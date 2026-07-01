import type { IndexQuote } from './dataTypes'
import { fetchAllIndicesRaw } from './nseApiClient'

// App-facing index list mapped to NSE's official `indexSymbol` values.
// Note: SENSEX is a BSE index (absent from NSE's feed) — NIFTY NEXT 50 stands in
// as the second broad-market gauge. Smallcap uses NSE's SMALLCAP 500.
const INDICES: Array<{ nse: string; name: string }> = [
  { nse: 'NIFTY 50',           name: 'Nifty 50' },
  { nse: 'NIFTY NEXT 50',      name: 'Nifty Next 50' },
  { nse: 'NIFTY BANK',         name: 'Nifty Bank' },
  { nse: 'NIFTY IT',           name: 'Nifty IT' },
  { nse: 'NIFTY MIDCAP 100',   name: 'Nifty Midcap 100' },
  { nse: 'NIFTY SMALLCAP 500', name: 'Nifty Smallcap 500' },
  { nse: 'NIFTY PHARMA',       name: 'Nifty Pharma' },
  { nse: 'NIFTY AUTO',         name: 'Nifty Auto' },
  { nse: 'NIFTY FMCG',         name: 'Nifty FMCG' },
]

let fallbackCache: IndexQuote[] | null = null

async function loadFallback(): Promise<IndexQuote[]> {
  if (fallbackCache) return fallbackCache
  try {
    const res = await fetch('./indices-fallback.json')
    if (res.ok) {
      fallbackCache = await res.json()
      return fallbackCache ?? []
    }
  } catch {}
  fallbackCache = INDICES.map(({ nse, name }) => ({
    symbol: nse, name, value: 0, change: 0, changePct: 0,
  }))
  return fallbackCache
}

export async function fetchIndices(): Promise<IndexQuote[]> {
  try {
    const rows = await fetchAllIndicesRaw()
    const byName = new Map(rows.map(r => [r.indexSymbol, r]))

    const mapped: IndexQuote[] = INDICES.map(({ nse, name }) => {
      const r = byName.get(nse)
      if (!r || !isFinite(r.last) || r.last === 0) {
        return { symbol: nse, name, value: 0, change: 0, changePct: 0 }
      }
      return { symbol: nse, name, value: r.last, change: r.variation, changePct: r.percentChange }
    })

    // If NSE returned real data for at least one index, use it
    if (mapped.some(i => i.value > 0)) return mapped
  } catch {
    // fall through to static fallback
  }

  return loadFallback()
}
