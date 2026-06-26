import { useQuery } from '@tanstack/react-query'
import { NS } from '@/lib/symbols'
import type { Quote, EodBar, Fundamentals } from '@/api/dataTypes'
import {
  fetchQuoteWithFallback,
  fetchFundamentalsWithFallback,
  fetchEodBarsWithFallback,
} from '@/api/backupClient'

export interface SymbolDetailData {
  quote: Quote
  fundamentals: Fundamentals | null
  eodBars: EodBar[]
  isFallback: boolean
}

export function useSymbolDetail(symbol: string) {
  const cleanSymbol = symbol?.replace(/\..*$/, '') ?? ''
  const yahooSymbol = cleanSymbol ? `${cleanSymbol}${NS}` : ''

  return useQuery({
    queryKey: ['symbolDetail', cleanSymbol],
    queryFn: async (): Promise<SymbolDetailData> => {
      let isFallback = false

      let quote: Quote
      try {
        quote = await fetchQuoteWithFallback(yahooSymbol)
      } catch {
        const fallback = await loadStockFallback(cleanSymbol)
        if (fallback) {
          quote = fallback
          isFallback = true
        } else {
          throw new Error(`Symbol not found: ${cleanSymbol}`)
        }
      }

      const [fundamentals, eodBars] = await Promise.all([
        fetchFundamentalsWithFallback(yahooSymbol),
        fetchEodBarsWithFallback(yahooSymbol, '1mo', '1d'),
      ])

      return { quote, fundamentals, eodBars, isFallback }
    },
    enabled: !!cleanSymbol,
    staleTime: 60_000,
  })
}

async function loadStockFallback(symbol: string): Promise<Quote | null> {
  try {
    const res = await fetch('./stocks-fallback.json')
    if (!res.ok) return null
    const all: Quote[] = await res.json()
    return all.find(q => q.symbol === symbol) ?? null
  } catch {
    return null
  }
}
