import { useQuery } from '@tanstack/react-query'
import { fetchFundDetail } from '@/api/mfapiClient'
import { computeStats } from '@/lib/fundStats'

export function useFundDetail(schemeCode: string) {
  return useQuery({
    queryKey: ['fundDetail', schemeCode],
    queryFn: async () => {
      const detail = await fetchFundDetail(schemeCode)
      const stats = computeStats(detail.data) // null when the scheme has no valid NAV history
      return { detail, stats }
    },
    enabled: !!schemeCode,
    staleTime: 600_000,
  })
}
