import { useEffect, useState } from 'react'
import type { IndexQuote } from '@/api/dataTypes'
import { fetchIndices } from '@/api/indianMarketClient'

interface State { data: IndexQuote[]; isLoading: boolean; error: string | null }

export function useIndicesSnapshot() {
  const [state, setState] = useState<State>({ data: [], isLoading: true, error: null })
  useEffect(() => {
    fetchIndices()
      .then(data => setState({ data, isLoading: false, error: null }))
      .catch(e  => setState({ data: [], isLoading: false, error: String(e) }))
  }, [])
  return state
}
