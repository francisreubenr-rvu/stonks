import { useQuery } from '@tanstack/react-query'
import { NS } from '@/lib/symbols'
import { fetchMultipleWithFallback } from '@/api/backupClient'

export function useCompareSet(symbols: string[]) {
  const yahooSymbols = symbols.map(s => `${s}${NS}`)

  return useQuery({
    queryKey: ['compare', ...symbols],
    queryFn: () => fetchMultipleWithFallback(yahooSymbols),
    staleTime: 60_000,
    enabled: symbols.length > 0,
  })
}
