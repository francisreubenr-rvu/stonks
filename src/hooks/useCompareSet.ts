import { useEffect, useState } from 'react'
import type { Quote } from '@/api/dataTypes'
import { fetchMultipleQuotes } from '@/api/indianMarketClient'

const DEFAULT = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK']

interface State { data: Quote[]; isLoading: boolean; error: string | null }

export function useCompareSet(symbols: string[] = DEFAULT) {
  const [state, setState] = useState<State>({ data: [], isLoading: true, error: null })
  const key = symbols.join(',')
  useEffect(() => {
    fetchMultipleQuotes(symbols)
      .then(data => setState({ data, isLoading: false, error: null }))
      .catch(e  => setState({ data: [], isLoading: false, error: String(e) }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return state
}
