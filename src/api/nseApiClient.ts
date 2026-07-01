import type { Quote, EodBar, Fundamentals } from './dataTypes'

// ─────────────────────────────────────────────────────────────────────────────
//  NSE India official API client.
//
//  All requests go through a same-origin proxy that injects the browser headers
//  (and, in production, the cookie bootstrap) that NSE's edge requires:
//    • dev  → Vite dev-server proxy at /api/nse  (see vite.config.ts)
//    • prod → Cloudflare Worker                  (see api-proxy/worker.ts)
//
//  Reliability note: NSE serves market-wide endpoints (allIndices, marketStatus)
//  freely, but Akamai-protects per-symbol endpoints (quote-equity, search,
//  historical). Those are best-effort here — callers fall back gracefully when
//  NSE denies the request.
// ─────────────────────────────────────────────────────────────────────────────

const DEV_BASE = '/api/nse'
const PROD_BASE = 'https://stonks-proxy.francisreubenrbtech25.workers.dev/api/nse'
const BASE = import.meta.env.DEV ? DEV_BASE : PROD_BASE
const FETCH_TIMEOUT = 15_000

function bareSymbol(symbol: string): string {
  return symbol.replace(/\..*$/, '').trim().toUpperCase()
}

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`NSE returned ${res.status}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

// ── Indices (allIndices) ─────────────────────────────────────────────────────

interface RawIndex {
  indexSymbol: string
  last: number
  variation: number
  percentChange: number
  open: number
  high: number
  low: number
  previousClose: number
  pe?: string
  pb?: string
  dy?: string
  advances?: string
  declines?: string
  unchanged?: string
}

let indicesCache: { ts: number; rows: RawIndex[] } | null = null

export async function fetchAllIndicesRaw(): Promise<RawIndex[]> {
  if (indicesCache && Date.now() - indicesCache.ts < 60_000) return indicesCache.rows
  const data = await get<{ data: RawIndex[] }>('/allIndices')
  const rows = data.data ?? []
  indicesCache = { ts: Date.now(), rows }
  return rows
}

/** Look up a single index by its NSE indexSymbol (e.g. "NIFTY 50"). */
export async function fetchIndexQuote(
  indexSymbol: string,
): Promise<{ value: number; change: number; changePct: number } | null> {
  const rows = await fetchAllIndicesRaw()
  const r = rows.find(x => x.indexSymbol === indexSymbol)
  if (!r || !isFinite(r.last)) return null
  return { value: r.last, change: r.variation, changePct: r.percentChange }
}

// ── Equity quote (best-effort) ───────────────────────────────────────────────

interface NseQuoteResponse {
  info?: { symbol: string; companyName?: string }
  metadata?: { pdSymbolPe?: number | string }
  priceInfo?: {
    lastPrice: number
    change: number
    pChange: number
    previousClose: number
  }
  securityInfo?: unknown
  industryInfo?: { macro?: string; sector?: string; industry?: string; basicIndustry?: string }
  preOpenMarket?: { totalTradedVolume?: number }
}

export async function fetchQuote(symbol: string): Promise<Quote> {
  const s = bareSymbol(symbol)
  const data = await get<NseQuoteResponse>('/quote-equity', { symbol: s })
  const p = data.priceInfo
  if (!p || !isFinite(p.lastPrice)) throw new Error(`Symbol not found: ${s}`)
  const pe = Number(data.metadata?.pdSymbolPe ?? 0)
  return {
    symbol: s,
    name: data.info?.companyName ?? s,
    price: p.lastPrice,
    change: p.change,
    changePct: p.pChange,
    volume: data.preOpenMarket?.totalTradedVolume ?? 0,
    marketCap: 0,
    pe: isFinite(pe) ? pe : 0,
    exchange: 'NSE',
  }
}

export async function fetchMultipleQuotes(symbols: string[]): Promise<Quote[]> {
  const settled = await Promise.allSettled(symbols.map(s => fetchQuote(s)))
  return settled
    .filter((r): r is PromiseFulfilledResult<Quote> => r.status === 'fulfilled')
    .map(r => r.value)
}

// ── Fundamentals (best-effort — NSE exposes a subset) ────────────────────────

export async function fetchFundamentals(symbol: string): Promise<Fundamentals | null> {
  try {
    const s = bareSymbol(symbol)
    const data = await get<NseQuoteResponse>('/quote-equity', { symbol: s })
    if (!data.priceInfo) return null
    const pe = Number(data.metadata?.pdSymbolPe ?? 0)
    return {
      symbol: s,
      pe: isFinite(pe) ? pe : 0,
      pb: 0,
      eps: 0,
      roe: 0,
      debtToEquity: 0,
      dividendYield: 0,
      marketCap: 0,
      sector: data.industryInfo?.sector ?? 'N/A',
      industry: data.industryInfo?.industry ?? data.industryInfo?.basicIndustry ?? 'N/A',
    }
  } catch {
    return null
  }
}

// ── EOD history (best-effort) ────────────────────────────────────────────────

interface NseHistRow {
  CH_TIMESTAMP: string // YYYY-MM-DD
  CH_OPENING_PRICE: number
  CH_TRADE_HIGH_PRICE: number
  CH_TRADE_LOW_PRICE: number
  CH_CLOSING_PRICE: number
  CH_TOT_TRADED_QTY: number
}

const RANGE_DAYS: Record<string, number> = {
  '1mo': 30, '3mo': 91, '6mo': 182, '1y': 365, '3y': 1095, '5y': 1826, max: 3650,
}

function ddmmyyyy(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`
}

export async function fetchEodBars(symbol: string, range = '1mo'): Promise<EodBar[]> {
  try {
    const s = bareSymbol(symbol)
    const days = RANGE_DAYS[range] ?? 30
    const to = new Date()
    const from = new Date(to.getTime() - days * 86_400_000)
    const data = await get<{ data: NseHistRow[] }>('/historical/cm/equity', {
      symbol: s,
      series: '["EQ"]',
      from: ddmmyyyy(from),
      to: ddmmyyyy(to),
    })
    const rows = data.data ?? []
    return rows
      .map(r => ({
        date: r.CH_TIMESTAMP,
        open: r.CH_OPENING_PRICE ?? 0,
        high: r.CH_TRADE_HIGH_PRICE ?? 0,
        low: r.CH_TRADE_LOW_PRICE ?? 0,
        close: r.CH_CLOSING_PRICE ?? 0,
        volume: r.CH_TOT_TRADED_QTY ?? 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  } catch {
    return []
  }
}

// ── Search / autocomplete (best-effort) ──────────────────────────────────────

export interface SearchResult {
  symbol: string
  name: string
  exchange: string
  type: string
}

interface NseAutocompleteResponse {
  symbols?: Array<{
    symbol: string
    symbol_info?: string
    result_sub_type?: string
  }>
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  try {
    const data = await get<NseAutocompleteResponse>('/search/autocomplete', { q: query })
    const rows = data.symbols ?? []
    return rows
      .filter(r => r.symbol)
      .map(r => ({
        symbol: r.symbol,
        name: r.symbol_info ?? r.symbol,
        exchange: 'NSE',
        type: r.result_sub_type === 'mutual_fund'
          ? 'Mutual Fund'
          : r.result_sub_type === 'index'
            ? 'Index'
            : 'Equity',
      }))
  } catch {
    return []
  }
}

