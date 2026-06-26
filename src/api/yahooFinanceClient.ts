import type { Quote, EodBar, Fundamentals } from './dataTypes'

const DEV_BASE = '/api/yahoo'
const PROD_BASE = 'https://stonks-proxy.francisreubenr-rvu.workers.dev'

const BASE = import.meta.env.DEV ? DEV_BASE : PROD_BASE

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`Yahoo Finance returned ${res.status}`)
  }
  return res.json()
}

// ── EOD Chart ────────────────────────────────────────────────────────────────

interface ChartResponse {
  chart: {
    result?: Array<{
      meta: {
        currency: string
        symbol: string
        regularMarketPrice: number
        previousClose: number
        regularMarketVolume?: number
      }
      timestamp?: number[]
      indicators?: {
        quote?: Array<{
          open?: (number | null)[]
          high?: (number | null)[]
          low?: (number | null)[]
          close?: (number | null)[]
          volume?: (number | null)[]
        }>
      }
    }>
  }
}

export async function fetchEodBars(symbol: string, range = '1mo', interval = '1d'): Promise<EodBar[]> {
  const data = await get<ChartResponse>(`${BASE}/v8/finance/chart/${encodeURIComponent(symbol)}`, {
    range,
    interval,
  })

  const result = data.chart?.result?.[0]
  if (!result?.timestamp || !result.indicators?.quote?.[0]) return []

  const timestamps = result.timestamp
  const quote = result.indicators.quote[0]

  return timestamps.map((ts, i) => ({
    date: new Date(ts * 1000).toISOString().slice(0, 10),
    open: quote.open?.[i] ?? 0,
    high: quote.high?.[i] ?? 0,
    low: quote.low?.[i] ?? 0,
    close: quote.close?.[i] ?? 0,
    volume: quote.volume?.[i] ?? 0,
  }))
}

// ── Quote (single symbol) ───────────────────────────────────────────────────

export async function fetchQuote(symbol: string): Promise<Quote> {
  const data = await get<ChartResponse>(`${BASE}/v8/finance/chart/${encodeURIComponent(symbol)}`, {
    range: '1d',
    interval: '1d',
  })

  const meta = data.chart?.result?.[0]?.meta
  if (!meta) throw new Error(`Symbol not found: ${symbol}`)

  const price = meta.regularMarketPrice
  const change = price - meta.previousClose
  const changePct = meta.previousClose > 0 ? (change / meta.previousClose) * 100 : 0

  return {
    symbol: meta.symbol.replace('.NS', ''),
    name: meta.symbol.replace('.NS', ''),
    price,
    change,
    changePct,
    volume: meta.regularMarketVolume ?? 0,
    marketCap: 0,
    pe: 0,
    exchange: 'NSE',
  }
}

// ── Multiple Quotes ─────────────────────────────────────────────────────────

interface MultiQuoteResponse {
  quoteResponse: {
    result?: Array<{
      symbol: string
      shortName?: string
      longName?: string
      regularMarketPrice: number
      regularMarketChange: number
      regularMarketChangePercent: number
      regularMarketVolume?: number
      marketCap?: number
      trailingPE?: number
      fullExchangeName?: string
    }>
    error?: unknown
  }
}

export async function fetchMultipleQuotes(symbols: string[]): Promise<Quote[]> {
  const symbolStr = symbols.map(s => encodeURIComponent(s)).join(',')
  const data = await get<MultiQuoteResponse>(`${BASE}/v7/finance/quote`, {
    symbols: symbolStr,
  })

  const results = data.quoteResponse?.result
  if (!results) return []

  return results.map(r => ({
    symbol: r.symbol.replace('.NS', '').replace('.BO', ''),
    name: r.longName ?? r.shortName ?? r.symbol,
    price: r.regularMarketPrice,
    change: r.regularMarketChange,
    changePct: r.regularMarketChangePercent,
    volume: r.regularMarketVolume ?? 0,
    marketCap: r.marketCap ?? 0,
    pe: r.trailingPE ?? 0,
    exchange: r.fullExchangeName?.includes('BSE') ? 'BSE' : 'NSE',
  }))
}

// ── Index Quote ─────────────────────────────────────────────────────────────

export async function fetchIndexQuote(symbol: string): Promise<{ value: number; change: number; changePct: number } | null> {
  try {
    const data = await get<ChartResponse>(`${BASE}/v8/finance/chart/${encodeURIComponent(symbol)}`, {
      range: '1d',
      interval: '1d',
    })
    const meta = data.chart?.result?.[0]?.meta
    if (!meta) return null
    const change = meta.regularMarketPrice - meta.previousClose
    const changePct = meta.previousClose > 0 ? (change / meta.previousClose) * 100 : 0
    return {
      value: meta.regularMarketPrice,
      change,
      changePct,
    }
  } catch {
    return null
  }
}

// ── Fundamentals ─────────────────────────────────────────────────────────────

interface QuoteSummaryResponse {
  quoteSummary: {
    result?: Array<{
      assetProfile?: {
        sector?: string
        industry?: string
      }
      financialData?: {
        currentPrice?: { raw: number }
        returnOnEquity?: { raw: number }
      }
      defaultKeyStatistics?: {
        priceToBook?: { raw: number }
        trailingEps?: { raw: number }
        marketCap?: { raw: number }
        lastDividendYield?: { raw: number }
        trailingPE?: { raw: number }
        pegRatio?: { raw: number }
        debtToEquity?: { raw: number }
      }
    }>
  }
}

export async function fetchFundamentals(symbol: string): Promise<Fundamentals | null> {
  try {
    const modules = 'assetProfile,financialData,defaultKeyStatistics'
    const data = await get<QuoteSummaryResponse>(
      `${BASE}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}`,
      { modules }
    )

    const r = data.quoteSummary?.result?.[0]
    if (!r) return null

    const ks = r.defaultKeyStatistics
    const fin = r.financialData
    const ap = r.assetProfile

    return {
      symbol: symbol.replace('.NS', '').replace('.BO', ''),
      pe: ks?.trailingPE?.raw ?? 0,
      pb: ks?.priceToBook?.raw ?? 0,
      eps: ks?.trailingEps?.raw ?? 0,
      roe: (fin?.returnOnEquity?.raw ?? 0) * 100,
      debtToEquity: ks?.debtToEquity?.raw ?? 0,
      dividendYield: (ks?.lastDividendYield?.raw ?? 0) * 100,
      marketCap: ks?.marketCap?.raw ?? 0,
      sector: ap?.sector ?? 'N/A',
      industry: ap?.industry ?? 'N/A',
    }
  } catch {
    return null
  }
}

// ── Search / Autocomplete ───────────────────────────────────────────────────

interface AutocompleteResponse {
  ResultSet?: {
    Result?: Array<{
      symbol: string
      name?: string
      exch?: string
      typeDisp?: string
    }>
  }
}

export interface SearchResult {
  symbol: string
  name: string
  exchange: string
  type: string
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  try {
    const data = await get<AutocompleteResponse>(`${BASE}/v6/finance/autocomplete`, {
      query,
      lang: 'en',
      region: 'IN',
    })

    const results = data.ResultSet?.Result ?? []
    return results
      .filter(r => r.symbol && r.typeDisp !== 'Currency' && r.typeDisp !== 'Future')
      .map(r => ({
        symbol: r.symbol,
        name: r.name ?? r.symbol,
        exchange: r.exch ?? 'NSE',
        type: r.typeDisp ?? 'Equity',
      }))
  } catch {
    return []
  }
}
