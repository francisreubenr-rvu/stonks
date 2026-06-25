export interface Quote {
  symbol: string
  name: string
  price: number
  change: number
  changePct: number
  volume: number
  marketCap: number
  pe: number
  exchange: 'NSE' | 'BSE'
}

export interface IndexQuote {
  symbol: string
  name: string
  value: number
  change: number
  changePct: number
}

export interface Fund {
  schemeCode: string
  schemeName: string
  nav: number
  navDate: string
  category: string
  aum: number
  returns1y: number
  returns3y: number
  returns5y: number
  riskRating: 'Low' | 'Moderate' | 'High' | 'Very High'
}

export interface Fundamentals {
  symbol: string
  pe: number
  pb: number
  eps: number
  roe: number
  debtToEquity: number
  dividendYield: number
  marketCap: number
  sector: string
  industry: string
}

export interface EodBar {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
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
