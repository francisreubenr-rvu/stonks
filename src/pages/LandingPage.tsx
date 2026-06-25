import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const ACCENT = '#10B981'

// ── Static data ─────────────────────────────────────────────────────────────

const TICKER = [
  ['RELIANCE','2,945.20','+1.24%',true],['TCS','4,102.50','+0.62%',true],
  ['HDFCBANK','1,678.30','-0.45%',false],['INFY','1,842.10','+0.88%',true],
  ['ICICIBANK','1,234.55','+1.10%',true],['SBIN','842.30','-0.32%',false],
  ['BHARTIARTL','1,567.80','+2.05%',true],['ITC','478.90','+0.41%',true],
  ['LT','3,612.40','-0.78%',false],['AXISBANK','1,156.20','+0.55%',true],
  ['KOTAKBANK','1,789.60','-0.21%',false],['HINDUNILVR','2,456.70','+0.33%',true],
  ['BAJFINANCE','7,234.50','+1.67%',true],['MARUTI','12,890.30','-0.92%',false],
  ['SUNPHARMA','1,678.40','+0.74%',true],['TATAMOTORS','978.50','+2.34%',true],
  ['ADANIENT','2,890.60','-1.45%',false],['WIPRO','542.10','+1.33%',true],
].map(([sym, price, delta, up]) => ({ sym, price, delta, c: up ? '#34D399' : '#F87171' }))

const BAND_STATS = [
  { target: 12480, dec: 0, comma: true,  prefix: '',  suffix: '',    label: 'Mutual funds tracked' },
  { target: 1940,  dec: 0, comma: true,  prefix: '',  suffix: '',    label: 'Listed equities' },
  { target: 451,   dec: 0, comma: false, prefix: '₹', suffix: 'L Cr',label: 'Total market cap' },
  { target: 24,    dec: 0, comma: false, prefix: '',  suffix: '',    label: 'Live indices' },
]

const FEATURES = [
  { key: 'screener', title: 'Fund Screener',  delay: 0,   desc: 'Filter 12,000+ mutual funds by risk, category, expense ratio and trailing returns — results in milliseconds.' },
  { key: 'indices',  title: 'Live Indices',   delay: 90,  desc: 'NIFTY 50, SENSEX, BANK NIFTY and every sector index, redrawn in real time with EOD history on tap.' },
  { key: 'compare',  title: 'Compare Engine', delay: 180, desc: 'Overlay any funds and equities on one normalized chart and read relative performance at a glance.' },
]

const ICON_SVG: Record<string, string> = {
  screener: '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="9" cy="6" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="8" cy="18" r="2" fill="currentColor"/>',
  indices:  '<line x1="6" y1="20" x2="6" y2="13"/><line x1="12" y1="20" x2="12" y2="8"/><line x1="18" y1="20" x2="18" y2="4"/>',
  compare:  '<path d="M3 17l5-5 4 3 8-9"/><path d="M3 21l6-3 4 2 8-6" opacity="0.5"/>',
}

function mkSpark(seed: number, trend: number) {
  let s = seed, v = 0.5
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
  const pts: number[] = []
  for (let i = 0; i < 26; i++) { v += (rnd() - 0.5) * 0.22 + trend * 0.012; v = Math.max(0.08, Math.min(0.92, v)); pts.push(v) }
  const W = 240, H = 56
  const coords = pts.map((p, i) => [(i / 25) * W, H - 4 - p * (H - 10)] as [number, number])
  const line = coords.map((c, i) => (i === 0 ? 'M' : 'L') + c[0].toFixed(1) + ' ' + c[1].toFixed(1)).join(' ')
  return { line, area: line + ` L${W} ${H} L0 ${H} Z` }
}

const IDX_RAW: [string, number, string, boolean, number][] = [
  ['NIFTY 50',    24182.65, '+0.84%', true,  3],
  ['SENSEX',      79486.20, '+0.72%', true,  7],
  ['BANK NIFTY',  51234.40, '-0.31%', false, 11],
  ['NIFTY IT',    38902.15, '+1.42%', true,  5],
  ['NIFTY AUTO',  23456.80, '+0.58%', true,  9],
  ['NIFTY PHARMA',21103.50, '-0.44%', false, 13],
]
const INDICES = IDX_RAW.map(([name, value, pct, up, seed], i) => ({
  name, value, pct,
  c: up ? '#34D399' : '#F87171',
  arrow: up ? '▲' : '▼',
  delay: i * 70,
  ...mkSpark(seed, up ? 1 : -1),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function fmtNum(val: number, dec: number, comma: boolean, prefix: string, suffix: string) {
  let str = val.toFixed(dec)
  if (comma) {
    const parts = str.split('.')
    parts[0] = Number(parts[0]).toLocaleString('en-IN')
    str = parts.join('.')
  }
  return prefix + str + suffix
}

// ── Inline keyframes (scoped to this page) ───────────────────────────────────
const LP_CSS = `
  @keyframes lpMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  @keyframes lpFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
  @keyframes lpDrift { 0% { transform:translate(0,0) scale(1); } 33% { transform:translate(6%,-4%) scale(1.08); } 66% { transform:translate(-4%,3%) scale(0.96); } 100% { transform:translate(0,0) scale(1); } }
  @keyframes lpPing  { 0% { transform:scale(1); opacity:0.7; } 70%,100% { transform:scale(2.6); opacity:0; } }
  @keyframes lpBlink { 0%,49% { opacity:1; } 50%,100% { opacity:0; } }
  @keyframes lpReveal { 0% { opacity:0; transform:translateY(28px); } 100% { opacity:1; transform:translateY(0); } }
  @keyframes lpRise   { 0% { opacity:0; transform:translateY(8px);  } 100% { opacity:1; transform:translateY(0); } }
  .lp-nav-link:hover   { color:#EAF0F8 !important; background:rgba(255,255,255,0.05) !important; }
  .lp-btn-pri:hover    { box-shadow:0 18px 50px -10px color-mix(in srgb,#10B981 90%,transparent) !important; }
  .lp-btn-out:hover    { border-color:rgba(255,255,255,0.28) !important; background:rgba(255,255,255,0.07) !important; }
  .lp-feat:hover       { transform:translateY(-6px) !important; border-color:color-mix(in srgb,#10B981 40%,transparent) !important; box-shadow:0 26px 60px -28px color-mix(in srgb,#10B981 50%,transparent) !important; }
  .lp-idx:hover        { transform:translateY(-5px) !important; border-color:rgba(255,255,255,0.2) !important; }
  .lp-foot-link:hover  { color:#EAF0F8 !important; }
  .lp-cta-btn:hover    { box-shadow:0 24px 64px -10px color-mix(in srgb,#10B981 95%,transparent) !important; }
  .lp-nav-cta:hover    { box-shadow:0 12px 36px -8px color-mix(in srgb,#10B981 85%,transparent) !important; }
`

const MONO = "'JetBrains Mono', monospace"
const SANS = "'Space Grotesk', system-ui, -apple-system, sans-serif"

export default function LandingPage() {
  const navigate = useNavigate()
  const rootRef    = useRef<HTMLDivElement>(null)
  const progRef    = useRef<HTMLDivElement>(null)
  const particleRef= useRef<HTMLCanvasElement>(null)
  const chartRef   = useRef<HTMLCanvasElement>(null)
  const cycleRef   = useRef<HTMLSpanElement>(null)

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

    // ── Reveal on scroll ──────────────────────────────────────────────────
    const revealEls = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (reduced) {
      revealEls.forEach(el => { el.style.opacity = '1'; el.style.transform = 'none' })
    } else {
      const obs = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (!en.isIntersecting) return
          const el = en.target as HTMLElement
          const d = parseInt(el.getAttribute('data-reveal-delay') || '0', 10)
          el.style.animation = `lpReveal 0.72s cubic-bezier(0.2,0.7,0.2,1) ${d}ms both`
          const commit = () => { el.style.animation = 'none'; el.style.opacity = '1'; el.style.transform = 'none' }
          el.addEventListener('animationend', commit, { once: true })
          timers.push(setTimeout(commit, d + 1100))
          obs.unobserve(el)
        })
      }, { threshold: 0.08 })
      revealEls.forEach(el => obs.observe(el))
      cleanup.push(() => obs.disconnect())
    }

    // ── Count-up ──────────────────────────────────────────────────────────
    const cntObs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return
        const el = en.target as HTMLElement
        const target = parseFloat(el.getAttribute('data-target') || '0')
        const dec    = parseInt(el.getAttribute('data-decimals') || '0', 10)
        const comma  = el.getAttribute('data-comma') === '1'
        const prefix = el.getAttribute('data-prefix') || ''
        const suffix = el.getAttribute('data-suffix') || ''
        if (reduced) { el.textContent = fmtNum(target, dec, comma, prefix, suffix); return }
        const dur = 1700, start = performance.now()
        const step = (now: number) => {
          const t = Math.min((now - start) / dur, 1)
          el.textContent = fmtNum(target * (1 - Math.pow(1 - t, 3)), dec, comma, prefix, suffix)
          if (t < 1) raf.push(requestAnimationFrame(step))
        }
        raf.push(requestAnimationFrame(step))
        cntObs.unobserve(el)
      })
    }, { threshold: 0.5 })
    Array.from(root.querySelectorAll('[data-countup]')).forEach(el => cntObs.observe(el))
    cleanup.push(() => cntObs.disconnect())

    // ── Sparklines ────────────────────────────────────────────────────────
    if (!reduced) {
      const spkObs = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (!en.isIntersecting) return
          const svg  = en.target as SVGElement
          const path = svg.querySelector<SVGPathElement>('[data-sparkline]')
          if (!path) return
          const len = path.getTotalLength()
          path.style.strokeDasharray = String(len)
          path.style.strokeDashoffset = String(len)
          const dur = 1000, start = performance.now()
          const step = (now: number) => {
            const t = Math.min((now - start) / dur, 1)
            path.style.strokeDashoffset = (len * Math.pow(1 - t, 3)).toFixed(1)
            if (t < 1) raf.push(requestAnimationFrame(step))
          }
          raf.push(requestAnimationFrame(step))
          spkObs.unobserve(svg)
        })
      }, { threshold: 0.5 })
      Array.from(root.querySelectorAll('[data-spark]')).forEach(el => spkObs.observe(el))
      cleanup.push(() => spkObs.disconnect())
    }

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

    // ── Particle field ────────────────────────────────────────────────────
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

    // ── Hero mini-chart ───────────────────────────────────────────────────
    const cc = chartRef.current
    if (cc) {
      const ctx = cc.getContext('2d')!
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      let W = 0, H = 0
      const N = 70
      let data: number[] = [], v = 0.45
      for (let i = 0; i < N; i++) { v += (Math.random() - 0.48) * 0.05; v = Math.max(0.15, Math.min(0.85, v)); data.push(v) }
      const resize = () => {
        const rc = cc.getBoundingClientRect()
        W = rc.width; H = rc.height
        cc.width = W * dpr; cc.height = H * dpr
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
      resize()
      window.addEventListener('resize', resize)
      let progress = reduced ? 1 : 0, last = performance.now(), acc = 0
      const xAt = (i: number) => (i / (N - 1)) * W
      const yAt = (val: number) => H - 6 - val * (H - 12)
      const draw = (now: number) => {
        const dt = now - last; last = now
        if (progress < 1) progress = Math.min(1, progress + dt / 1400)
        acc += dt
        if (acc > 900 && !reduced) { v += (Math.random() - 0.47) * 0.06; v = Math.max(0.12, Math.min(0.88, v)); data.push(v); data.shift(); acc = 0 }
        ctx.clearRect(0, 0, W, H)
        for (let i = 1; i <= 3; i++) { const y = (H / 4) * i; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1; ctx.stroke() }
        const n = Math.floor(N * progress)
        ctx.beginPath(); ctx.moveTo(0, H)
        for (let i = 0; i < n; i++) ctx.lineTo(xAt(i), yAt(data[i]))
        ctx.lineTo(xAt(Math.max(0, n - 1)), H); ctx.closePath()
        const grad = ctx.createLinearGradient(0, 0, 0, H)
        grad.addColorStop(0, `rgba(${r},${g},${b},0.32)`); grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx.fillStyle = grad; ctx.fill()
        ctx.beginPath()
        for (let i = 0; i < n; i++) { i === 0 ? ctx.moveTo(xAt(i), yAt(data[i])) : ctx.lineTo(xAt(i), yAt(data[i])) }
        ctx.strokeStyle = `rgb(${r},${g},${b})`; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'
        ctx.shadowColor = `rgba(${r},${g},${b},0.6)`; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0
        if (n > 0) {
          const lx = xAt(n - 1), ly = yAt(data[n - 1]), pulse = 3 + Math.sin(now / 280) * 1.4
          ctx.beginPath(); ctx.arc(lx, ly, pulse + 4, 0, Math.PI * 2); ctx.fillStyle = `rgba(${r},${g},${b},0.18)`; ctx.fill()
          ctx.beginPath(); ctx.arc(lx, ly, 3.2, 0, Math.PI * 2); ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fill()
        }
        loops.chart = requestAnimationFrame(draw)
      }
      cleanup.push(() => window.removeEventListener('resize', resize))
      loops.chart = requestAnimationFrame(draw)
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
    <div ref={rootRef} style={{ position: 'relative', minHeight: '100vh', background: '#05080F', color: '#EAF0F8', fontFamily: SANS, overflowX: 'hidden' }}>
      <style>{LP_CSS}</style>

      {/* Scroll progress */}
      <div ref={progRef} style={{ position: 'fixed', top: 0, left: 0, height: 2, width: '0%', background: ACCENT, zIndex: 100, boxShadow: `0 0 12px ${ACCENT}`, transition: 'width 0.08s linear' }} />

      {/* Background orbs */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div data-parallax data-speed="0.06" style={{ position: 'absolute', top: '-12%', left: '-8%', width: '55%', height: '60%', background: `radial-gradient(circle, color-mix(in srgb, ${ACCENT} 16%, transparent), transparent 62%)`, filter: 'blur(50px)', animation: 'lpDrift 22s ease-in-out infinite' }} />
        <div data-parallax data-speed="0.1"  style={{ position: 'absolute', bottom: '-18%', right: '-10%', width: '50%', height: '58%', background: 'radial-gradient(circle, rgba(99,102,241,0.10), transparent 64%)', filter: 'blur(60px)', animation: 'lpDrift 28s ease-in-out infinite reverse' }} />
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, backdropFilter: 'blur(16px)', background: 'rgba(5,8,15,0.55)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ position: 'relative', width: 9, height: 9, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 12px ${ACCENT}`, display: 'inline-block' }}>
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: ACCENT, animation: 'lpPing 2.4s ease-out infinite' }} />
            </span>
            <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em' }}>stonks</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {[['Funds', '/funds'], ['Indices', '/indices'], ['Compare', '/compare']].map(([lbl, path]) => (
              <button key={lbl} onClick={() => navigate(path)} className="lp-nav-link" style={{ fontFamily: SANS, fontSize: 14, fontWeight: 500, color: '#8A97AB', background: 'transparent', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', transition: 'color 0.15s, background 0.15s' }}>{lbl}</button>
            ))}
            <button onClick={() => scrollTo('footer-about')} className="lp-nav-link" style={{ fontFamily: SANS, fontSize: 14, fontWeight: 500, color: '#8A97AB', background: 'transparent', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', transition: 'color 0.15s, background 0.15s' }}>About</button>
            <button data-magnetic className="lp-nav-cta" onClick={() => navigate('/funds')} style={{ marginLeft: 10, fontFamily: SANS, fontSize: 14, fontWeight: 600, color: '#04140D', background: ACCENT, border: 'none', padding: '10px 18px', borderRadius: 10, cursor: 'pointer', transition: 'transform 0.18s ease-out, box-shadow 0.2s', boxShadow: `0 8px 26px -10px color-mix(in srgb,${ACCENT} 70%,transparent)` }}>Launch app</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1, overflow: 'hidden' }}>
        <canvas ref={particleRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.035) 1px,transparent 1px)', backgroundSize: '46px 46px', WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 35%,#000 0%,transparent 75%)', maskImage: 'radial-gradient(ellipse 80% 70% at 50% 35%,#000 0%,transparent 75%)' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '150px 24px 90px', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 56, alignItems: 'center' }}>
          {/* Copy */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '7px 14px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, background: 'rgba(255,255,255,0.03)', marginBottom: 28, animation: 'lpRise 0.6s ease-out both' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 10px ${ACCENT}` }} />
              <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.14em', color: '#B6C2D2' }}>NSE · BSE · REAL-TIME RESEARCH</span>
            </div>
            <h1 style={{ fontSize: 'clamp(42px,5.6vw,74px)', lineHeight: 1.02, fontWeight: 700, letterSpacing: '-0.035em', margin: '0 0 24px' }}>
              <span style={{ display: 'block', color: '#F4F8FD', animation: 'lpRise 0.7s ease-out 0.05s both' }}>Screen Indian</span>
              <span style={{ display: 'inline-block', animation: 'lpRise 0.7s ease-out 0.12s both' }}>
                <span ref={cycleRef} style={{ background: `linear-gradient(100deg,${ACCENT},#6EE7B7 55%,#5EEAD4)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>funds</span>
                <span style={{ display: 'inline-block', width: 4, height: '0.82em', background: ACCENT, marginLeft: 6, verticalAlign: 'baseline', transform: 'translateY(0.08em)', animation: 'lpBlink 1.1s step-end infinite', boxShadow: `0 0 12px ${ACCENT}` }} />
              </span>
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.6, color: '#9DAABC', maxWidth: 480, margin: '0 0 36px', animation: 'lpRise 0.7s ease-out 0.2s both' }}>
              A blazing-fast screener for 12,000+ mutual funds, every NSE &amp; BSE index, and live equities — built for people who read the numbers, not the noise.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 40, animation: 'lpRise 0.7s ease-out 0.28s both' }}>
              <button data-magnetic className="lp-btn-pri" onClick={() => navigate('/funds')} style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: '#04140D', background: ACCENT, border: 'none', padding: '15px 28px', borderRadius: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 9, transition: 'transform 0.18s ease-out, box-shadow 0.2s', boxShadow: `0 14px 40px -12px color-mix(in srgb,${ACCENT} 75%,transparent)` }}>
                Start screening
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
              <button data-magnetic className="lp-btn-out" onClick={() => navigate('/indices')} style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: '#EAF0F8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.13)', padding: '15px 26px', borderRadius: 12, cursor: 'pointer', transition: 'transform 0.18s ease-out, border-color 0.2s, background 0.2s' }}>View live indices</button>
            </div>
            <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', animation: 'lpRise 0.7s ease-out 0.36s both' }}>
              {['Real-time NSE + BSE', '12K+ funds indexed', 'Free forever'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#8A97AB', fontSize: 13.5, fontWeight: 500 }}>
                  <span style={{ color: ACCENT }}>✓</span> {t}
                </div>
              ))}
            </div>
          </div>

          {/* Floating card */}
          <div data-parallax data-speed="-0.05" style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: '-10% -6% -14% -6%', background: `radial-gradient(circle at 60% 30%,color-mix(in srgb,${ACCENT} 20%,transparent),transparent 65%)`, filter: 'blur(40px)', zIndex: 0, animation: 'lpFloat 7s ease-in-out infinite' }} />
            <div style={{ position: 'relative', zIndex: 1, background: 'linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: 20, backdropFilter: 'blur(14px)', boxShadow: '0 40px 90px -30px rgba(0,0,0,0.6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {['#F87171','#FBBF24','#34D399'].map(c => <span key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />)}
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 10px', borderRadius: 999, background: `color-mix(in srgb,${ACCENT} 14%,transparent)`, border: `1px solid color-mix(in srgb,${ACCENT} 30%,transparent)` }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }} />
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6EE7B7' }}>LIVE</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: '#8A97AB', fontWeight: 500 }}>NIFTY 50</span>
                <span style={{ fontSize: 12, color: '#5B687C', fontFamily: MONO }}>NSE · 30D</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18 }}>
                <span data-countup data-target="24182.65" data-decimals="2" data-comma="1" style={{ fontFamily: MONO, fontSize: 34, fontWeight: 600, letterSpacing: '-0.02em' }}>0.00</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 999, background: 'rgba(52,211,153,0.12)', color: '#34D399', fontFamily: MONO, fontSize: 13, fontWeight: 600 }}>▲ +0.84%</span>
              </div>
              <canvas ref={chartRef} style={{ display: 'block', width: '100%', height: 188 }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 18 }}>
                {[['Open','24,050.10'],['Day High','24,210.55'],['Volume','284M']].map(([label, val]) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '11px 12px' }}>
                    <div style={{ fontSize: 11, color: '#5B687C', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 500 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee ──────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.012)', padding: '16px 0', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 120, zIndex: 2, pointerEvents: 'none', background: 'linear-gradient(90deg,#06090F,transparent)' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 120, zIndex: 2, pointerEvents: 'none', background: 'linear-gradient(270deg,#06090F,transparent)' }} />
        <div style={{ display: 'flex', width: 'max-content', animation: 'lpMarquee 48s linear infinite' }}>
          {[...TICKER, ...TICKER].map((t, i) => (
            <div key={i} style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 9, padding: '0 22px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: '#C5D0DE' }}>{t.sym}</span>
              <span style={{ fontFamily: MONO, fontSize: 13, color: '#8A97AB' }}>{t.price}</span>
              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: t.c }}>{t.delta}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats band ───────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '88px 24px' }}>
        <div data-reveal style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, opacity: 0, transform: 'translateY(28px)', transition: 'opacity 0.7s cubic-bezier(0.2,0.7,0.2,1),transform 0.7s cubic-bezier(0.2,0.7,0.2,1)' }}>
          {BAND_STATS.map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '8px 4px' }}>
              <div style={{ fontFamily: MONO, fontSize: 'clamp(32px,4vw,46px)', fontWeight: 600, letterSpacing: '-0.02em', background: 'linear-gradient(180deg,#FFFFFF,#9DAABC)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                <span data-countup data-target={s.target} data-decimals={s.dec} data-comma={s.comma ? '1' : '0'} data-prefix={s.prefix} data-suffix={s.suffix}>0</span>
              </div>
              <div style={{ fontSize: 14, color: '#8A97AB', marginTop: 8 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '40px 24px 90px' }}>
        <div data-reveal style={{ maxWidth: 620, margin: '0 auto 56px', textAlign: 'center', opacity: 0, transform: 'translateY(28px)', transition: 'opacity 0.7s cubic-bezier(0.2,0.7,0.2,1),transform 0.7s cubic-bezier(0.2,0.7,0.2,1)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.16em', color: ACCENT, marginBottom: 14 }}>EVERYTHING IN ONE TERMINAL</div>
          <h2 style={{ fontSize: 'clamp(30px,4vw,46px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.08, margin: '0 0 16px' }}>Research that keeps up with the tape</h2>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: '#9DAABC', margin: 0 }}>Screen, track, and compare across the entire Indian market without juggling five tabs.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {FEATURES.map(f => (
            <div key={f.key} data-reveal data-reveal-delay={f.delay} style={{ opacity: 0, transform: 'translateY(32px)', transition: 'opacity 0.7s cubic-bezier(0.2,0.7,0.2,1),transform 0.7s cubic-bezier(0.2,0.7,0.2,1)' }}>
              <div className="lp-feat" style={{ height: '100%', background: 'linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 26, transition: 'transform 0.25s ease-out,border-color 0.25s,box-shadow 0.25s' }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: `color-mix(in srgb,${ACCENT} 14%,transparent)`, border: `1px solid color-mix(in srgb,${ACCENT} 28%,transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT, marginBottom: 20 }}
                  dangerouslySetInnerHTML={{ __html: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICON_SVG[f.key]}</svg>` }} />
                <h3 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 10px' }}>{f.title}</h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#9DAABC', margin: 0 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Indices ──────────────────────────────────────────────────────── */}
      <section id="indices" style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '20px 24px 100px' }}>
        <div data-reveal style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 16, opacity: 0, transform: 'translateY(28px)', transition: 'opacity 0.7s cubic-bezier(0.2,0.7,0.2,1),transform 0.7s cubic-bezier(0.2,0.7,0.2,1)' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.16em', color: ACCENT, marginBottom: 12 }}>MARKET PULSE</div>
            <h2 style={{ fontSize: 'clamp(28px,3.6vw,42px)', fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Every index, drawn live</h2>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#8A97AB', fontSize: 13, fontFamily: MONO }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }} /> updated just now
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
          {INDICES.map(ix => (
            <div key={ix.name} data-reveal data-reveal-delay={ix.delay} style={{ opacity: 0, transform: 'translateY(30px)', transition: 'opacity 0.7s cubic-bezier(0.2,0.7,0.2,1),transform 0.7s cubic-bezier(0.2,0.7,0.2,1)' }}>
              <div className="lp-idx" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, transition: 'transform 0.25s ease-out,border-color 0.25s' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#DCE4EE' }}>{ix.name}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 999, fontFamily: MONO, fontSize: 12, fontWeight: 600, color: ix.c, background: `color-mix(in srgb,${ix.c} 14%,transparent)` }}>{ix.arrow} {ix.pct}</span>
                </div>
                <div data-countup data-target={ix.value} data-decimals="2" data-comma="1" style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 14 }}>0.00</div>
                <svg data-spark viewBox="0 0 240 56" preserveAspectRatio="none" style={{ width: '100%', height: 52, display: 'block' }}>
                  <path d={ix.area} fill={ix.c} fillOpacity={0.09} stroke="none" />
                  <path data-sparkline d={ix.line} fill="none" stroke={ix.c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section id="cta" style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '20px 24px 110px' }}>
        <div data-reveal style={{ position: 'relative', overflow: 'hidden', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '80px 32px', background: 'linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))', opacity: 0, transform: 'translateY(28px)', transition: 'opacity 0.7s cubic-bezier(0.2,0.7,0.2,1),transform 0.7s cubic-bezier(0.2,0.7,0.2,1)' }}>
          <div style={{ position: 'absolute', top: '-40%', left: '50%', transform: 'translateX(-50%)', width: '70%', height: '100%', background: `radial-gradient(circle,color-mix(in srgb,${ACCENT} 22%,transparent),transparent 60%)`, filter: 'blur(60px)', pointerEvents: 'none', animation: 'lpFloat 8s ease-in-out infinite' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 'clamp(32px,4.6vw,56px)', fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.05, margin: '0 0 18px' }}>Start screening in seconds.</h2>
            <p style={{ fontSize: 18, lineHeight: 1.6, color: '#9DAABC', maxWidth: 480, margin: '0 auto 36px' }}>No signup, no paywall. Open the terminal and read the market the way the pros do.</p>
            <button data-magnetic className="lp-cta-btn" onClick={() => navigate('/funds')} style={{ fontFamily: SANS, fontSize: 16, fontWeight: 600, color: '#04140D', background: ACCENT, border: 'none', padding: '17px 36px', borderRadius: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, transition: 'transform 0.18s ease-out, box-shadow 0.2s', boxShadow: `0 18px 50px -12px color-mix(in srgb,${ACCENT} 80%,transparent)` }}>
              Launch the terminal
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer id="footer-about" style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.07)', padding: '56px 24px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 10px ${ACCENT}` }} />
              <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>stonks</span>
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: '#6B7889', maxWidth: 280, margin: 0 }}>The fastest way to screen Indian mutual funds, indices and equities. Built for serious retail research.</p>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', color: '#5B687C', marginBottom: 14 }}>PRODUCT</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {[['Fund Screener','/funds'],['Live Indices','/indices'],['Compare Engine','/compare']].map(([lbl, path]) => (
                <button key={lbl} onClick={() => navigate(path)} className="lp-foot-link" style={{ fontFamily: SANS, background: 'none', border: 'none', padding: 0, fontSize: 14, color: '#9DAABC', cursor: 'pointer', textAlign: 'left', transition: 'color 0.15s' }}>{lbl}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', color: '#5B687C', marginBottom: 14 }}>COMPANY</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {['About','Methodology','Changelog'].map(lbl => (
                <button key={lbl} onClick={() => scrollTo('cta')} className="lp-foot-link" style={{ fontFamily: SANS, background: 'none', border: 'none', padding: 0, fontSize: 14, color: '#9DAABC', cursor: 'pointer', textAlign: 'left', transition: 'color 0.15s' }}>{lbl}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', color: '#5B687C', marginBottom: 14 }}>DATA</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {['NSE · BSE','EOD & Intraday','12,000+ funds'].map(t => (
                <span key={t} style={{ fontSize: 14, color: '#9DAABC' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: '40px auto 0', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 12.5, color: '#5B687C' }}>© 2026 stonks · Personal research only · Data may be delayed · Not financial advice</span>
          <span style={{ fontSize: 12.5, color: '#5B687C', fontFamily: MONO }}>built for the Indian markets</span>
        </div>
      </footer>
    </div>
  )
}
