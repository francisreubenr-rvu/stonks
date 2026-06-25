export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Very High'

export function riskFromCategory(category: string): RiskLevel {
  const c = category.toLowerCase()
  if (/liquid|overnight|money market|ultra short|low duration/.test(c)) return 'Low'
  if (/short duration|floater|banking and psu|corporate bond|gilt|debt|credit risk|medium/.test(c)) return 'Moderate'
  if (/large cap|balanced|conservative hybrid|equity savings|multi asset|dynamic asset/.test(c)) return 'Moderate'
  if (/flexi cap|multi cap|large & mid|aggressive hybrid/.test(c)) return 'Moderate'
  if (/mid cap/.test(c)) return 'High'
  if (/small cap|sectoral|thematic|elss|infrastructure|international|fof|fund of fund/.test(c)) return 'Very High'
  return 'Moderate'
}
