import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { ChartResult } from '../lib/bazi/calculate'
import type { LuckTimeline } from '../lib/bazi/luck'
import { detailedReading, tenGodOf, HIDDEN_STEMS } from '../lib/bazi/detail'
import { interpretChart, roleOf, ELEMENTS } from '../lib/bazi/interpret'
import { STEMS, type Element } from '../lib/bazi/data'
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
  const lower = (e: Element) => e.toLowerCase()

  const extMax = Math.max(...ELEMENTS.map((e) => detail.extendedCounts[e]), 1)
  const surfaceSupporters =
    reading.counts[dm.element] + reading.counts[GENERATED_BY[dm.element]]
  const extendedSupporters =
    detail.extendedCounts[dm.element] + detail.extendedCounts[GENERATED_BY[dm.element]]

  const current = luck.currentIndex >= 0 ? luck.periods[luck.currentIndex] : null

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
      <p>
        Every branch carries one to three hidden stems — elements working under the surface that
        the free balance doesn&apos;t count. Here is what yours are holding:
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
      {detail.trulyMissing.length > 0 && (
        <p className="hidden-find">
          Even counting every hidden stem, {detail.trulyMissing.map(lower).join(' and ')}{' '}
          {detail.trulyMissing.length === 1 ? 'does' : 'do'} not appear in your chart at all. That
          absence is structural, and decades or years that bring it will land noticeably.
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
        Counting the hidden stems, it&apos;s {extendedSupporters} of {detail.extendedTotal}. The
        season ({lower(chart.monthPillar.branch.element)} month) weighs in on top of the count,
        which is how the reading arrives at &ldquo;{reading.strength}&rdquo;.
      </p>

      <h3>The Ten Gods: who everyone is to you</h3>
      <p>
        Each character in your chart plays one of ten classical roles relative to your day master
        — the Ten Gods. Ten roles exist; your chart casts only some of them, and repetition is
        part of the reading. These roles come from your birth chart, so they are lifelong — they
        do not change as the decades turn. The visible stems set the stage; the main hidden stem
        of each branch works underneath.
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

      {current && (
        <>
          <h3>Your current decade, in depth</h3>
          <p>
            {`Your ${current.stem.pinyin} ${current.branch.pinyin} pillar (${current.startYear}–${current.endYear}) breaks down like this: the visible stem ${current.stem.chinese} is ${lower(current.stem.element)}, your ${roleLabel(roleOf(dm.element, current.stem.element))}; the branch ${current.branch.chinese} carries ${lower(current.branch.element)} on the surface, and hides ${hiddenListFor(current.branch.chinese)} underneath. `}
            {`The decade also takes a seat in your cast: its stem plays ${tenGodOf(dm, current.stem).english} (${tenGodOf(dm, current.stem).chinese}) and its branch's main qi plays ${tenGodOf(dm, STEMS[HIDDEN_STEMS[current.branch.chinese][0]]).english} (${tenGodOf(dm, STEMS[HIDDEN_STEMS[current.branch.chinese][0]]).chinese}) — guest roles that sit alongside the lifelong ones above for these ten years, reinforcing them where they repeat and adding what your birth chart lacks where they don't. `}
            {current.guiRen
              ? `Gui ren also sits in this branch — in these years, the helpful-people signal is not an abstraction; it names the decade you are in.`
              : `The decade carries no gui ren marker, so its gifts route through your own effort more than through patrons.`}
          </p>
        </>
      )}
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
