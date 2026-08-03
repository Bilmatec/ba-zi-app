import { useCallback, useEffect, useState } from 'react'
import { listCharts, deleteChart, type SavedChartRow } from '../lib/charts-store'

interface Props {
  /** bumped by the parent whenever a new chart is saved, to trigger a refresh */
  refreshKey: number
  onOpen: (row: SavedChartRow) => void
}

export default function SavedCharts({ refreshKey, onOpen }: Props) {
  const [rows, setRows] = useState<SavedChartRow[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRows(await listCharts())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load charts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh, refreshKey])

  async function remove(id: string) {
    if (!window.confirm('Delete this saved chart?')) return
    try {
      await deleteChart(id)
      setRows((r) => r.filter((row) => row.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the chart.')
    }
  }

  return (
    <section className="saved-charts">
      <h2>My saved charts</h2>
      {loading && <p className="auth-note">Loading…</p>}
      {error && <div className="error">{error}</div>}
      {!loading && !error && rows.length === 0 && (
        <p className="auth-note">Nothing saved yet — calculate a chart and save it.</p>
      )}
      <ul>
        {rows.map((row) => (
          <li key={row.id}>
            <button type="button" className="saved-open" onClick={() => onOpen(row)}>
              {row.chart_name}
              <span>
                {row.input.year}-{String(row.input.month).padStart(2, '0')}-
                {String(row.input.day).padStart(2, '0')}
                {row.input.hour !== undefined
                  ? ` ${String(row.input.hour).padStart(2, '0')}:${String(row.input.minute ?? 0).padStart(2, '0')}`
                  : ' (time unknown)'}
                {' · '}
                {row.input.placeLabel}
              </span>
            </button>
            <button
              type="button"
              className="auth-link saved-delete"
              onClick={() => remove(row.id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
