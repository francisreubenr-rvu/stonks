import type { Fund, Fundamentals, EodBar } from './dataTypes'

const FUNDS: Fund[] = [
  { schemeCode: '120503', schemeName: 'Mirae Asset Large Cap Fund — Direct Growth',       nav:   102.45, navDate: '2024-06-20', category: 'Large Cap',          aum:  34567, returns1y: 23.4, returns3y: 18.7, returns5y: 16.2, riskRating: 'Moderate'  },
  { schemeCode: '119598', schemeName: 'Axis Bluechip Fund — Direct Growth',                nav:    58.32, navDate: '2024-06-20', category: 'Large Cap',          aum:  41234, returns1y: 19.8, returns3y: 15.3, returns5y: 14.9, riskRating: 'Moderate'  },
  { schemeCode: '125354', schemeName: 'Parag Parikh Flexi Cap Fund — Direct Growth',       nav:    78.91, navDate: '2024-06-20', category: 'Flexi Cap',          aum:  56789, returns1y: 28.6, returns3y: 22.1, returns5y: 19.8, riskRating: 'Moderate'  },
  { schemeCode: '130503', schemeName: 'Nippon India Small Cap Fund — Direct Growth',       nav:   143.20, navDate: '2024-06-20', category: 'Small Cap',          aum:  23456, returns1y: 45.3, returns3y: 32.7, returns5y: 28.4, riskRating: 'Very High' },
  { schemeCode: '118989', schemeName: 'ICICI Prudential Technology Fund — Direct Growth', nav:   187.65, navDate: '2024-06-20', category: 'Sectoral/Thematic', aum:  12345, returns1y: -8.4, returns3y: 12.3, returns5y: 22.1, riskRating: 'High'      },
  { schemeCode: '119775', schemeName: 'SBI Liquid Fund — Direct Growth',                  nav:  3456.78, navDate: '2024-06-20', category: 'Liquid',             aum:  78901, returns1y:  7.1, returns3y:  6.8, returns5y:  6.5, riskRating: 'Low'       },
  { schemeCode: '135781', schemeName: 'HDFC Mid-Cap Opportunities Fund — Direct Growth',  nav:   112.34, navDate: '2024-06-20', category: 'Mid Cap',            aum:  45678, returns1y: 38.2, returns3y: 27.4, returns5y: 23.6, riskRating: 'High'      },
]

const FUNDAMENTALS: Record<string, Fundamentals> = {
  RELIANCE:  { symbol: 'RELIANCE',  pe: 24.3, pb:  2.8, eps: 121.25, roe: 12.4, debtToEquity: 0.47, dividendYield: 0.37, marketCap: 1992000000000, sector: 'Energy',     industry: 'Oil & Gas Refining' },
  TCS:       { symbol: 'TCS',       pe: 28.7, pb: 13.2, eps: 132.87, roe: 46.1, debtToEquity: 0.03, dividendYield: 1.68, marketCap: 1389000000000, sector: 'Technology', industry: 'IT Services' },
  HDFCBANK:  { symbol: 'HDFCBANK',  pe: 19.1, pb:  2.9, eps:  87.95, roe: 15.8, debtToEquity: 6.82, dividendYield: 1.13, marketCap: 1263000000000, sector: 'Financials', industry: 'Banks' },
  INFY:      { symbol: 'INFY',      pe: 23.5, pb:  8.4, eps:  65.67, roe: 35.7, debtToEquity: 0.09, dividendYield: 2.56, marketCap:  641000000000, sector: 'Technology', industry: 'IT Services' },
  ICICIBANK: { symbol: 'ICICIBANK', pe: 17.8, pb:  3.1, eps:  66.74, roe: 17.4, debtToEquity: 4.91, dividendYield: 0.84, marketCap:  843000000000, sector: 'Financials', industry: 'Banks' },
}

const BASE_PRICES: Record<string, number> = {
  RELIANCE: 2945.60, TCS: 3812.45, HDFCBANK: 1678.90, INFY: 1543.20, ICICIBANK: 1187.55,
}

function generateEodBars(basePrice: number, count: number): EodBar[] {
  const bars: EodBar[] = []
  let price = basePrice * 0.88
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(2026, 4, 27 - i)
    const open = price
    const delta = (((i * 17 + 31) % 100) / 100 - 0.47) * open * 0.022
    price = Math.max(open + delta, 1)
    bars.push({
      date:   d.toISOString().slice(0, 10),
      open:   +open.toFixed(2),
      high:   +(Math.max(open, price) * 1.005).toFixed(2),
      low:    +(Math.min(open, price) * 0.995).toFixed(2),
      close:  +price.toFixed(2),
      volume: ((i * 1234567) % 4000000) + 500000,
    })
  }
  return bars
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function fetchFunds(): Promise<Fund[]> {
  await sleep(300)
  return FUNDS
}

export async function fetchFundamentals(symbol: string): Promise<Fundamentals | null> {
  await sleep(200)
  return FUNDAMENTALS[symbol] ?? null
}

export async function fetchEodBars(symbol: string, count = 30): Promise<EodBar[]> {
  await sleep(250)
  return generateEodBars(BASE_PRICES[symbol] ?? 1000, count)
}
