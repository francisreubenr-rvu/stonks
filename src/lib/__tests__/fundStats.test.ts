import { describe, it, expect } from 'vitest'
import { computeStats, computeYearlyReturns } from '../fundStats'
import type { NavPoint } from '@/api/dataTypes'

function ddmmyyyy(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`
}

/** Build `count` daily NAV points starting `startDate`, one per calendar day. */
function daily(startDate: Date, navs: number[]): NavPoint[] {
  return navs.map((nav, i) => {
    const d = new Date(startDate.getTime() + i * 86_400_000)
    return { date: ddmmyyyy(d), nav }
  })
}

describe('computeStats — empty input', () => {
  it('returns null instead of throwing for an empty NAV series', () => {
    expect(computeStats([])).toBeNull()
  })
})

describe('computeStats — CAGR', () => {
  it('computes ~100% 1Y CAGR for a NAV that doubles over 365 days', () => {
    const start = new Date(2023, 0, 1)
    const navs: number[] = []
    for (let i = 0; i <= 365; i++) {
      // exponential growth from 100 -> 200 over 365 days
      navs.push(100 * Math.pow(2, i / 365))
    }
    const stats = computeStats(daily(start, navs))
    expect(stats.cagr1y).not.toBeNull()
    expect(stats.cagr1y!).toBeCloseTo(1.0, 1)
  })

  it('returns null CAGR fields when there is no data far enough back', () => {
    const start = new Date(2024, 0, 1)
    const navs = [100, 101, 102, 103, 104]
    const stats = computeStats(daily(start, navs))
    expect(stats.cagr1y).toBeNull()
    expect(stats.cagr3y).toBeNull()
    expect(stats.cagr5y).toBeNull()
  })

  it('is flat (0% CAGR) for a constant NAV series', () => {
    const start = new Date(2022, 0, 1)
    const navs = Array.from({ length: 400 }, () => 100)
    const stats = computeStats(daily(start, navs))
    expect(stats.cagr1y).not.toBeNull()
    expect(stats.cagr1y!).toBeCloseTo(0, 5)
  })
})

describe('computeStats — volatility / Sharpe / Sortino', () => {
  it('is null for a constant (zero-volatility) NAV series', () => {
    const start = new Date(2022, 0, 1)
    const navs = Array.from({ length: 400 }, () => 100)
    const stats = computeStats(daily(start, navs))
    expect(stats.annualizedVol).toBe(0)
    expect(stats.sharpe).toBeNull()
    expect(stats.sortino).toBeNull()
  })

  it('produces a negative Sharpe when 1Y return trails the risk-free rate', () => {
    const start = new Date(2022, 0, 1)
    // Oscillating but net-flat series with real day-to-day volatility, well
    // below the 6.5% risk-free CAGR baseline.
    const navs = Array.from({ length: 400 }, (_, i) => 100 + (i % 2 === 0 ? 1 : -1))
    const stats = computeStats(daily(start, navs))
    expect(stats.annualizedVol).not.toBeNull()
    expect(stats.annualizedVol!).toBeGreaterThan(0)
    expect(stats.sharpe).not.toBeNull()
    expect(stats.sharpe!).toBeLessThan(0)
  })
})

describe('computeStats — max drawdown', () => {
  it('detects a known peak-to-trough drawdown and marks recovery', () => {
    const start = new Date(2023, 0, 1)
    // 100 -> 150 (peak) -> 90 (trough, -40% DD) -> 160 (recovers past peak)
    const navs = [100, 120, 150, 130, 110, 90, 100, 120, 140, 160]
    const stats = computeStats(daily(start, navs))
    expect(stats.maxDrawdown).toBeCloseTo((90 - 150) / 150, 5)
    expect(stats.recoveryDays).not.toBeNull()
    expect(stats.recoveryDays!).toBeGreaterThan(0)
  })

  it('leaves recoveryDays null when the series never recovers past the prior peak', () => {
    const start = new Date(2023, 0, 1)
    const navs = [100, 150, 90, 95, 100, 110]
    const stats = computeStats(daily(start, navs))
    expect(stats.maxDrawdown).toBeLessThan(0)
    expect(stats.recoveryDays).toBeNull()
  })

  it('has zero drawdown for a monotonically rising series', () => {
    const start = new Date(2023, 0, 1)
    const navs = Array.from({ length: 30 }, (_, i) => 100 + i)
    const stats = computeStats(daily(start, navs))
    expect(stats.maxDrawdown).toBe(0)
  })
})

describe('computeStats — monthly win rate', () => {
  it('scores 100% win rate when every month closes higher than it opened', () => {
    const start = new Date(2023, 0, 1)
    const navs: number[] = []
    for (let m = 0; m < 6; m++) {
      for (let d = 0; d < 28; d++) navs.push(100 + m * 10 + d * 0.1)
    }
    const stats = computeStats(daily(start, navs))
    expect(stats.winRate).toBe(1)
    expect(stats.negativeMonths).toBe(0)
  })
})

describe('computeYearlyReturns', () => {
  it('buckets returns by calendar year using first/last NAV in each year', () => {
    const points: NavPoint[] = [
      { date: '01-01-2022', nav: 100 },
      { date: '31-12-2022', nav: 110 },
      { date: '01-01-2023', nav: 110 },
      { date: '31-12-2023', nav: 121 },
    ]
    const yearly = computeYearlyReturns(points)
    expect(yearly).toEqual([
      { year: 2022, return: 0.1 },
      { year: 2023, return: 0.1 },
    ])
  })

  it('skips years with fewer than 2 data points', () => {
    const points: NavPoint[] = [
      { date: '01-01-2022', nav: 100 },
      { date: '31-12-2022', nav: 110 },
      { date: '15-06-2023', nav: 115 },
    ]
    const yearly = computeYearlyReturns(points)
    expect(yearly).toEqual([{ year: 2022, return: 0.1 }])
  })
})
