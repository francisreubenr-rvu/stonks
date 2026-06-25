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
