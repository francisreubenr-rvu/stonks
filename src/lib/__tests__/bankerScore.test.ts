import { describe, it, expect } from 'vitest'
import { scoreCohort, isGrowthPlan, dedupePlans, horizonReturn, type Candidate } from '../bankerScore'
import { amcTier } from '../amc'
import type { LightFund } from '@/hooks/useFundList'
import type { FundStats } from '@/api/dataTypes'

function fund(n: string, c = 1, g = 'Large Cap', r = 2): LightFund {
  return { c, n, g, r, h: n.split(' ').slice(0, 2).join(' ') }
}

function stats(over: Partial<FundStats>): FundStats {
  return {
    currentNav: 100, inceptionNav: 10, dataPoints: 2000,
    cagr1m: 0.01, cagr3m: 0.03, cagr6m: 0.06,
    cagr1y: 0.12, cagr3y: 0.14, cagr5y: 0.13, cagrInception: 0.12,
    annualizedVol: 0.15, maxDrawdown: -0.12, maxDrawdownDurationDays: 90,
    recoveryDays: 60, sharpe: 0.8, sortino: 1.2,
    positiveMonths: 40, negativeMonths: 20, winRate: 0.66,
    bestMonth: 0.08, worstMonth: -0.06, avgMonthlyReturn: 0.01,
    rolling1yMin: 0.02, rolling1yMax: 0.25, rolling1yAvg: 0.12,
    ...over,
  }
}

describe('isGrowthPlan — IDCW/payout plans are excluded (their NAV math lies)', () => {
  it('accepts growth plans', () => {
    expect(isGrowthPlan('HDFC Flexi Cap Fund - Direct Plan - Growth')).toBe(true)
    expect(isGrowthPlan('SBI Large Cap Fund - Growth Option')).toBe(true)
  })
  it('rejects IDCW and dividend payout plans', () => {
    expect(isGrowthPlan('Bandhan Low Duration Fund - Direct Plan - Daily IDCW')).toBe(false)
    expect(isGrowthPlan('Franklin India Credit Risk Fund - Direct - IDCW')).toBe(false)
    expect(isGrowthPlan('Nippon Fund - Monthly Dividend Payout')).toBe(false)
  })
  it('rejects plans that are neither growth nor payout-marked (ambiguous)', () => {
    expect(isGrowthPlan('Some Fund - Direct Plan')).toBe(false)
  })
  it('rejects non-investable schemes: segregated portfolios, FMPs, series, interval funds', () => {
    expect(isGrowthPlan('Nippon India Equity Savings Fund - Segregated Portfolio 1 - Growth')).toBe(false)
    expect(isGrowthPlan('Kotak Fixed Maturity Plan Series 292 - Growth')).toBe(false)
    expect(isGrowthPlan('SBI FMP - Growth')).toBe(false)
    expect(isGrowthPlan('Axis Capital Builder Fund Series 4 - Growth')).toBe(false)
    expect(isGrowthPlan('Invesco India Interval Fund - Growth')).toBe(false)
  })
})

describe('dedupePlans — Direct wins over Regular for the same fund', () => {
  it('collapses twins and keeps Direct', () => {
    const twins = [
      fund('HDFC Flexi Cap Fund - Regular Plan - Growth', 1),
      fund('HDFC Flexi Cap Fund - Direct Plan - Growth', 2),
    ]
    const out = dedupePlans(twins)
    expect(out).toHaveLength(1)
    expect(out[0].n).toContain('Direct')
  })
  it('keeps genuinely different funds apart', () => {
    const out = dedupePlans([
      fund('HDFC Flexi Cap Fund - Direct Plan - Growth', 1),
      fund('HDFC Large Cap Fund - Direct Plan - Growth', 2),
    ])
    expect(out).toHaveLength(2)
  })
})

describe('amcTier — reputation registry', () => {
  it('recognises established houses as tier 1', () => {
    expect(amcTier('SBI Large Cap Fund - Direct - Growth')).toBe(1)
    expect(amcTier('ICICI Prudential Bluechip Fund - Growth')).toBe(1)
    expect(amcTier('HDFC Flexi Cap Fund - Growth')).toBe(1)
  })
  it('recognises mid-tier houses as tier 2', () => {
    expect(amcTier('Parag Parikh Flexi Cap Fund - Direct - Growth')).toBe(2)
    expect(amcTier('Quant Small Cap Fund - Growth')).toBe(2)
  })
  it('defaults unknown houses to tier 3', () => {
    expect(amcTier('Totally New AMC Alpha Fund - Growth')).toBe(3)
  })
})

describe('scoreCohort — cohort-relative, discriminating, deterministic', () => {
  const strong: Candidate = {
    scheme: fund('HDFC Strong Fund - Direct - Growth', 1),
    stats: stats({ sortino: 2.5, cagr3y: 0.18, maxDrawdown: -0.06, winRate: 0.75 }),
  }
  const weak: Candidate = {
    scheme: fund('HDFC Weak Fund - Direct - Growth', 2),
    stats: stats({ sortino: 0.2, cagr3y: 0.04, maxDrawdown: -0.35, winRate: 0.45 }),
  }
  const mid: Candidate = {
    scheme: fund('HDFC Middle Fund - Direct - Growth', 3),
    stats: stats({}),
  }

  it('ranks better numbers higher, with clear score separation', () => {
    const scored = scoreCohort([strong, weak, mid], '3-5Y')
    const byName = Object.fromEntries(scored.map(s => [s.scheme.n, s.score]))
    expect(byName['HDFC Strong Fund - Direct - Growth']).toBeGreaterThan(byName['HDFC Middle Fund - Direct - Growth'])
    expect(byName['HDFC Middle Fund - Direct - Growth']).toBeGreaterThan(byName['HDFC Weak Fund - Direct - Growth'])
    // No 100/100 saturation: strong ≠ weak by a real margin
    expect(byName['HDFC Strong Fund - Direct - Growth'] - byName['HDFC Weak Fund - Direct - Growth']).toBeGreaterThan(30)
  })

  it('is deterministic — same inputs, same output', () => {
    const a = scoreCohort([strong, weak, mid], '3-5Y')
    const b = scoreCohort([strong, weak, mid], '3-5Y')
    expect(a).toEqual(b)
  })

  it('gives established houses a bounded edge, never a verdict', () => {
    const tier1 = { scheme: fund('SBI Fund - Direct - Growth', 1), stats: stats({}) }
    const tier3good = {
      scheme: fund('Unknown House Fund - Direct - Growth', 2),
      stats: stats({ sortino: 3.0, cagr3y: 0.2, maxDrawdown: -0.05, winRate: 0.8 }),
    }
    const scored = scoreCohort([tier1, tier3good], '3-5Y')
    const winner = scored.sort((a, b) => b.score - a.score)[0]
    // Better numbers beat better branding
    expect(winner.scheme.n).toContain('Unknown House')
  })

  it('handles empty and single-candidate cohorts', () => {
    expect(scoreCohort([], '3-5Y')).toEqual([])
    const one = scoreCohort([mid], '3-5Y')
    expect(one).toHaveLength(1)
    expect(one[0].score).toBeGreaterThan(0)
    expect(one[0].score).toBeLessThanOrEqual(100)
  })
})

describe('risk appetite tilts the weights', () => {
  const highReturnDeepDD: Candidate = {
    scheme: fund('HDFC Smallcap Style Fund - Direct - Growth', 1, 'Small Cap', 3),
    stats: stats({ cagr3y: 0.28, maxDrawdown: -0.30, winRate: 0.55, sortino: 1.4, rolling1yMin: -0.1, rolling1yMax: 0.5 }),
  }
  const lowReturnShallowDD: Candidate = {
    scheme: fund('HDFC Steady Fund - Direct - Growth', 2, 'Corporate Bond', 1),
    stats: stats({ cagr3y: 0.07, maxDrawdown: -0.01, winRate: 0.97, sortino: 1.4, rolling1yMin: 0.05, rolling1yMax: 0.09 }),
  }
  it('Aggressive prefers the high-return fund; Conservative prefers the protected one', () => {
    const agg = scoreCohort([highReturnDeepDD, lowReturnShallowDD], '3-5Y', 'Aggressive')
    const con = scoreCohort([highReturnDeepDD, lowReturnShallowDD], '3-5Y', 'Conservative')
    const top = (arr: typeof agg) => [...arr].sort((a, b) => b.score - a.score)[0].scheme.n
    expect(top(agg)).toContain('Smallcap')
    expect(top(con)).toContain('Steady')
  })
})

describe('horizonReturn — the window follows the money', () => {
  const s = stats({ cagr1y: 0.10, cagr3y: 0.14, cagr5y: 0.16 })
  it('short horizon uses 1Y', () => expect(horizonReturn(s, '<1Y')).toBe(0.10))
  it('medium horizon uses 3Y', () => expect(horizonReturn(s, '3-5Y')).toBe(0.14))
  it('long horizon uses 5Y', () => expect(horizonReturn(s, '10Y+')).toBe(0.16))
  it('falls back when the window is missing', () => {
    expect(horizonReturn(stats({ cagr5y: null, cagr3y: 0.14 }), '10Y+')).toBe(0.14)
  })
})
