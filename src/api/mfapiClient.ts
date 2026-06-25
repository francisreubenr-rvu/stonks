import type { MFScheme, MFDetail, NavPoint } from './dataTypes'

const BASE = 'https://api.mfapi.in/mf'

let schemeCache: MFScheme[] | null = null

export async function fetchAllSchemes(): Promise<MFScheme[]> {
  if (schemeCache) return schemeCache
  const res = await fetch(BASE)
  if (!res.ok) throw new Error(`MFAPI list failed: ${res.status}`)
  const raw: Array<{ schemeCode: number; schemeName: string }> = await res.json()
  schemeCache = raw
  return raw
}

export async function fetchFundDetail(schemeCode: number | string): Promise<MFDetail> {
  const res = await fetch(`${BASE}/${schemeCode}`)
  if (!res.ok) throw new Error(`MFAPI detail failed: ${res.status}`)
  const raw = await res.json() as {
    meta: {
      fund_house: string
      scheme_type: string
      scheme_category: string
      scheme_code: number
      scheme_name: string
    }
    data: Array<{ date: string; nav: string }>
  }

  // MFAPI returns newest-first; reverse to chronological
  const data: NavPoint[] = raw.data
    .slice()
    .reverse()
    .map(d => ({ date: d.date, nav: parseFloat(d.nav) }))
    .filter(d => !isNaN(d.nav))

  return { meta: raw.meta, data }
}
