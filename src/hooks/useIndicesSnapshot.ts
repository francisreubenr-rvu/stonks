import { useQuery } from '@tanstack/react-query'
import { fetchIndices, type IndicesResult } from '@/api/nseClient'

/** Tracked indices plus provenance ('live' | 'snapshot') so consumers can
 *  disclose data freshness honestly instead of guessing from the values. */
export function useIndicesSnapshot() {
  return useQuery<IndicesResult>({
    queryKey: ['indices'],
    queryFn: fetchIndices,
    staleTime: 60_000,
  })
}
