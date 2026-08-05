import { describe, it, expect } from 'vitest'
import { LunarUtil } from 'lunar-typescript'
import { calculateChart, type BirthInput } from './calculate'
import { calculateLuck } from './luck'
import { annualReport, clashPartner, harmPartner, BLOOD_BLADE } from './annual'

function reportFor(input: BirthInput, now: Date) {
  const chart = calculateChart(input)
  return annualReport(chart, calculateLuck(input, chart), now)
}

describe('clash (冲) rule', () => {
  it('matches the library’s CHONG table for all twelve branches', () => {
    const order = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
    order.forEach((branch, i) => {
      expect(clashPartner(branch), `branch ${branch}`).toBe(LunarUtil.CHONG[i])
    })
  })

  it('pairs are the documented six opposites', () => {
    expect(clashPartner('子')).toBe('午')
    expect(clashPartner('丑')).toBe('未')
    expect(clashPartner('寅')).toBe('申')
    expect(clashPartner('卯')).toBe('酉')
    expect(clashPartner('辰')).toBe('戌')
    expect(clashPartner('巳')).toBe('亥')
    // symmetric
    expect(clashPartner('亥')).toBe('巳')
  })
})

describe('harm (害) rule', () => {
  it('covers the six documented pairs, symmetrically', () => {
    const pairs: [string, string][] = [
      ['子', '未'], ['丑', '午'], ['寅', '巳'],
      ['卯', '辰'], ['申', '亥'], ['酉', '戌'],
    ]
    for (const [a, b] of pairs) {
      expect(harmPartner(a)).toBe(b)
      expect(harmPartner(b)).toBe(a)
    }
  })

  it('every branch has exactly one harm partner', () => {
    const order = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
    const partners = order.map(harmPartner)
    expect(new Set(partners).size).toBe(12)
  })
})

describe('blood blade (血刃) table', () => {
  it('matches the cross-verified month-branch → trigger mapping', () => {
    expect(BLOOD_BLADE['寅']).toBe('丑')
    expect(BLOOD_BLADE['卯']).toBe('未')
    expect(BLOOD_BLADE['辰']).toBe('寅')
    expect(BLOOD_BLADE['巳']).toBe('申')
    expect(BLOOD_BLADE['午']).toBe('卯')
    expect(BLOOD_BLADE['未']).toBe('酉')
    expect(BLOOD_BLADE['申']).toBe('辰')
    expect(BLOOD_BLADE['酉']).toBe('戌')
    expect(BLOOD_BLADE['戌']).toBe('巳')
    expect(BLOOD_BLADE['亥']).toBe('亥')
    expect(BLOOD_BLADE['子']).toBe('午')
    expect(BLOOD_BLADE['丑']).toBe('子')
    expect(Object.keys(BLOOD_BLADE)).toHaveLength(12)
  })
})

describe('annual pillar', () => {
  const input: BirthInput = {
    year: 1968, month: 10, day: 31, hour: 16, minute: 26,
    timeZone: 'America/New_York', gender: 'male',
  }

  it('gives 丙午 for August 2026 and flags nothing before-Lichun', () => {
    const r = reportFor(input, new Date(2026, 7, 4))
    expect(r.stem.chinese + r.branch.chinese).toBe('丙午')
    expect(r.beforeLichun).toBe(false)
  })

  it('still runs the previous ganzhi year in January', () => {
    const r = reportFor(input, new Date(2026, 0, 15))
    expect(r.stem.chinese + r.branch.chinese).toBe('乙巳') // 2025’s pillar
    expect(r.beforeLichun).toBe(true)
  })

  it('finds no clash for the 1968 chart in a 午 year (branches 申戌戌申, decade 辰)', () => {
    const r = reportFor(input, new Date(2026, 7, 4))
    expect(r.clashes).toEqual([])
  })

  it('finds the hour-branch clash for a 子-hour birth in a 午 year', () => {
    // 2000-08-15 23:30 Shanghai: hour branch 子, which clashes the 午 year.
    const r = reportFor(
      {
        year: 2000, month: 8, day: 15, hour: 23, minute: 30,
        timeZone: 'Asia/Shanghai', gender: 'male',
      },
      new Date(2026, 7, 4),
    )
    expect(r.clashes).toHaveLength(1)
    expect(r.clashes[0].location).toBe('hour branch')
    expect(r.clashes[0].isLuckPillar).toBe(false)
  })

  it('handles unknown birth time without an hour branch', () => {
    const r = reportFor(
      { year: 1968, month: 10, day: 31, timeZone: 'America/New_York', gender: 'male' },
      new Date(2026, 7, 4),
    )
    expect(r.clashes).toEqual([])
  })

  it('finds harm and no false blade for the 1968 chart in a 午 year', () => {
    // 午 harms 丑 — the 1968 branches (申戌戌申) hold none; blade trigger for
    // a 戌 month is 巳, which neither the year (午) nor the decade (辰) carries.
    const r = reportFor(
      { year: 1968, month: 10, day: 31, hour: 16, minute: 26, timeZone: 'America/New_York', gender: 'male' },
      new Date(2026, 7, 4),
    )
    expect(r.harms).toEqual([])
    expect(r.bloodBlade.trigger.chinese).toBe('巳')
    expect(r.bloodBlade.activeVia).toEqual([])
  })

  it('finds clash + blade together for a 子-month birth in a 午 year', () => {
    // Born 1990-12-20 (子 month): the 午 year clashes the 子 month branch, and
    // the blade trigger for a 子 month is 午 — carried by this very year.
    const r = reportFor(
      { year: 1990, month: 12, day: 20, hour: 12, minute: 0, timeZone: 'Asia/Shanghai', gender: 'male' },
      new Date(2026, 7, 4),
    )
    expect(r.clashes.some((c) => c.location === 'month branch')).toBe(true)
    expect(r.bloodBlade.activeVia).toContain('this year')
  })

  it('finds a harm hit for a 丑-month birth in a 午 year', () => {
    // Born 1985-01-20 (丑 month, still the 甲子 ganzhi year): 午 harms 丑.
    const r = reportFor(
      { year: 1985, month: 1, day: 20, hour: 12, minute: 0, timeZone: 'Asia/Shanghai', gender: 'female' },
      new Date(2026, 7, 4),
    )
    expect(r.harms.some((h) => h.location === 'month branch')).toBe(true)
  })
})
