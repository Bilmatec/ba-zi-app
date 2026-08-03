import { supabase } from './supabase'
import type { BirthInput } from './bazi/calculate'

// A saved chart stores the birth details (the input). The chart itself is
// recomputed from them on load — the calculation is deterministic, so this
// keeps saved charts consistent with the verified engine at all times.

export interface SavedChartRow {
  id: string
  created_at: string
  chart_name: string
  input: BirthInput & { placeLabel: string }
}

function client() {
  if (!supabase) throw new Error('Accounts are not configured yet.')
  return supabase
}

export async function saveChart(
  chartName: string,
  input: BirthInput & { placeLabel: string },
): Promise<void> {
  const { error } = await client()
    .from('saved_charts')
    .insert({ chart_name: chartName, input })
  if (error) throw new Error(error.message)
}

export async function listCharts(): Promise<SavedChartRow[]> {
  const { data, error } = await client()
    .from('saved_charts')
    .select('id, created_at, chart_name, input')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as SavedChartRow[]
}

export async function deleteChart(id: string): Promise<void> {
  const { error } = await client().from('saved_charts').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
