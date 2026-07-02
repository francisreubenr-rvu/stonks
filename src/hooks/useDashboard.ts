import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { DashboardData, MarketMover, SectorPerformance } from '@/api/dataTypes'
import { fetchIndices, type IndicesResult } from '@/api/nseClient'

export function useDashboard() {
  const { data: result, ...rest } = useQuery<IndicesResult>({
    queryKey: ['indices'],
    queryFn: fetchIndices,
    staleTime: 60_000,
    refetchInterval: 120_000,
  })
  const indices = useMemo(() => result?.indices ?? [], [result])
  const isLive = result?.source === 'live'

  const dashboard = useMemo<DashboardData>(() => {
    // Broad-market and SIZE indices are not sectors — Midcap/Smallcap gauges
    // in a "Sector performance" panel would be a category error. Only true
    // sector indices (Bank, IT, Pharma, Auto, FMCG) pass through.
    const NON_SECTOR = new Set(['NIFTY 50', 'NIFTY NEXT 50', 'NIFTY MIDCAP 100', 'NIFTY SMLCAP 100'])
    const sectorIndices = indices.filter(i =>
      i.symbol.includes('NIFTY') && !NON_SECTOR.has(i.symbol)
    )
    // "gainers"/"losers"/"advanceDecline" below are derived from sector
    // INDICES (NIFTY IT, NIFTY PHARMA, ...), not individual stocks — the app
    // does not fetch a real per-stock movers/breadth feed. Labeled honestly
    // as "Sector Leaders/Laggards" and "Sector Breadth" in DashboardPage.

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
      // Only claim a fetch time when the data actually came from the live
      // feed this session — stamping "now" onto a static snapshot is a lie.
      lastUpdated: isLive ? new Date().toISOString() : null,
      isLive,
    }
  }, [indices, isLive])

  return { data: dashboard, ...rest }
}
