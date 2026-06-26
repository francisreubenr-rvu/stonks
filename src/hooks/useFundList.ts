import { useQuery } from '@tanstack/react-query'
import type { MFScheme } from '@/api/dataTypes'
import { fetchAllSchemes } from '@/api/mfapiClient'
import { cacheGet, cacheSet, cacheKey } from '@/lib/cache'

export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Very High'

// Extract category keywords from fund name (NOT from plan type suffix)
const CATEGORY_PATTERNS: Array<[RegExp, string]> = [
  [/Large\s*Cap/, 'Large Cap'], [/Mid\s*Cap/, 'Mid Cap'], [/Small\s*Cap/, 'Small Cap'],
  [/Flexi\s*Cap/, 'Flexi Cap'], [/Multi\s*Cap/, 'Multi Cap'],
  [/Large\s*&?\s*Mid/i, 'Large & Mid'], [/ELSS/i, 'ELSS'],
  [/Index\s*Fund/, 'Index Fund'], [/ETF/, 'ETF'],
  [/Sectoral|Thematic|Technology|Pharma|Infrastructure|Banking|Energy|Consumption|MNC|Dividend Yield/, 'Sectoral/Thematic'],
  [/International|Global|US|Nasdaq|S&P/, 'International'],
  [/Liquid/, 'Liquid'], [/Overnight/, 'Overnight'], [/Ultra\s*Short/, 'Ultra Short'],
  [/Money\s*Market/, 'Money Market'], [/Low\s*Duration/, 'Low Duration'],
  [/Short\s*Duration/, 'Short Duration'], [/Corporate\s*Bond/, 'Corporate Bond'],
  [/Gilt/, 'Gilt'], [/Credit\s*Risk/, 'Credit Risk'],
  [/Floater/, 'Floater'], [/Banking\s*and\s*PSU/, 'Banking and PSU'],
  [/Medium\s*Duration/, 'Medium Duration'], [/Long\s*Duration/, 'Long Duration'],
  [/Dynamic\s*Bond/, 'Dynamic Bond'], [/Conservative\s*Hybrid/, 'Conservative Hybrid'],
  [/Aggressive\s*Hybrid/, 'Aggressive Hybrid'], [/Equity\s*Savings/, 'Equity Savings'],
  [/Balanced\s*Hybrid/, 'Balanced Hybrid'], [/Multi\s*Asset/, 'Multi Asset'],
  [/Arbitrage/, 'Arbitrage'], [/Contra/, 'Contra'],
  [/Value/, 'Value'], [/Dividend\s*Yield/, 'Dividend Yield'],
  [/Focused/, 'Focused'], [/FOF|Fund\s*of\s*Fund/, 'FoF'],
]

function extractCategory(fundName: string): string {
  for (const [pattern, label] of CATEGORY_PATTERNS) {
    if (pattern.test(fundName)) return label
  }
  return 'Other'
}

function classifyRisk(category: string): RiskLevel {
  const c = category.toLowerCase()
  if (/liquid|overnight|money market|ultra short|low duration/.test(c)) return 'Low'
  if (/short duration|floater|banking|corporate bond|gilt|debt|credit risk|medium|arbitrage|conservative/i.test(c)) return 'Moderate'
  if (/large cap|multi cap|flexi cap|large & mid|balanced|index|etf|focused|value|dividend|dynamic/i.test(c)) return 'Moderate'
  if (/mid cap|contra/i.test(c)) return 'High'
  if (/small cap|sectoral|thematic|elss|infrastructure|international|fof|aggressive/i.test(c)) return 'Very High'
  return 'Moderate'
}

export interface EnrichedScheme extends MFScheme {
  category: string
  risk: RiskLevel
  fundHouse: string
}

export function useFundList() {
  return useQuery<EnrichedScheme[]>({
    queryKey: ['fundList'],
    queryFn: async () => {
      const cached = await cacheGet<EnrichedScheme[]>(cacheKey(['schemes', 'v2']))
      if (cached) {
        // async refresh in background
        fetchAllSchemes().then(raw => {
          const enriched = raw.map(s => {
            const parts = s.schemeName.split(' — ')
            const fundName = parts[0].trim()
            const cat = extractCategory(fundName)
            return { ...s, category: cat, risk: classifyRisk(cat), fundHouse: parts[0].split(' ').slice(0, 2).join(' ') }
          })
          cacheSet(cacheKey(['schemes', 'v2']), enriched, 86400000)
        })
        return cached
      }
      const raw = await fetchAllSchemes()
      const enriched: EnrichedScheme[] = raw.map(s => {
        const parts = s.schemeName.split(' — ')
        const fundName = parts[0].trim()
        const cat = extractCategory(fundName)
        return { ...s, category: cat, risk: classifyRisk(cat), fundHouse: parts[0].split(' ').slice(0, 2).join(' ') }
      })
      cacheSet(cacheKey(['schemes', 'v2']), enriched, 86400000)
      return enriched
    },
    staleTime: 3600_000,
  })
}
