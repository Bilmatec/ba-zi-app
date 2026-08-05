import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { ChartResult } from '../lib/bazi/calculate'
import type { LuckTimeline } from '../lib/bazi/luck'
import {
  detailedReading,
  tenGodOf,
  castCategoryCounts,
  favorableCategories,
  HIDDEN_STEMS,
  type TenGod,
  type TenGodEntry,
  type TenGodCategory,
  type DetailedReadingData,
} from '../lib/bazi/detail'
import { interpretChart, roleOf, ELEMENTS, type Strength } from '../lib/bazi/interpret'
import { STEMS, BRANCHES, type Element } from '../lib/bazi/data'
import { annualReport, clashPartner, harmPartner, type AnnualReport } from '../lib/bazi/annual'
import { isUnlocked, unlockDetailed } from '../lib/unlock'

const ELEMENT_COLORS: Record<Element, string> = {
  Wood: '#3e7c4f',
  Fire: '#a5321f',
  Earth: '#c9a227',
  Metal: '#8c8c8c',
  Water: '#12213b',
}

const GENERATED_BY: Record<Element, Element> = {
  Fire: 'Wood',
  Earth: 'Fire',
  Metal: 'Earth',
  Water: 'Metal',
  Wood: 'Water',
}

/** Plain-English labels for the five role categories. */
const CATEGORY_LABEL: Record<TenGodCategory, string> = {
  companion: 'company (allies and rivals)',
  output: 'expression (making and creating)',
  wealth: 'opportunity (things to build and gain)',
  officer: 'pressure (demands and duty)',
  resource: 'support (learning and backing)',
}

const lower = (e: Element) => e.toLowerCase()

/** "a", "a and b", "a, b, and c" */
function listJoin(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

// --- Plain-English section leads -------------------------------------------

function hiddenLead(detail: DetailedReadingData, surface: Record<Element, number>): string {
  if (detail.hiddenFinds.length > 0) {
    const finds = detail.hiddenFinds.map(lower).join(' and ')
    const plural = detail.hiddenFinds.length > 1
    return `In plain terms: the ${finds} your chart seemed to be missing ${plural ? 'are' : 'is'} actually here — hidden, not absent. You carry ${plural ? 'them' : 'it'} as quiet reserves rather than visible strengths.`
  }
  if (detail.trulyMissing.length > 0) {
    const missing = detail.trulyMissing.map(lower).join(' and ')
    return `In plain terms: your chart travels light in ${missing} — it doesn't appear even under the surface. Nothing needs fixing about that; it simply means that when a decade or a year brings ${detail.trulyMissing.length > 1 ? 'those elements' : 'that element'} in, you'll likely feel it more vividly than most people would.`
  }
  const surfaceTop = ELEMENTS.reduce((a, b) => (surface[b] > surface[a] ? b : a))
  const extTop = ELEMENTS.reduce((a, b) =>
    detail.extendedCounts[b] > detail.extendedCounts[a] ? b : a,
  )
  return surfaceTop === extTop
    ? `In plain terms: the hidden layer mostly repeats your surface — ${lower(surfaceTop)} leads above and below. No surprises wait underneath, which is its own kind of answer.`
    : `In plain terms: under the surface your chart carries more ${lower(extTop)} than it shows — the visible chart understates it.`
}

function castLead(counts: Record<TenGodCategory, number>, total: number): string {
  const present = (Object.entries(counts) as [TenGodCategory, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
  const absent = (Object.entries(counts) as [TenGodCategory, number][])
    .filter(([, n]) => n === 0)
    .map(([c]) => CATEGORY_LABEL[c])

  const [top, ...rest] = present
  const restText = rest.length
    ? `, with ${listJoin(rest.map(([c, n]) => `${CATEGORY_LABEL[c]} ×${n}`))}`
    : ''
  const absentText = absent.length
    ? ` It carries no ${absent.join(' and no ')}. Those aren't closed doors — they're just not automatic for you: places you get to by choice, practice, or good company rather than by default.`
    : ''
  return `In plain terms: your chart's cast leans toward ${CATEGORY_LABEL[top[0]]} — ${top[1]} of its ${total} roles${restText}.${absentText}`
}

function favorableParagraph(
  strength: Strength,
  counts: Record<TenGodCategory, number>,
): string {
  const rule = favorableCategories(strength)
  if (!rule) {
    return `Your day master sits near the middle, so the classical favorable-or-unfavorable sorting loses its force — none of your roles is flatly good or bad for you. What matters more in a chart like yours is which roles each decade amplifies, and that is exactly what the next section tracks.`
  }
  const list = (cats: TenGodCategory[]) =>
    listJoin(cats.filter((c) => counts[c] > 0).map((c) => `${CATEGORY_LABEL[c]} ×${counts[c]}`))
  const favPresent = list(rule.favorable)
  const unfavPresent = list(rule.unfavorable)

  if (strength === 'weak') {
    const favPart = favPresent
      ? `In your cast, ${favPresent} ${rule.favorable.filter((c) => counts[c] > 0).length > 1 || counts[rule.favorable.find((c) => counts[c] > 0)!] > 1 ? 'are' : 'is'} where your footing comes from — lean there first.`
      : `Your cast holds none of the giving roles, which says in role language what the element balance already said: your backing comes from outside the chart — the people around you and the timing you choose.`
    const unfavPart = unfavPresent
      ? ` The rest — ${unfavPresent} — put you to work: real capability, and it spends energy rather than restores it, which is worth knowing when you plan.`
      : ''
    return `Because your day master runs weak, the classical rule of thumb is simple: giving roles feed your footing, spending roles put it to use. ${favPart}${unfavPart}`
  }

  const favPart = favPresent
    ? `Your ${favPresent} ${counts[rule.favorable.find((c) => counts[c] > 0)!] > 1 ? 'give' : 'gives'} that surplus somewhere to go.`
    : `Your cast is light on outlets, so giving your surplus somewhere deliberate to go matters more for you than for most.`
  const unfavPart = unfavPresent
    ? ` The ${unfavPresent} add support you already hold in surplus; tradition counts those the least useful part of a strong chart.`
    : ''
  return `Because your day master runs strong, more feeding is the one thing you don't need — what serves you are outlets: opportunity, pressure, and expression. ${favPart}${unfavPart}`
}

/** Which part of life each natal pillar position stands for. */
const DOMAIN: Record<string, string> = {
  'year branch': 'family, elders, and your standing in the wider world',
  'month branch': 'work and career',
  'day branch': 'yourself and your closest partner',
  'hour branch': 'children, aspirations, and the road ahead',
}

interface AnnualCopy {
  lead: string
  narrative: string
  mechanics: string
}

function buildAnnualReading(
  annual: AnnualReport,
  stemGod: TenGod,
  strength: Strength,
  timeKnown: boolean,
): AnnualCopy {
  const animal = annual.branch.animal
  const natalClash = annual.clashes.filter((c) => !c.isLuckPillar)
  const natalHarm = annual.harms.filter((c) => !c.isLuckPillar)
  const luckClash = annual.clashes.some((c) => c.isLuckPillar)
  const luckHarm = annual.harms.some((c) => c.isLuckPillar)
  const bladeActive = annual.bloodBlade.activeVia.length > 0
  const hitLocations = [...new Set([...natalClash, ...natalHarm].map((h) => h.location))]
  const domains = hitLocations.map((l) => DOMAIN[l])

  // --- Lead: which part of life the year leans into ---
  let lead: string
  if (hitLocations.length === 0 && !luckClash && !luckHarm && !bladeActive) {
    lead = `In plain terms: this ${animal} year is a quiet passage for you — nothing in it pushes against what you carry, and the steering stays in your hands.`
  } else if (hitLocations.length === 0 && (luckClash || luckHarm)) {
    lead = `In plain terms: this ${animal} year moves the backdrop more than the foreground — it ${luckClash ? 'meets the decade you are in head-on' : 'rubs gently against the decade you are in'}, so the overall weather of these years shifts while your own corners stay steady.`
  } else if (hitLocations.length === 1) {
    const hasClashHere = natalClash.length > 0
    lead = hasClashHere
      ? `In plain terms: this ${animal} year leans into ${domains[0]}. Expect real movement there — plans reshuffle, stuck things come loose, and directions can change. That makes it an important year in that corner of life, not a bad one.`
      : `In plain terms: this ${animal} year leans gently on ${domains[0]} — nothing dramatic, just a place where patience and a slower yes will serve you well.`
  } else if (hitLocations.length > 1) {
    lead = `In plain terms: this ${animal} year touches several parts of your life lightly — ${listJoin(domains)} — rather than leaning hard into one.`
  } else {
    // only the blade is active
    lead = `In plain terms: this ${animal} year passes through your chart quietly, with one practical note about physical care woven in below.`
  }

  // --- Narrative: identity + role, then lean-into / watch-for, woven ---
  const parts: string[] = []
  parts.push(
    `${annual.calendarYear} runs as ${annual.stem.chinese}${annual.branch.chinese} (${annual.stem.pinyin} ${annual.branch.pinyin} — ${annual.stem.polarity.toLowerCase()} ${annual.stem.element.toLowerCase()} over the ${animal}), and toward your day master it plays ${stemGod.english} (${stemGod.chinese}) — ${CATEGORY_LABEL[stemGod.category]}.`,
  )
  const rule = favorableCategories(strength)
  if (!rule) {
    parts.push(`With your day master near the middle, what matters more than the year's role is where the year lands.`)
  } else if (rule.favorable.includes(stemGod.category)) {
    parts.push(
      strength === 'weak'
        ? `For a lightly backed chart like yours, that makes it a giving year — one that feeds your footing, and worth asking more of.`
        : `For a well-fueled chart like yours, that makes it an outlet year — somewhere for your surplus to go. Push.`,
    )
  } else {
    parts.push(
      strength === 'weak'
        ? `For a lightly backed chart like yours, that makes it a spending year — it will put you to work, so pace the bigger pushes.`
        : `For a well-fueled chart like yours, that makes it a feeding year — more supply than you strictly need; spend it rather than store it.`,
    )
  }
  if (natalClash.length > 0) {
    const clashDomains = [...new Set(natalClash.map((c) => DOMAIN[c.location]))]
    parts.push(
      `Lean into the movement: if something around ${listJoin(clashDomains)} has felt stuck, this is a year it can come loose — changes of direction, fresh starts, and overdue decisions all come easier.`,
    )
  }
  if (natalHarm.length > 0 || luckHarm) {
    parts.push(
      `What to watch for is quieter: give commitments and the people close to you a little more patience this year. Agreements reward a second read, and a slower yes costs less than a fast one.`,
    )
  }
  if (luckClash) {
    parts.push(
      `The backdrop moves too: the year meets your current decade head-on, so expect the overall feel of these years to shift, not just one corner of them.`,
    )
  }
  if (bladeActive) {
    parts.push(
      `One practical note: ${listJoin(annual.bloodBlade.activeVia)} carr${annual.bloodBlade.activeVia.length > 1 ? 'y' : 'ies'} your chart's blood-blade marker, a traditional flag for cuts, bruises, and procedures. Nothing is foretold; it simply favors a little extra care with sharp tools, driving, and rough physical activity — and if elective surgery is ever a matter of choosing a window, this wouldn't be the one to pick first.`,
    )
  }
  if (hitLocations.length === 0 && !luckClash && !luckHarm && !bladeActive) {
    parts.push(
      `With nothing pulling at the chart, the year rewards building: the decade reading above stays the main story, and this year simply carries it along.`,
    )
  }

  // --- Mechanics: one shared block, not one per phenomenon ---
  const clashResult =
    annual.clashes.length === 0
      ? 'it meets none of them'
      : `it meets your ${listJoin(annual.clashes.map((c) => c.location))}`
  const harmResult =
    annual.harms.length === 0
      ? 'none of yours is involved'
      : `it touches your ${listJoin(annual.harms.map((c) => c.location))}`
  const bladeResult =
    annual.bloodBlade.activeVia.length === 0
      ? 'not carried by this year or your current decade'
      : `carried by ${listJoin(annual.bloodBlade.activeVia)}`
  const mechanics =
    `For anyone who wants the gears: the Ba Zi year turns at Lìchūn in early February, not on January 1${annual.beforeLichun ? " — which is why the previous year's pillar is still the one running right now" : ''}. Three checks sit behind the reading above, all against your ${timeKnown ? 'four' : 'three'} birth branches plus your current decade. Clash (冲), each branch's direct opposite — this year the ${animal} opposes the ${BRANCHES[clashPartner(annual.branch.chinese)].animal}: ${clashResult}. Harm (害), a softer pairing traditionally read as friction in bonds — this year pairing the ${animal} with the ${BRANCHES[harmPartner(annual.branch.chinese)].animal}: ${harmResult}. Blood blade (血刃), fixed for life by your birth month's branch (yours: the ${annual.bloodBlade.monthBranch.animal}, triggered by the ${annual.bloodBlade.trigger.animal}): ${bladeResult}.`

  return { lead, narrative: parts.join(' '), mechanics }
}

function decadeLead(
  stemGod: TenGod,
  branchGod: TenGod,
  counts: Record<TenGodCategory, number>,
): string {
  if (stemGod.category === branchGod.category) {
    const label = CATEGORY_LABEL[stemGod.category]
    const n = counts[stemGod.category]
    return n > 0
      ? `In plain terms: these ten years bring a double helping of ${label} — more of the very thing your chart already carries${n >= 3 ? ' most' : ''}.`
      : `In plain terms: these ten years bring ${label} into your life — a theme your chart doesn't supply on its own. The decade carries it for you, and ten years is long enough to make something lasting of it.`
  }
  return `In plain terms: these ten years bring ${CATEGORY_LABEL[stemGod.category]} and ${CATEGORY_LABEL[branchGod.category]} into your life at once.`
}

// States which way the birth season pushes the strength verdict.
function seasonPhrase(
  relation: ReturnType<typeof interpretChart>['seasonRelation'],
  monthElement: string,
  dmElement: string,
): string {
  // "an earth month" but "a fire month".
  const inMonth = `born in ${/^[aeiou]/.test(monthElement) ? 'an' : 'a'} ${monthElement} month`
  switch (relation) {
    case 'same':
      return `The season helps too: ${inMonth}, your own element holds the season.`
    case 'feeds':
      return `The season helps too: ${inMonth}, the season feeds ${dmElement}.`
    case 'drains':
      return `The season leans the other way: ${inMonth}, the season draws on ${dmElement}.`
    case 'opposes':
      return `The season leans the other way: ${inMonth}, the season pushes against ${dmElement}.`
    case 'yields':
      return `The season sits roughly neutral: ${inMonth}, ${dmElement} controls the season, though holding that ground costs effort.`
  }
}

// The decade's two characters join the lifelong cast for ten years. The app
// knows whether their roles repeat existing cast members or bring something
// new, so the copy states the applicable case instead of describing both.
function decadeCastSentence(
  stemGod: TenGod,
  branchGod: TenGod,
  cast: TenGodEntry[],
): string {
  const countOf = (god: TenGod) => cast.filter((t) => t.god.chinese === god.chinese).length
  const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`)

  if (stemGod.chinese === branchGod.chinese) {
    const n = countOf(stemGod)
    return n > 0
      ? `Both guests play ${stemGod.english} (${stemGod.chinese}) — a role your birth chart already casts ${times(n)}. These ten years don't introduce a new theme; they turn that one up louder.`
      : `Both guests play ${stemGod.english} (${stemGod.chinese}) — ${stemGod.meaning}. Your birth chart doesn't otherwise cast this role, so for these ten years it is a genuinely new voice.`
  }

  const describe = (god: TenGod, source: string) => {
    const n = countOf(god)
    return n > 0
      ? `its ${source} plays ${god.english} (${god.chinese}), a role already in your lifelong cast`
      : `its ${source} plays ${god.english} (${god.chinese}) — ${god.meaning} — a role your birth chart doesn't otherwise carry`
  }
  return `${describe(stemGod, 'stem')[0].toUpperCase()}${describe(stemGod, 'stem').slice(1)}, and ${describe(branchGod, "branch's main qi")}.`
}

function hiddenListFor(branchChar: string): string {
  const stems = (HIDDEN_STEMS[branchChar] ?? []).map((c) => STEMS[c])
  return stems
    .map((s) => `${s.chinese} (${s.polarity.toLowerCase()} ${s.element.toLowerCase()})`)
    .join(', ')
}

function roleLabel(role: ReturnType<typeof roleOf>): string {
  switch (role) {
    case 'peer':
      return 'own element'
    case 'resource':
      return 'resource — the element that feeds you'
    case 'output':
      return 'output — the element you produce'
    case 'wealth':
      return 'wealth — the element you act on'
    case 'pressure':
      return 'pressure — the element that pushes on you'
  }
}

export default function DetailedReading({
  chart,
  luck,
  user,
}: {
  chart: ChartResult
  luck: LuckTimeline
  user: User | null
}) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const unlocked = isUnlocked(user)

  const reading = interpretChart(chart)
  const detail = detailedReading(chart, reading.strength)
  const dm = chart.dayMaster

  const extMax = Math.max(...ELEMENTS.map((e) => detail.extendedCounts[e]), 1)
  const surfaceSupporters =
    reading.counts[dm.element] + reading.counts[GENERATED_BY[dm.element]]
  const extendedSupporters =
    detail.extendedCounts[dm.element] + detail.extendedCounts[GENERATED_BY[dm.element]]

  const categoryCounts = castCategoryCounts(detail.tenGods)
  const annual = annualReport(chart, luck)
  const annualCopy = buildAnnualReading(
    annual,
    tenGodOf(dm, annual.stem),
    reading.strength,
    chart.timeKnown,
  )
  const current = luck.currentIndex >= 0 ? luck.periods[luck.currentIndex] : null
  const currentStemGod = current ? tenGodOf(dm, current.stem) : null
  const currentBranchGod = current
    ? tenGodOf(dm, STEMS[HIDDEN_STEMS[current.branch.chinese][0]])
    : null

  async function upgrade() {
    setMessage('')
    if (!user) {
      setMessage('Create a free account or log in above first — the unlock is tied to your account.')
      return
    }
    setBusy(true)
    try {
      await unlockDetailed()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const content = (
    <div className="detail-content">
      <h2>Detailed Interpretation</h2>

      <h3>Inside the branches: hidden stems</h3>
      <p className="section-lead">{hiddenLead(detail, reading.counts)}</p>
      <p>
        How this works: every branch carries one to three hidden stems — elements working under
        the surface that the free balance doesn&apos;t count. The first stem listed in each branch
        is its <em>main qi</em>, the branch&apos;s strongest voice; any others speak more quietly.
      </p>
      <div className="hidden-grid">
        {detail.hiddenPillars.map((hp) => (
          <div className="hidden-card" key={hp.label}>
            <div className="hidden-label">
              {hp.label} · {hp.branch}
            </div>
            <div className="hidden-stems">
              {hp.hidden.map((s, i) => (
                <span className="hidden-stem" key={i}>
                  {s.chinese} <em>{s.pinyin} · {s.polarity.toLowerCase()} {lower(s.element)}</em>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {detail.hiddenFinds.length > 0 && (
        <p className="hidden-find">
          {detail.hiddenFinds
            .map((e) => {
              const holders = detail.hiddenPillars
                .filter((hp) => hp.hidden.some((s) => s.element === e))
                .map((hp) => `${hp.label.toLowerCase()} branch`)
              return `${e} shows nowhere on your chart's surface, but it is not gone: it hides in your ${holders.join(' and ')}.`
            })
            .join(' ')}{' '}
          A hidden element is quieter than a visible one, but it counts — reserves you can reach,
          even if they don&apos;t show.
        </p>
      )}

      <div className="element-bars">
        {ELEMENTS.map((e) => (
          <div className="element-row" key={e}>
            <span className="element-name">{e}</span>
            <div className="element-track">
              <div
                className="element-fill"
                style={{
                  width: `${(detail.extendedCounts[e] / extMax) * 100}%`,
                  background: ELEMENT_COLORS[e],
                }}
              />
            </div>
            <span className="element-count">{detail.extendedCounts[e]}</span>
          </div>
        ))}
      </div>
      <p className="element-note">
        The full balance: all {detail.extendedTotal} characters, hidden stems included, each
        counted once.
      </p>
      <p>
        This is also where your day master&apos;s strength shows its work. On the surface,{' '}
        {surfaceSupporters} of your {reading.total} visible positions match or feed {lower(dm.element)}.
        Counting the hidden stems, it&apos;s {extendedSupporters} of {detail.extendedTotal}.{' '}
        {seasonPhrase(reading.seasonRelation, lower(chart.monthPillar.branch.element), lower(dm.element))}{' '}
        The count and the season together are how the reading arrives at &ldquo;
        {reading.strength}&rdquo;.
      </p>

      <h3>The Ten Gods: who everyone is to you</h3>
      <p className="section-lead">{castLead(categoryCounts, detail.tenGods.length)}</p>
      <p>{favorableParagraph(reading.strength, categoryCounts)}</p>
      <p>
        How this works: every character in your chart plays one of ten classical roles relative to
        your day master — the Ten Gods. Ten roles exist; your chart casts only some of them, and
        repetition is part of the reading. These roles come from your birth chart, so they are
        lifelong — they do not change as the decades turn. The full cast, role by role:
      </p>
      <ul className="tengod-list">
        {detail.tenGods.map((t, i) => (
          <li key={i}>
            <span className="tengod-pos">{t.position}</span>
            <span className="tengod-stem">
              {t.stem.chinese} {t.stem.pinyin}
            </span>
            <span className="tengod-name">
              {t.god.english} <em>({t.god.chinese})</em>
            </span>
            <span className="tengod-meaning">{t.god.meaning}</span>
          </li>
        ))}
      </ul>

      <h3>What your chart most welcomes</h3>
      <p>
        {reading.strength === 'weak'
          ? `With a lightly supported day master, the element most often considered helpful for a chart like yours is ${lower(detail.usefulGod.primary)} — the one that feeds ${lower(dm.element)} — with ${lower(detail.usefulGod.secondary!)} itself as the natural second. `
          : reading.strength === 'strong'
            ? `With a well-supported day master, charts like yours are usually read as welcoming an outlet more than more fuel: ${lower(detail.usefulGod.primary)}, the element you produce, and ${lower(detail.usefulGod.secondary!)}, the element you act on, are the ones most often named. `
            : `Sitting near the middle, your chart has no single settled answer here — which element helps most shifts with the decade you are in. If pressed, tradition usually points first at ${lower(detail.usefulGod.primary)}, the element that feeds you. `}
        Picking one &ldquo;useful god&rdquo; is the part of Ba Zi that is most art and least
        arithmetic: schools weigh it differently, and a full consultation would look deeper than
        any calculator. Treat this as a well-grounded starting point, not a prescription.
      </p>

      {current && currentStemGod && currentBranchGod && (
        <>
          <h3>Your current decade, in depth</h3>
          <p className="section-lead">
            {decadeLead(currentStemGod, currentBranchGod, categoryCounts)}
          </p>
          <p>
            {`The mechanics: your ${current.stem.pinyin} ${current.branch.pinyin} pillar (${current.startYear}–${current.endYear}) has a visible stem, ${current.stem.chinese}, which is ${lower(current.stem.element)} — your ${roleLabel(roleOf(dm.element, current.stem.element))} — and a branch, ${current.branch.chinese}, carrying ${lower(current.branch.element)} on the surface with ${hiddenListFor(current.branch.chinese)} underneath. `}
            {decadeCastSentence(currentStemGod, currentBranchGod, detail.tenGods)}{' '}
            {current.guiRen
              ? `Gui ren also sits in this branch — in these years, the helpful-people signal is not an abstraction; it names the decade you are in.`
              : `The decade carries no gui ren marker, so its gifts route through your own effort more than through patrons.`}
          </p>
        </>
      )}

      <h3>This year</h3>
      <p className="section-lead">{annualCopy.lead}</p>
      <p>{annualCopy.narrative}</p>
      <p className="element-note">{annualCopy.mechanics}</p>
    </div>
  )

  return (
    <section className="detail">
      {unlocked ? (
        content
      ) : (
        <div className="paywall">
          <div className="paywall-blur" aria-hidden="true">
            {content}
          </div>
          <div className="paywall-overlay">
            <div className="lock-badge">🔒</div>
            <p className="paywall-line">
              To unlock the full interpretation of your reading, please upgrade your account.
            </p>
            <button type="button" className="unlock-btn" onClick={upgrade} disabled={busy}>
              {busy ? 'Unlocking…' : 'Upgrade to unlock →'}
            </button>
            {message && <p className="paywall-message">{message}</p>}
          </div>
        </div>
      )}
    </section>
  )
}
