import { useState, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchSymbols, type SearchResult } from '@/api/nseApiClient'
import { useFundList } from '@/hooks/useFundList'
import { useDebounce } from '@/hooks/useDebounce'

export function useSearch(query: string) {
  const debounced = useDebounce(query, 250)
  const [open, setOpen] = useState(false)

  // Local mutual-fund index — always available (cached), so the search bar
  // stays useful even when NSE's equity autocomplete is blocked/unreachable.
  const { data: funds = [] } = useFundList()

  const { data: nseResults = [], isLoading } = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => (debounced.length >= 2 ? searchSymbols(debounced) : []),
    staleTime: 30_000,
    retry: false,
  })

  const results = useMemo<SearchResult[]>(() => {
    if (debounced.length < 2) return []
    const q = debounced.toLowerCase()
    const fundMatches: SearchResult[] = funds
      .filter(f => f.n.toLowerCase().includes(q))
      .slice(0, 8)
      .map(f => ({ symbol: String(f.c), name: f.n, exchange: 'MF', type: 'Mutual Fund' }))
    // Equities first (when NSE responds), then matching mutual funds.
    return [...nseResults, ...fundMatches].slice(0, 12)
  }, [nseResults, funds, debounced])

  const close = useCallback(() => setOpen(false), [])

  return { results, isLoading, open, setOpen, close, debounced }
}
