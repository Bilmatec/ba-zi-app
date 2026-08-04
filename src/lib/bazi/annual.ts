import { Solar } from 'lunar-typescript'
import { STEMS, BRANCHES, type StemInfo, type BranchInfo } from './data'
import type { ChartResult } from './calculate'
import type { LuckTimeline } from './luck'

// Annual pillar (流年), first pass. The year's stem/branch comes from the
// same Lichun-exact year mechanism verified in Phase 1 — applied to today
// instead of the birth date. Clash (冲) only: the six opposite-branch pairs
// (子午, 丑未, 寅申, 卯酉, 辰戌, 巳亥), i.e. branches six steps apart.
// A test cross-checks this rule against the library's CHONG table.
// Combination (合), harm (害), and punishment (刑) are deliberately not
// implemented in this pass.

const BRANCH_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

/** The clash partner of a branch: the branch six steps opposite. */
export function clashPartner(branch: string): string {
  const i = BRANCH_ORDER.indexOf(branch)
  return BRANCH_ORDER[(i + 6) % 12]
}

export interface ClashHit {
  /** where in the person's chart the clashed branch sits */
  location: string
  branch: BranchInfo
  /** true when the clash is with the current luck pillar rather than the birth chart */
  isLuckPillar: boolean
}

export interface AnnualReport {
  /** calendar year label for display */
  calendarYear: number
  stem: StemInfo
  branch: BranchInfo
  /** true from Jan 1 until Lichun, when the previous ganzhi year still runs */
  beforeLichun: boolean
  clashes: ClashHit[]
}

export function annualReport(
  chart: ChartResult,
  luck: LuckTimeline,
  now: Date = new Date(),
): AnnualReport {
  const lunar = Solar.fromYmdHms(
    now.getFullYear(), now.getMonth() + 1, now.getDate(), 12, 0, 0,
  ).getLunar()
  const ganzhi = lunar.getYearInGanZhiExact()
  const stem = STEMS[ganzhi[0]]
  const branch = BRANCHES[ganzhi[1]]
  if (!stem || !branch) throw new Error(`Unknown annual pillar: ${ganzhi}`)

  // Before Lichun, the running ganzhi year is still the previous calendar
  // year's — worth flagging so the display label doesn't mislead.
  const lichunGanzhi = Solar.fromYmdHms(now.getFullYear(), 6, 1, 12, 0, 0)
    .getLunar()
    .getYearInGanZhiExact()
  const beforeLichun = ganzhi !== lichunGanzhi

  const partner = clashPartner(ganzhi[1])
  const clashes: ClashHit[] = []
  const natal: { location: string; branch: BranchInfo | undefined }[] = [
    { location: 'year branch', branch: chart.yearPillar.branch },
    { location: 'month branch', branch: chart.monthPillar.branch },
    { location: 'day branch', branch: chart.dayPillar.branch },
    { location: 'hour branch', branch: chart.hourPillar?.branch },
  ]
  for (const { location, branch: b } of natal) {
    if (b && b.chinese === partner) {
      clashes.push({ location, branch: b, isLuckPillar: false })
    }
  }
  const current = luck.currentIndex >= 0 ? luck.periods[luck.currentIndex] : null
  if (current && current.branch.chinese === partner) {
    clashes.push({
      location: 'current luck pillar',
      branch: current.branch,
      isLuckPillar: true,
    })
  }

  return { calendarYear: now.getFullYear(), stem, branch, beforeLichun, clashes }
}
