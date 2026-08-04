import { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  calculateChart,
  type BirthInput,
  type ChartResult,
  type Pillar,
} from './lib/bazi/calculate'
import { searchPlaces, placeLabel, type PlaceResult } from './lib/geo'
import { calculateLuck, type LuckTimeline } from './lib/bazi/luck'
import { supabase } from './lib/supabase'
import { saveChart, type SavedChartRow } from './lib/charts-store'
import LuckPillars from './components/LuckPillars'
import AuthPanel from './components/AuthPanel'
import SavedCharts from './components/SavedCharts'
import Interpretation from './components/Interpretation'
import stillLifeImg from './assets/props-stilllife.png'
import portraitImg from './assets/portrait-candid.png'
import './App.css'

type SavableInput = BirthInput & { placeLabel: string }

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

function SaveChartBox({
  input,
  onSaved,
}: {
  input: SavableInput
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      await saveChart(name.trim() || 'Untitled chart', input)
      setMessage('Saved!')
      setName('')
      onSaved()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save the chart.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="save-box" onSubmit={submit}>
      <input
        type="text"
        placeholder="Name this chart (e.g. Mine, Mum, 1990 test)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" className="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save this chart'}
      </button>
      {message && <span className="auth-note">{message}</span>}
    </form>
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
  const [luck, setLuck] = useState<LuckTimeline | null>(null)
  const [lastInput, setLastInput] = useState<SavableInput | null>(null)
  const [openedName, setOpenedName] = useState('')
  const [error, setError] = useState('')

  const [user, setUser] = useState<User | null>(null)
  const [savedRefresh, setSavedRefresh] = useState(0)

  // Track login state.
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      // Don't carry a "Viewing saved chart" label across a login change.
      if (!session) setOpenedName('')
    })
    return () => sub.subscription.unsubscribe()
  }, [])

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

  function runCalculation(input: SavableInput, sourceName = '') {
    try {
      const result = calculateChart(input)
      setChart(result)
      setLuck(calculateLuck(input, result))
      setLastInput(input)
      setOpenedName(sourceName)
      setError('')
    } catch (err) {
      setChart(null)
      setLuck(null)
      setError(err instanceof Error ? err.message : 'Something went wrong calculating the chart.')
    }
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
    if (!gender) {
      return setError('Please select your birth gender (used for the Luck Pillars timeline).')
    }

    const [y, m, d] = date.split('-').map(Number)
    const [hh, mm] = timeUnknown ? [undefined, undefined] : time.split(':').map(Number)

    runCalculation({
      year: y,
      month: m,
      day: d,
      hour: hh,
      minute: mm,
      timeZone: place.timezone,
      gender,
      placeLabel: placeLabel(place),
    })
  }

  function openSaved(row: SavedChartRow) {
    runCalculation(row.input, row.chart_name)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="app">
      <nav className="topbar">
        <span className="wordmark">Ba Zi · Four Pillars</span>
        <AuthPanel user={user} />
      </nav>

      <header className="hero">
        <img className="hero-bg" src={stillLifeImg} alt="" />
        <div className="hero-inner">
          <div className="hero-text">
            <span className="eyebrow">Ba Zi · four pillars of destiny</span>
            <h1>Luck isn&apos;t random. It&apos;s a resource you can manage.</h1>
            <p>
              Ba Zi reads the exact moment you were born to show your natural strengths, where the
              friction tends to come from, and where you sit in your current luck cycle —
              resource-rich or resource-scarce — so you know when to push and when to conserve.
              Yours takes under a minute to see.
            </p>
            <div className="pillar-strip" aria-hidden="true">
              <div className="pillar-mini">戊<br />申</div>
              <div className="pillar-mini">壬<br />戌</div>
              <div className="pillar-mini">甲<br />戌</div>
              <div className="pillar-mini">壬<br />申</div>
            </div>
            <p className="img-note">↑ this is what your chart will look like</p>
          </div>
          <img
            className="hero-portrait"
            src={portraitImg}
            alt="Someone smiling while writing their birth details at a sunlit desk"
          />
        </div>
      </header>

      <section className="benefit-cards">
        <div className="benefit-card">
          <p className="benefit-title">Who you are</p>
          <p className="benefit-sub">Your core personality, from the moment you were born</p>
        </div>
        <div className="benefit-card">
          <p className="benefit-title">Where the friction is</p>
          <p className="benefit-sub">Which elements dominate, and which are missing</p>
        </div>
        <div className="benefit-card">
          <p className="benefit-title">Your current resource level</p>
          <p className="benefit-sub">Where you sit in your luck cycle right now</p>
        </div>
      </section>

      <div className="chip-row">
        <span className="chip">🕒 Compatibility readings — coming soon</span>
        <span className="chip">📍 How your current location fits your chart — coming soon</span>
      </div>

      <h2 className="form-heading" id="get-your-chart">
        See your chart
      </h2>
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
          <span className="place-input-wrap">
            <input
              type="text"
              placeholder="Start typing a city name…"
              value={placeQuery}
              onChange={(e) => {
                setPlaceQuery(e.target.value)
                setPlace(null)
              }}
            />
            {placeQuery.length > 0 && (
              <button
                type="button"
                className="place-clear"
                aria-label="Clear birth city"
                onClick={() => {
                  setPlaceQuery('')
                  setPlace(null)
                  setPlaceResults([])
                }}
              >
                ×
              </button>
            )}
          </span>
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
          <span className="label-with-tip">
            Birth gender
            <span className="info-tip" tabIndex={0} role="note" aria-label="Why only male or female?">
              ⓘ
              <span className="info-tip-bubble">
                Ba Zi&apos;s formula is centuries old and uses only two values here: the gender
                recorded at your birth. It sets the direction of your luck cycle — it isn&apos;t a
                statement about who you are today.
              </span>
            </span>
          </span>
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

      {chart && openedName && (
        <div className="opened-banner">
          Viewing saved chart: <strong>{openedName}</strong>
        </div>
      )}
      {chart && <ChartView chart={chart} />}
      {chart && <Interpretation chart={chart} />}
      {chart && luck && <LuckPillars chart={chart} luck={luck} />}
      {chart && lastInput && user && (
        <SaveChartBox input={lastInput} onSaved={() => setSavedRefresh((n) => n + 1)} />
      )}
      {chart && !user && supabase && (
        <p className="auth-note">Log in above to save this chart to your account.</p>
      )}

      {user && <SavedCharts refreshKey={savedRefresh} onOpen={openSaved} />}
    </main>
  )
}
