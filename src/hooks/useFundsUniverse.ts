import { useEffect, useState } from 'react'
import type { Fund } from '@/api/dataTypes'
import { fetchFunds } from '@/api/eodhdClient'

interface State { data: Fund[]; isLoading: boolean; error: string | null }

export function useFundsUniverse() {
  const [state, setState] = useState<State>({ data: [], isLoading: true, error: null })
  useEffect(() => {
    fetchFunds()
      .then(data => setState({ data, isLoading: false, error: null }))
      .catch(e  => setState({ data: [], isLoading: false, error: String(e) }))
  }, [])
  return state
}
