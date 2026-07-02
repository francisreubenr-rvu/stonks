import type { Quote, EodBar } from './dataTypes'
import {
  fetchQuote as nseQuote,
  fetchFundamentals as nseFundamentals,
  fetchEodBars as nseEodBars,
  fetchMultipleQuotes as nseMultiple,
} from './nseApiClient'

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (e: any) {
      // Retrying into a rate limit only makes it worse — surface it immediately.
      if (e?.message?.includes('429') || e?.message?.includes('rate')) throw e
      if (i === retries) throw e
      await delay(1000)
    }
  }
  // Unreachable: the loop above always either returns or throws by i === retries.
  throw new Error('All retries exhausted')
}

let quoteFallbackCache: Quote[] | null = null

/** The real NSE close snapshot (public/stocks-fallback.json) — the single
 *  source of truth for offline stock quotes. Exported so other surfaces
 *  (e.g. the landing marquee) read the same file instead of carrying their
 *  own copy of the data. */
export async function loadStocksSnapshot(): Promise<Quote[]> {
  return loadFallbackCache()
}

async function loadFallbackCache(): Promise<Quote[]> {
  if (quoteFallbackCache) return quoteFallbackCache
  try {
    const res = await fetch('./stocks-fallback.json')
    if (res.ok) {
      quoteFallbackCache = await res.json()
      return quoteFallbackCache ?? []
    }
  } catch {}
  quoteFallbackCache = []
  return quoteFallbackCache
}

export async function fetchQuoteWithFallback(symbol: string): Promise<Quote> {
  try {
    return await withRetry(() => nseQuote(symbol))
  } catch (e: any) {
    // Fall back on ANY failure (rate limit, Akamai 401/403, timeout, 502 from
    // the proxy) — the most common real-world failure is NSE's edge blocking
    // the request, not a detected "429"/"rate" string, and a good static
    // snapshot exists either way.
    const cleanSymbol = symbol.replace(/\..*$/, '').toUpperCase()
    const fallback = await loadFallbackCache().then(all =>
      all.find(q => q.symbol === cleanSymbol)
    )
    if (fallback) return { ...fallback, exchange: 'NSE' }
    throw e
  }
}

export async function fetchFundamentalsWithFallback(symbol: string) {
  try {
    return await withRetry(() => nseFundamentals(symbol))
  } catch {
    return null
  }
}

export async function fetchEodBarsWithFallback(symbol: string, range = '1mo', _interval = '1d'): Promise<EodBar[]> {
  try {
    return await withRetry(() => nseEodBars(symbol, range))
  } catch {
    return []
  }
}

export async function fetchMultipleWithFallback(symbols: string[]): Promise<Quote[]> {
  // nseMultiple (fetchMultipleQuotes) uses Promise.allSettled internally and
  // never rejects — a total NSE outage resolves to [], not a thrown error —
  // so a try/catch around it alone never reaches a fallback. Compare against
  // what we asked for and backfill anything missing from the static snapshot.
  const wanted = symbols.map(s => s.replace(/\..*$/, '').toUpperCase())
  let live: Quote[] = []
  try {
    live = await withRetry(() => nseMultiple(symbols))
  } catch {
    live = []
  }

  const resolved = new Set(live.map(q => q.symbol))
  const missing = wanted.filter(s => !resolved.has(s))
  if (missing.length === 0) return live

  const all = await loadFallbackCache()
  const missingSet = new Set(missing)
  const backfilled = all.filter(q => missingSet.has(q.symbol))
  return [...live, ...backfilled]
}
