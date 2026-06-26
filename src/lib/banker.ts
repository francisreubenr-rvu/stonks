import type { EnrichedScheme, RiskLevel } from '@/hooks/useFundList'
import type { FundStats } from '@/api/dataTypes'

export type BankerRisk = 'Conservative' | 'Moderate' | 'Aggressive'

const RISK_ORDER: Record<RiskLevel, number> = {
  'Low': 0, 'Moderate': 1, 'High': 2, 'Very High': 3,
}

const RISK_TO_PROFILE: Record<BankerRisk, { min: number; max: number }> = {
  Conservative: { min: 0, max: 1 },
  Moderate:     { min: 0, max: 2 },
  Aggressive:   { min: 1, max: 3 },
}

export function filterByProfile(schemes: EnrichedScheme[], profile: BankerRisk): EnrichedScheme[] {
  const range = RISK_TO_PROFILE[profile]
  return schemes.filter(s => {
    const riskNum = RISK_ORDER[s.risk]
    return riskNum >= range.min && riskNum <= range.max
  })
}

export function scoreFund(fund: EnrichedScheme, stats: FundStats | null): number {
  let score = 50

  // Base score from risk (higher risk = higher potential)
  score += RISK_ORDER[fund.risk] * 10

  if (stats) {
    // CAGR 1Y: +0 to +25
    if (stats.cagr1y !== null) {
      score += Math.min(Math.max((stats.cagr1y - 0.06) * 200, -15), 25)
    }
    // Sortino ratio: +0 to +15
    if (stats.sortino !== null && stats.sortino > 0) {
      score += Math.min(stats.sortino * 5, 15)
    }
    // Win rate: +0 to +10
    score += stats.winRate * 10
    // Max drawdown penalty: -5 to -15
    const dd = Math.abs(stats.maxDrawdown)
    if (dd > 0.3) score -= 15
    else if (dd > 0.2) score -= 8
    else if (dd > 0.1) score -= 3
    // Data points bonus (more history = more reliable)
    if (stats.dataPoints > 365) score += 5
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

export const INSIGHTS: Record<BankerRisk, string[]> = {
  Conservative: [
    'Focus on funds with low volatility and high win rates',
    'Liquid and low-duration debt funds protect capital',
    'Gilt funds offer sovereign safety with moderate returns',
    'Consider balanced hybrid funds for equity exposure with downside protection',
  ],
  Moderate: [
    'Large cap equity funds offer growth with controlled risk',
    'Flexi cap funds adapt to market conditions dynamically',
    'Multi-asset funds diversify across equities, debt, and gold',
    'ELSS funds combine tax benefits with equity growth',
  ],
  Aggressive: [
    'Small cap funds offer highest growth potential over 5+ years',
    'Sectoral/thematic funds ride specific industry cycles',
    'International funds provide geographical diversification',
    'Consider pharma and technology sectors for structural growth',
  ],
}

export interface InvestmentProfile {
  horizon: string       // '<1Y' | '1-3Y' | '3-5Y' | '5-10Y' | '10Y+'
  fundCount: number
  amount: string        // '<50K' | '50K-2L' | '2L-10L' | '10L+'
  frequency: string     // 'Lumpsum' | 'Monthly SIP' | 'Quarterly'
}

export function adjustScoreForProfile(
  score: number,
  fund: EnrichedScheme,
  profile: InvestmentProfile,
): number {
  let adjusted = score

  // Longer horizon → favour higher risk
  if (profile.horizon === '10Y+' && fund.risk === 'Very High') adjusted += 10
  else if (profile.horizon === '5-10Y' && (fund.risk === 'High' || fund.risk === 'Very High')) adjusted += 5
  else if (profile.horizon === '<1Y' && fund.risk !== 'Low') adjusted -= 10

  // Larger amounts → favour diversification (mid/large cap)
  if (profile.amount === '10L+' && fund.category === 'Large Cap') adjusted += 5
  if (profile.amount === '10L+' && fund.risk === 'Very High') adjusted -= 5

  // SIP → favour funds with long history
  if (profile.frequency === 'Monthly SIP' && fund.category !== 'Liquid') adjusted += 3

  // Fewer funds → need high conviction picks
  if (profile.fundCount <= 3) adjusted += 5
  else if (profile.fundCount >= 8) adjusted -= 3 // diversify means accept slightly lower

  return Math.max(0, Math.min(100, Math.round(adjusted)))
}

export const PROFILE_LABELS: Record<BankerRisk, { title: string; desc: string }> = {
  Conservative: {
    title: 'Capital Preservation',
    desc: 'Low volatility · Debt-heavy · Sleep well at night',
  },
  Moderate: {
    title: 'Balanced Growth',
    desc: 'Moderate risk · Blend of equity and debt · Steady compounding',
  },
  Aggressive: {
    title: 'High Growth',
    desc: 'Maximum returns · High volatility tolerance · Long time horizon',
  },
}
