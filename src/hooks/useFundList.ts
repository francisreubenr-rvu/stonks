import { useEffect, useState } from 'react'
import type { MFScheme } from '@/api/dataTypes'
import { fetchAllSchemes } from '@/api/mfapiClient'

interface State {
  data: MFScheme[]
  isLoading: boolean
  error: string | null
}

export function useFundList() {
  const [state, setState] = useState<State>({ data: [], isLoading: true, error: null })

  useEffect(() => {
    fetchAllSchemes()
      .then(data => setState({ data, isLoading: false, error: null }))
      .catch(e  => setState({ data: [], isLoading: false, error: String(e) }))
  }, [])

  return state
}
