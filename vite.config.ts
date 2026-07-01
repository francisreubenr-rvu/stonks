import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const NSE_ORIGIN = 'https://www.nseindia.com'
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// NSE's edge requires browser headers and, for protected endpoints, a session
// cookie obtained by first hitting the homepage. We bootstrap that cookie once
// and refresh it lazily so the dev proxy mirrors the production Cloudflare Worker.
let nseCookie = ''
let cookieAt = 0

async function ensureNseCookie(): Promise<void> {
  if (nseCookie && Date.now() - cookieAt < 8 * 60_000) return
  try {
    const res = await fetch(`${NSE_ORIGIN}/`, {
      headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
    })
    const jar = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? []
    const cookie = jar.map(c => c.split(';')[0]).join('; ')
    if (cookie) { nseCookie = cookie; cookieAt = Date.now() }
  } catch {
    /* best-effort — indices endpoints work cookieless anyway */
  }
}

export default defineConfig({
  base: './',
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    proxy: {
      '/api/nse': {
        target: NSE_ORIGIN,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/nse/, '/api'),
        headers: {
          'User-Agent': BROWSER_UA,
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          Referer: `${NSE_ORIGIN}/`,
        },
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // fire-and-forget refresh; attach whatever cookie we currently hold
            void ensureNseCookie()
            if (nseCookie) proxyReq.setHeader('cookie', nseCookie)
          })
        },
      },
    },
  },
})
