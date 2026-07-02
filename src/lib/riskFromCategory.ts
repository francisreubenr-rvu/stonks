import { cat, risk, RISK_LABELS } from '@/hooks/useFundList'

export type RiskLevel = (typeof RISK_LABELS)[number]

// Single source of truth for category→risk lives in useFundList's cat()/risk()
// pair (used by the screener and the Banker). This used to be a second,
// independently-maintained regex table that could disagree with the first
// and badge the same fund differently depending on which page you were on.
export function riskFromCategory(category: string): RiskLevel {
  return RISK_LABELS[risk(cat(category))]
}
