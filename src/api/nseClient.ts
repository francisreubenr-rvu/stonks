import type { IndexQuote } from './dataTypes'
import { fetchIndexQuote } from './yahooFinanceClient'

const INDEX_MAP: Record<string, string> = {
  'NIFTY 50':          '^NSEI',
  'SENSEX':            '^BSESN',
  'NIFTY BANK':        '^NSEBANK',
  'NIFTY IT':          '^CNXIT',
  'NIFTY MIDCAP 100':  '^NSEMDCP100',
  'NIFTY SMALLCAP 100':'^NSESMAL100',
  'NIFTY PHARMA':      '^CNXPHARMA',
  'NIFTY AUTO':        '^CNXAUTO',
  'NIFTY FMCG':        '^CNXFMCG',
}

export async function fetchIndices(): Promise<IndexQuote[]> {
  const entries = Object.entries(INDEX_MAP)
  const results = await Promise.allSettled(
    entries.map(([_name, yahooSymbol]) => fetchIndexQuote(yahooSymbol))
  )

  return results.map((r, i) => {
    const [name] = entries[i]
    if (r.status === 'rejected' || !r.value) {
      return { symbol: name, name, value: 0, change: 0, changePct: 0 }
    }
    return {
      symbol: name,
      name,
      value: r.value.value,
      change: r.value.change,
      changePct: r.value.changePct,
    }
  })
}
