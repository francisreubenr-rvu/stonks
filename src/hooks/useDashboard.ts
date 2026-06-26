import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { DashboardData, MarketMover, SectorPerformance } from '@/api/dataTypes'
import { fetchIndices } from '@/api/nseClient'

export function useDashboard() {
  const { data: indices = [], ...rest } = useQuery({
    queryKey: ['indices'],
    queryFn: fetchIndices,
    staleTime: 60_000,
    refetchInterval: 120_000,
  })

  const dashboard = useMemo<DashboardData>(() => {
    const sectorIndices = indices.filter(i =>
      i.symbol.includes('NIFTY') && i.symbol !== 'NIFTY 50' && i.symbol !== 'SENSEX'
    )

    const sectors: SectorPerformance[] = sectorIndices.map(i => ({
      name: i.name.replace('Nifty ', ''),
      changePct: i.changePct,
    })).sort((a, b) => b.changePct - a.changePct)

    const gainers: MarketMover[] = sectorIndices
      .filter(i => i.changePct > 0)
      .sort((a, b) => b.changePct - a.changePct)
      .slice(0, 5)
      .map(i => ({
        symbol: i.symbol,
        name: i.name,
        price: i.value,
        changePct: i.changePct,
      }))

    const losers: MarketMover[] = sectorIndices
      .filter(i => i.changePct < 0)
      .sort((a, b) => a.changePct - b.changePct)
      .slice(0, 5)
      .map(i => ({
        symbol: i.symbol,
        name: i.name,
        price: i.value,
        changePct: i.changePct,
      }))

    const advances = sectorIndices.filter(i => i.changePct > 0).length
    const declines = sectorIndices.filter(i => i.changePct < 0).length
    const unchanged = sectorIndices.filter(i => i.changePct === 0).length

    return {
      indices,
      gainers,
      losers,
      sectors,
      advanceDecline: { advances, declines, unchanged },
      lastUpdated: new Date().toISOString(),
    }
  }, [indices])

  return { data: dashboard, ...rest }
}
