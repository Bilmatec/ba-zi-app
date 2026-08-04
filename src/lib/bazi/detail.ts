import { STEMS, type StemInfo, type Element } from './data'
import type { ChartResult, Pillar } from './calculate'
import { countElements, ELEMENTS } from './interpret'

// Detailed-tier calculations (Phase 5). Verification notes:
// - Hidden stems (藏干): table below matches lunar-typescript's
//   LunarUtil.ZHI_HIDE_GAN and Imperial Harvest's published table exactly
//   (all 12 branches, membership and main-qi order; checked Aug 2026).
//   A test cross-checks this table against the library's copy.
// - Ten Gods (十神): derived from the classical rule (element relation to the
//   day master + same/opposite polarity). A test cross-checks the derivation
//   against the library's LunarUtil.SHI_SHEN table for all 100 stem pairs.

/** Hidden stems per branch, main qi first. */
export const HIDDEN_STEMS: Record<string, string[]> = {
  子: ['癸'],
  丑: ['己', '癸', '辛'],
  寅: ['甲', '丙', '戊'],
  卯: ['乙'],
  辰: ['戊', '乙', '癸'],
  巳: ['丙', '庚', '戊'],
  午: ['丁', '己'],
  未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'],
  酉: ['辛'],
  戌: ['戊', '辛', '丁'],
  亥: ['壬', '甲'],
}

const GENERATES: Record<Element, Element> = {
  Wood: 'Fire',
  Fire: 'Earth',
  Earth: 'Metal',
  Metal: 'Water',
  Water: 'Wood',
}

const CONTROLS: Record<Element, Element> = {
  Wood: 'Earth',
  Earth: 'Water',
  Water: 'Fire',
  Fire: 'Metal',
  Metal: 'Wood',
}

export interface TenGod {
  chinese: string
  english: string
  /** the five broader categories */
  category: 'companion' | 'output' | 'wealth' | 'officer' | 'resource'
  /** one-line tendency, phrased as tendency rather than verdict */
  meaning: string
}

const TEN_GODS: Record<string, TenGod> = {
  比肩: { chinese: '比肩', english: 'Friend', category: 'companion', meaning: 'peers and equals — self-reliance, and allies who stand shoulder to shoulder with you' },
  劫财: { chinese: '劫财', english: 'Rob Wealth', category: 'companion', meaning: 'rivalry and shared stakes — magnetic company that can also draw on your resources' },
  食神: { chinese: '食神', english: 'Eating God', category: 'output', meaning: 'easeful output — craft, taste, and quiet creative flow' },
  伤官: { chinese: '伤官', english: 'Hurting Officer', category: 'output', meaning: 'bold output — performance, sharp expression, and a streak that tests rules' },
  偏财: { chinese: '偏财', english: 'Indirect Wealth', category: 'wealth', meaning: 'opportunistic gain — ventures, windfalls, money in motion' },
  正财: { chinese: '正财', english: 'Direct Wealth', category: 'wealth', meaning: 'earned gain — steady, methodical building of what you keep' },
  七杀: { chinese: '七杀', english: 'Seven Killings', category: 'officer', meaning: 'raw pressure — drive under challenge, decisiveness when stakes are high' },
  正官: { chinese: '正官', english: 'Direct Officer', category: 'officer', meaning: 'order and duty — reputation, correctness, recognized position' },
  偏印: { chinese: '偏印', english: 'Indirect Resource', category: 'resource', meaning: 'unconventional support — intuition, niche knowledge, learning off the beaten path' },
  正印: { chinese: '正印', english: 'Direct Resource', category: 'resource', meaning: 'straightforward support — protection, credentials, learning that steadies you' },
}

/**
 * The classical Ten Gods rule: relation of a stem to the day master stem.
 * Same polarity → the "indirect"/peer god of the pair; opposite polarity →
 * the "direct" god.
 */
export function tenGodOf(dayMaster: StemInfo, other: StemInfo): TenGod {
  const samePolarity = dayMaster.polarity === other.polarity
  let key: string
  if (other.element === dayMaster.element) {
    key = samePolarity ? '比肩' : '劫财'
  } else if (GENERATES[dayMaster.element] === other.element) {
    key = samePolarity ? '食神' : '伤官'
  } else if (CONTROLS[dayMaster.element] === other.element) {
    key = samePolarity ? '偏财' : '正财'
  } else if (CONTROLS[other.element] === dayMaster.element) {
    key = samePolarity ? '七杀' : '正官'
  } else {
    key = samePolarity ? '偏印' : '正印'
  }
  return TEN_GODS[key]
}

export interface HiddenPillar {
  label: string
  branch: string
  hidden: StemInfo[]
}

export interface TenGodEntry {
  position: string
  stem: StemInfo
  god: TenGod
  /** true when the stem is hidden inside a branch rather than visible */
  isHidden: boolean
}

export interface DetailedReadingData {
  hiddenPillars: HiddenPillar[]
  /** balance including every hidden stem, each counted once */
  extendedCounts: Record<Element, number>
  extendedTotal: number
  /** elements absent from the visible chart but present once hidden stems count */
  hiddenFinds: Element[]
  /** elements absent even including hidden stems */
  trulyMissing: Element[]
  tenGods: TenGodEntry[]
  usefulGod: {
    primary: Element
    secondary: Element | null
  }
}

function hiddenOf(branchChar: string): StemInfo[] {
  return (HIDDEN_STEMS[branchChar] ?? []).map((c) => STEMS[c])
}

export type TenGodCategory = TenGod['category']

/** How many cast members fall in each of the five role categories. */
export function castCategoryCounts(entries: TenGodEntry[]): Record<TenGodCategory, number> {
  const counts: Record<TenGodCategory, number> = {
    companion: 0,
    output: 0,
    wealth: 0,
    officer: 0,
    resource: 0,
  }
  for (const e of entries) counts[e.god.category]++
  return counts
}

/**
 * The classical support-or-restrain (扶抑) rule: a weak day master is helped
 * by the giving categories and drained by the spending ones; a strong day
 * master is the reverse. Near the middle the rule loses its force, so
 * balanced charts get null and the copy says so honestly.
 */
export function favorableCategories(
  strength: 'strong' | 'weak' | 'balanced',
): { favorable: TenGodCategory[]; unfavorable: TenGodCategory[] } | null {
  if (strength === 'weak') {
    return { favorable: ['resource', 'companion'], unfavorable: ['wealth', 'officer', 'output'] }
  }
  if (strength === 'strong') {
    return { favorable: ['wealth', 'officer', 'output'], unfavorable: ['resource', 'companion'] }
  }
  return null
}

export function detailedReading(chart: ChartResult, strength: 'strong' | 'weak' | 'balanced'): DetailedReadingData {
  const pillars: { label: string; pillar: Pillar | null }[] = [
    { label: 'Year', pillar: chart.yearPillar },
    { label: 'Month', pillar: chart.monthPillar },
    { label: 'Day', pillar: chart.dayPillar },
    { label: 'Hour', pillar: chart.hourPillar },
  ]
  const present = pillars.filter((p): p is { label: string; pillar: Pillar } => p.pillar !== null)

  const hiddenPillars: HiddenPillar[] = present.map(({ label, pillar }) => ({
    label,
    branch: pillar.branch.chinese,
    hidden: hiddenOf(pillar.branch.chinese),
  }))

  // Extended balance: the 8 (or 6) visible characters plus every hidden stem.
  const { counts: surface } = countElements(chart)
  const extendedCounts: Record<Element, number> = { ...surface }
  let extendedTotal = Object.values(surface).reduce((a, b) => a + b, 0)
  for (const hp of hiddenPillars) {
    for (const s of hp.hidden) {
      extendedCounts[s.element]++
      extendedTotal++
    }
  }

  const hiddenFinds = ELEMENTS.filter((e) => surface[e] === 0 && extendedCounts[e] > 0)
  const trulyMissing = ELEMENTS.filter((e) => extendedCounts[e] === 0)

  // Ten Gods for every visible stem (except the day master itself) and each
  // branch's main hidden stem.
  const dm = chart.dayMaster
  const tenGods: TenGodEntry[] = []
  for (const { label, pillar } of present) {
    if (label !== 'Day') {
      tenGods.push({
        position: `${label} stem`,
        stem: pillar.stem,
        god: tenGodOf(dm, pillar.stem),
        isHidden: false,
      })
    }
    const main = hiddenOf(pillar.branch.chinese)[0]
    tenGods.push({
      position: `${label} branch (${pillar.branch.chinese} main qi)`,
      stem: main,
      god: tenGodOf(dm, main),
      isHidden: true,
    })
  }

  // Useful god, kept deliberately simple and presented hedged in the copy:
  // a weak day master is usually helped by its resource element (with the
  // peer element as backup); a strong one by its output (with wealth as the
  // alternative); a balanced chart has no single settled answer.
  const usefulGod =
    strength === 'weak'
      ? { primary: (Object.keys(GENERATES) as Element[]).find((e) => GENERATES[e] === dm.element)!, secondary: dm.element }
      : strength === 'strong'
        ? { primary: GENERATES[dm.element], secondary: CONTROLS[dm.element] }
        : { primary: GENERATES[dm.element], secondary: null }

  return { hiddenPillars, extendedCounts, extendedTotal, hiddenFinds, trulyMissing, tenGods, usefulGod }
}
