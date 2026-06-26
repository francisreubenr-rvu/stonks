import type { Quote, EodBar } from './dataTypes'
import {
  fetchQuote as yahooQuote,
  fetchFundamentals as yahooFundamentals,
  fetchEodBars as yahooEodBars,
  fetchMultipleQuotes as yahooMultiple,
} from './yahooFinanceClient'

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (e: any) {
      if (i === retries) throw e
      if (e?.message?.includes('429') || e?.message?.includes('rate')) {
        await delay(3000 * (i + 1))
      } else {
        await delay(1000)
      }
    }
  }
  throw new Error('All retries exhausted')
}

export async function fetchQuoteWithFallback(symbol: string): Promise<Quote> {
  return withRetry(() => yahooQuote(symbol))
}

export async function fetchFundamentalsWithFallback(symbol: string) {
  return withRetry(() => yahooFundamentals(symbol)).catch(() => null)
}

export async function fetchEodBarsWithFallback(symbol: string, range = '1mo', interval = '1d'): Promise<EodBar[]> {
  return withRetry(() => yahooEodBars(symbol, range, interval)).catch(() => [])
}

export async function fetchMultipleWithFallback(symbols: string[]): Promise<Quote[]> {
  return withRetry(() => yahooMultiple(symbols)).catch(() => [])
}
