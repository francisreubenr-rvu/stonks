import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchSymbols } from '@/api/yahooFinanceClient'
import { useDebounce } from '@/hooks/useDebounce'

export function useSearch(query: string) {
  const debounced = useDebounce(query, 250)
  const [open, setOpen] = useState(false)

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => (debounced.length >= 2 ? searchSymbols(debounced) : []),
    staleTime: 30_000,
  })

  const close = useCallback(() => setOpen(false), [])

  return { results, isLoading, open, setOpen, close, debounced }
}
