import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { useIndicesSnapshot } from '@/hooks/useIndicesSnapshot'
import { useFundList } from '@/hooks/useFundList'

const ACCENT = '#059669'

// ── Static data ─────────────────────────────────────────────────────────────

// Real NSE close snapshot, regenerated from the equity bhavcopy. Do NOT hand-edit
// the rows between the sentinels — run `npm run refresh-data` to refresh them from
// the keyless NSE feed (keeps the marquee in lockstep with stocks-fallback.json).
const TICKER = [
  /* TICKER-DATA:START */
  ['RELIANCE','1,293.90','-0.55%',false],['TCS','2,031.50','-3.17%',false],
  ['HDFCBANK','797.95','-0.12%',false],['INFY','1,000.40','-3.50%',false],
  ['ICICIBANK','1,375.20','-0.89%',false],['SBIN','1,026.90','-0.89%',false],
  ['BHARTIARTL','1,852.00','+0.59%',true],['ITC','286.95','-1.29%',false],
  ['LT','4,143.40','-0.52%',false],['AXISBANK','1,345.70','-0.82%',false],
  ['KOTAKBANK','392.25','-0.82%',false],['HINDUNILVR','2,118.20','-1.54%',false],
  ['BAJFINANCE','1,004.75','+2.31%',true],['MARUTI','14,115.00','+5.24%',true],
  ['SUNPHARMA','1,862.50','-0.66%',false],['TMPV','352.20','+2.07%',true],
  ['ADANIENT','3,036.00','+2.48%',true],['WIPRO','170.39','-2.90%',false],
  /* TICKER-DATA:END */
].map(([sym, price, delta, up]) => ({ sym, price, delta, c: up ? '#059669' : '#DC2626' }))

const FEATURES = [
  { key: 'screener', title: 'Fund Screener',  delay: 0,   desc: 'Filter thousands of mutual funds by risk, category, expense ratio and trailing returns — results in milliseconds.' },
  { key: 'indices',  title: 'Live Indices',   delay: 90,  desc: 'NIFTY 50, SENSEX, BANK NIFTY and every sector index, redrawn in real time with EOD history on tap.' },
  { key: 'compare',  title: 'Compare Engine', delay: 180, desc: 'Overlay any funds and equities on one normalized chart and read relative performance at a glance.' },
]

const ICON_SVG: Record<string, string> = {
  screener: '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="9" cy="6" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="8" cy="18" r="2" fill="currentColor"/>',
  indices:  '<line x1="6" y1="20" x2="6" y2="13"/><line x1="12" y1="20" x2="12" y2="8"/><line x1="18" y1="20" x2="18" y2="4"/>',
  compare:  '<path d="M3 17l5-5 4 3 8-9"/><path d="M3 21l6-3 4 2 8-6" opacity="0.5"/>',
}

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
  .lp-nav-link:hover   { color:#0F172A !important; background:#F1F5F9 !important; }
  .lp-btn-pri:hover    { background:#047857 !important; }
  .lp-btn-out:hover    { border-color:#CBD5E1 !important; background:#F8FAFC !important; }
  .lp-feat:hover       { border-color:#CBD5E1 !important; }
  .lp-idx:hover        { border-color:#CBD5E1 !important; }
  .lp-foot-link:hover  { color:#0F172A !important; }
  .lp-cta-btn:hover    { background:#047857 !important; }
  .lp-nav-cta:hover    { background:#047857 !important; }
  @media (max-width: 820px) {
    .lp-hero { grid-template-columns: 1fr !important; gap: 28px !important; padding-top: 96px !important; }
    .lp-navlinks { display: none !important; }
    .lp-grid3 { grid-template-columns: 1fr !important; }
    .lp-footer { grid-template-columns: 1fr 1fr !important; gap: 24px !important; }
  }
`

const MONO = "ui-monospace, 'SF Mono', SFMono-Regular, 'Cascadia Code', 'Roboto Mono', Menlo, Consolas, 'Liberation Mono', monospace"
const SANS = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

export default function LandingPage() {
  const navigate = useNavigate()
  const rootRef    = useRef<HTMLDivElement>(null)
  const progRef    = useRef<HTMLDivElement>(null)
  const particleRef= useRef<HTMLCanvasElement>(null)
  const cycleRef   = useRef<HTMLSpanElement>(null)

  // Reveal-on-scroll — shared with the rest of the app.
  useScrollReveal(rootRef)

  // ── Real data ───────────────────────────────────────────────────────────
  const { data: indices } = useIndicesSnapshot()
  const { data: funds } = useFundList()
  const idxList = indices ?? []
  const heroIdx = idxList.find(i => i.symbol === 'NIFTY 50') ?? idxList[0]
  const heroMini = idxList.filter(i => i.symbol !== heroIdx?.symbol).slice(0, 3)
  const showcase = idxList.slice(0, 6)
  const fundCount = funds?.length ?? null
  const categoryCount = funds ? new Set(funds.map(f => f.g)).size : null
  const indexCount = idxList.length || null

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
    <div ref={rootRef} style={{ position: 'relative', minHeight: '100vh', background: '#F8FAFC', color: '#0F172A', fontFamily: SANS, overflowX: 'hidden' }}>
      <style>{LP_CSS}</style>

      {/* Scroll progress */}
      <div ref={progRef} style={{ position: 'fixed', top: 0, left: 0, height: 2, width: '0%', background: ACCENT, zIndex: 100, transition: 'width 0.08s linear' }} />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ position: 'relative', width: 9, height: 9, borderRadius: '50%', background: ACCENT, display: 'inline-block' }}>
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: ACCENT, animation: 'lpPing 2.4s ease-out infinite' }} />
            </span>
            <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em' }}>stonks</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div className="lp-navlinks" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {[['Funds', '/funds'], ['Indices', '/indices'], ['Compare', '/compare']].map(([lbl, path]) => (
                <button key={lbl} onClick={() => navigate(path)} className="lp-nav-link" style={{ fontFamily: SANS, fontSize: 14, fontWeight: 500, color: '#64748B', background: 'transparent', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', transition: 'color 0.15s, background 0.15s' }}>{lbl}</button>
              ))}
              <button onClick={() => scrollTo('footer-about')} className="lp-nav-link" style={{ fontFamily: SANS, fontSize: 14, fontWeight: 500, color: '#64748B', background: 'transparent', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', transition: 'color 0.15s, background 0.15s' }}>About</button>
            </div>
            <button data-magnetic className="lp-nav-cta" onClick={() => navigate('/funds')} style={{ marginLeft: 10, fontFamily: SANS, fontSize: 14, fontWeight: 600, color: '#FFFFFF', background: ACCENT, border: 'none', padding: '10px 18px', borderRadius: 10, cursor: 'pointer', transition: 'transform 0.18s ease-out, background 0.2s' }}>Launch app</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1, overflow: 'hidden' }}>
        <canvas ref={particleRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />

        <div className="lp-hero" style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '150px 24px 90px', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 56, alignItems: 'center' }}>
          {/* Copy */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '7px 14px', border: '1px solid #E2E8F0', borderRadius: 999, background: '#F1F5F9', marginBottom: 28, animation: 'lpRise 0.6s ease-out both' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT }} />
              <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.14em', color: '#64748B' }}>NSE · BSE · REAL-TIME RESEARCH</span>
            </div>
            <h1 style={{ fontSize: 'clamp(42px,5.6vw,74px)', lineHeight: 1.02, fontWeight: 700, letterSpacing: '-0.035em', margin: '0 0 24px' }}>
              <span style={{ display: 'block', color: '#0F172A', animation: 'lpRise 0.7s ease-out 0.05s both' }}>Screen Indian</span>
              <span style={{ display: 'inline-block', animation: 'lpRise 0.7s ease-out 0.12s both' }}>
                <span ref={cycleRef} style={{ color: ACCENT }}>funds</span>
                <span style={{ display: 'inline-block', width: 4, height: '0.82em', background: ACCENT, marginLeft: 6, verticalAlign: 'baseline', transform: 'translateY(0.08em)', animation: 'lpBlink 1.1s step-end infinite' }} />
              </span>
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.6, color: '#64748B', maxWidth: 480, margin: '0 0 36px', animation: 'lpRise 0.7s ease-out 0.2s both' }}>
              A blazing-fast screener for India's mutual funds, every NSE &amp; BSE index, and live equities — built for people who read the numbers, not the noise.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 40, animation: 'lpRise 0.7s ease-out 0.28s both' }}>
              <button data-magnetic className="lp-btn-pri" onClick={() => navigate('/funds')} style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: '#FFFFFF', background: ACCENT, border: 'none', padding: '15px 28px', borderRadius: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 9, transition: 'transform 0.18s ease-out, background 0.2s' }}>
                Start screening
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
              <button data-magnetic className="lp-btn-out" onClick={() => navigate('/indices')} style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: '#0F172A', background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '15px 26px', borderRadius: 12, cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s' }}>View live indices</button>
            </div>
            <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', animation: 'lpRise 0.7s ease-out 0.36s both' }}>
              {['Real-time NSE + BSE', 'Thousands of funds indexed', 'Free forever'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#64748B', fontSize: 13.5, fontWeight: 500 }}>
                  <span style={{ color: ACCENT }}>✓</span> {t}
                </div>
              ))}
            </div>
          </div>

          {/* Live snapshot card — real index data */}
          <div data-parallax data-speed="-0.05" style={{ position: 'relative' }}>
            <div style={{ position: 'relative', zIndex: 1, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: 20, boxShadow: '0 1px 2px 0 rgba(15,23,42,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>{heroIdx?.name ?? 'NIFTY 50'}</span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 10px', borderRadius: 999, background: 'var(--primary-subtle)', border: '1px solid #A7F3D0' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT }} />
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#047857' }}>LIVE</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
                <span style={{ fontFamily: MONO, fontSize: 34, fontWeight: 600, letterSpacing: '-0.02em' }}>
                  {heroIdx ? fmtIN(heroIdx.value) : '—'}
                </span>
                {heroIdx && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 999, background: heroIdx.change >= 0 ? '#ECFDF5' : '#FEF2F2', color: heroIdx.change >= 0 ? '#059669' : '#DC2626', fontFamily: MONO, fontSize: 13, fontWeight: 600 }}>
                    {heroIdx.change >= 0 ? '▲' : '▼'} {heroIdx.change >= 0 ? '+' : ''}{heroIdx.changePct.toFixed(2)}%
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {heroMini.length > 0 ? heroMini.map(ix => (
                  <div key={ix.symbol} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '11px 12px' }}>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ix.name}</div>
                    <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 500 }}>{fmtIN(ix.value, 0)}</div>
                    <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: ix.change >= 0 ? '#059669' : '#DC2626' }}>
                      {ix.change >= 0 ? '+' : ''}{ix.changePct.toFixed(2)}%
                    </div>
                  </div>
                )) : [0, 1, 2].map(i => (
                  <div key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '11px 12px', height: 62 }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee (real NSE close snapshot) ────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1, borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', padding: '16px 0', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 120, zIndex: 2, pointerEvents: 'none', background: 'linear-gradient(90deg,#FFFFFF,transparent)' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 120, zIndex: 2, pointerEvents: 'none', background: 'linear-gradient(270deg,#FFFFFF,transparent)' }} />
        <div style={{ display: 'flex', width: 'max-content', animation: 'lpMarquee 48s linear infinite' }}>
          {[...TICKER, ...TICKER].map((t, i) => (
            <div key={i} style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 9, padding: '0 22px', borderRight: '1px solid #E2E8F0' }}>
              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: '#334155' }}>{t.sym}</span>
              <span style={{ fontFamily: MONO, fontSize: 13, color: '#64748B' }}>{t.price}</span>
              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: t.c }}>{t.delta}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats band (real counts) ─────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '88px 24px' }}>
        <div data-reveal className="lp-grid3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, opacity: 0, transform: 'translateY(28px)' }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '8px 4px' }}>
              <div style={{ fontFamily: MONO, fontSize: 'clamp(32px,4vw,46px)', fontWeight: 600, letterSpacing: '-0.02em', color: '#0F172A' }}>
                {s.value != null ? s.value.toLocaleString('en-IN') : '—'}
              </div>
              <div style={{ fontSize: 14, color: '#64748B', marginTop: 8 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '40px 24px 90px' }}>
        <div data-reveal style={{ maxWidth: 620, margin: '0 auto 56px', textAlign: 'center', opacity: 0, transform: 'translateY(28px)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.16em', color: ACCENT, marginBottom: 14 }}>EVERYTHING IN ONE TERMINAL</div>
          <h2 style={{ fontSize: 'clamp(30px,4vw,46px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.08, margin: '0 0 16px' }}>Research that keeps up with the tape</h2>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: '#64748B', margin: 0 }}>Screen, track, and compare across the entire Indian market without juggling five tabs.</p>
        </div>
        <div className="lp-grid3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {FEATURES.map(f => (
            <div key={f.key} data-reveal data-reveal-delay={f.delay} style={{ opacity: 0, transform: 'translateY(32px)' }}>
              <div className="lp-feat" style={{ height: '100%', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 26, transition: 'border-color 0.2s' }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--primary-subtle)', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT, marginBottom: 20 }}
                  dangerouslySetInnerHTML={{ __html: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICON_SVG[f.key]}</svg>` }} />
                <h3 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 10px' }}>{f.title}</h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#64748B', margin: 0 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Indices (real snapshot) ──────────────────────────────────────── */}
      <section id="indices" style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '20px 24px 100px' }}>
        <div data-reveal style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 16, opacity: 0, transform: 'translateY(28px)' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.16em', color: ACCENT, marginBottom: 12 }}>MARKET PULSE</div>
            <h2 style={{ fontSize: 'clamp(28px,3.6vw,42px)', fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Every index, drawn live</h2>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#64748B', fontSize: 13, fontFamily: MONO }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT }} /> updated just now
          </div>
        </div>
        <div className="lp-grid3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
          {showcase.map((ix, i) => {
            const pos = ix.change >= 0
            const c = pos ? '#059669' : '#DC2626'
            return (
              <div key={ix.symbol} data-reveal data-reveal-delay={i * 70} style={{ opacity: 0, transform: 'translateY(30px)' }}>
                <div className="lp-idx" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 20, transition: 'border-color 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{ix.name}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 999, fontFamily: MONO, fontSize: 12, fontWeight: 600, color: c, background: pos ? '#ECFDF5' : '#FEF2F2' }}>{pos ? '▲' : '▼'} {pos ? '+' : ''}{ix.changePct.toFixed(2)}%</span>
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
        <div data-reveal style={{ position: 'relative', overflow: 'hidden', textAlign: 'center', border: '1px solid #E2E8F0', borderRadius: 24, padding: '80px 32px', background: '#FFFFFF', opacity: 0, transform: 'translateY(28px)' }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 'clamp(32px,4.6vw,56px)', fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.05, margin: '0 0 18px' }}>Start screening in seconds.</h2>
            <p style={{ fontSize: 18, lineHeight: 1.6, color: '#64748B', maxWidth: 480, margin: '0 auto 36px' }}>No signup, no paywall. Open the terminal and read the market the way the pros do.</p>
            <button data-magnetic className="lp-cta-btn" onClick={() => navigate('/funds')} style={{ fontFamily: SANS, fontSize: 16, fontWeight: 600, color: '#FFFFFF', background: ACCENT, border: 'none', padding: '17px 36px', borderRadius: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, transition: 'transform 0.18s ease-out, background 0.2s' }}>
              Launch the terminal
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer id="footer-about" style={{ position: 'relative', zIndex: 1, borderTop: '1px solid #E2E8F0', padding: '56px 24px 40px' }}>
        <div className="lp-footer" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: ACCENT }} />
              <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>stonks</span>
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: '#64748B', maxWidth: 280, margin: 0 }}>The fastest way to screen Indian mutual funds, indices and equities. Built for serious retail research.</p>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', color: '#94A3B8', marginBottom: 14 }}>PRODUCT</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {[['Fund Screener','/funds'],['Live Indices','/indices'],['Compare Engine','/compare']].map(([lbl, path]) => (
                <button key={lbl} onClick={() => navigate(path)} className="lp-foot-link" style={{ fontFamily: SANS, background: 'none', border: 'none', padding: 0, fontSize: 14, color: '#64748B', cursor: 'pointer', textAlign: 'left', transition: 'color 0.15s' }}>{lbl}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', color: '#94A3B8', marginBottom: 14 }}>COMPANY</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {['About','Methodology','Changelog'].map(lbl => (
                <button key={lbl} onClick={() => scrollTo('cta')} className="lp-foot-link" style={{ fontFamily: SANS, background: 'none', border: 'none', padding: 0, fontSize: 14, color: '#64748B', cursor: 'pointer', textAlign: 'left', transition: 'color 0.15s' }}>{lbl}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', color: '#94A3B8', marginBottom: 14 }}>DATA</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {['NSE · BSE','EOD & Intraday','MFAPI + AMFI'].map(t => (
                <span key={t} style={{ fontSize: 14, color: '#64748B' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: '40px auto 0', paddingTop: 24, borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 12.5, color: '#94A3B8' }}>© 2026 stonks · Personal research only · Data may be delayed · Not financial advice</span>
          <span style={{ fontSize: 12.5, color: '#94A3B8', fontFamily: MONO }}>built for the Indian markets</span>
        </div>
      </footer>
    </div>
  )
}
