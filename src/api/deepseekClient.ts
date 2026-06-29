const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'

let cachedKey: string | null = null

export function getApiKey(): string | null {
  // 1. Vite env var (set once in .env.local)
  if (import.meta.env.VITE_DEEPSEEK_KEY) {
    return import.meta.env.VITE_DEEPSEEK_KEY
  }
  // 2. localStorage (set via UI)
  if (cachedKey) return cachedKey
  cachedKey = localStorage.getItem('stonks:deepseek_key')
  return cachedKey
}

export function hasEnvKey(): boolean {
  return !!import.meta.env.VITE_DEEPSEEK_KEY
}

export function setApiKey(key: string) {
  cachedKey = key
  localStorage.setItem('stonks:deepseek_key', key)
}

export function clearApiKey() {
  cachedKey = null
  localStorage.removeItem('stonks:deepseek_key')
}

async function chat(messages: Array<{ role: string; content: string }>): Promise<string> {
  const key = getApiKey()
  if (!key) throw new Error('API key not set')

  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.7,
      max_tokens: 800,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `DeepSeek returned ${res.status}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

export async function explainPick(
  fundName: string,
  category: string,
  risk: string,
  stats: Record<string, string>,
): Promise<string> {
  const msg = `You are Warren Buffett's investment analyst. In 2-3 concise, insightful sentences, explain why "${fundName}" (${category}, ${risk} risk) is a good pick, given these metrics: ${Object.entries(stats).map(([k, v]) => `${k}: ${v}`).join(', ')}. Be specific. Reference one of Buffett's principles. Keep it under 100 words.`
  return chat([{ role: 'user', content: msg }])
}

export async function analyzePortfolio(
  funds: Array<{ name: string; score: number; category: string }>,
  profile: { horizon: string; fundCount: number; amount: string; frequency: string },
): Promise<string> {
  const fundList = funds.map(f => `${f.name} (${f.category}, score: ${f.score.toFixed(1)}/100)`).join('\n')
  const msg = `You are Warren Buffett's investment analyst. Analyze this fund selection for an investor with: ${profile.horizon} horizon, ${profile.fundCount} funds, ${profile.amount} amount, ${profile.frequency} frequency.\n\nSelected funds:\n${fundList}\n\nIn 3-4 sentences: assess the balance, identify any concentration risk, suggest one improvement. Keep it under 150 words.`
  return chat([{ role: 'user', content: msg }])
}

export async function marketBrief(indices: Array<{ name: string; changePct: number }>): Promise<string> {
  const market = indices.map(i => `${i.name}: ${i.changePct >= 0 ? '+' : ''}${i.changePct.toFixed(2)}%`).join(', ')
  const msg = `You are a quantitative market analyst. Based on these Indian market index changes: ${market}. In 2 sentences: briefly characterize today's session (risk-on/risk-off/sector rotation/neutral) and what it means for mutual fund investors. Keep it under 100 words.`
  return chat([{ role: 'user', content: msg }])
}
