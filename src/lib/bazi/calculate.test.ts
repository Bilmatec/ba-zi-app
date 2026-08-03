import { describe, it, expect } from 'vitest'
import { calculateChart, type Pillar } from './calculate'
import { STEMS, BRANCHES } from './data'
import { LunarUtil } from 'lunar-typescript'

function ganzhi(p: Pillar | null): string {
  return p ? p.stem.chinese + p.branch.chinese : '—'
}

// ---------------------------------------------------------------------------
// Reference cases. Sources for expected values:
// - Bruce Lee: publicly documented chart (b. 1940-11-27 08:00, San Francisco,
//   no DST in effect in Nov 1940): 庚辰 丁亥 甲戌 戊辰. Day pillar additionally
//   confirmed by an independent Julian-day calculation anchored to the
//   documented fact that 1949-10-01 was a 甲子 day.
// - Solar term instants verified against Hong Kong Observatory published
//   dates (1990, 2026) and Wikipedia's equinox/solstice table (2026, to the
//   minute). 立春 1990 = 1990-02-04 10:14 UTC+8 = 02:14 UTC.
// ---------------------------------------------------------------------------

describe('reference charts', () => {
  it('matches Bruce Lee’s documented chart (1940, San Francisco, no DST)', () => {
    const c = calculateChart({
      year: 1940, month: 11, day: 27, hour: 8, minute: 0,
      timeZone: 'America/Los_Angeles', gender: 'male',
    })
    expect(ganzhi(c.yearPillar)).toBe('庚辰')
    expect(ganzhi(c.monthPillar)).toBe('丁亥')
    expect(ganzhi(c.dayPillar)).toBe('甲戌')
    expect(ganzhi(c.hourPillar)).toBe('戊辰')
    expect(c.dayMaster.element).toBe('Wood')
    expect(c.meta.dstAdjustmentMinutes).toBe(0)
  })

  it('computes a plain mid-year chart (1990-06-15 12:00 New York)', () => {
    const c = calculateChart({
      year: 1990, month: 6, day: 15, hour: 12, minute: 0,
      timeZone: 'America/New_York', gender: 'male',
    })
    // 1990 = 庚午 year; June 15 is after 芒种 → 午 month; day 辛亥 confirmed
    // by the independent Julian-day formula; 12:00 EDT = 11:00 EST → 午 hour.
    expect(ganzhi(c.yearPillar)).toBe('庚午')
    expect(ganzhi(c.monthPillar)).toBe('壬午')
    expect(ganzhi(c.dayPillar)).toBe('辛亥')
    expect(ganzhi(c.hourPillar)).toBe('甲午')
    expect(c.meta.dstAdjustmentMinutes).toBe(60)
  })
})

describe('year boundary at 立春 (solar term instant, cross-time-zone)', () => {
  // 立春 1990 fell at 1990-02-04 10:14 on the UTC+8 clock = 02:14 UTC,
  // which is 02:14 in London (GMT, no DST in February).
  it('a London birth 44 minutes BEFORE the instant stays in the old year', () => {
    const c = calculateChart({
      year: 1990, month: 2, day: 4, hour: 1, minute: 30,
      timeZone: 'Europe/London', gender: 'female',
    })
    expect(ganzhi(c.yearPillar)).toBe('己巳') // still the 1989 snake year
    expect(c.monthPillar.branch.chinese).toBe('丑') // still the 12th month
  })

  it('a London birth 46 minutes AFTER the instant is in the new year', () => {
    const c = calculateChart({
      year: 1990, month: 2, day: 4, hour: 3, minute: 0,
      timeZone: 'Europe/London', gender: 'female',
    })
    expect(ganzhi(c.yearPillar)).toBe('庚午') // the 1990 horse year
    expect(ganzhi(c.monthPillar)).toBe('戊寅') // first month of a 庚 year
  })

  it('the SAME wall clock in Shanghai (already past the instant) is in the new year', () => {
    const c = calculateChart({
      year: 1990, month: 2, day: 4, hour: 11, minute: 0,
      timeZone: 'Asia/Shanghai', gender: 'female',
    })
    expect(ganzhi(c.yearPillar)).toBe('庚午')
  })
})

describe('daylight saving time correction (IANA database)', () => {
  it('removes US summer DST so 13:30 EDT counts as the 午 hour (12:30 standard)', () => {
    const c = calculateChart({
      year: 1985, month: 7, day: 1, hour: 13, minute: 30,
      timeZone: 'America/New_York', gender: 'male',
    })
    expect(c.meta.dstAdjustmentMinutes).toBe(60)
    expect(c.hourPillar?.branch.chinese).toBe('午') // 未 would mean DST was ignored
  })

  it('applies no correction to the same date in a non-DST zone', () => {
    const c = calculateChart({
      year: 1985, month: 7, day: 1, hour: 13, minute: 30,
      timeZone: 'Asia/Shanghai', gender: 'male',
    })
    expect(c.meta.dstAdjustmentMinutes).toBe(0)
    expect(c.hourPillar?.branch.chinese).toBe('未')
  })

  it('handles southern-hemisphere DST (Sydney in January)', () => {
    const c = calculateChart({
      year: 2000, month: 1, day: 15, hour: 10, minute: 30,
      timeZone: 'Australia/Sydney', gender: 'female',
    })
    expect(c.meta.dstAdjustmentMinutes).toBe(60) // AEDT +11 → standard +10
    expect(c.hourPillar?.branch.chinese).toBe('巳') // 09:30 standard time
  })

  it('DST correction can move the birth into the previous day', () => {
    // 00:30 EDT on 1985-07-02 = 23:30 EST on 1985-07-01.
    const withDst = calculateChart({
      year: 1985, month: 7, day: 2, hour: 0, minute: 30,
      timeZone: 'America/New_York', gender: 'male',
    })
    const explicit = calculateChart({
      year: 1985, month: 7, day: 1, hour: 23, minute: 30,
      timeZone: 'Asia/Shanghai', gender: 'male', // same wall clock, no DST zone
    })
    expect(ganzhi(withDst.dayPillar)).toBe(ganzhi(explicit.dayPillar))
  })
})

describe('unknown birth time', () => {
  it('omits the hour pillar and still returns the other three', () => {
    const c = calculateChart({
      year: 1990, month: 6, day: 15,
      timeZone: 'America/New_York', gender: 'male',
    })
    expect(c.timeKnown).toBe(false)
    expect(c.hourPillar).toBeNull()
    expect(ganzhi(c.yearPillar)).toBe('庚午')
    expect(ganzhi(c.monthPillar)).toBe('壬午')
    expect(ganzhi(c.dayPillar)).toBe('辛亥')
  })
})

describe('late-night 子 hour (23:00–23:59)', () => {
  it('keeps the day pillar on the birth date (midnight day boundary)', () => {
    // 2000-08-15 was a 乙巳 day (independent Julian-day formula).
    const c = calculateChart({
      year: 2000, month: 8, day: 15, hour: 23, minute: 30,
      timeZone: 'Asia/Shanghai', gender: 'male',
    })
    expect(ganzhi(c.dayPillar)).toBe('乙巳')
    expect(c.hourPillar?.branch.chinese).toBe('子')
  })
})

describe('display tables agree with the calculation library', () => {
  const elementMap: Record<string, string> = {
    木: 'Wood', 火: 'Fire', 土: 'Earth', 金: 'Metal', 水: 'Water',
  }

  it('stem elements match LunarUtil.WU_XING_GAN', () => {
    for (const [gan, info] of Object.entries(STEMS)) {
      expect(info.element, `stem ${gan}`).toBe(elementMap[LunarUtil.WU_XING_GAN[gan]])
    }
  })

  it('branch elements match LunarUtil.WU_XING_ZHI', () => {
    for (const [zhi, info] of Object.entries(BRANCHES)) {
      expect(info.element, `branch ${zhi}`).toBe(elementMap[LunarUtil.WU_XING_ZHI[zhi]])
    }
  })
})
