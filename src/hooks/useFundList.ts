import { useQuery } from '@tanstack/react-query'
import { fetchAllSchemes } from '@/api/mfapiClient'
import { fetchActiveSchemeCodes } from '@/api/amfiClient'
import { cacheGet, cacheSet, cacheKey } from '@/lib/cache'

// Lightweight fund type — 4x less memory than EnrichedScheme
export interface LightFund {
  c: number     // schemeCode
  n: string     // schemeName
  g: string     // category
  r: number     // risk 0=Low 1=Moderate 2=High 3=VeryHigh
  h: string     // fundHouse
}

export const RISK_LABELS = ['Low', 'Moderate', 'High', 'Very High'] as const

// Category extraction patterns
const CAT_PATTERNS: Array<[RegExp, string]> = [
  [/Large\s*Cap/i, 'Large Cap'], [/Mid\s*Cap/i, 'Mid Cap'], [/Small\s*Cap/i, 'Small Cap'],
  [/Flexi\s*Cap/i, 'Flexi Cap'], [/Multi\s*Cap/i, 'Multi Cap'],
  [/Large\s*&?\s*Mid/i, 'Large & Mid'], [/ELSS/i, 'ELSS'],
  [/Index\s*Fund/i, 'Index Fund'], [/ETF/i, 'ETF'],
  [/Sectoral|Thematic|Technology|Pharma|Infrastructure|Banking|Energy|Consumption|MNC|Dividend Yield/i, 'Sectoral/Thematic'],
  [/International|Global|\bU\.?S\.?\b|Nasdaq|S&P/i, 'International'],
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

function cat(fundName: string): string {
  for (const [p, l] of CAT_PATTERNS) { if (p.test(fundName)) return l }
  return 'Other'
}

function risk(category: string): number {
  const c = category.toLowerCase()
  if (/liquid|overnight|money market|ultra short|low duration/.test(c)) return 0
  if (/short|floater|banking|corp|gilt|debt|credit|medium|arb|conserv/i.test(c)) return 1
  if (/large|multi|flexi|large & mid|balanced|index|etf|focus|value|dividend|dyn/i.test(c)) return 1
  if (/mid cap|contra/i.test(c)) return 2
  if (/small|sector|thematic|elss|infra|international|fof|aggr/i.test(c)) return 3
  return 1
}

function house(fundName: string): string {
  const words = fundName.split(' ').filter(w => w.length > 1 && !/^(Fund|Plan|Growth|Dividend|Direct|Regular|Cap|ETF)$/i.test(w))
  return words.slice(0, 2).join(' ')
}

function enrich(
  raw: { schemeCode: number; schemeName: string }[],
  active: Set<number>,
): LightFund[] {
  // MFAPI returns duplicate schemeCode entries — dedupe so React keys stay unique
  const seen = new Set<number>()
  const result: LightFund[] = []
  // When the AMFI manifest is available, keep only currently-active schemes;
  // if it failed to load (empty set) we fall back to the full list rather than
  // showing nothing.
  const filterActive = active.size > 0
  for (let i = 0; i < raw.length; i++) {
    const s = raw[i]
    if (seen.has(s.schemeCode)) continue
    if (filterActive && !active.has(s.schemeCode)) continue
    seen.add(s.schemeCode)
    const fundName = s.schemeName.split(' — ')[0].trim()
    const cg = cat(fundName)
    result.push({
      c: s.schemeCode,
      n: s.schemeName,
      g: cg,
      r: risk(cg),
      h: house(fundName),
    })
  }
  return result
}

export function useFundList() {
  return useQuery<LightFund[]>({
    queryKey: ['fundList'],
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    queryFn: async () => {
      // v6: fund universe pruned to AMFI-active schemes (drops ~62% dead/defunct)
      const cached = await cacheGet<LightFund[]>(cacheKey(['funds', 'v6']))
      if (cached) return cached
      const [raw, active] = await Promise.all([fetchAllSchemes(), fetchActiveSchemeCodes()])
      const enriched = enrich(raw, active)
      cacheSet(cacheKey(['funds', 'v6']), enriched, 86_400_000)
      return enriched
    },
    placeholderData: (prev) => prev,
  })
}
