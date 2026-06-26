import { useQuery } from '@tanstack/react-query'
import type { MFScheme } from '@/api/dataTypes'
import { fetchAllSchemes } from '@/api/mfapiClient'
import { cacheGet, cacheSet, cacheKey } from '@/lib/cache'

export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Very High'

const CATEGORY_PATTERNS: Array<[RegExp, string]> = [
  [/Large\s*Cap/i, 'Large Cap'], [/Mid\s*Cap/i, 'Mid Cap'], [/Small\s*Cap/i, 'Small Cap'],
  [/Flexi\s*Cap/i, 'Flexi Cap'], [/Multi\s*Cap/i, 'Multi Cap'],
  [/Large\s*&?\s*Mid/i, 'Large & Mid'], [/ELSS/i, 'ELSS'],
  [/Index\s*Fund/i, 'Index Fund'], [/ETF/i, 'ETF'],
  [/Sectoral|Thematic|Technology|Pharma|Infrastructure|Banking|Energy|Consumption|MNC|Dividend Yield/i, 'Sectoral/Thematic'],
  [/International|Global|US|Nasdaq|S&P/i, 'International'],
  [/Liquid/i, 'Liquid'], [/Overnight/i, 'Overnight'], [/Ultra\s*Short/i, 'Ultra Short'],
  [/Money\s*Market/i, 'Money Market'], [/Low\s*Duration/i, 'Low Duration'],
  [/Short\s*Duration/i, 'Short Duration'], [/Corporate\s*Bond/i, 'Corporate Bond'],
  [/Gilt/i, 'Gilt'], [/Credit\s*Risk/i, 'Credit Risk'],
  [/Floater/i, 'Floater'], [/Banking\s*and\s*PSU/i, 'Banking and PSU'],
  [/Medium\s*Duration/i, 'Medium Duration'], [/Long\s*Duration/i, 'Long Duration'],
  [/Dynamic\s*Bond/i, 'Dynamic Bond'], [/Conservative\s*Hybrid/i, 'Conservative Hybrid'],
  [/Aggressive\s*Hybrid/i, 'Aggressive Hybrid'], [/Equity\s*Savings/i, 'Equity Savings'],
  [/Balanced\s*Hybrid/i, 'Balanced Hybrid'], [/Multi\s*Asset/i, 'Multi Asset'],
  [/Arbitrage/i, 'Arbitrage'], [/Contra/i, 'Contra'],
  [/Value/i, 'Value'], [/Dividend\s*Yield/i, 'Dividend Yield'],
  [/Focused/i, 'Focused'], [/FOF|Fund\s*of\s*Fund/i, 'FoF'],
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

function extractFundHouse(fundName: string): string {
  const words = fundName.split(' ')
  if (words.length === 1) return words[0]
  if (words.length === 2) return words[0]
  // Try 3 words for houses like "ICICI Prudential", "Nippon India", etc.
  const threeWord = words.slice(0, 3).join(' ')
  for (const prefix of [threeWord, words.slice(0, 2).join(' ')]) {
    if (/^\w[\w\s&]+(?!Fund|Cap|Index|Bond|Gilt|Liquid|ETF|Plan)/i.test(prefix)) {
      return prefix
    }
  }
  return words[0]
}

export interface EnrichedScheme extends MFScheme {
  category: string
  risk: RiskLevel
  fundHouse: string
}

function enrich(raw: MFScheme[]): EnrichedScheme[] {
  return raw.map(s => {
    const parts = s.schemeName.split(' — ')
    const fundName = parts[0].trim()
    const cat = extractCategory(fundName)
    return {
      ...s,
      category: cat,
      risk: classifyRisk(cat),
      fundHouse: extractFundHouse(fundName),
    }
  })
}

export function useFundList() {
  return useQuery<EnrichedScheme[]>({
    queryKey: ['fundList'],
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async () => {
      const cached = await cacheGet<EnrichedScheme[]>(cacheKey(['schemes', 'v2']))
      if (cached) return cached
      const raw = await fetchAllSchemes()
      const enriched = enrich(raw)
      cacheSet(cacheKey(['schemes', 'v2']), enriched, 86400000)
      return enriched
    },
    placeholderData: (prev) => prev,
  })
}
