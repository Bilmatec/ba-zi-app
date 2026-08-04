import { describe, it, expect } from 'vitest'
import { calculateChart, type BirthInput } from './calculate'
import { calculateLuck } from './luck'

function luckFor(input: BirthInput) {
  return calculateLuck(input, calculateChart(input))
}

function ganzhi(p: { stem: { chinese: string }; branch: { chinese: string } }): string {
  return p.stem.chinese + p.branch.chinese
}

describe('luck pillar direction and sequence', () => {
  it('reproduces the Wikibooks worked example (male, 2000-08-28, forward, starts age 3)', () => {
    // Wikibooks "Ba Zi/Luck Pillar": male born 2000-08-28 (庚辰 yang year →
    // forward). Month pillar 甲申; next jie is 白露 on Sep 7, 10 days away;
    // 10 ÷ 3 → starting age 3; first luck pillar 乙酉.
    const luck = luckFor({
      year: 2000, month: 8, day: 28, hour: 12, minute: 0,
      timeZone: 'Asia/Shanghai', gender: 'male',
    })
    expect(luck.forward).toBe(true)
    expect(luck.startAgeYears).toBe(3)
    expect(ganzhi(luck.periods[0])).toBe('乙酉')
    expect(ganzhi(luck.periods[1])).toBe('丙戌')
    expect(ganzhi(luck.periods[2])).toBe('丁亥')
    expect(luck.periods[0].startAge).toBe(3)
  })

  it('Bruce Lee: yang year + male → forward from 丁亥, starting around age 3', () => {
    // 1940 = 庚辰 (yang) + male → forward. Born Nov 27 (PST) = Nov 28 00:00
    // UTC+8; next jie 大雪 falls Dec 7 → just over 9 days ≈ 3 years.
    const luck = luckFor({
      year: 1940, month: 11, day: 27, hour: 8, minute: 0,
      timeZone: 'America/Los_Angeles', gender: 'male',
    })
    expect(luck.forward).toBe(true)
    expect(luck.startAgeYears).toBe(3)
    expect(ganzhi(luck.periods[0])).toBe('戊子')
    expect(ganzhi(luck.periods[1])).toBe('己丑')
    expect(ganzhi(luck.periods[7])).toBe('乙未')
  })

  it('same yang year but female → backward through the cycle', () => {
    const luck = luckFor({
      year: 1990, month: 6, day: 15, hour: 12, minute: 0,
      timeZone: 'America/New_York', gender: 'female',
    })
    // 1990 = 庚午 (yang) + female → backward. Month pillar 壬午 → 辛巳, 庚辰…
    expect(luck.forward).toBe(false)
    expect(ganzhi(luck.periods[0])).toBe('辛巳')
    expect(ganzhi(luck.periods[1])).toBe('庚辰')
  })

  it('male in the same yang year → forward (direction needs both inputs)', () => {
    const luck = luckFor({
      year: 1990, month: 6, day: 15, hour: 12, minute: 0,
      timeZone: 'America/New_York', gender: 'male',
    })
    expect(luck.forward).toBe(true)
    expect(ganzhi(luck.periods[0])).toBe('癸未')
  })
})

describe('gui ren (天乙贵人) per period', () => {
  it('marks 丑 and 未 periods for a 甲 day master (Bruce Lee)', () => {
    // Classic table: 甲 → 丑/未. His sequence 戊子 己丑 庚寅 辛卯 壬辰 癸巳 甲午 乙未.
    const luck = luckFor({
      year: 1940, month: 11, day: 27, hour: 8, minute: 0,
      timeZone: 'America/Los_Angeles', gender: 'male',
    })
    const flags = luck.periods.map((p) => p.guiRen)
    expect(flags).toEqual([false, true, false, false, false, false, false, true])
  })

  it('marks 亥 and 酉 periods for a 丁 day master', () => {
    // 2000-08-17 12:00 Shanghai is a 丁未 day (two days after the 乙巳 day
    // verified in the core tests), so the day stem is 丁 → 亥/酉.
    const input: BirthInput = {
      year: 2000, month: 8, day: 17, hour: 12, minute: 0,
      timeZone: 'Asia/Shanghai', gender: 'female',
    }
    const chart = calculateChart(input)
    if (chart.dayMaster.chinese !== '丁') {
      throw new Error(`test setup: expected 丁 day, got ${chart.dayMaster.chinese}`)
    }
    const luck = calculateLuck(input, chart)
    for (const p of luck.periods) {
      expect(p.guiRen).toBe(p.branch.chinese === '亥' || p.branch.chinese === '酉')
    }
  })
})

describe('resource levels', () => {
  it('counts how many of a period’s two characters supply the day master', () => {
    // 1990 male: day master 辛 (metal); metal is supplied by metal and earth.
    // First period 癸未: 癸 water (no) + 未 earth (yes) → 1 → mixed.
    const luck = luckFor({
      year: 1990, month: 6, day: 15, hour: 12, minute: 0,
      timeZone: 'America/New_York', gender: 'male',
    })
    const first = luck.periods[0]
    expect(first.supportCount).toBe(1)
    expect(first.resource).toBe('mixed')
    // Every period's level must follow its count.
    for (const p of luck.periods) {
      const expected = p.supportCount === 2 ? 'rich' : p.supportCount === 1 ? 'mixed' : 'scarce'
      expect(p.resource).toBe(expected)
    }
  })
})

describe('timeline bookkeeping', () => {
  it('periods are consecutive decades with consistent years and ages', () => {
    const luck = luckFor({
      year: 1968, month: 10, day: 31, hour: 16, minute: 26,
      timeZone: 'America/New_York', gender: 'male',
    })
    expect(luck.periods).toHaveLength(8)
    for (let i = 1; i < luck.periods.length; i++) {
      expect(luck.periods[i].startYear).toBe(luck.periods[i - 1].endYear + 1)
    }
    for (let i = 0; i < luck.periods.length; i++) {
      const p = luck.periods[i]
      expect(p.endYear - p.startYear).toBe(9)
      expect(p.startAge).toBe(luck.startAgeYears + i * 10)
    }
    // Born 1968: today (2026) falls inside one of the first pillars.
    expect(luck.currentIndex).toBeGreaterThanOrEqual(0)
    const current = luck.periods[luck.currentIndex]
    const nowYear = new Date().getFullYear()
    expect(nowYear).toBeGreaterThanOrEqual(current.startYear)
    expect(nowYear).toBeLessThanOrEqual(current.endYear)
  })
})
