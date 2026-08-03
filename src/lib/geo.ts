// City search via the Open-Meteo geocoding API (free, no API key).
// Each result carries its IANA time zone, which drives the historical
// DST-correct time handling in the chart calculation.

export interface PlaceResult {
  id: number
  name: string
  /** state / province / region, when available */
  admin1?: string
  country?: string
  latitude: number
  longitude: number
  timezone: string
}

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', query)
  url.searchParams.set('count', '6')
  url.searchParams.set('language', 'en')
  url.searchParams.set('format', 'json')

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Location search failed (${res.status})`)
  }
  const data = await res.json()
  const results: PlaceResult[] = (data.results ?? []).filter(
    (r: PlaceResult) => typeof r.timezone === 'string' && r.timezone.length > 0,
  )
  return results
}

export function placeLabel(p: PlaceResult): string {
  return [p.name, p.admin1, p.country].filter(Boolean).join(', ')
}
