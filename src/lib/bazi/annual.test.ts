import { describe, it, expect } from 'vitest'
import { LunarUtil } from 'lunar-typescript'
import { calculateChart, type BirthInput } from './calculate'
import { calculateLuck } from './luck'
import { annualReport, clashPartner } from './annual'

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
})
