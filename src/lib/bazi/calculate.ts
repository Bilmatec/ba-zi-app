import { DateTime, FixedOffsetZone } from 'luxon'
import { Solar } from 'lunar-typescript'
import { STEMS, BRANCHES, type StemInfo, type BranchInfo } from './data'

export interface BirthInput {
  year: number
  month: number // 1-12
  day: number
  /** undefined when birth time is unknown */
  hour?: number
  minute?: number
  /** IANA time zone name, e.g. "America/New_York" */
  timeZone: string
  gender: 'male' | 'female'
}

export interface Pillar {
  stem: StemInfo
  branch: BranchInfo
}

export interface ChartResult {
  yearPillar: Pillar
  monthPillar: Pillar
  dayPillar: Pillar
  /** null when birth time is unknown */
  hourPillar: Pillar | null
  dayMaster: StemInfo
  timeKnown: boolean
  gender: 'male' | 'female'
  meta: {
    /** what the user entered, as an ISO string in their zone */
    wallClock: string
    timeZone: string
    /** UTC offset in effect at birth, minutes */
    offsetMinutes: number
    /** minutes of daylight saving removed to reach standard time (0 if none) */
    dstAdjustmentMinutes: number
    /** the standard-time clock actually used for the day and hour pillars */
    standardClock: string
    /** the birth moment as a UTC instant */
    utcInstant: string
  }
}

/**
 * The zone's standard (non-DST) offset for a given year: the smaller of the
 * offsets in effect on Jan 1 and Jul 1, which covers both hemispheres since
 * daylight saving always adds to the standard offset.
 */
function standardOffsetMinutes(year: number, timeZone: string): number {
  const jan = DateTime.fromObject({ year, month: 1, day: 1, hour: 12 }, { zone: timeZone })
  const jul = DateTime.fromObject({ year, month: 7, day: 1, hour: 12 }, { zone: timeZone })
  return Math.min(jan.offset, jul.offset)
}

function toPillar(gan: string, zhi: string): Pillar {
  const stem = STEMS[gan]
  const branch = BRANCHES[zhi]
  if (!stem || !branch) {
    throw new Error(`Unknown stem/branch combination: ${gan}${zhi}`)
  }
  return { stem, branch }
}

function eightCharFor(dt: DateTime) {
  return Solar.fromYmdHms(dt.year, dt.month, dt.day, dt.hour, dt.minute, 0)
    .getLunar()
    .getEightChar()
}

/**
 * Compute the Four Pillars chart.
 *
 * Time conventions (locked in the project brief):
 * - Clock time corrected to STANDARD time: any historical daylight saving
 *   offset (per the IANA database) is removed before the day and hour
 *   pillars are read. No true-solar-time adjustment.
 * - Year and month pillars change at solar term instants. Those instants are
 *   astronomical moments; lunar-typescript computes them on a UTC+8 clock, so
 *   the birth instant is converted to UTC+8 for those two pillars. The day
 *   and hour pillars use the birth location's own standard clock.
 * - Unknown birth time: day pillar is computed from the calendar date alone
 *   (day boundary is midnight) and the hour pillar is omitted, never guessed.
 */
export function calculateChart(input: BirthInput): ChartResult {
  const timeKnown = input.hour !== undefined
  const hour = input.hour ?? 12
  const minute = input.minute ?? 0

  const wall = DateTime.fromObject(
    { year: input.year, month: input.month, day: input.day, hour, minute },
    { zone: input.timeZone },
  )
  if (!wall.isValid) {
    throw new Error(`Invalid date/time or time zone: ${wall.invalidExplanation}`)
  }

  const stdOffset = standardOffsetMinutes(input.year, input.timeZone)
  const dstAdjustment = wall.offset - stdOffset
  // Same instant, re-expressed on the standard-time clock (DST removed).
  const standardLocal = wall.setZone(FixedOffsetZone.instance(stdOffset))
  // Same instant on the UTC+8 clock the solar term tables are computed in.
  const chinaLocal = wall.setZone(FixedOffsetZone.instance(8 * 60))

  // Year + month pillars: solar-term-boundary based, so use the UTC+8 clock.
  const termChart = eightCharFor(chinaLocal)
  // Day + hour pillars: local-clock based, so use the standard-time clock.
  const localChart = eightCharFor(standardLocal)

  const dayPillar = toPillar(localChart.getDayGan(), localChart.getDayZhi())

  return {
    yearPillar: toPillar(termChart.getYearGan(), termChart.getYearZhi()),
    monthPillar: toPillar(termChart.getMonthGan(), termChart.getMonthZhi()),
    dayPillar,
    hourPillar: timeKnown ? toPillar(localChart.getTimeGan(), localChart.getTimeZhi()) : null,
    dayMaster: dayPillar.stem,
    timeKnown,
    gender: input.gender,
    meta: {
      wallClock: wall.toISO() ?? '',
      timeZone: input.timeZone,
      offsetMinutes: wall.offset,
      dstAdjustmentMinutes: dstAdjustment,
      standardClock: standardLocal.toISO() ?? '',
      utcInstant: wall.toUTC().toISO() ?? '',
    },
  }
}
