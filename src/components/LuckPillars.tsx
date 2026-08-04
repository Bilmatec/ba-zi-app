import { useEffect, useState } from 'react'
import type { ChartResult } from '../lib/bazi/calculate'
import type { LuckTimeline, LuckPeriod } from '../lib/bazi/luck'
import { interpretChart, type Strength } from '../lib/bazi/interpret'

const RESOURCE_LABEL: Record<LuckPeriod['resource'], string> = {
  rich: 'Resource-rich',
  mixed: 'Mixed supply',
  scarce: 'Resource-scarce',
}

type Tense = 'past' | 'current' | 'future'

function ordinal(n: number): string {
  const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
  return `${n}${suffix}`
}

function startAgeText(luck: LuckTimeline): string {
  const y = luck.startAgeYears
  const m = luck.startAgeMonths
  const parts: string[] = []
  if (y > 0) parts.push(`${y} ${y === 1 ? 'year' : 'years'}`)
  if (m > 0) parts.push(`${m} ${m === 1 ? 'month' : 'months'}`)
  if (parts.length === 0) return 'at birth'
  return `at age ${parts.join(' and ')}`
}

function periodCopy(p: LuckPeriod, strength: Strength, tense: Tense): string {
  const pinyin = `${p.stem.pinyin} ${p.branch.pinyin}`
  const span = `age ${p.startAge} to ${p.startAge + 9} (${p.startYear}–${p.endYear})`

  if (tense === 'past') {
    const opening = `Your ${ordinal(p.index)} pillar, ${pinyin}, ran from about ${span}.`
    const resourceLine =
      p.resource === 'rich'
        ? `Both of its characters fed your element — a resource-rich stretch, years when support came easier.`
        : p.resource === 'scarce'
          ? `Neither of its characters fed your element — a resource-scarce stretch, years that likely asked you to run lean.`
          : `One of its characters fed your element and one drew on it — a mixed stretch, with supply coming and going.`
    const guiRenLine = p.guiRen
      ? ` Gui ren sat in this pillar: help arriving through other people was part of those years' pattern.`
      : ''
    return `${opening} ${resourceLine}${guiRenLine}`
  }

  const opening =
    tense === 'current'
      ? `Right now you are in your ${ordinal(p.index)} pillar, ${pinyin}, running about ${span}.`
      : `Your ${ordinal(p.index)} pillar, ${pinyin}, arrives around age ${p.startAge} and runs to about age ${p.startAge + 9} (${p.startYear}–${p.endYear}).`

  let resourceLine: string
  if (p.resource === 'rich') {
    resourceLine =
      strength === 'weak'
        ? `Both of its characters feed your element, so supply runs toward you in these years. For a lightly backed day master like yours, that is traction: a stretch for starting things and for asking for more.`
        : strength === 'strong'
          ? `Both of its characters feed your element. You already carry plenty, so this chapter reads as surplus; the question is where you choose to spend it.`
          : `Both of its characters feed your element, so more arrives than drains in these years. The balance tips your way.`
  } else if (p.resource === 'scarce') {
    resourceLine =
      strength === 'weak'
        ? `Neither of its characters feeds your element, so little arrives on its own in these years. Conserve, choose your efforts with care, and let the people who back you carry part of the load.`
        : strength === 'strong'
          ? `Neither of its characters feeds your element, but you carry your own fuel, so lean supply costs you less than it would most. These read as working years: output over intake.`
          : `Neither of its characters feeds your element, so less arrives than drains in these years. Budget your energy accordingly.`
  } else {
    resourceLine = `One of its two characters feeds your element and the other draws on it, so supply comes and goes in these years. Timing matters more than volume.`
  }

  const guiRenLine = p.guiRen
    ? `This pillar also carries gui ren, the helpful-people signal: doors tend to open through others in these years, so ask.`
    : `This pillar carries no gui ren marker, so count on your own footing first and treat help that arrives as a bonus.`

  return `${opening} ${resourceLine} ${guiRenLine}`
}

export default function LuckPillars({
  chart,
  luck,
}: {
  chart: ChartResult
  luck: LuckTimeline
}) {
  const strength = interpretChart(chart).strength
  const defaultIndex = luck.currentIndex >= 0 ? luck.currentIndex : 0
  const [selected, setSelected] = useState(defaultIndex)

  // A new calculation replaces the timeline — snap back to its own "now".
  useEffect(() => {
    setSelected(defaultIndex)
  }, [luck, defaultIndex])

  const p = luck.periods[selected]
  const tense: Tense =
    selected === luck.currentIndex
      ? 'current'
      : luck.currentIndex >= 0 && selected < luck.currentIndex
        ? 'past'
        : 'future'

  return (
    <section className="luck">
      <h2>Your Luck Pillars</h2>
      <p className="luck-intro">
        Life runs in ten-year chapters, each colored by one pillar. Yours move{' '}
        {luck.forward ? 'forward' : 'backward'} through the cycle and begin {startAgeText(luck)}.
        Each chapter is a resource level to work with, not a verdict. Click any pillar to read that
        chapter.
      </p>
      {!chart.timeKnown && (
        <p className="luck-note">
          Birth hour unknown: start ages here can be off by up to a few months.
        </p>
      )}

      <div className="luck-strip" role="tablist" aria-label="Luck pillar decades">
        {luck.periods.map((period, i) => (
          <button
            type="button"
            role="tab"
            aria-selected={i === selected}
            key={period.index}
            className={[
              'luck-card',
              i === luck.currentIndex ? 'luck-current' : '',
              i === selected ? 'luck-selected' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => setSelected(i)}
          >
            {i === luck.currentIndex && <span className="luck-now">Now</span>}
            <span className="luck-age">
              Age {period.startAge}–{period.startAge + 9}
            </span>
            <span className="luck-years">
              {period.startYear}–{period.endYear}
            </span>
            <span className="luck-glyphs">
              {period.stem.chinese}
              {period.branch.chinese}
            </span>
            <span className="luck-elements">
              {period.stem.element} · {period.branch.element}
            </span>
            <span className={`luck-resource luck-resource-${period.resource}`}>
              {RESOURCE_LABEL[period.resource]}
            </span>
            {period.guiRen && <span className="luck-guiren">✦ helpful people</span>}
          </button>
        ))}
      </div>

      {luck.currentIndex < 0 && (
        <p className="luck-note">
          You have not yet entered your first pillar — these chapters begin {startAgeText(luck)}.
          Until then, the birth chart above is the whole picture.
        </p>
      )}

      <div className="luck-reading">
        <p>{periodCopy(p, strength, tense)}</p>
      </div>
    </section>
  )
}
