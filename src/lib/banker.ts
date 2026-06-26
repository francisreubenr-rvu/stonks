import type { LightFund } from '@/hooks/useFundList'

export type BankerRisk = 'Conservative' | 'Moderate' | 'Aggressive'

const RISK_ORDER: Record<number, number> = {
  0: 0, 1: 1, 2: 2, 3: 3,
}

const RISK_TO_PROFILE: Record<BankerRisk, { min: number; max: number }> = {
  Conservative: { min: 0, max: 1 },
  Moderate:     { min: 0, max: 2 },
  Aggressive:   { min: 1, max: 3 },
}

export function filterByProfile(schemes: LightFund[], profile: BankerRisk): LightFund[] {
  const range = RISK_TO_PROFILE[profile]
  return schemes.filter(s => {
    const riskNum = RISK_ORDER[s.r] ?? 1
    return riskNum >= range.min && riskNum <= range.max
  })
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
  horizon: string
  fundCount: number
  amount: string
  frequency: string
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
