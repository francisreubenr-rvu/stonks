import type { Quote, IndexQuote } from './dataTypes'

const QUOTES: Quote[] = [
  { symbol: 'RELIANCE',  name: 'Reliance Industries Ltd',       price: 2945.60, change:  18.35, changePct:  0.63, volume: 4823000, marketCap: 1992000000000, pe: 24.3, exchange: 'NSE' },
  { symbol: 'TCS',       name: 'Tata Consultancy Services Ltd', price: 3812.45, change: -22.10, changePct: -0.58, volume: 1934000, marketCap: 1389000000000, pe: 28.7, exchange: 'NSE' },
  { symbol: 'HDFCBANK',  name: 'HDFC Bank Ltd',                 price: 1678.90, change:   9.75, changePct:  0.58, volume: 7234000, marketCap: 1263000000000, pe: 19.1, exchange: 'NSE' },
  { symbol: 'INFY',      name: 'Infosys Ltd',                   price: 1543.20, change: -11.30, changePct: -0.73, volume: 6123000, marketCap:  641000000000, pe: 23.5, exchange: 'NSE' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd',                price: 1187.55, change:  14.20, changePct:  1.21, volume: 8923000, marketCap:  843000000000, pe: 17.8, exchange: 'NSE' },
]

const INDICES: IndexQuote[] = [
  { symbol: 'NIFTY 50',           name: 'Nifty 50',            value: 24532.15, change:  142.30, changePct:  0.58 },
  { symbol: 'SENSEX',             name: 'BSE Sensex',          value: 80412.45, change:  467.85, changePct:  0.59 },
  { symbol: 'NIFTY BANK',         name: 'Nifty Bank',          value: 52341.70, change:  -98.25, changePct: -0.19 },
  { symbol: 'NIFTY IT',           name: 'Nifty IT',            value: 38721.30, change: -234.50, changePct: -0.60 },
  { symbol: 'NIFTY MIDCAP 100',   name: 'Nifty Midcap 100',   value: 55678.90, change:  312.45, changePct:  0.56 },
  { symbol: 'NIFTY SMALLCAP 100', name: 'Nifty Smallcap 100', value: 18923.40, change:  189.70, changePct:  1.01 },
  { symbol: 'NIFTY PHARMA',       name: 'Nifty Pharma',        value: 21567.80, change: -145.30, changePct: -0.67 },
  { symbol: 'NIFTY AUTO',         name: 'Nifty Auto',          value: 23456.90, change:  234.60, changePct:  1.01 },
  { symbol: 'NIFTY FMCG',         name: 'Nifty FMCG',         value: 57890.30, change:  123.40, changePct:  0.21 },
]

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function fetchQuote(symbol: string): Promise<Quote> {
  await sleep(200)
  const q = QUOTES.find(q => q.symbol === symbol)
  if (!q) throw new Error(`Symbol not found: ${symbol}`)
  return q
}

export async function fetchMultipleQuotes(symbols: string[]): Promise<Quote[]> {
  await sleep(300)
  return QUOTES.filter(q => symbols.includes(q.symbol))
}

export async function fetchIndices(): Promise<IndexQuote[]> {
  await sleep(200)
  return INDICES
}
