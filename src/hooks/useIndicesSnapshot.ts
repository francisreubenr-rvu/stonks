import { useQuery } from '@tanstack/react-query'
import { fetchIndices } from '@/api/nseClient'

export function useIndicesSnapshot() {
  return useQuery({
    queryKey: ['indices'],
    queryFn: fetchIndices,
    staleTime: 60_000,
  })
}
