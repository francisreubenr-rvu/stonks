import type { MFScheme, MFDetail, NavPoint } from './dataTypes'

const BASE = 'https://api.mfapi.in/mf'
const FETCH_TIMEOUT = 15_000

let schemeCache: MFScheme[] | null = null

function abortableFetch(url: string, timeoutMs = FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer))
}

export async function fetchAllSchemes(): Promise<MFScheme[]> {
  if (schemeCache) return schemeCache
  const res = await abortableFetch(BASE)
  if (!res.ok) throw new Error(`MFAPI list failed: ${res.status}`)
  const raw: Array<{ schemeCode: number; schemeName: string }> = await res.json()
  schemeCache = raw
  return raw
}

export async function fetchFundDetail(schemeCode: number | string): Promise<MFDetail> {
  const res = await abortableFetch(`${BASE}/${schemeCode}`)
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
    // Drop NaN and non-positive NAVs — MFAPI occasionally returns a stray 0,
    // which otherwise produces divide-by-zero returns (NaN vol) and a phantom
    // -100% drawdown in the stats and chart.
    .filter(d => !isNaN(d.nav) && d.nav > 0)

  return { meta: raw.meta, data }
}
