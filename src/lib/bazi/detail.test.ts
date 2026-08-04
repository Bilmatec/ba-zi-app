import { describe, it, expect } from 'vitest'
import { LunarUtil } from 'lunar-typescript'
import { STEMS } from './data'
import { calculateChart } from './calculate'
import { interpretChart } from './interpret'
import { HIDDEN_STEMS, tenGodOf, detailedReading } from './detail'

describe('hidden stems table', () => {
  it('matches the library’s ZHI_HIDE_GAN for all 12 branches (membership and order)', () => {
    for (const [branch, ours] of Object.entries(HIDDEN_STEMS)) {
      expect(LunarUtil.ZHI_HIDE_GAN[branch], `branch ${branch}`).toEqual(ours)
    }
    expect(Object.keys(HIDDEN_STEMS)).toHaveLength(12)
  })
})

describe('ten gods derivation', () => {
  it('matches the library’s SHI_SHEN table for all 100 day-master/stem pairs', () => {
    const stems = Object.values(STEMS)
    for (const dm of stems) {
      for (const other of stems) {
        const ours = tenGodOf(dm, other).chinese
        const lib = LunarUtil.SHI_SHEN[dm.chinese + other.chinese]
        expect(ours, `${dm.chinese} vs ${other.chinese}`).toBe(lib)
      }
    }
  })

  it('spot-checks the classical anchors', () => {
    // 甲 day master: 甲=Friend, 乙=Rob Wealth, 丙=Eating God, 辛=Direct Officer.
    expect(tenGodOf(STEMS['甲'], STEMS['甲']).english).toBe('Friend')
    expect(tenGodOf(STEMS['甲'], STEMS['乙']).english).toBe('Rob Wealth')
    expect(tenGodOf(STEMS['甲'], STEMS['丙']).english).toBe('Eating God')
    expect(tenGodOf(STEMS['甲'], STEMS['辛']).english).toBe('Direct Officer')
  })
})

describe('detailed reading', () => {
  // The mockup's worked example: 31 Oct 1968, 4:26pm, Easton PA — no visible
  // fire, but both Dog (戌) branches hide 丁 fire.
  const chart = calculateChart({
    year: 1968, month: 10, day: 31, hour: 16, minute: 26,
    timeZone: 'America/New_York', gender: 'male',
  })
  const detail = detailedReading(chart, interpretChart(chart).strength)

  it('finds fire hiding in the branches of the 1968 chart', () => {
    expect(detail.hiddenFinds).toContain('Fire')
    expect(detail.trulyMissing).toHaveLength(0)
    // Both Dog pillars carry hidden 丁.
    const dogs = detail.hiddenPillars.filter((p) => p.branch === '戌')
    expect(dogs).toHaveLength(2)
    for (const dog of dogs) {
      expect(dog.hidden.map((s) => s.chinese)).toEqual(['戊', '辛', '丁'])
    }
  })

  it('extended balance counts every hidden stem on top of the visible eight', () => {
    // 申 hides 3, 戌 hides 3 (x2), plus the other 申: 3 → 8 + 12 = 20.
    expect(detail.extendedTotal).toBe(20)
    const sum = Object.values(detail.extendedCounts).reduce((a, b) => a + b, 0)
    expect(sum).toBe(20)
  })

  it('lists ten gods for the three non-day stems and all four branch main qis', () => {
    expect(detail.tenGods).toHaveLength(7)
    const hidden = detail.tenGods.filter((t) => t.isHidden)
    expect(hidden).toHaveLength(4)
  })

  it('handles unknown birth time (three pillars)', () => {
    const noHour = calculateChart({
      year: 1968, month: 10, day: 31,
      timeZone: 'America/New_York', gender: 'male',
    })
    const d = detailedReading(noHour, interpretChart(noHour).strength)
    expect(d.hiddenPillars).toHaveLength(3)
    expect(d.tenGods).toHaveLength(5) // 2 non-day stems + 3 branch main qis
  })

  it('suggests the resource element for a weak day master, hedged elsewhere', () => {
    // 1990 chart: 辛 metal day master, weak → resource is earth.
    const weak = calculateChart({
      year: 1990, month: 6, day: 15, hour: 12, minute: 0,
      timeZone: 'America/New_York', gender: 'male',
    })
    const d = detailedReading(weak, interpretChart(weak).strength)
    expect(d.usefulGod.primary).toBe('Earth')
    expect(d.usefulGod.secondary).toBe('Metal')
  })
})
