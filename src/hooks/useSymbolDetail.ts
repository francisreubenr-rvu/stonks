import { useEffect, useState } from 'react'
import type { Quote, Fundamentals, EodBar } from '@/api/dataTypes'
import { fetchQuote } from '@/api/indianMarketClient'
import { fetchFundamentals, fetchEodBars } from '@/api/eodhdClient'

interface State {
  quote: Quote | null
  fundamentals: Fundamentals | null
  eodBars: EodBar[]
  isLoading: boolean
  error: string | null
}

const INIT: State = { quote: null, fundamentals: null, eodBars: [], isLoading: true, error: null }

export function useSymbolDetail(symbol: string) {
  const [state, setState] = useState<State>(INIT)
  useEffect(() => {
    if (!symbol) return
    setState(INIT)
    Promise.all([fetchQuote(symbol), fetchFundamentals(symbol), fetchEodBars(symbol, 30)])
      .then(([quote, fundamentals, eodBars]) =>
        setState({ quote, fundamentals, eodBars, isLoading: false, error: null })
      )
      .catch(e => setState(s => ({ ...s, isLoading: false, error: String(e) })))
  }, [symbol])
  return state
}
