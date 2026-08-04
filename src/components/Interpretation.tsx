import type { ChartResult } from '../lib/bazi/calculate'
import { interpretChart, ELEMENTS } from '../lib/bazi/interpret'
import type { Element } from '../lib/bazi/data'

const ELEMENT_COLORS: Record<Element, string> = {
  Wood: '#3e7c4f',
  Fire: '#a5321f',
  Earth: '#c9a227',
  Metal: '#8c8c8c',
  Water: '#12213b',
}

export default function Interpretation({ chart }: { chart: ChartResult }) {
  const reading = interpretChart(chart)
  const max = Math.max(...ELEMENTS.map((e) => reading.counts[e]), 1)

  return (
    <section className="interpretation">
      <h2>Five Element Balance</h2>
      <div className="element-bars">
        {ELEMENTS.map((e) => (
          <div className="element-row" key={e}>
            <span className="element-name">{e}</span>
            <div className="element-track">
              <div
                className={`element-fill${reading.counts[e] === 0 ? ' element-zero' : ''}`}
                style={{
                  width: `${(reading.counts[e] / max) * 100}%`,
                  background: ELEMENT_COLORS[e],
                }}
              />
            </div>
            <span className="element-count">
              {reading.counts[e]}
              {reading.counts[e] === 0 && <em> — absent</em>}
            </span>
          </div>
        ))}
      </div>
      <p className="element-note">
        Counted across the {reading.total} visible positions of your chart (
        {reading.total === 6 ? 'three pillars — birth hour unknown' : 'four pillars'}, one stem and
        one branch each).
      </p>

      <h2>Your Reading</h2>
      <div className={reading.extreme ? 'reading reading-extreme' : 'reading'}>
        {reading.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </section>
  )
}
