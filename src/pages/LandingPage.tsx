import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { useIndicesSnapshot } from '@/hooks/useIndicesSnapshot'
import { useFundList } from '@/hooks/useFundList'
import { loadStocksSnapshot } from '@/api/backupClient'
import { Logo, LogoMark } from '@/components/Logo'

const ACCENT = '#34D399' // phosphor green — literal (hexRgb needs RGB for the particle canvas)

// ── Static data ─────────────────────────────────────────────────────────────

// Risk-math metric chips for the bento — every one of these is actually
// computed per fund in lib/fundStats.ts. Do not list metrics we don't compute.
const RISK_METRICS = ['Sharpe', 'Sortino', 'Max drawdown', 'Recovery days', 'Win rate', 'Rolling 1Y', 'CAGR 1M→inception', 'Annualised vol']

// ── Helpers ──────────────────────────────────────────────────────────────────

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

const fmtIN = (v: number, dec = 2) =>
  v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })

// ── Inline keyframes (scoped to this page) ───────────────────────────────────
const LP_CSS = `
  @keyframes lpMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  @keyframes lpFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
  @keyframes lpPing  { 0% { transform:scale(1); opacity:0.7; } 70%,100% { transform:scale(2.6); opacity:0; } }
  @keyframes lpBlink { 0%,49% { opacity:1; } 50%,100% { opacity:0; } }
  @keyframes lpRise   { 0% { opacity:0; transform:translateY(8px);  } 100% { opacity:1; transform:translateY(0); } }
  .lp-nav-link:hover   { color:var(--foreground) !important; background:var(--muted) !important; }
  .lp-btn-pri:hover    { background:var(--primary-hover) !important; }
  .lp-btn-out:hover    { border-color:var(--border-strong) !important; background:var(--muted) !important; }
  .lp-feat:hover       { border-color:var(--border-strong) !important; }
  .lp-idx:hover        { border-color:var(--border-strong) !important; }
  .lp-foot-link:hover  { color:var(--foreground) !important; }
  .lp-cta-btn:hover    { background:var(--primary-hover) !important; }
  .lp-nav-cta:hover    { background:var(--primary-hover) !important; }
  @media (max-width: 820px) {
    .lp-hero { grid-template-columns: 1fr !important; gap: 28px !important; padding-top: 96px !important; }
    .lp-navlinks { display: none !important; }
    .lp-grid3 { grid-template-columns: 1fr !important; }
    .lp-bento { grid-template-columns: 1fr !important; }
    .lp-bento > div { grid-column: auto !important; grid-row: auto !important; }
    .lp-footer { grid-template-columns: 1fr 1fr !important; gap: 24px !important; }
  }
`

const MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
const SANS = "'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
const DISPLAY = "'Fraunces', Georgia, serif"

export default function LandingPage() {
  const navigate = useNavigate()
  const rootRef    = useRef<HTMLDivElement>(null)
  const progRef    = useRef<HTMLDivElement>(null)
  const particleRef= useRef<HTMLCanvasElement>(null)
  const cycleRef   = useRef<HTMLSpanElement>(null)

  // Reveal-on-scroll — shared with the rest of the app.
  useScrollReveal(rootRef)

  // ── Real data ───────────────────────────────────────────────────────────
  const { data: indicesResult } = useIndicesSnapshot()
  const indices = indicesResult?.indices
  const { data: funds } = useFundList()
  // Marquee rows come straight from the real NSE close snapshot — the same
  // stocks-fallback.json the quote fallback uses. Previously this data was
  // duplicated as a hardcoded array kept in sync by a source-rewriting step
  // in refresh-data.mjs; now there is exactly one copy.
  const { data: snapshot } = useQuery({
    queryKey: ['stocksSnapshot'],
    queryFn: loadStocksSnapshot,
    staleTime: Infinity,
  })
  const ticker = (snapshot ?? []).map(q => ({
    sym: q.symbol,
    price: fmtIN(q.price),
    delta: `${q.changePct >= 0 ? '+' : ''}${q.changePct.toFixed(2)}%`,
    c: q.changePct >= 0 ? 'var(--delta-positive)' : 'var(--delta-negative)',
  }))
  const idxList = indices ?? []
  const heroIdx = idxList.find(i => i.symbol === 'NIFTY 50') ?? idxList[0]
  const heroMini = idxList.filter(i => i.symbol !== heroIdx?.symbol).slice(0, 3)
  const showcase = idxList.slice(0, 6)
  const fundCount = funds?.length ?? null
  const categoryCount = funds ? new Set(funds.map(f => f.g)).size : null
  const indexCount = idxList.length || null

  // Top fund categories by real scheme count — feeds the bento screener cell.
  const topCats = (() => {
    if (!funds) return []
    const counts = new Map<string, number>()
    for (const f of funds) counts.set(f.g, (counts.get(f.g) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  })()

  const STATS: { value: number | null; label: string }[] = [
    { value: fundCount, label: 'Mutual funds tracked' },
    { value: categoryCount, label: 'Fund categories' },
    { value: indexCount, label: 'Live indices tracked' },
  ]

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  useEffect(() => {
    const root = rootRef.current!
    const raf: number[] = []
    const timers: ReturnType<typeof setTimeout>[] = []
    const loops: Record<string, number> = {}
    const cleanup: (() => void)[] = []
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const [r, g, b] = hexRgb(ACCENT)

    // ── Magnetic buttons ──────────────────────────────────────────────────
    if (!reduced) {
      Array.from(root.querySelectorAll<HTMLElement>('[data-magnetic]')).forEach(el => {
        const move  = (ev: MouseEvent) => {
          const rc = el.getBoundingClientRect()
          el.style.transform = `translate(${((ev.clientX - rc.left - rc.width / 2) * 0.28).toFixed(1)}px,${((ev.clientY - rc.top - rc.height / 2) * 0.4).toFixed(1)}px)`
        }
        const leave = () => { el.style.transform = 'translate(0,0)' }
        el.addEventListener('mousemove', move)
        el.addEventListener('mouseleave', leave)
        cleanup.push(() => { el.removeEventListener('mousemove', move); el.removeEventListener('mouseleave', leave) })
      })
    }

    // ── Scroll progress + parallax ────────────────────────────────────────
    const bar  = progRef.current
    const plxs = Array.from(root.querySelectorAll<HTMLElement>('[data-parallax]'))
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      raf.push(requestAnimationFrame(() => {
        const st = window.scrollY
        const h  = document.documentElement.scrollHeight - window.innerHeight
        if (bar) bar.style.width = (h > 0 ? (st / h) * 100 : 0) + '%'
        if (!reduced) plxs.forEach(el => {
          const sp = parseFloat(el.getAttribute('data-speed') || '0')
          el.style.transform = `translateY(${(st * sp).toFixed(1)}px)`
        })
        ticking = false
      }))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    cleanup.push(() => window.removeEventListener('scroll', onScroll))

    // ── Headline word cycle ───────────────────────────────────────────────
    const cycleEl = cycleRef.current
    if (cycleEl) {
      const words = ['funds', 'indices', 'equities', 'ETFs', 'NAVs']
      if (reduced) {
        cycleEl.textContent = words[0]
      } else {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$%&'
        let idx = 0, stopped = false
        const scramble = (text: string, done: () => void) => {
          const from = cycleEl.textContent || ''
          const len  = Math.max(from.length, text.length)
          const q = Array.from({ length: len }, (_, i) => ({
            from: from[i] || '', to: text[i] || '',
            s: Math.floor(Math.random() * 8), e: Math.floor(Math.random() * 8) + 12, r: '',
          }))
          let frame = 0
          const run = () => {
            if (stopped) return
            let out = '', done2 = 0
            for (const c of q) {
              if (frame >= c.e) { out += c.to; done2++ }
              else if (frame >= c.s) { if (!c.r || Math.random() < 0.32) c.r = chars[Math.floor(Math.random() * chars.length)]; out += c.r }
              else out += c.from
            }
            cycleEl.textContent = out
            if (done2 === q.length) { done(); return }
            frame++
            raf.push(requestAnimationFrame(run))
          }
          run()
        }
        const cycle = () => {
          if (stopped) return
          idx = (idx + 1) % words.length
          scramble(words[idx], () => { if (!stopped) timers.push(setTimeout(cycle, 2000)) })
        }
        timers.push(setTimeout(cycle, 2200))
        cleanup.push(() => { stopped = true })
      }
    }

    // ── Particle field (decorative — abstract network, no data) ────────────
    const pc = particleRef.current
    if (pc && !reduced) {
      const ctx = pc.getContext('2d')!
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      let W = 0, H = 0
      type P = { x: number; y: number; vx: number; vy: number; s: number }
      let parts: P[] = []
      const mouse = { x: -9999, y: -9999 }
      const resize = () => {
        const rc = pc.getBoundingClientRect()
        W = rc.width; H = rc.height
        pc.width = W * dpr; pc.height = H * dpr
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        const n = Math.max(24, Math.min(120, Math.round((W * H) / 16000)))
        parts = Array.from({ length: n }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
          s: Math.random() * 1.6 + 0.6,
        }))
      }
      const sec = pc.parentElement!
      const onMove  = (e: MouseEvent) => { const rc = pc.getBoundingClientRect(); mouse.x = e.clientX - rc.left; mouse.y = e.clientY - rc.top }
      const onLeave = () => { mouse.x = -9999; mouse.y = -9999 }
      sec.addEventListener('mousemove', onMove)
      sec.addEventListener('mouseleave', onLeave)
      const draw = () => {
        ctx.clearRect(0, 0, W, H)
        for (const p of parts) {
          const dx = mouse.x - p.x, dy = mouse.y - p.y, d = Math.hypot(dx, dy)
          if (d > 0 && d < 140) { const f = (140 - d) / 140; p.x -= (dx / d) * f * 0.9; p.y -= (dy / d) * f * 0.9 }
          p.x += p.vx; p.y += p.vy
          if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
          if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
          ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${r},${g},${b},0.55)`; ctx.fill()
        }
        for (let i = 0; i < parts.length; i++) {
          for (let j = i + 1; j < parts.length; j++) {
            const d = Math.hypot(parts[i].x - parts[j].x, parts[i].y - parts[j].y)
            if (d < 120) { ctx.beginPath(); ctx.moveTo(parts[i].x, parts[i].y); ctx.lineTo(parts[j].x, parts[j].y); ctx.strokeStyle = `rgba(${r},${g},${b},${(0.16 * (1 - d / 120)).toFixed(3)})`; ctx.lineWidth = 1; ctx.stroke() }
          }
          if (mouse.x > 0) {
            const dm = Math.hypot(parts[i].x - mouse.x, parts[i].y - mouse.y)
            if (dm < 160) { ctx.beginPath(); ctx.moveTo(parts[i].x, parts[i].y); ctx.lineTo(mouse.x, mouse.y); ctx.strokeStyle = `rgba(${r},${g},${b},${(0.28 * (1 - dm / 160)).toFixed(3)})`; ctx.lineWidth = 1; ctx.stroke() }
          }
        }
        loops.part = requestAnimationFrame(draw)
      }
      resize()
      window.addEventListener('resize', resize)
      cleanup.push(() => { window.removeEventListener('resize', resize); sec.removeEventListener('mousemove', onMove); sec.removeEventListener('mouseleave', onLeave) })
      draw()
    }

    return () => {
      raf.forEach(cancelAnimationFrame)
      Object.values(loops).forEach(cancelAnimationFrame)
      timers.forEach(clearTimeout)
      cleanup.forEach(fn => { try { fn() } catch {} })
    }
  }, [])

  // ── JSX ──────────────────────────────────────────────────────────────────

  return (
    <div ref={rootRef} style={{ position: 'relative', minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)', fontFamily: SANS, overflowX: 'hidden' }}>
      <style>{LP_CSS}</style>

      {/* Scroll progress */}
      <div ref={progRef} style={{ position: 'fixed', top: 0, left: 0, height: 2, width: '0%', background: ACCENT, zIndex: 100, transition: 'width 0.08s linear' }} />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo size={30} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div className="lp-navlinks" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {[['Funds', '/funds'], ['Indices', '/indices'], ['Compare', '/compare']].map(([lbl, path]) => (
                <button key={lbl} onClick={() => navigate(path)} className="lp-nav-link" style={{ fontFamily: SANS, fontSize: 14, fontWeight: 500, color: 'var(--muted-foreground)', background: 'transparent', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', transition: 'color 0.15s, background 0.15s' }}>{lbl}</button>
              ))}
              <button onClick={() => scrollTo('footer-about')} className="lp-nav-link" style={{ fontFamily: SANS, fontSize: 14, fontWeight: 500, color: 'var(--muted-foreground)', background: 'transparent', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', transition: 'color 0.15s, background 0.15s' }}>About</button>
            </div>
            <button data-magnetic className="lp-nav-cta" onClick={() => navigate('/funds')} style={{ marginLeft: 10, fontFamily: SANS, fontSize: 14, fontWeight: 600, color: 'var(--primary-foreground)', background: ACCENT, border: 'none', padding: '10px 18px', borderRadius: 10, cursor: 'pointer', transition: 'transform 0.18s ease-out, background 0.2s' }}>Launch app</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1, overflow: 'hidden' }}>
        <canvas ref={particleRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />

        {/* Vertical source rail — editorial spine, hidden on mobile */}
        <div className="lp-navlinks" style={{ position: 'absolute', left: 26, top: 170, bottom: 90, zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <span style={{ width: 1, flex: 1, background: 'linear-gradient(180deg, transparent, var(--border-strong))' }} />
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.34em', color: 'var(--subtle)', writingMode: 'vertical-rl' }}>
            NSE · AMFI · MFAPI — KEYLESS FEEDS
          </span>
          <span style={{ width: 1, flex: 1, background: 'linear-gradient(180deg, var(--border-strong), transparent)' }} />
        </div>

        <div className="lp-hero" style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '150px 24px 90px', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 56, alignItems: 'center' }}>
          {/* Copy */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 14, marginBottom: 30, animation: 'lpRise 0.6s ease-out both' }}>
              <span style={{ fontFamily: MONO, fontSize: 13, color: ACCENT }}>01</span>
              <span style={{ width: 34, height: 1, background: 'var(--border-strong)', alignSelf: 'center' }} />
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 500, letterSpacing: '0.2em', color: 'var(--muted-foreground)' }}>INDIAN MARKETS RESEARCH TERMINAL</span>
            </div>
            <h1 style={{ fontFamily: DISPLAY, fontSize: 'clamp(44px,6vw,82px)', lineHeight: 0.98, fontWeight: 600, letterSpacing: '-0.03em', margin: '0 0 26px' }}>
              <span style={{ display: 'block', color: 'var(--foreground)', animation: 'lpRise 0.7s ease-out 0.05s both' }}>Read the tape.</span>
              <span style={{ display: 'block', fontStyle: 'italic', animation: 'lpRise 0.7s ease-out 0.14s both' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Screen </span>
                <span ref={cycleRef} style={{ color: ACCENT }}>funds</span>
                <span style={{ display: 'inline-block', width: 4, height: '0.78em', background: ACCENT, marginLeft: 7, verticalAlign: 'baseline', transform: 'translateY(0.08em)', animation: 'lpBlink 1.1s step-end infinite' }} />
              </span>
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--muted-foreground)', maxWidth: 470, margin: '0 0 36px', animation: 'lpRise 0.7s ease-out 0.2s both' }}>
              14,000+ mutual funds, nine NSE benchmarks and live equities on one dark,
              data-dense terminal. Every number traces to a real source — nothing on
              screen is mocked, padded or invented.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 40, animation: 'lpRise 0.7s ease-out 0.28s both' }}>
              <button data-magnetic className="lp-btn-pri" onClick={() => navigate('/funds')} style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, color: 'var(--primary-foreground)', background: ACCENT, border: 'none', padding: '15px 28px', borderRadius: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, transition: 'transform 0.18s ease-out, background 0.2s' }}>
                $ start screening
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
              <button data-magnetic className="lp-btn-out" onClick={() => navigate('/indices')} style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: 'var(--foreground)', background: 'var(--card)', border: '1px solid var(--border)', padding: '15px 26px', borderRadius: 12, cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s' }}>View live indices</button>
            </div>
            <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', animation: 'lpRise 0.7s ease-out 0.36s both' }}>
              {['Keyless NSE + AMFI feeds', '14,000+ funds indexed', 'Free forever'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--muted-foreground)', fontSize: 13.5, fontWeight: 500 }}>
                  <span style={{ color: ACCENT }}>✓</span> {t}
                </div>
              ))}
            </div>
          </div>

          {/* Live snapshot card — real index data */}
          <div data-parallax data-speed="-0.05" style={{ position: 'relative' }}>
            <div style={{ position: 'relative', zIndex: 1, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 20, boxShadow: '0 12px 40px -12px rgba(0,0,0,0.6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: 'var(--muted-foreground)', fontWeight: 500 }}>{heroIdx?.name ?? 'NIFTY 50'}</span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 10px', borderRadius: 999, background: 'var(--primary-subtle)', border: '1px solid var(--risk-low-border)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT }} />
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--primary-hover)' }}>LIVE</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
                <span style={{ fontFamily: MONO, fontSize: 34, fontWeight: 600, letterSpacing: '-0.02em' }}>
                  {heroIdx ? fmtIN(heroIdx.value) : '—'}
                </span>
                {heroIdx && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 999, background: heroIdx.change >= 0 ? 'var(--primary-subtle)' : 'var(--delta-negative-bg)', color: heroIdx.change >= 0 ? 'var(--delta-positive)' : 'var(--delta-negative)', fontFamily: MONO, fontSize: 13, fontWeight: 600 }}>
                    {heroIdx.change >= 0 ? '▲' : '▼'} {heroIdx.change >= 0 ? '+' : ''}{heroIdx.changePct.toFixed(2)}%
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {heroMini.length > 0 ? heroMini.map(ix => (
                  <div key={ix.symbol} style={{ background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 12px' }}>
                    <div style={{ fontSize: 11, color: 'var(--subtle)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ix.name}</div>
                    <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 500 }}>{fmtIN(ix.value, 0)}</div>
                    <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: ix.change >= 0 ? 'var(--delta-positive)' : 'var(--delta-negative)' }}>
                      {ix.change >= 0 ? '+' : ''}{ix.changePct.toFixed(2)}%
                    </div>
                  </div>
                )) : [0, 1, 2].map(i => (
                  <div key={i} style={{ background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 12px', height: 62 }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee (real NSE close snapshot) ────────────────────────────── */}
      {ticker.length > 0 && (
        <section style={{ position: 'relative', zIndex: 1, borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--background)', padding: '16px 0', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 120, zIndex: 2, pointerEvents: 'none', background: 'linear-gradient(90deg,var(--background),transparent)' }} />
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 120, zIndex: 2, pointerEvents: 'none', background: 'linear-gradient(270deg,var(--background),transparent)' }} />
          <div style={{ display: 'flex', width: 'max-content', animation: 'lpMarquee 48s linear infinite' }}>
            {[...ticker, ...ticker].map((t, i) => (
              <div key={i} style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 9, padding: '0 22px', borderRight: '1px solid var(--border)' }}>
                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)' }}>{t.sym}</span>
                <span style={{ fontFamily: MONO, fontSize: 13, color: 'var(--muted-foreground)' }}>{t.price}</span>
                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: t.c }}>{t.delta}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Stats band (real counts) ─────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '88px 24px' }}>
        <div data-reveal className="lp-grid3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, opacity: 0, transform: 'translateY(28px)' }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '8px 4px' }}>
              <div style={{ fontFamily: MONO, fontSize: 'clamp(32px,4vw,46px)', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--foreground)' }}>
                {s.value != null ? s.value.toLocaleString('en-IN') : '—'}
              </div>
              <div style={{ fontSize: 14, color: 'var(--muted-foreground)', marginTop: 8 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features — bento grid, every cell fed by real data ───────────── */}
      <section id="features" style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '40px 24px 90px' }}>
        <div data-reveal style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 40, opacity: 0, transform: 'translateY(28px)' }}>
          <span style={{ fontFamily: MONO, fontSize: 13, color: ACCENT }}>02</span>
          <span style={{ width: 34, height: 1, background: 'var(--border-strong)', alignSelf: 'center' }} />
          <h2 style={{ fontFamily: DISPLAY, fontSize: 'clamp(30px,4vw,46px)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.08, margin: 0 }}>
            Research that keeps up <span style={{ fontStyle: 'italic', color: 'var(--muted-foreground)' }}>with the tape</span>
          </h2>
        </div>

        <div className="lp-bento" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'auto auto', gap: 18 }}>
          {/* Screener — large cell with live category chips */}
          <div data-reveal className="lp-feat" style={{ gridColumn: 'span 2', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 30, opacity: 0, transform: 'translateY(32px)', transition: 'border-color 0.2s', cursor: 'pointer' }} onClick={() => navigate('/funds')}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.22em', color: ACCENT, marginBottom: 14 }}>FUND SCREENER</div>
            <h3 style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 600, margin: '0 0 10px' }}>
              {fundCount ? fundCount.toLocaleString('en-IN') : '14,000+'} funds. One filter bar.
            </h3>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--muted-foreground)', margin: '0 0 22px', maxWidth: 520 }}>
              The full AMFI-active universe, searchable live and filterable by risk tier,
              category and fund house. Dead and defunct schemes are pruned automatically.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {topCats.length > 0 ? topCats.map(([cat, n]) => (
                <span key={cat} style={{ fontFamily: MONO, fontSize: 12, color: 'var(--muted-foreground)', border: '1px solid var(--border)', background: 'var(--muted)', borderRadius: 999, padding: '6px 12px' }}>
                  {cat} <span style={{ color: ACCENT }}>{n.toLocaleString('en-IN')}</span>
                </span>
              )) : (
                <span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--subtle)' }}>loading live universe…</span>
              )}
            </div>
          </div>

          {/* Banker — tall cell */}
          <div data-reveal data-reveal-delay={80} className="lp-feat" style={{ gridRow: 'span 2', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 30, display: 'flex', flexDirection: 'column', opacity: 0, transform: 'translateY(32px)', transition: 'border-color 0.2s', cursor: 'pointer' }} onClick={() => navigate('/banker')}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.22em', color: ACCENT, marginBottom: 14 }}>THE BANKER</div>
            <h3 style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 600, margin: '0 0 10px' }}>A Buffett-principles shortlist</h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--muted-foreground)', margin: '0 0 22px' }}>
              Answer a real risk questionnaire; get funds scored on drawdown, consistency
              and track record. Fully algorithmic, fully client-side.
            </p>
            <blockquote style={{ margin: 'auto 0 0', padding: '16px 18px', borderLeft: `2px solid ${ACCENT}`, background: 'var(--muted)', borderRadius: '0 12px 12px 0' }}>
              <p style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 16, lineHeight: 1.5, color: 'var(--foreground)', margin: 0 }}>
                "Price is what you pay. Value is what you get."
              </p>
              <footer style={{ fontFamily: MONO, fontSize: 11, color: 'var(--subtle)', marginTop: 8 }}>— Warren Buffett</footer>
            </blockquote>
          </div>

          {/* Risk math cell */}
          <div data-reveal data-reveal-delay={140} className="lp-feat" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 26, opacity: 0, transform: 'translateY(32px)', transition: 'border-color 0.2s' }}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.22em', color: ACCENT, marginBottom: 12 }}>REAL RISK MATH</div>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--muted-foreground)', margin: '0 0 16px' }}>
              Computed from full NAV history on every fund — unit-tested, never estimated.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {RISK_METRICS.map(m => (
                <span key={m} style={{ fontFamily: MONO, fontSize: 11, color: 'var(--muted-foreground)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px' }}>{m}</span>
              ))}
            </div>
          </div>

          {/* Privacy cell */}
          <div data-reveal data-reveal-delay={200} className="lp-feat" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 26, opacity: 0, transform: 'translateY(32px)', transition: 'border-color 0.2s' }}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.22em', color: ACCENT, marginBottom: 12 }}>PRIVATE BY DESIGN</div>
            <h3 style={{ fontFamily: DISPLAY, fontSize: 21, fontWeight: 600, margin: '0 0 8px' }}>Your portfolio never leaves the browser</h3>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--muted-foreground)', margin: 0 }}>
              Watchlist and holdings live in localStorage. No account, no server, no
              analytics on your money.
            </p>
          </div>
        </div>
      </section>

      {/* ── Indices (real snapshot) ──────────────────────────────────────── */}
      <section id="indices" style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '20px 24px 100px' }}>
        <div data-reveal style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 16, opacity: 0, transform: 'translateY(28px)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 12 }}>
              <span style={{ fontFamily: MONO, fontSize: 13, color: ACCENT }}>03</span>
              <span style={{ width: 34, height: 1, background: 'var(--border-strong)', alignSelf: 'center' }} />
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 500, letterSpacing: '0.2em', color: 'var(--muted-foreground)' }}>MARKET PULSE</span>
            </div>
            <h2 style={{ fontFamily: DISPLAY, fontSize: 'clamp(28px,3.6vw,42px)', fontWeight: 600, letterSpacing: '-0.03em', margin: 0 }}>
              Nine benchmarks, <span style={{ fontStyle: 'italic', color: 'var(--muted-foreground)' }}>drawn live</span>
            </h2>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--muted-foreground)', fontSize: 13, fontFamily: MONO }}>
            {/* Honest provenance label — never claims "live" over snapshot data. */}
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT }} />
            {indicesResult?.source === 'live' ? 'live feed' : 'last market close'}
          </div>
        </div>
        <div className="lp-grid3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
          {showcase.map((ix, i) => {
            const pos = ix.change >= 0
            const c = pos ? 'var(--delta-positive)' : 'var(--delta-negative)'
            return (
              <div key={ix.symbol} data-reveal data-reveal-delay={i * 70} style={{ opacity: 0, transform: 'translateY(30px)' }}>
                <div className="lp-idx" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, transition: 'border-color 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{ix.name}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 999, fontFamily: MONO, fontSize: 12, fontWeight: 600, color: c, background: pos ? 'var(--primary-subtle)' : 'var(--delta-negative-bg)' }}>{pos ? '▲' : '▼'} {pos ? '+' : ''}{ix.changePct.toFixed(2)}%</span>
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>{fmtIN(ix.value)}</div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section id="cta" style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '20px 24px 110px' }}>
        <div data-reveal style={{ position: 'relative', overflow: 'hidden', textAlign: 'center', border: '1px solid var(--border)', borderRadius: 24, padding: '80px 32px', background: 'var(--card)', opacity: 0, transform: 'translateY(28px)' }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 26 }}>
              <LogoMark size={52} />
            </div>
            <h2 style={{ fontFamily: DISPLAY, fontSize: 'clamp(32px,4.6vw,56px)', fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.05, margin: '0 0 18px' }}>
              Start screening <span style={{ fontStyle: 'italic' }}>in seconds.</span>
            </h2>
            <p style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--muted-foreground)', maxWidth: 480, margin: '0 auto 36px' }}>No signup, no paywall, no API keys. Open the terminal and read the market the way the pros do.</p>
            <button data-magnetic className="lp-cta-btn" onClick={() => navigate('/funds')} style={{ fontFamily: MONO, fontSize: 16, fontWeight: 600, color: 'var(--primary-foreground)', background: ACCENT, border: 'none', padding: '17px 36px', borderRadius: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, transition: 'transform 0.18s ease-out, background 0.2s' }}>
              $ launch terminal
              <span style={{ display: 'inline-block', width: 9, height: '1em', background: 'var(--primary-foreground)', animation: 'lpBlink 1.1s step-end infinite' }} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer id="footer-about" style={{ position: 'relative', zIndex: 1, borderTop: '1px solid var(--border)', padding: '56px 24px 40px' }}>
        <div className="lp-footer" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 32 }}>
          <div>
            <div style={{ marginBottom: 14 }}>
              <Logo size={26} />
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--muted-foreground)', maxWidth: 280, margin: 0 }}>The fastest way to screen Indian mutual funds, indices and equities. Built for serious retail research.</p>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--subtle)', marginBottom: 14 }}>PRODUCT</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {[['Fund Screener','/funds'],['Live Indices','/indices'],['Compare','/compare'],['The Banker','/banker']].map(([lbl, path]) => (
                <button key={lbl} onClick={() => navigate(path)} className="lp-foot-link" style={{ fontFamily: SANS, background: 'none', border: 'none', padding: 0, fontSize: 14, color: 'var(--muted-foreground)', cursor: 'pointer', textAlign: 'left', transition: 'color 0.15s' }}>{lbl}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--subtle)', marginBottom: 14 }}>APP</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {[['About','/about'],['Watchlist','/watchlist'],['Portfolio','/portfolio']].map(([lbl, path]) => (
                <button key={lbl} onClick={() => navigate(path)} className="lp-foot-link" style={{ fontFamily: SANS, background: 'none', border: 'none', padding: 0, fontSize: 14, color: 'var(--muted-foreground)', cursor: 'pointer', textAlign: 'left', transition: 'color 0.15s' }}>{lbl}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--subtle)', marginBottom: 14 }}>DATA</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {['NSE indices & quotes', 'NSE EOD bhavcopy', 'MFAPI + AMFI'].map(t => (
                <span key={t} style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: '40px auto 0', paddingTop: 24, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 12.5, color: 'var(--subtle)' }}>© 2026 stonks · Personal research only · Data may be delayed · Not financial advice</span>
          <span style={{ fontSize: 12.5, color: 'var(--subtle)', fontFamily: MONO }}>built for the Indian markets</span>
        </div>
      </footer>
    </div>
  )
}
