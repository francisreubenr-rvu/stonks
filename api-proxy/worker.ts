// Cloudflare Worker — CORS proxy for Yahoo Finance
// Deploy: npx wrangler deploy

const ALLOWED_ORIGINS = [
  'https://francisreubenr-rvu.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
]

const ALLOWED_PATHS: Array<{ prefix: string; allowParams: boolean }> = [
  { prefix: '/v8/finance/chart/',      allowParams: true },
  { prefix: '/v7/finance/quote',       allowParams: true },
  { prefix: '/v10/finance/quoteSummary/', allowParams: true },
  { prefix: '/v6/finance/autocomplete',  allowParams: true },
]

// Simple rate limiter: 100 req/min per IP
const rateLimit = new Map<string, { count: number; resetAt: number }>()

function isAllowed(req: Request): boolean {
  const ip = req.headers.get('CF-Connecting-IP') ?? 'unknown'
  const now = Date.now()
  const entry = rateLimit.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }

  if (entry.count >= 100) return false
  entry.count++
  return true
}

export default {
  async fetch(request: Request): Promise<Response> {
    const origin = request.headers.get('Origin') ?? ''

    if (request.method === 'OPTIONS') {
      if (!ALLOWED_ORIGINS.includes(origin) && origin !== '') {
        return new Response(null, { status: 403 })
      }
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    if (!isAllowed(request)) {
      return new Response('Rate limit exceeded', { status: 429 })
    }

    const url = new URL(request.url)

    // Normalize path: decode %2e→. to prevent path traversal bypass
    const normalized = decodeURIComponent(url.pathname)

    if (!ALLOWED_PATHS.some(({ prefix }) => normalized.startsWith(prefix))) {
      return new Response('Unauthorized path', { status: 403 })
    }

    const target = `https://query1.finance.yahoo.com${url.pathname}${url.search}`

    const response = await fetch(target, {
      method: request.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StonksBot/1.0)',
        'Accept': 'application/json',
      },
    })

    const headers = new Headers(response.headers)
    headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0])
    headers.set('Cache-Control', 'public, max-age=60')
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

    return new Response(response.body, {
      status: response.status,
      headers,
    })
  },
}
