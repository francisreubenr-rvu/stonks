import type { LightFund } from '@/hooks/useFundList'
import type { FundStats } from '@/api/dataTypes'
import type { InvestmentProfile } from './banker'

export const ORACLE_QUOTES = {
  value: [
    "Price is what you pay. Value is what you get.",
    "It's far better to buy a wonderful company at a fair price than a fair company at a wonderful price.",
    "The stock market is a device for transferring money from the impatient to the patient.",
  ],
  patience: [
    "Someone's sitting in the shade today because someone planted a tree a long time ago.",
    "Our favorite holding period is forever.",
    "If you aren't willing to own a stock for ten years, don't even think about owning it for ten minutes.",
  ],
  risk: [
    "The first rule of investment is don't lose money. The second rule is don't forget the first rule.",
    "Only when the tide goes out do you discover who's been swimming naked.",
  ],
  markets: [
    "Be fearful when others are greedy and greedy when others are fearful.",
    "In the short run, the market is a voting machine. In the long run, it's a weighing machine.",
  ],
  discipline: [
    "Diversification is protection against ignorance.",
    "You don't need to be a rocket scientist. Investing is not a game where the guy with the 160 IQ beats the guy with 130 IQ.",
  ],
}

export function oracleQuote(theme?: keyof typeof ORACLE_QUOTES): string {
  const themes = theme ? [theme] : Object.keys(ORACLE_QUOTES) as (keyof typeof ORACLE_QUOTES)[]
  const pick = themes[Math.floor(Math.random() * themes.length)]
  const quotes = ORACLE_QUOTES[pick]
  return quotes[Math.floor(Math.random() * quotes.length)]
}

export const PRINCIPLES = [
  {
    name: 'Margin of Safety',
    quote: "The first rule is don't lose money.",
    rule: 'Prefer funds with low drawdowns and high Sortino ratios.',
  },
  {
    name: 'Circle of Competence',
    quote: 'Never invest in a business you cannot understand.',
    rule: 'Large cap and balanced funds are understandable. Avoid complex strategies.',
  },
  {
    name: 'Long-Term Horizon',
    quote: 'Our favorite holding period is forever.',
    rule: 'Favor funds with 5+ years of track record.',
  },
  {
    name: 'Quality at Fair Price',
    quote: "It's far better to buy a wonderful company at a fair price.",
    rule: 'Steady, consistent CAGR wins over volatile short-term returns.',
  },
  {
    name: 'Beware the Crowd',
    quote: 'Be fearful when others are greedy.',
    rule: 'Avoid funds that have been top performers in the last 3 months.',
  },
]

const AVOID = ['Sectoral/Thematic', 'International', 'Arbitrage']
const FAVOR = ['Large Cap', 'Flexi Cap', 'Value', 'Contra', 'Dividend Yield', 'ELSS', 'Balanced Hybrid', 'Conservative Hybrid']
const RISK_BONUS = [0, 10, -5, -15] // Low, Moderate, High, Very High

export function buffettScore(fund: LightFund, stats: FundStats | null, _profile: InvestmentProfile): { score: number; reasoning: string[] } {
  let score = 50
  const reasons: string[] = []

  if (AVOID.includes(fund.g)) { score -= 20; reasons.push('Avoids this category — outside circle of competence') }
  if (FAVOR.includes(fund.g)) { score += 10; reasons.push('Favored category — understandable, durable businesses') }

  score += RISK_BONUS[fund.r]
  if (fund.r === 3) reasons.push('Excessive risk — Buffett avoids speculative bets')

  if (stats) {
    if (stats.dataPoints >= 1825) { score += 15; reasons.push('Excellent 5+ year track record') }
    else if (stats.dataPoints >= 1095) { score += 10; reasons.push('Solid 3+ year track record') }
    else if (stats.dataPoints >= 365) { score += 5 }
    else { score -= 10; reasons.push('Insufficient track record') }

    const dd = Math.abs(stats.maxDrawdown)
    if (dd < 0.05) { score += 15; reasons.push('Exceptional downside protection < 5%') }
    else if (dd < 0.10) { score += 10; reasons.push('Strong margin of safety < 10%') }
    else if (dd < 0.20) { score += 5 }
    else if (dd > 0.40) { score -= 20; reasons.push('Violates first rule — drawdown > 40%') }
    else if (dd > 0.25) { score -= 10; reasons.push('Concerning drawdown') }

    if (stats.sortino !== null && stats.sortino > 0) {
      if (stats.sortino > 2.0) { score += 15; reasons.push('Outstanding risk-adjusted returns') }
      else { score += 10 }
    }

    if (stats.winRate > 0.70) { score += 10; reasons.push('Remarkable 70%+ win rate') }
    else if (stats.winRate > 0.60) { score += 5 }
    else if (stats.winRate < 0.45) { score -= 10; reasons.push('Erratic monthly returns') }

    if (stats.cagr1y !== null) {
      if (stats.cagr1y > 0.05 && stats.cagr1y <= 0.35) { score += 10; reasons.push('Sustainable 1Y returns (5-35%)') }
      else if (stats.cagr1y > 0.35) { score -= 5; reasons.push('Unsustainably high 1Y returns') }
      else if (stats.cagr1y < 0) { score -= 10; reasons.push('Negative 1Y return') }
    }
  }

  if (fund.n.toLowerCase().includes('direct')) score += 3
  if (fund.n.toLowerCase().includes('regular')) { score -= 3; reasons.push('Regular plan — higher expense ratio') }

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasoning: reasons.slice(0, 3) }
}

// ═══════════════════════════════════════════════════════════════
//  PROPRIETARY STONKS SCORE™ — tie-breaking composite formula
//  Eliminates duplicate scores by factoring micro-differentiators
// ═══════════════════════════════════════════════════════════════

export function stonksScore(
  fund: LightFund,
  stats: FundStats | null,
  profile: InvestmentProfile,
): number {
  const { score: base } = buffettScore(fund, stats, profile)

  if (!stats) return base

  // Tiebreakers — micro-differentiators (0 to +0.999, never affect integer part)
  let tie = 0

  // Sortino ratio: 0 → +0.3
  if (stats.sortino !== null && stats.sortino > 0) {
    tie += Math.min(stats.sortino, 6) / 20
  }

  // Win rate: 0 → +0.05
  tie += stats.winRate * 0.05

  // Data points (history length): 0 → +0.1
  tie += Math.min(stats.dataPoints, 3650) / 36500

  // Max drawdown recovery: lower DD → +0.15
  const dd = Math.abs(stats.maxDrawdown)
  if (dd < 0.05) tie += 0.15
  else if (dd < 0.10) tie += 0.10
  else if (dd < 0.20) tie += 0.05
  else if (dd > 0.40) tie -= 0.10

  // CAGR quality: steady moderate returns → +0.1
  if (stats.cagr1y !== null && stats.cagr1y > 0.05 && stats.cagr1y <= 0.30) {
    tie += 0.10
  } else if (stats.cagr1y !== null && stats.cagr1y > 0.30) {
    tie -= 0.05
  }

  // Sharpe bonus: 0 → +0.05
  if (stats.sharpe !== null && stats.sharpe > 0) {
    tie += Math.min(stats.sharpe, 2) / 40
  }

  // Rolling 1Y stability: tight range → +0.05
  if (stats.rolling1yMin !== null && stats.rolling1yMax !== null) {
    const range = stats.rolling1yMax - stats.rolling1yMin
    if (range < 0.15) tie += 0.05
  }

  // Fund house reputation (treat long names as proxy for established houses)
  if (fund.h.length > 6) tie += 0.02

  // Direct plan preference
  if (fund.n.toLowerCase().includes('direct')) tie += 0.03

  return base + tie
}

export function oracleWisdom(profile: InvestmentProfile): string[] {
  const w: string[] = []
  if (profile.horizon === '<1Y') w.push('Mr. Buffett would say: "If you are not willing to own something for ten years, do not own it for ten minutes."')
  if (profile.horizon === '10Y+') w.push('Mr. Buffett approves. "Time is the friend of the wonderful business."')
  if (profile.fundCount > 8) w.push('"Diversification is protection against ignorance." Consider 3-5 great funds.')
  if (profile.fundCount <= 3) w.push('"Put all your eggs in one basket — and watch that basket carefully."')
  if (profile.frequency === 'Monthly SIP') w.push('The Oracle smiles upon your discipline. Regular investing is the patient investor\'s ally.')
  if (profile.amount === '10L+') w.push('"The first rule is don\'t lose money." Capital preservation matters.')
  return w
}

export function oracleSignOff(): string {
  return ['— Warren Buffett', '— The Oracle of Omaha', '— Warren E. Buffett'][Math.floor(Math.random() * 3)]
}
