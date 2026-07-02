import type { IndexQuote } from './dataTypes'
import { fetchAllIndicesRaw } from './nseApiClient'
// Canonical tracked-index list — shared with scripts/refresh-data.mjs so the
// live path, the fallback snapshot, and the refresh script can never drift.
// (A previous drift here — the app asking for a nonexistent "NIFTY SMALLCAP
// 500" while the snapshot carried NIFTY SMLCAP 100 — silently forced the app
// onto fallback data forever.)
// Note: SENSEX is a BSE index (absent from NSE's feed) — NIFTY NEXT 50 stands
// in as the second broad-market gauge.
import INDEX_UNIVERSE from '@/data/index-universe.json'

const INDICES: Array<{ nse: string; name: string }> = INDEX_UNIVERSE

/** Index data plus its provenance, so the UI can disclose honestly:
 *  - live: fetched from NSE this session
 *  - snapshot: the real EOD close snapshot shipped with the app
 *  Never fabricated values; an empty array means "no data", not zeros. */
export interface IndicesResult {
  indices: IndexQuote[]
  source: 'live' | 'snapshot'
}

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
  // No snapshot available either — return NO data rather than synthesizing
  // zero-valued rows. A zero is a number; missing data is not.
  return []
}

export async function fetchIndices(): Promise<IndicesResult> {
  try {
    const rows = await fetchAllIndicesRaw()
    const byName = new Map(rows.map(r => [r.indexSymbol, r]))

    // Only keep indices NSE actually resolved this call. A partial response
    // (common — individual gauges drop in/out) must not backfill the missing
    // ones with fabricated zeros sitting next to real values.
    const mapped: IndexQuote[] = INDICES.flatMap(({ nse, name }) => {
      const r = byName.get(nse)
      if (!r || !isFinite(r.last) || r.last === 0) return []
      return [{ symbol: nse, name, value: r.last, change: r.variation, changePct: r.percentChange }]
    })

    // Only trust the live response if it covers every index we track —
    // otherwise prefer the complete, real fallback snapshot over a mix of
    // live + silently-missing gauges.
    if (mapped.length === INDICES.length) return { indices: mapped, source: 'live' }
  } catch {
    // fall through to static fallback
  }

  return { indices: await loadFallback(), source: 'snapshot' }
}
