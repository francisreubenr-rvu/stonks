// Cloudflare Worker — CORS proxy for the NSE India official API.
// Handles the browser headers + session-cookie bootstrap that NSE's Akamai edge
// requires, then forwards /api/nse/<path> → https://www.nseindia.com/api/<path>.
// Deploy: npx wrangler deploy --config api-proxy/wrangler.toml

const NSE_ORIGIN = 'https://www.nseindia.com'
const PROXY_PREFIX = '/api/nse'

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const ALLOWED_ORIGINS = [
  'https://francisreubenr-rvu.github.io',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
]

// Only allow the NSE API paths the app actually uses.
const ALLOWED_PATHS = [
  '/allIndices',
  '/marketStatus',
  '/quote-equity',
  '/search/autocomplete',
  '/historical/cm/equity',
]

// Best-effort rate limiter: ~120 req/min per IP, PER ISOLATE. The map is
// module-global, so it resets on cold start and is not shared across
// concurrent isolates — with N isolates the effective cap is ~120×N/min.
// Real cross-isolate limiting needs Cloudflare's rate-limiting binding or a
// Durable Object; this is a cheap abuse dampener, not a guarantee.
const rateLimit = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX_ENTRIES = 10_000

function checkRateLimit(req: Request): boolean {
  const ip = req.headers.get('CF-Connecting-IP') ?? 'unknown'
  const now = Date.now()
  // Sweep expired entries once the map grows large, so a long-lived isolate
  // doesn't accumulate stale IPs without bound.
  if (rateLimit.size > RATE_LIMIT_MAX_ENTRIES) {
    for (const [k, v] of rateLimit) {
      if (now > v.resetAt) rateLimit.delete(k)
    }
  }
  const entry = rateLimit.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 120) return false
  entry.count++
  return true
}

// ── NSE session cookie (cached per isolate, lazily refreshed) ────────────────
let nseCookie = ''
let cookieAt = 0

async function ensureCookie(force = false): Promise<string> {
  if (!force && nseCookie && Date.now() - cookieAt < 8 * 60_000) return nseCookie
  try {
    const res = await fetch(`${NSE_ORIGIN}/`, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    const jar = res.headers.getSetCookie?.() ?? []
    const cookie = jar.map(c => c.split(';')[0]).join('; ')
    if (cookie) { nseCookie = cookie; cookieAt = Date.now() }
  } catch {
    /* leave previous cookie in place */
  }
  return nseCookie
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  }
}

async function nseFetch(targetPath: string): Promise<Response> {
  const cookie = await ensureCookie()
  const doFetch = (ck: string) =>
    fetch(`${NSE_ORIGIN}/api${targetPath}`, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: `${NSE_ORIGIN}/`,
        ...(ck ? { Cookie: ck } : {}),
      },
    })

  let res = await doFetch(cookie)
  // One retry with a freshly bootstrapped cookie on an auth/edge rejection.
  if (res.status === 401 || res.status === 403) {
    res = await doFetch(await ensureCookie(true))
  }
  return res
}

// ── NVIDIA NIM proxy ─────────────────────────────────────────────────────────
// integrate.api.nvidia.com sends no CORS headers, so the browser can't call it
// directly — and the key must never ship in the client bundle anyway. The key
// lives here as a Worker secret:  npx wrangler secret put NIM_API_KEY
// Model is pinned server-side to a free-tier chat model; the client cannot
// choose the model or exceed the token cap.
const NIM_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const NIM_MODEL = 'meta/llama-3.1-8b-instruct'
const NIM_MAX_TOKENS = 600

interface Env {
  NIM_API_KEY?: string
}

async function nimChat(request: Request, env: Env, origin: string): Promise<Response> {
  const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' }
  if (!env.NIM_API_KEY) {
    return new Response(JSON.stringify({ error: 'NIM key not configured' }), { status: 503, headers })
  }
  let body: { messages?: Array<{ role: string; content: string }> }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON' }), { status: 400, headers })
  }
  const messages = (body.messages ?? []).slice(0, 8).map(m => ({
    role: m.role === 'system' ? 'system' : 'user',
    content: String(m.content).slice(0, 6000),
  }))
  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages required' }), { status: 400, headers })
  }
  const upstream = await fetch(NIM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.NIM_API_KEY}`,
    },
    body: JSON.stringify({
      model: NIM_MODEL,
      messages,
      temperature: 0.4,
      max_tokens: NIM_MAX_TOKENS,
      stream: false,
    }),
  })
  const text = await upstream.text()
  return new Response(text, { status: upstream.status, headers })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') ?? ''

    if (request.method === 'OPTIONS') {
      if (origin !== '' && !ALLOWED_ORIGINS.includes(origin)) {
        return new Response(null, { status: 403 })
      }
      return new Response(null, {
        headers: {
          ...corsHeaders(origin),
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    // Enforce the origin allowlist on the data path too, not just preflight.
    // Browser requests always carry Origin for cross-origin fetches; a
    // request with a disallowed Origin gets rejected outright instead of
    // being served with a mismatched ACAO header. (Origin-less requests —
    // curl, server-to-server — are allowed through: the CORS header is
    // meaningless to them and blocking empty Origin would break nothing
    // for abusers while breaking legitimate tooling.)
    if (origin !== '' && !ALLOWED_ORIGINS.includes(origin)) {
      return new Response('Forbidden origin', { status: 403 })
    }

    if (!checkRateLimit(request)) {
      return new Response('Rate limit exceeded', { status: 429, headers: corsHeaders(origin) })
    }

    const url = new URL(request.url)

    // NIM chat proxy — POST only, key held server-side, model pinned.
    if (url.pathname === '/api/nim/chat') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: corsHeaders(origin) })
      }
      return nimChat(request, env, origin)
    }

    if (!url.pathname.startsWith(PROXY_PREFIX)) {
      return new Response('Not found', { status: 404, headers: corsHeaders(origin) })
    }

    const apiPath = url.pathname.slice(PROXY_PREFIX.length) // e.g. "/allIndices"
    // Exact match or a slash-delimited subpath — bare startsWith would let
    // "/allIndices-anything" ride through on the "/allIndices" allowance.
    if (!ALLOWED_PATHS.some(p => apiPath === p || apiPath.startsWith(`${p}/`))) {
      return new Response('Unauthorized path', { status: 403, headers: corsHeaders(origin) })
    }

    let upstream: Response
    try {
      upstream = await nseFetch(`${apiPath}${url.search}`)
    } catch {
      return new Response(JSON.stringify({ error: 'NSE upstream unreachable' }), {
        status: 502,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      })
    }

    const headers = new Headers(corsHeaders(origin))
    headers.set('Content-Type', upstream.headers.get('Content-Type') ?? 'application/json')
    // Short cache — index data refreshes ~every minute; protected endpoints vary.
    headers.set('Cache-Control', 'public, max-age=30')

    return new Response(upstream.body, { status: upstream.status, headers })
  },
}
