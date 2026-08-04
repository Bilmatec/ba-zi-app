import type { ChartResult } from '../lib/bazi/calculate'
import type { LuckTimeline, LuckPeriod } from '../lib/bazi/luck'
import { interpretChart, type Strength } from '../lib/bazi/interpret'

const RESOURCE_LABEL: Record<LuckPeriod['resource'], string> = {
  rich: 'Resource-rich',
  mixed: 'Mixed supply',
  scarce: 'Resource-scarce',
}

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

function currentPeriodCopy(p: LuckPeriod, strength: Strength, pinyin: string): string {
  const opening = `Right now you are in your ${ordinal(p.index)} pillar, ${pinyin}, running about age ${p.startAge} to ${p.startAge + 9} (${p.startYear}–${p.endYear}).`

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
  const current = luck.currentIndex >= 0 ? luck.periods[luck.currentIndex] : null

  return (
    <section className="luck">
      <h2>Your Luck Pillars</h2>
      <p className="luck-intro">
        Life runs in ten-year chapters, each colored by one pillar. Yours move{' '}
        {luck.forward ? 'forward' : 'backward'} through the cycle and begin {startAgeText(luck)}.
        Each chapter is a resource level to work with, not a verdict.
      </p>
      {!chart.timeKnown && (
        <p className="luck-note">
          Birth hour unknown: start ages here can be off by up to a few months.
        </p>
      )}

      <div className="luck-strip" role="list">
        {luck.periods.map((p, i) => (
          <div
            role="listitem"
            key={p.index}
            className={`luck-card${i === luck.currentIndex ? ' luck-current' : ''}`}
          >
            {i === luck.currentIndex && <span className="luck-now">Now</span>}
            <div className="luck-age">
              Age {p.startAge}–{p.startAge + 9}
            </div>
            <div className="luck-years">
              {p.startYear}–{p.endYear}
            </div>
            <div className="luck-glyphs">
              {p.stem.chinese}
              {p.branch.chinese}
            </div>
            <div className="luck-elements">
              {p.stem.element} · {p.branch.element}
            </div>
            <div className={`luck-resource luck-resource-${p.resource}`}>
              {RESOURCE_LABEL[p.resource]}
            </div>
            {p.guiRen && <div className="luck-guiren">✦ helpful people</div>}
          </div>
        ))}
      </div>

      {current ? (
        <div className="luck-reading">
          <p>
            {currentPeriodCopy(
              current,
              strength,
              `${current.stem.pinyin} ${current.branch.pinyin}`,
            )}
          </p>
        </div>
      ) : (
        <div className="luck-reading">
          <p>
            You have not yet entered your first pillar — these chapters begin at age{' '}
            {luck.startAgeYears}. Until then, the birth chart above is the whole picture.
          </p>
        </div>
      )}
    </section>
  )
}
