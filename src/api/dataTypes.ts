export interface Quote {
  symbol: string
  name: string
  price: number
  change: number
  changePct: number
  volume: number
  // NSE's public endpoints don't expose these — null, not a fabricated 0,
  // when unavailable on both the live and fallback-snapshot paths.
  marketCap: number | null
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

export interface Fundamentals {
  symbol: string
  pe: number | null
  // NSE's public quote-equity endpoint does not expose these — always null
  // until a real source is wired up. Never fabricate a zero for them.
  pb: number | null
  eps: number | null
  roe: number | null
  debtToEquity: number | null
  dividendYield: number | null
  marketCap: number | null
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
  lastUpdated: string
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
