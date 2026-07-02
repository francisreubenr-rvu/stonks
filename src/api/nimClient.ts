// NVIDIA NIM chat client — always via the Cloudflare Worker proxy.
// The browser never sees the NIM key (it lives as a Worker secret) and
// integrate.api.nvidia.com has no CORS anyway. Model + token caps are pinned
// server-side; this client only supplies message content.

const DEV_URL = '/api/nim/chat' // Vite dev proxy target (see vite.config.ts)
const PROD_URL = 'https://stonks-proxy.francisreubenrbtech25.workers.dev/api/nim/chat'
const URL_ = import.meta.env.DEV ? DEV_URL : PROD_URL

export class NimUnavailableError extends Error {}

async function chat(messages: Array<{ role: 'system' | 'user'; content: string }>): Promise<string> {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
  if (res.status === 503) throw new NimUnavailableError('AI commentary is not configured on the proxy')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}) as { error?: { message?: string } })
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `NIM proxy returned ${res.status}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

export interface PickSummary {
  name: string
  category: string
  score: number
  cagr1y: number | null
  sortino: number | null
  maxDrawdown: number
  winRate: number
}

/** Commentary on a finished Banker scan. Receives only the real computed
 *  numbers — the model narrates them, it does not invent them. */
export async function commentOnPicks(
  picks: PickSummary[],
  profile: { risk: string; horizon: string; fundCount: number; frequency: string },
): Promise<string> {
  const rows = picks.map(p =>
    `${p.name} | ${p.category} | score ${p.score}/100 | 1Y ${p.cagr1y !== null ? (p.cagr1y * 100).toFixed(1) + '%' : 'n/a'} | Sortino ${p.sortino?.toFixed(2) ?? 'n/a'} | MaxDD ${(p.maxDrawdown * 100).toFixed(1)}% | Win ${(p.winRate * 100).toFixed(0)}%`,
  ).join('\n')

  return chat([
    {
      role: 'system',
      content:
        'You are a careful investment research assistant for Indian mutual funds. ' +
        'Comment ONLY on the metrics provided — never invent numbers, never predict returns, ' +
        'never give personalized financial advice. Be concise and concrete. End with a one-line ' +
        'reminder that this is not financial advice.',
    },
    {
      role: 'user',
      content:
        `Investor profile: ${profile.risk} risk tolerance, ${profile.horizon} horizon, ` +
        `${profile.fundCount} funds, ${profile.frequency} investing.\n\n` +
        `Shortlist (cohort-relative scores):\n${rows}\n\n` +
        'In under 140 words: assess the balance of this shortlist (category spread, downside profile), ' +
        'flag the weakest pick by the numbers shown, and note one thing the investor should verify themselves.',
    },
  ])
}
