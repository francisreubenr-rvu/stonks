// ─────────────────────────────────────────────────────────────────────────────
//  AMC (fund house) reputation registry.
//
//  Tiers reflect public standing by assets under management and operating
//  history in the Indian mutual fund industry — not a performance judgment
//  on any individual scheme. Used by the Banker as (a) a candidate-selection
//  prior and (b) a modest scoring component, never as a hard filter: a
//  Tier-3 fund with excellent numbers still beats a Tier-1 fund with poor ones.
//
//  Matching is done against the scheme name (AMFI scheme names always lead
//  with the AMC brand), case-insensitively, longest-pattern-first so
//  "ICICI Prudential" wins over any shorter overlap.
// ─────────────────────────────────────────────────────────────────────────────

export type AmcTier = 1 | 2 | 3

const TIER_1 = [
  'SBI', 'ICICI Prudential', 'HDFC', 'Nippon India', 'Kotak', 'Aditya Birla',
  'Axis', 'UTI', 'Mirae Asset', 'Tata', 'DSP', 'Bandhan', 'Edelweiss',
]

const TIER_2 = [
  'Franklin', 'Canara Robeco', 'Invesco', 'Motilal Oswal', 'Quant',
  'Sundaram', 'Parag Parikh', 'PPFAS', 'HSBC', 'Baroda BNP', 'LIC MF', 'LIC',
  'PGIM', 'Union', 'Mahindra Manulife', 'JM Financial', 'JM ', '360 ONE',
  'WhiteOak', 'Bajaj Finserv', 'Mirae', 'Bank of India', 'Quantum',
]

// Everything unmatched is Tier 3 — newer or niche houses. Not a rejection;
// simply less institutional track record to lean on.

const PATTERNS: Array<{ re: RegExp; tier: AmcTier }> = [
  ...TIER_1.map(n => ({ re: new RegExp(`^${n.trim()}`, 'i'), tier: 1 as AmcTier })),
  ...TIER_2.map(n => ({ re: new RegExp(`^${n.trim()}`, 'i'), tier: 2 as AmcTier })),
].sort((a, b) => b.re.source.length - a.re.source.length)

export function amcTier(schemeName: string): AmcTier {
  const name = schemeName.trim()
  for (const { re, tier } of PATTERNS) {
    if (re.test(name)) return tier
  }
  return 3
}

export const AMC_TIER_LABEL: Record<AmcTier, string> = {
  1: 'Established house',
  2: 'Recognised house',
  3: 'Emerging house',
}
