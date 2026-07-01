import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { NS } from '@/lib/symbols'
import { fetchMultipleWithFallback } from '@/api/backupClient'

export function useCompareSet(symbols: string[]) {
  const nseSymbols = symbols.map(s => `${s}${NS}`)

  return useQuery({
    queryKey: ['compare', ...symbols],
    queryFn: () => fetchMultipleWithFallback(nseSymbols),
    staleTime: 60_000,
    enabled: symbols.length > 0,
    // Keep existing columns visible while a newly added symbol loads, instead
    // of flashing the whole table back to a skeleton on every add/remove.
    placeholderData: keepPreviousData,
  })
}
