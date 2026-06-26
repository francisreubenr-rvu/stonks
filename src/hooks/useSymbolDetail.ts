import { useQuery } from '@tanstack/react-query'
import { NS } from '@/lib/symbols'
import {
  fetchQuoteWithFallback,
  fetchFundamentalsWithFallback,
  fetchEodBarsWithFallback,
} from '@/api/backupClient'

export function useSymbolDetail(symbol: string) {
  const cleanSymbol = symbol?.replace(/\..*$/, '') ?? ''
  const yahooSymbol = cleanSymbol ? `${cleanSymbol}${NS}` : ''

  return useQuery({
    queryKey: ['symbolDetail', cleanSymbol],
    queryFn: async () => {
      const [quote, fundamentals, eodBars] = await Promise.all([
        fetchQuoteWithFallback(yahooSymbol),
        fetchFundamentalsWithFallback(yahooSymbol),
        fetchEodBarsWithFallback(yahooSymbol, '1mo', '1d'),
      ])
      return { quote, fundamentals, eodBars }
    },
    enabled: !!cleanSymbol,
    staleTime: 60_000,
  })
}
