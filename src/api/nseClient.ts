import type { IndexQuote } from './dataTypes'
import { fetchIndexQuote } from './yahooFinanceClient'

const INDEX_MAP: Record<string, string> = {
  'NIFTY 50':          '^NSEI',
  'SENSEX':            '^BSESN',
  'NIFTY BANK':        '^NSEBANK',
  'NIFTY IT':          '^CNXIT',
  'NIFTY MIDCAP 100':  '^NSEMDCP100',
  'NIFTY SMALLCAP 100':'^NSESMAL100',
  'NIFTY PHARMA':      '^CNXPHARMA',
  'NIFTY AUTO':        '^CNXAUTO',
  'NIFTY FMCG':        '^CNXFMCG',
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
  fallbackCache = Object.entries(INDEX_MAP).map(([name, _sym]) => ({
    symbol: name, name, value: 0, change: 0, changePct: 0,
  }))
  return fallbackCache
}

export async function fetchIndices(): Promise<IndexQuote[]> {
  const entries = Object.entries(INDEX_MAP)

  // Try Yahoo Finance first
  const results = await Promise.allSettled(
    entries.map(([_name, yahooSymbol]) => fetchIndexQuote(yahooSymbol))
  )

  const hasAnyData = results.some(
    r => r.status === 'fulfilled' && r.value !== null && (r.value?.value ?? 0) > 0
  )

  // If Yahoo returned real data for at least one index, use it
  if (hasAnyData) {
    return results.map((r, i) => {
      const [name] = entries[i]
      if (r.status === 'rejected' || !r.value || r.value.value === 0) {
        return { symbol: name, name, value: 0, change: 0, changePct: 0 }
      }
      return { symbol: name, name, value: r.value.value, change: r.value.change, changePct: r.value.changePct }
    })
  }

  // If Yahoo returned nothing, use the static fallback
  return loadFallback()
}
