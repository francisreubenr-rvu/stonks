// ┌─────────────────────────────────────────────────────────────┐
// │  THE ORACLE OF OMAHA — Warren Buffett Investment Engine     │
// │  "Price is what you pay. Value is what you get."            │
// └─────────────────────────────────────────────────────────────┘
//
// This module encodes Warren Buffett's investment philosophy into
// a fund selection algorithm. Every principle, every quote, every
// scoring weight draws directly from his shareholder letters,
// interviews, and documented practices.

import type { EnrichedScheme, RiskLevel } from '@/hooks/useFundList'
import type { FundStats } from '@/api/dataTypes'
import type { InvestmentProfile } from './banker'

// ═══════════════════════════════════════════════════════════════
//  THE ORACLE'S VOICE — Quotes organized by theme
// ═══════════════════════════════════════════════════════════════

export const ORACLE_QUOTES = {
  value: [
    "Price is what you pay. Value is what you get.",
    "It's far better to buy a wonderful company at a fair price than a fair company at a wonderful price.",
    "The stock market is a device for transferring money from the impatient to the patient.",
    "Whether we're talking about socks or stocks, I like buying quality merchandise when it is marked down.",
    "Long ago, Ben Graham taught me that price is what you pay; value is what you get.",
  ],
  patience: [
    "Someone's sitting in the shade today because someone planted a tree a long time ago.",
    "No matter how great the talent or efforts, some things just take time.",
    "The most important quality for an investor is temperament, not intellect.",
    "Our favorite holding period is forever.",
    "If you aren't willing to own a stock for ten years, don't even think about owning it for ten minutes.",
  ],
  risk: [
    "Risk comes from not knowing what you're doing.",
    "Only when the tide goes out do you discover who's been swimming naked.",
    "The first rule of investment is don't lose money. The second rule is don't forget the first rule.",
    "You only find out who is swimming naked when the tide goes out.",
    "Never invest in a business you cannot understand.",
  ],
  markets: [
    "Be fearful when others are greedy and greedy when others are fearful.",
    "The market, like the Lord, helps those who help themselves. But unlike the Lord, the market does not forgive those who know not what they do.",
    "In the short run, the market is a voting machine. In the long run, it's a weighing machine.",
    "A simple rule dictates my buying: Be fearful when others are greedy, and be greedy when others are fearful.",
  ],
  discipline: [
    "The difference between successful people and really successful people is that really successful people say no to almost everything.",
    "You don't need to be a rocket scientist. Investing is not a game where the guy with the 160 IQ beats the guy with 130 IQ.",
    "Diversification is protection against ignorance. It makes little sense if you know what you are doing.",
    "Wide diversification is only required when investors do not understand what they are doing.",
    "An investor needs to do very few things right as long as he or she avoids big mistakes.",
  ],
  compounding: [
    "My wealth has come from a combination of living in America, some lucky genes, and compound interest.",
    "Time is the friend of the wonderful business, the enemy of the mediocre.",
    "The most powerful force in the universe is compound interest.",
  ],
  quality: [
    "When a management with a reputation for brilliance tackles a business with a reputation for bad economics, it is the reputation of the business that remains intact.",
    "It takes 20 years to build a reputation and five minutes to ruin it.",
    "Look for three things in a person: intelligence, energy, and integrity. If they don't have the last one, don't even bother with the first two.",
    "A great investment opportunity occurs when a marvelous business encounters a one-time huge, but solvable, problem.",
  ],
  mistakes: [
    "The most important thing to do if you find yourself in a hole is to stop digging.",
    "Honesty is a very expensive gift. Don't expect it from cheap people.",
    "Should you find yourself in a chronically leaking boat, energy devoted to changing vessels is likely to be more productive than energy devoted to patching leaks.",
  ],
  independence: [
    "I will tell you how to become rich. Close the doors. Be fearful when others are greedy. Be greedy when others are fearful.",
    "You are neither right nor wrong because the crowd disagrees with you.",
    "Wall Street is the only place that people ride to in a Rolls Royce to get advice from those who take the subway.",
  ],
  simplicity: [
    "The business schools reward difficult complex behavior more than simple behavior, but simple behavior is more effective.",
    "I don't look to jump over 7-foot bars: I look around for 1-foot bars that I can step over.",
    "There seems to be some perverse human characteristic that likes to make easy things difficult.",
  ],
}

// Pick a random quote for a theme
export function oracleQuote(theme?: keyof typeof ORACLE_QUOTES): string {
  const themes = theme ? [theme] : (Object.keys(ORACLE_QUOTES) as (keyof typeof ORACLE_QUOTES)[])
  const pick = themes[Math.floor(Math.random() * themes.length)]
  const quotes = ORACLE_QUOTES[pick]
  return quotes[Math.floor(Math.random() * quotes.length)]
}

// ═══════════════════════════════════════════════════════════════
//  BUFFETT'S FUND SELECTION PRINCIPLES
//  Each principle maps to a concrete scoring rule
// ═══════════════════════════════════════════════════════════════

export const PRINCIPLES: Array<{
  name: string
  quote: string
  rule: string
}> = [
  {
    name: 'Margin of Safety',
    quote: 'The first rule is don\'t lose money.',
    rule: 'Prefer funds with low drawdowns and high Sortino ratios. Downside protection matters more than upside capture.',
  },
  {
    name: 'Circle of Competence',
    quote: 'Never invest in a business you cannot understand.',
    rule: 'Large cap and balanced funds are understandable. Avoid overly complex strategies like arbitrage and derivatives-heavy funds.',
  },
  {
    name: 'Long-Term Horizon',
    quote: 'Our favorite holding period is forever.',
    rule: 'Favor funds with 5+ years of track record. Ignore 1-month and 3-month performance — they are noise.',
  },
  {
    name: 'Quality at Fair Price',
    quote: 'It\'s far better to buy a wonderful company at a fair price.',
    rule: 'Steady, consistent CAGR wins over volatile, spectacular short-term returns. Prefer high Sharpe ratios.',
  },
  {
    name: 'Beware the Crowd',
    quote: 'Be fearful when others are greedy.',
    rule: 'Avoid funds that have been top performers in the last 3 months — they attract hot money and mean-revert.',
  },
  {
    name: 'The Compounding Machine',
    quote: 'Time is the friend of the wonderful business.',
    rule: 'Favor funds with data spanning 1,000+ days. Compounding only works over time. Young funds are unproven.',
  },
  {
    name: 'Concentration Over Diversification',
    quote: 'Diversification is protection against ignorance.',
    rule: 'Recommend fewer, higher-conviction picks. 3-5 excellent funds beat 15 mediocre ones.',
  },
  {
    name: 'Ignore the Macro',
    quote: 'I don\'t read economic forecasts. I don\'t read funny papers.',
    rule: 'Don\'t time markets. Consistent SIP beats trying to predict tops and bottoms.',
  },
  {
    name: 'Owner Earnings',
    quote: 'I look for businesses I understand with favorable long-term prospects.',
    rule: 'Prefer funds investing in companies with durable competitive advantages — large cap, quality, value-oriented funds.',
  },
  {
    name: 'Frugality Compounds',
    quote: 'Do not save what is left after spending, but spend what is left after saving.',
    rule: 'Every rupee saved in fees compounds. Prefer direct plans over regular plans when available.',
  },
]

// ═══════════════════════════════════════════════════════════════
//  THE BUFFETT SCORE (0-100)
//  "If you aren't thinking about owning a fund for ten years,
//   don't even think about owning it for ten minutes."
// ═══════════════════════════════════════════════════════════════

// Categories Buffett would avoid
const BUFFETT_AVOID: string[] = [
  'Sectoral/Thematic', 'International', 'Arbitrage',
]

// Categories Buffett favors
const BUFFETT_FAVOR: string[] = [
  'Large Cap', 'Flexi Cap', 'Value', 'Contra', 'Dividend Yield',
  'ELSS', 'Balanced Hybrid', 'Conservative Hybrid',
]

// Risk levels Buffett prefers (moderate, understandable businesses)
const BUFFETT_RISK_BONUS: Record<RiskLevel, number> = {
  'Low':       0,
  'Moderate':  10,
  'High':     -5,
  'Very High': -15,
}

export function buffettScore(
  fund: EnrichedScheme,
  stats: FundStats | null,
  _profile: InvestmentProfile,
): { score: number; reasoning: string[] } {
  let score = 50
  const reasons: string[] = []

  // ── 1. Circle of Competence (category preference) ──────────
  if (BUFFETT_AVOID.includes(fund.category)) {
    score -= 20
    reasons.push('Avoids this category — outside circle of competence')
  }
  if (BUFFETT_FAVOR.includes(fund.category)) {
    score += 10
    reasons.push('Favored category — understandable, durable businesses')
  }

  // ── 2. Risk temperament ────────────────────────────────────
  score += BUFFETT_RISK_BONUS[fund.risk]
  if (fund.risk === 'Very High') {
    reasons.push('Excessive risk — Buffett avoids speculative bets')
  }

  // ── 3. Track record length (compounding needs time) ─────────
  if (stats) {
    if (stats.dataPoints >= 1825) { // 5+ years
      score += 15
      reasons.push('Excellent track record — 5+ years of compounding history')
    } else if (stats.dataPoints >= 1095) {
      score += 10
      reasons.push('Solid track record — 3+ years of data')
    } else if (stats.dataPoints >= 365) {
      score += 5
      reasons.push('Adequate history — 1+ year of data')
    } else {
      score -= 10
      reasons.push('Insufficient track record — compounding needs time')
    }

    // ── 4. Margin of Safety (drawdown penalty) ─────────────────
    const dd = Math.abs(stats.maxDrawdown)
    if (dd < 0.05) {
      score += 15
      reasons.push('Exceptional downside protection — max drawdown < 5%')
    } else if (dd < 0.10) {
      score += 10
      reasons.push('Strong margin of safety — drawdown < 10%')
    } else if (dd < 0.20) {
      score += 5
    } else if (dd > 0.40) {
      score -= 20
      reasons.push('Violates first rule — excessive drawdown > 40%')
    } else if (dd > 0.25) {
      score -= 10
      reasons.push('Concerning drawdown — would test investor conviction')
    }

    // ── 5. Quality at fair price (consistency over flash) ──────
    if (stats.sortino !== null && stats.sortino > 0) {
      if (stats.sortino > 2.0) {
        score += 15
        reasons.push('Outstanding risk-adjusted returns — high Sortino ratio')
      } else if (stats.sortino > 1.0) {
        score += 10
        reasons.push('Strong risk-adjusted returns')
      } else {
        score += 5
      }
    }

    if (stats.sharpe !== null && stats.sharpe > 1.0) {
      score += 5
    }

    // ── 6. Win rate — consistency of compounding ────────────────
    if (stats.winRate > 0.70) {
      score += 10
      reasons.push('Remarkable consistency — wins 70%+ of months')
    } else if (stats.winRate > 0.60) {
      score += 5
    } else if (stats.winRate < 0.45) {
      score -= 10
      reasons.push('Erratic monthly returns — hard to compound steadily')
    }

    // ── 7. Return quality (moderate, sustainable CAGR) ──────────
    if (stats.cagr1y !== null) {
      if (stats.cagr1y > 0.05 && stats.cagr1y <= 0.35) {
        score += 10
        reasons.push('Sustainable 1Y returns in the sweet spot (5-35%)')
      } else if (stats.cagr1y > 0.35) {
        score -= 5
        reasons.push('Unsustainably high 1Y returns — likely mean-reverting')
      } else if (stats.cagr1y < 0) {
        score -= 10
        reasons.push('Negative 1Y return — wait for recovery signals')
      }
    }
  }

  // ── 8. Name quality — prefer direct plans ──────────────────
  if (fund.schemeName.toLowerCase().includes('direct')) {
    score += 3
  }
  if (fund.schemeName.toLowerCase().includes('regular')) {
    score -= 3
    reasons.push('Regular plan — higher expense ratio eats compounding')
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasoning: reasons.slice(0, 3),
  }
}

// ═══════════════════════════════════════════════════════════════
//  ORACLE'S WISDOM — personalized insights for the investor
// ═══════════════════════════════════════════════════════════════

export function oracleWisdom(profile: InvestmentProfile): string[] {
  const wisdom: string[] = []

  if (profile.horizon === '<1Y') {
    wisdom.push('Mr. Buffett would say: "If you aren\'t willing to own something for ten years, don\'t own it for ten minutes." Consider extending your horizon.')
  } else if (profile.horizon === '10Y+') {
    wisdom.push('Mr. Buffett approves. "Time is the friend of the wonderful business." Your long horizon lets compounding do the heavy lifting.')
  }

  if (profile.fundCount > 8) {
    wisdom.push('"Diversification is protection against ignorance." Consider concentrating in 3-5 great funds rather than 8+ average ones.')
  } else if (profile.fundCount <= 3) {
    wisdom.push('"Put all your eggs in one basket — and watch that basket very carefully." Concentration requires conviction. Your selection is focused.')
  }

  if (profile.frequency === 'Monthly SIP') {
    wisdom.push('The Oracle smiles upon your discipline. Regular investing harnesses rupee-cost averaging — the patient investor\'s greatest ally.')
  }

  if (profile.amount === '10L+') {
    wisdom.push('With significant capital, Mr. Buffett reminds us: "The first rule is don\'t lose money." Capital preservation deserves as much attention as growth.')
  }

  return wisdom
}

// Pick a random Buffett sign-off for the banker page
export function oracleSignOff(): string {
  const signs = [
    '— Warren Buffett, Chairman, Berkshire Hathaway',
    '— The Oracle of Omaha',
    '— Warren E. Buffett',
    '— WEB',
  ]
  return signs[Math.floor(Math.random() * signs.length)]
}
