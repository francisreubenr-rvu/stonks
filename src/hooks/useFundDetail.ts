import { useEffect, useState } from 'react'
import type { MFDetail, FundStats } from '@/api/dataTypes'
import { fetchFundDetail } from '@/api/mfapiClient'
import { computeStats } from '@/lib/fundStats'

interface State {
  detail: MFDetail | null
  stats: FundStats | null
  isLoading: boolean
  error: string | null
}

const INIT: State = { detail: null, stats: null, isLoading: true, error: null }

export function useFundDetail(schemeCode: string) {
  const [state, setState] = useState<State>(INIT)

  useEffect(() => {
    if (!schemeCode) return
    setState(INIT)
    fetchFundDetail(schemeCode)
      .then(detail => {
        const stats = computeStats(detail.data)
        setState({ detail, stats, isLoading: false, error: null })
      })
      .catch(e => setState({ detail: null, stats: null, isLoading: false, error: String(e) }))
  }, [schemeCode])

  return state
}
