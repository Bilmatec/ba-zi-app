import { useEffect, useState } from 'react'
import type { ChartResult } from '../lib/bazi/calculate'
import type { LuckTimeline, LuckPeriod } from '../lib/bazi/luck'
import { interpretChart, roleOf, type Strength, type ElementRole } from '../lib/bazi/interpret'
import type { Element } from '../lib/bazi/data'

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

// One short clause per element role, present and past tense. These are what
// make each decade read differently: the same "resource-scarce" level lands
// differently when the years run on the element you act on versus the element
// that presses on you.
const ROLE_CLAUSE: Record<ElementRole, { present: string; past: string }> = {
  peer: {
    present: 'your own element, bringing peers and competition onto your ground',
    past: 'your own element, crowding those years with peers and competition',
  },
  resource: {
    present: 'the element that feeds you',
    past: 'the element that fed you',
  },
  output: {
    present: 'the element you produce, which draws work and expression out of you',
    past: 'the element you produce, which drew plenty out of you',
  },
  wealth: {
    present: 'the element you act on, where effort turns into results',
    past: 'the element you act on, so what those years gave, they gave for effort',
  },
  pressure: {
    present: 'the element that presses on you, setting structure and demands',
    past: 'the element that pressed on you with structure and demands',
  },
}

function elementFlavor(p: LuckPeriod, dayMaster: Element, tense: Tense): string {
  const t = tense === 'past' ? 'past' : 'present'
  const a = p.stem.element
  const b = p.branch.element
  const lower = (e: Element) => e.toLowerCase()
  if (a === b) {
    const clause = ROLE_CLAUSE[roleOf(dayMaster, a)][t]
    return tense === 'past'
      ? `Both of its characters were ${lower(a)} — ${clause}.`
      : `Both of its characters are ${lower(a)} — ${clause}.`
  }
  const clauseA = ROLE_CLAUSE[roleOf(dayMaster, a)][t]
  const clauseB = ROLE_CLAUSE[roleOf(dayMaster, b)][t]
  return tense === 'past'
    ? `In it, ${lower(a)} was ${clauseA}, and ${lower(b)} was ${clauseB}.`
    : `In it, ${lower(a)} is ${clauseA}, and ${lower(b)} is ${clauseB}.`
}

function periodCopy(
  p: LuckPeriod,
  strength: Strength,
  tense: Tense,
  dayMaster: Element,
): string {
  const pinyin = `${p.stem.pinyin} ${p.branch.pinyin}`
  const span = `age ${p.startAge} to ${p.startAge + 9} (${p.startYear}–${p.endYear})`
  const flavor = elementFlavor(p, dayMaster, tense)

  if (tense === 'past') {
    const opening = `Your ${ordinal(p.index)} pillar, ${pinyin}, ran from about ${span}.`
    const resourceLine =
      p.resource === 'rich'
        ? `A resource-rich stretch, years when support came easier.`
        : p.resource === 'scarce'
          ? `A resource-scarce stretch, years that likely asked you to run lean.`
          : `A mixed stretch, with supply coming and going.`
    const guiRenLine = p.guiRen
      ? ` Gui ren sat in this pillar: help arriving through other people was part of those years' pattern.`
      : ''
    return `${opening} ${flavor} ${resourceLine}${guiRenLine}`
  }

  const opening =
    tense === 'current'
      ? `Right now you are in your ${ordinal(p.index)} pillar, ${pinyin}, running about ${span}.`
      : `Your ${ordinal(p.index)} pillar, ${pinyin}, arrives around age ${p.startAge} and runs to about age ${p.startAge + 9} (${p.startYear}–${p.endYear}).`

  let resourceLine: string
  if (p.resource === 'rich') {
    resourceLine =
      strength === 'weak'
        ? `Supply runs toward you in these years. For a lightly backed day master like yours, that is traction: a stretch for starting things and for asking for more.`
        : strength === 'strong'
          ? `You already carry plenty, so this chapter reads as surplus; the question is where you choose to spend it.`
          : `More arrives than drains in these years; the balance tips your way.`
  } else if (p.resource === 'scarce') {
    resourceLine =
      strength === 'weak'
        ? `Little arrives on its own in these years. Conserve, choose your efforts with care, and let the people who back you carry part of the load.`
        : strength === 'strong'
          ? `You carry your own fuel, so lean supply costs you less than it would most. These read as working years: output over intake.`
          : `Less arrives than drains in these years. Budget your energy accordingly.`
  } else {
    resourceLine = `Supply comes and goes in these years. Timing matters more than volume.`
  }

  const guiRenLine = p.guiRen
    ? `This pillar also carries gui ren, the helpful-people signal: doors tend to open through others in these years, so ask.`
    : `This pillar carries no gui ren marker, so count on your own footing first and treat help that arrives as a bonus.`

  return `${opening} ${flavor} ${resourceLine} ${guiRenLine}`
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
        <p>{periodCopy(p, strength, tense, chart.dayMaster.element)}</p>
      </div>
    </section>
  )
}
