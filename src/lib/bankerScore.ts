// ─────────────────────────────────────────────────────────────────────────────
//  Banker scoring engine — cohort-relative, horizon-aware.
//
//  Design notes (why the previous engine recommended the wrong funds):
//   1. It scored funds with fixed thresholds (+15 for Sortino > 2, etc.),
//      so most decent funds saturated at 100/100 and ties were broken by
//      name-order accidents. Here every metric is PERCENTILE-RANKED WITHIN
//      THE SCANNED COHORT — scores discriminate by construction.
//   2. It weighted 1Y CAGR regardless of the investor's horizon. Here the
//      return window follows the horizon (<1Y → 1Y, 3-5Y → 3Y, ≥5Y → 5Y or
//      inception).
//   3. It ignored who runs the fund. Here AMC reputation contributes a
//      modest, bounded component (max 10 pts) — a prior, never a verdict.
// ─────────────────────────────────────────────────────────────────────────────

import type { LightFund } from '@/hooks/useFundList'
import type { FundStats } from '@/api/dataTypes'
import { amcTier, AMC_TIER_LABEL } from './amc'

export interface Candidate {
  scheme: LightFund
  stats: FundStats
}

export interface ScoredCandidate extends Candidate {
  score: number       // 0–100, cohort-relative
  reasoning: string[] // top contributing factors, human-readable
}

// Weights sum to 90 per profile; AMC reputation supplies the final 10.
// The risk profile TILTS the weights — without this, cross-category
// percentile scoring lets low-volatility debt sweep every profile, because
// debt always wins drawdown/consistency ranks while equity's edge (returns)
// carries too few points. An Aggressive investor is paying for returns;
// a Conservative one is paying for downside protection. Score accordingly.
export type RiskAppetite = 'Conservative' | 'Moderate' | 'Aggressive'

type WeightKey = 'riskAdjusted' | 'horizonReturn' | 'downside' | 'consistency' | 'stability' | 'trackRecord'

const WEIGHT_PRESETS: Record<RiskAppetite, Record<WeightKey, number>> = {
  //                riskAdj  return  downside  consist  stability  record
  Conservative: { riskAdjusted: 24, horizonReturn: 6,  downside: 27, consistency: 18, stability: 9, trackRecord: 6 },
  Moderate:     { riskAdjusted: 27, horizonReturn: 21, downside: 15, consistency: 15, stability: 6, trackRecord: 6 },
  Aggressive:   { riskAdjusted: 24, horizonReturn: 36, downside: 9,  consistency: 9,  stability: 6, trackRecord: 6 },
}

const AMC_POINTS: Record<1 | 2 | 3, number> = { 1: 10, 2: 6, 3: 2 }

/** Pick the return window that matches how long the money stays invested. */
export function horizonReturn(stats: FundStats, horizon: string): number | null {
  switch (horizon) {
    case '<1Y':  return stats.cagr1y ?? stats.cagr6m
    case '1-3Y': return stats.cagr3y ?? stats.cagr1y
    case '3-5Y': return stats.cagr3y ?? stats.cagr1y
    default:     return stats.cagr5y ?? stats.cagr3y ?? stats.cagrInception // 5-10Y, 10Y+
  }
}

/** Percentile rank of each value within the cohort (0..1, higher = better). */
function percentileRanks(values: Array<number | null>): number[] {
  const present = values.filter((v): v is number => v !== null).sort((a, b) => a - b)
  return values.map(v => {
    if (v === null || present.length <= 1) return 0.5 // unknown → neutral, never a bonus
    let below = 0
    for (const p of present) { if (p < v) below++; else break }
    return below / (present.length - 1)
  })
}

/**
 * Score a cohort of candidates against each other.
 * Deterministic: same candidates + profile → same scores and order.
 */
export function scoreCohort(
  candidates: Candidate[],
  horizon: string,
  appetite: RiskAppetite = 'Moderate',
): ScoredCandidate[] {
  if (candidates.length === 0) return []
  const WEIGHTS = WEIGHT_PRESETS[appetite]

  const metric = {
    riskAdjusted: candidates.map(c => c.stats.sortino ?? c.stats.sharpe),
    horizonReturn: candidates.map(c => horizonReturn(c.stats, horizon)),
    downside: candidates.map(c => -Math.abs(c.stats.maxDrawdown)), // shallower DD ranks higher
    consistency: candidates.map(c => c.stats.winRate as number | null),
    stability: candidates.map(c =>
      c.stats.rolling1yMin !== null && c.stats.rolling1yMax !== null
        ? -(c.stats.rolling1yMax - c.stats.rolling1yMin)
        : null),
    trackRecord: candidates.map(c => c.stats.dataPoints as number | null),
  }

  const ranks = Object.fromEntries(
    Object.entries(metric).map(([k, vals]) => [k, percentileRanks(vals)]),
  ) as Record<WeightKey, number[]>

  return candidates.map((c, i) => {
    const parts: Array<{ label: string; pts: number; max: number }> = (
      Object.keys(WEIGHTS) as Array<WeightKey>
    ).map(k => ({ label: k, pts: ranks[k][i] * WEIGHTS[k], max: WEIGHTS[k] }))

    const tier = amcTier(c.scheme.n)
    const total = parts.reduce((s, p) => s + p.pts, 0) + AMC_POINTS[tier]

    // Reasoning: strongest cohort-relative factors + reputation, honestly worded.
    const reasons: string[] = []
    const strong = [...parts].sort((a, b) => b.pts / b.max - a.pts / a.max)
    const NAME: Record<string, (r: number) => string> = {
      riskAdjusted:  r => `Risk-adjusted returns better than ${Math.round(r * 100)}% of scanned peers`,
      horizonReturn: r => `Returns over your horizon beat ${Math.round(r * 100)}% of scanned peers`,
      downside:      r => `Shallower drawdowns than ${Math.round(r * 100)}% of scanned peers`,
      consistency:   r => `Monthly win rate above ${Math.round(r * 100)}% of scanned peers`,
      stability:     r => `Steadier rolling returns than ${Math.round(r * 100)}% of scanned peers`,
      trackRecord:   r => `Longer track record than ${Math.round(r * 100)}% of scanned peers`,
    }
    for (const p of strong.slice(0, 2)) {
      const r = ranks[p.label as WeightKey][i]
      if (r > 0.55) reasons.push(NAME[p.label](r))
    }
    reasons.push(AMC_TIER_LABEL[tier])
    // Flag genuine weaknesses too — a recommender that only flatters is useless.
    const weak = strong[strong.length - 1]
    const weakRank = ranks[weak.label as WeightKey][i]
    if (weakRank < 0.25 && reasons.length < 3) {
      const WEAK_NAME: Record<string, string> = {
        riskAdjusted: 'Weakest-in-cohort risk-adjusted returns',
        horizonReturn: 'Below-cohort returns over your horizon',
        downside: 'Deeper drawdowns than most scanned peers',
        consistency: 'Below-cohort monthly win rate',
        stability: 'Wider swings in rolling returns',
        trackRecord: 'Shorter history than most scanned peers',
      }
      reasons.push(WEAK_NAME[weak.label])
    }

    return { ...c, score: Math.round(total * 10) / 10, reasoning: reasons.slice(0, 3) }
  })
}

// ── Candidate eligibility ────────────────────────────────────────────────────

/**
 * Growth plans only. IDCW / dividend-payout plans hand cash back to the
 * holder and their published NAV drops on every payout — CAGR, drawdown and
 * Sortino computed from that NAV series are simply WRONG (this was the single
 * biggest source of bad recommendations). "Dividend Yield" as a CATEGORY is
 * fine — that's a strategy, not a payout plan — so match plan keywords only.
 */
export function isGrowthPlan(schemeName: string): boolean {
  const n = schemeName.toLowerCase()
  if (/idcw|payout|reinvest|bonus option|dividend option|- dividend|daily dividend|weekly dividend|monthly dividend|quarterly dividend|annual dividend/i.test(n)) return false
  // Not investable schemes — never candidates:
  //  · segregated portfolios are side-pockets of defaulted paper whose NAV
  //    was written down then partially recovered; their "returns" are
  //    distressed-debt artifacts (a +126% side-pocket once topped a scan)
  //  · FMPs / numbered series / interval funds are closed-end — you can't
  //    buy them today
  if (/segregated|fixed maturity|\bfmp\b|series\s+[ivxlcdm0-9]+|interval fund/i.test(n)) return false
  return /growth/.test(n)
}

/**
 * Collapse Direct/Regular twins of the same underlying fund, preferring
 * Direct (lower expense ratio, same portfolio). Key = name minus plan noise.
 */
export function dedupePlans(funds: LightFund[]): LightFund[] {
  const byBase = new Map<string, LightFund>()
  for (const f of funds) {
    const base = f.n.toLowerCase()
      .replace(/[-–—]?\s*(direct|regular)\s*(plan)?/g, '')
      .replace(/[-–—]?\s*growth( option)?/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    const existing = byBase.get(base)
    const isDirect = /direct/i.test(f.n)
    if (!existing || (isDirect && !/direct/i.test(existing.n))) {
      byBase.set(base, f)
    }
  }
  return [...byBase.values()]
}
