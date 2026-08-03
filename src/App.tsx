import { useEffect, useRef, useState } from 'react'
import { calculateChart, type ChartResult, type Pillar } from './lib/bazi/calculate'
import { searchPlaces, placeLabel, type PlaceResult } from './lib/geo'
import './App.css'

function PillarCard({ label, pillar }: { label: string; pillar: Pillar | null }) {
  if (!pillar) {
    return (
      <div className="pillar-card pillar-unknown">
        <div className="pillar-label">{label}</div>
        <div className="pillar-unknown-text">
          Unknown
          <span>birth time not provided</span>
        </div>
      </div>
    )
  }
  return (
    <div className="pillar-card">
      <div className="pillar-label">{label}</div>
      <div className="pillar-char">{pillar.stem.chinese}</div>
      <div className="pillar-detail">
        {pillar.stem.pinyin} · {pillar.stem.polarity} {pillar.stem.element}
      </div>
      <hr />
      <div className="pillar-char">{pillar.branch.chinese}</div>
      <div className="pillar-detail">
        {pillar.branch.pinyin} · {pillar.branch.animal} · {pillar.branch.polarity}{' '}
        {pillar.branch.element}
      </div>
    </div>
  )
}

function ChartView({ chart }: { chart: ChartResult }) {
  const { meta } = chart
  const offsetHours = meta.offsetMinutes / 60
  const dstNote =
    meta.dstAdjustmentMinutes > 0
      ? `Daylight saving time was in effect at birth — the time was corrected back to standard time (−${meta.dstAdjustmentMinutes} min) before calculating.`
      : 'No daylight saving adjustment was needed for this birth time.'

  return (
    <section className="chart">
      <h2>Four Pillars Chart</h2>
      <div className="pillar-grid">
        <PillarCard label="Year" pillar={chart.yearPillar} />
        <PillarCard label="Month" pillar={chart.monthPillar} />
        <PillarCard label="Day" pillar={chart.dayPillar} />
        <PillarCard label="Hour" pillar={chart.hourPillar} />
      </div>

      <div className="day-master">
        <h3>Day Master</h3>
        <p>
          <span className="dm-char">{chart.dayMaster.chinese}</span>
          <strong>
            {chart.dayMaster.pinyin} — {chart.dayMaster.polarity} {chart.dayMaster.element}
          </strong>
        </p>
        <p className="dm-explain">
          The Day Master is the stem of your Day Pillar — the element that represents you in the
          chart. Everything else in a reading is weighed relative to it.
        </p>
      </div>

      <details className="calc-details">
        <summary>How this was calculated</summary>
        <ul>
          <li>
            Entered time: {meta.wallClock.replace('T', ' ').slice(0, 16)} in {meta.timeZone} (UTC
            {offsetHours >= 0 ? '+' : ''}
            {offsetHours})
          </li>
          <li>{dstNote}</li>
          {!chart.timeKnown && (
            <li>
              Birth time unknown: the Hour Pillar is omitted rather than guessed. The other three
              pillars are computed from the date alone.
            </li>
          )}
          <li>
            Year and month pillars change at solar term boundaries; day and hour pillars follow the
            local standard clock. No true-solar-time adjustment (standard-time convention).
          </li>
        </ul>
      </details>
    </section>
  )
}

export default function App() {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [gender, setGender] = useState<'male' | 'female' | ''>('')

  const [placeQuery, setPlaceQuery] = useState('')
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([])
  const [place, setPlace] = useState<PlaceResult | null>(null)
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef<number | undefined>(undefined)

  const [chart, setChart] = useState<ChartResult | null>(null)
  const [error, setError] = useState('')

  // Debounced city search: wait until typing pauses, then query.
  useEffect(() => {
    window.clearTimeout(searchTimer.current)
    if (place && placeQuery === placeLabel(place)) return
    if (placeQuery.trim().length < 2) {
      setPlaceResults([])
      return
    }
    searchTimer.current = window.setTimeout(async () => {
      setSearching(true)
      try {
        setPlaceResults(await searchPlaces(placeQuery.trim()))
      } catch {
        setPlaceResults([])
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => window.clearTimeout(searchTimer.current)
  }, [placeQuery, place])

  function choosePlace(p: PlaceResult) {
    setPlace(p)
    setPlaceQuery(placeLabel(p))
    setPlaceResults([])
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setChart(null)

    if (!date) return setError('Please enter your birth date.')
    if (!timeUnknown && !time) {
      return setError('Please enter your birth time, or tick "I don\'t know my birth time".')
    }
    if (!place) return setError('Please search for and select your birth city.')
    if (!gender) return setError('Please select a gender (used for the Luck Pillars timeline).')

    const [y, m, d] = date.split('-').map(Number)
    const [hh, mm] = timeUnknown ? [undefined, undefined] : time.split(':').map(Number)

    try {
      setChart(
        calculateChart({
          year: y,
          month: m,
          day: d,
          hour: hh,
          minute: mm,
          timeZone: place.timezone,
          gender,
        }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong calculating the chart.')
    }
  }

  return (
    <main className="app">
      <h1>Ba Zi — Four Pillars Chart</h1>
      <p className="tagline">
        Enter your birth details to calculate your Four Pillars of Destiny chart.
      </p>

      <form onSubmit={onSubmit} className="birth-form">
        <label>
          Birth date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <label>
          Birth time
          <input
            type="time"
            value={time}
            disabled={timeUnknown}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={timeUnknown}
            onChange={(e) => setTimeUnknown(e.target.checked)}
          />
          I don&apos;t know my birth time
        </label>

        <label className="place-field">
          Birth city
          <input
            type="text"
            placeholder="Start typing a city name…"
            value={placeQuery}
            onChange={(e) => {
              setPlaceQuery(e.target.value)
              setPlace(null)
            }}
          />
          {searching && <div className="place-hint">Searching…</div>}
          {placeResults.length > 0 && (
            <ul className="place-results">
              {placeResults.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => choosePlace(p)}>
                    {placeLabel(p)}
                    <span className="place-tz">{p.timezone}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {place && (
            <div className="place-hint place-chosen">
              Time zone: <strong>{place.timezone}</strong>
            </div>
          )}
        </label>

        <label>
          Gender
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as 'male' | 'female' | '')}
          >
            <option value="">Select…</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>

        <button type="submit" className="submit">
          Calculate my chart
        </button>

        {error && <div className="error">{error}</div>}
      </form>

      {chart && <ChartView chart={chart} />}
    </main>
  )
}
