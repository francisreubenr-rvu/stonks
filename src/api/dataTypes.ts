export interface Quote {
  symbol: string
  name: string
  price: number
  change: number
  changePct: number
  volume: number
  // null when unavailable (the EOD snapshot has no P/E column) — never a
  // fabricated 0. Market cap was removed entirely: no keyless source has it.
  pe: number | null
  exchange: 'NSE' | 'BSE'
}

export interface IndexQuote {
  symbol: string
  name: string
  value: number
  change: number
  changePct: number
}

export interface EodBar {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// Only what NSE's public quote-equity endpoint actually provides. P/B, EPS,
// ROE, D/E, dividend yield and market cap are NOT exposed by any keyless
// source this app uses — they were removed rather than shipped as
// permanently-empty rows implying data that never arrives.
export interface Fundamentals {
  symbol: string
  pe: number | null
  sector: string
  industry: string
}

// ── MFAPI types ───────────────────────────────────────────────────────────────

export interface MFScheme {
  schemeCode: number
  schemeName: string
}

export interface NavPoint {
  date: string  // "DD-MM-YYYY" as returned by MFAPI
  nav: number
}

export interface MFMeta {
  fund_house: string
  scheme_type: string
  scheme_category: string
  scheme_code: number
  scheme_name: string
}

export interface MFDetail {
  meta: MFMeta
  data: NavPoint[]  // chronological oldest-first after reversal
}

export interface FundStats {
  currentNav: number
  inceptionNav: number
  dataPoints: number
  // CAGR
  cagr1m: number | null
  cagr3m: number | null
  cagr6m: number | null
  cagr1y: number | null
  cagr3y: number | null
  cagr5y: number | null
  cagrInception: number | null
  // Risk
  annualizedVol: number | null
  maxDrawdown: number
  maxDrawdownDurationDays: number
  recoveryDays: number | null
  // Risk-adjusted (risk-free = 6.5%)
  sharpe: number | null
  sortino: number | null
  // Monthly distribution
  positiveMonths: number
  negativeMonths: number
  winRate: number
  bestMonth: number
  worstMonth: number
  avgMonthlyReturn: number
  // Rolling 1Y
  rolling1yMin: number | null
  rolling1yMax: number | null
  rolling1yAvg: number | null
}

// ── Dashboard types ───────────────────────────────────────────────────────────

export interface MarketIndex {
  symbol: string
  name: string
  value: number
  change: number
  changePct: number
}

export interface MarketMover {
  symbol: string
  name: string
  price: number
  changePct: number
}

export interface SectorPerformance {
  name: string
  changePct: number
}

export interface DashboardData {
  indices: MarketIndex[]
  gainers: MarketMover[]
  losers: MarketMover[]
  sectors: SectorPerformance[]
  advanceDecline: { advances: number; declines: number; unchanged: number }
  /** Fetch time of the LIVE feed — null when serving the EOD snapshot
   *  (never stamp "now" onto snapshot data). */
  lastUpdated: string | null
  isLive: boolean
}

// ── Watchlist types ────────────────────────────────────────────────────────────

export interface WatchlistItem {
  symbol: string
  name: string
  type: 'stock' | 'index' | 'fund'
  addedAt: number
}

// ── Portfolio types ────────────────────────────────────────────────────────────

export interface Holding {
  symbol: string
  name: string
  quantity: number
  buyPrice: number
  buyDate: string
}

export interface PortfolioItem extends Holding {
  currentPrice: number
  currentValue: number
  invested: number
  pnl: number
  pnlPct: number
  dayChange: number
  dayChangePct: number
  // true when no live quote resolved and currentPrice/value/pnl are just the
  // buy price carried forward — NOT a real "flat day", just missing data.
  priceUnavailable: boolean
}
