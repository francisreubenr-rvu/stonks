import { useQuery } from '@tanstack/react-query'
import { fetchMultipleQuotes } from '@/api/yahooFinanceClient'
import { NS } from '@/lib/symbols'

export function useCompareSet(symbols: string[]) {
  const yahooSymbols = symbols.map(s => `${s}${NS}`)

  return useQuery({
    queryKey: ['compare', ...symbols],
    queryFn: () => fetchMultipleQuotes(yahooSymbols),
    staleTime: 60_000,
    enabled: symbols.length > 0,
  })
}
