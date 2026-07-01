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
      if (e?.message?.includes('429') || e?.message?.includes('rate')) {
        throw e
      }
      if (i === retries) throw e
      await delay(1000)
    }
  }
  throw new Error('All retries exhausted')
}

let quoteFallbackCache: Quote[] | null = null

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
    if (e?.message?.includes('429') || e?.message?.includes('rate')) {
      const cleanSymbol = symbol.replace(/\..*$/, '')
      const fallback = await loadFallbackCache().then(all =>
        all.find(q => q.symbol === cleanSymbol)
      )
      if (fallback) return { ...fallback, exchange: 'NSE', marketCap: fallback.marketCap ?? 0 }
    }
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
  try {
    return await withRetry(() => nseMultiple(symbols))
  } catch {
    const all = await loadFallbackCache()
    return all.filter(q => symbols.includes(q.symbol))
  }
}
