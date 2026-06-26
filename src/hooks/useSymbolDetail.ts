import { useQuery } from '@tanstack/react-query'
import { fetchQuote, fetchFundamentals, fetchEodBars } from '@/api/yahooFinanceClient'
import { NS } from '@/lib/symbols'

export function useSymbolDetail(symbol: string) {
  const cleanSymbol = symbol?.replace(/\..*$/, '') ?? ''
  const yahooSymbol = cleanSymbol ? `${cleanSymbol}${NS}` : ''

  return useQuery({
    queryKey: ['symbolDetail', cleanSymbol],
    queryFn: async () => {
      const [quote, fundamentals, eodBars] = await Promise.all([
        fetchQuote(yahooSymbol),
        fetchFundamentals(yahooSymbol),
        fetchEodBars(yahooSymbol, '1mo', '1d'),
      ])
      return { quote, fundamentals, eodBars }
    },
    enabled: !!cleanSymbol,
    staleTime: 60_000,
  })
}
