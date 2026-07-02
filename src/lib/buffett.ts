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

export function oracleWisdom(profile: InvestmentProfile): string[] {
  const w: string[] = []
  if (profile.horizon === '<1Y') w.push('Mr. Buffett would say: "If you are not willing to own something for ten years, do not own it for ten minutes."')
  if (profile.horizon === '10Y+') w.push('Mr. Buffett approves. "Time is the friend of the wonderful business."')
  if (profile.fundCount > 8) w.push('"Diversification is protection against ignorance." Consider 3-5 great funds.')
  if (profile.fundCount <= 3) w.push('"Wide diversification is only required when investors do not understand what they are doing." A focused, well-understood portfolio is fine — for those who\'ve done the homework.')
  // Values must match BankerPage's actual inputs: frequency is one of
  // Monthly/Quarterly/Yearly/Lumpsum, amount is a free-text numeric string.
  if (profile.frequency === 'Monthly' || profile.frequency === 'Quarterly') w.push('The Oracle smiles upon your discipline. Regular investing is the patient investor\'s ally.')
  if (Number(profile.amount) >= 1_000_000) w.push('"The first rule is don\'t lose money." Capital preservation matters.')
  return w
}

export function oracleSignOff(): string {
  return ['— Warren Buffett', '— The Oracle of Omaha', '— Warren E. Buffett'][Math.floor(Math.random() * 3)]
}
