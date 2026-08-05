import { Solar } from 'lunar-typescript'
import { STEMS, BRANCHES, type StemInfo, type BranchInfo } from './data'
import type { ChartResult } from './calculate'
import type { LuckTimeline } from './luck'

// Annual reading (流年) engine. The year's stem/branch comes from the same
// Lichun-exact year mechanism verified in Phase 1 — applied to today instead
// of the birth date.
//
// Factors implemented (each verified; see build notes Aug 4):
// - Clash (冲): the six opposite-branch pairs, six steps apart. Cross-checked
//   against the library's CHONG table in tests.
// - Harm (害): the six documented pairs 子未, 丑午, 寅巳, 卯辰, 申亥, 酉戌.
//   Copy stays generic across pairs by design — no pair-specific fate claims.
// - Blood Blade (血刃): a fixed marker derived from the birth month branch,
//   active when the annual or current luck-pillar branch carries its trigger.
// Not implemented (future roadmap): Flying Blade (飛刃), combination (合),
// punishment (刑).

const BRANCH_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

/** The clash partner of a branch: the branch six steps opposite. */
export function clashPartner(branch: string): string {
  const i = BRANCH_ORDER.indexOf(branch)
  return BRANCH_ORDER[(i + 6) % 12]
}

/** The six harm (害) pairs, stored both directions. */
const HARM_PAIRS: [string, string][] = [
  ['子', '未'],
  ['丑', '午'],
  ['寅', '巳'],
  ['卯', '辰'],
  ['申', '亥'],
  ['酉', '戌'],
]

export function harmPartner(branch: string): string {
  for (const [a, b] of HARM_PAIRS) {
    if (a === branch) return b
    if (b === branch) return a
  }
  throw new Error(`Unknown branch: ${branch}`)
}

/** Blood Blade (血刃): birth month branch → the branch that triggers it. */
export const BLOOD_BLADE: Record<string, string> = {
  寅: '丑',
  卯: '未',
  辰: '寅',
  巳: '申',
  午: '卯',
  未: '酉',
  申: '辰',
  酉: '戌',
  戌: '巳',
  亥: '亥',
  子: '午',
  丑: '子',
}

export interface ClashHit {
  /** where in the person's chart the clashed branch sits */
  location: string
  branch: BranchInfo
  /** true when the clash is with the current luck pillar rather than the birth chart */
  isLuckPillar: boolean
}

export interface BloodBladeStatus {
  /** the person's birth month branch (fixed for life) */
  monthBranch: BranchInfo
  /** the branch that activates the marker for this person */
  trigger: BranchInfo
  /** where the trigger shows up right now: 'this year' and/or 'current decade' */
  activeVia: string[]
}

export interface AnnualReport {
  /** calendar year label for display */
  calendarYear: number
  stem: StemInfo
  branch: BranchInfo
  /** true from Jan 1 until Lichun, when the previous ganzhi year still runs */
  beforeLichun: boolean
  clashes: ClashHit[]
  harms: ClashHit[]
  bloodBlade: BloodBladeStatus
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

  const natal: { location: string; branch: BranchInfo | undefined }[] = [
    { location: 'year branch', branch: chart.yearPillar.branch },
    { location: 'month branch', branch: chart.monthPillar.branch },
    { location: 'day branch', branch: chart.dayPillar.branch },
    { location: 'hour branch', branch: chart.hourPillar?.branch },
  ]
  const current = luck.currentIndex >= 0 ? luck.periods[luck.currentIndex] : null

  const collect = (partner: string): ClashHit[] => {
    const hits: ClashHit[] = []
    for (const { location, branch: b } of natal) {
      if (b && b.chinese === partner) hits.push({ location, branch: b, isLuckPillar: false })
    }
    if (current && current.branch.chinese === partner) {
      hits.push({ location: 'current luck pillar', branch: current.branch, isLuckPillar: true })
    }
    return hits
  }

  const clashes = collect(clashPartner(ganzhi[1]))
  const harms = collect(harmPartner(ganzhi[1]))

  const monthBranch = chart.monthPillar.branch
  const triggerChar = BLOOD_BLADE[monthBranch.chinese]
  const activeVia: string[] = []
  if (ganzhi[1] === triggerChar) activeVia.push('this year')
  if (current && current.branch.chinese === triggerChar) activeVia.push('current decade')
  const bloodBlade: BloodBladeStatus = {
    monthBranch,
    trigger: BRANCHES[triggerChar],
    activeVia,
  }

  return { calendarYear: now.getFullYear(), stem, branch, beforeLichun, clashes, harms, bloodBlade }
}
