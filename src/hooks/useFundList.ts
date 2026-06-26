import { useQuery } from '@tanstack/react-query'
import type { MFScheme } from '@/api/dataTypes'
import { fetchAllSchemes } from '@/api/mfapiClient'
import { cacheGet, cacheSet, cacheKey } from '@/lib/cache'

export function useFundList() {
  return useQuery({
    queryKey: ['fundList'],
    queryFn: async () => {
      const cached = await cacheGet<MFScheme[]>(cacheKey(['schemes']))
      if (cached) {
        fetchAllSchemes().then(data => cacheSet(cacheKey(['schemes']), data, 3600000))
        return cached
      }
      const data = await fetchAllSchemes()
      cacheSet(cacheKey(['schemes']), data, 3600000)
      return data
    },
    staleTime: 3600_000,
  })
}
