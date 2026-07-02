import React, { useEffect, useRef, useState, useCallback } from 'react'
import type { NavPoint } from '@/api/dataTypes'

type Period = '1M' | '3M' | '6M' | '1Y' | '3Y' | 'Max'

const PERIODS: Period[] = ['1M', '3M', '6M', '1Y', '3Y', 'Max']
const PERIOD_DAYS: Record<Period, number> = {
  '1M': 30, '3M': 91, '6M': 182, '1Y': 365, '3Y': 1095, 'Max': Infinity,
}

function filterByPeriod(data: NavPoint[], period: Period): NavPoint[] {
  if (period === 'Max' || data.length === 0) return data
  const days = PERIOD_DAYS[period]
  // Anchor the window to the fund's most recent NAV date — not "today". Many
  // funds are closed/merged and their latest NAV is years in the past, so
  // measuring from Date.now() would filter every point out and blank the chart.
  const anchor = parseNavDate(data[data.length - 1].date)
  const cutoff = anchor - days * 86_400_000
  return data.filter(p => parseNavDate(p.date) >= cutoff)
}

function parseNavDate(d: string): number {
  const [dd, mm, yyyy] = d.split('-').map(Number)
  return new Date(yyyy, mm - 1, dd).getTime()
}

function formatDate(d: string): string {
  const [dd, mm, yyyy] = d.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${dd} ${months[parseInt(mm) - 1]} ${yyyy}`
}

const W = 640
const H = 200
const PAD = { top: 12, right: 8, bottom: 24, left: 48 }
const innerW = W - PAD.left - PAD.right
const innerH = H - PAD.top - PAD.bottom

interface TooltipState {
  x: number
  y: number
  nav: number
  date: string
  pct: number | null
}

interface Props {
  data: NavPoint[]
  positive?: boolean
}

function NavChart({ data, positive }: Props) {
  const [period, setPeriod] = useState<Period>('1Y')
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [animated, setAnimated] = useState(false)
  const pathRef = useRef<SVGPathElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const filtered = filterByPeriod(data, period)

  const minNav = filtered.length > 0 ? Math.min(...filtered.map(p => p.nav)) : 0
  const maxNav = filtered.length > 0 ? Math.max(...filtered.map(p => p.nav)) : 1
  const navRange = maxNav - minNav || 1

  const toX = (i: number) => PAD.left + (i / Math.max(filtered.length - 1, 1)) * innerW
  const toY = (nav: number) => PAD.top + innerH - ((nav - minNav) / navRange) * innerH

  const pathD = filtered.length < 2 ? '' : filtered.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.nav).toFixed(1)}`
  ).join(' ')

  const areaD = filtered.length < 2 ? '' :
    pathD +
    ` L${toX(filtered.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)}` +
    ` L${PAD.left.toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`

  const firstNav = filtered[0]?.nav ?? 0
  const isPos = positive !== undefined ? positive : (filtered.length > 1 ? filtered[filtered.length - 1].nav >= firstNav : true)
  const stroke = isPos ? 'var(--delta-positive)' : 'var(--delta-negative)'
  const gradId = `nav-grad-${isPos ? 'pos' : 'neg'}`

  // Animate path on mount / period change
  useEffect(() => {
    setAnimated(false)
    const t = setTimeout(() => setAnimated(true), 50)
    return () => clearTimeout(t)
  }, [period, data])

  const [pathLen, setPathLen] = useState(0)
  useEffect(() => {
    if (pathRef.current) setPathLen(pathRef.current.getTotalLength())
  }, [pathD])

  // Y-axis ticks (4 levels)
  const yTicks = [0, 1, 2, 3].map(i => {
    const nav = minNav + (navRange * i) / 3
    return { y: toY(nav), label: nav >= 1000 ? nav.toFixed(0) : nav.toFixed(2) }
  })

  // X-axis ticks (3–5 date labels)
  const xTicks = (() => {
    if (filtered.length < 2) return []
    const count = Math.min(4, filtered.length)
    return Array.from({ length: count }, (_, i) => {
      const idx = Math.round((i / (count - 1)) * (filtered.length - 1))
      return { x: toX(idx), date: filtered[idx].date }
    })
  })()

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || filtered.length < 2) return
    const rect = svgRef.current.getBoundingClientRect()
    const svgX = (e.clientX - rect.left) * (W / rect.width)
    const relX = svgX - PAD.left
    const idx = Math.round((relX / innerW) * (filtered.length - 1))
    const clamped = Math.max(0, Math.min(filtered.length - 1, idx))
    const p = filtered[clamped]
    const pct = firstNav > 0 ? (p.nav - firstNav) / firstNav : null
    setTooltip({
      x: toX(clamped),
      y: toY(p.nav),
      nav: p.nav,
      date: p.date,
      pct,
    })
  }, [filtered, firstNav])

  const handleMouseLeave = useCallback(() => setTooltip(null), [])

  if (data.length === 0) return (
    <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground">
      No NAV data available
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Period selector */}
      <div className="flex items-center gap-1">
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`text-[11px] font-medium px-2.5 py-1 rounded transition-colors duration-150 cursor-pointer ${
              period === p
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="relative">
        {filtered.length < 2 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-[11px] text-muted-foreground pointer-events-none">
            Not enough data for this period — try a longer range
          </div>
        )}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: H }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.18} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0.01} />
            </linearGradient>
            <clipPath id="chart-clip">
              <rect x={PAD.left} y={PAD.top} width={innerW} height={innerH} />
            </clipPath>
          </defs>

          {/* Y-axis gridlines + labels */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={PAD.left} y1={t.y} x2={PAD.left + innerW} y2={t.y}
                stroke="var(--border)" strokeWidth={0.5}
              />
              <text
                x={PAD.left - 4} y={t.y + 3.5}
                textAnchor="end" fontSize={9}
                fill="var(--subtle)"
                fontFamily="ui-monospace, monospace"
              >
                {t.label}
              </text>
            </g>
          ))}

          {/* X-axis date labels — show day for short ranges, month/year for long */}
          {xTicks.map((t, i) => {
            const full = formatDate(t.date)              // "DD MMM YYYY"
            const shortRange = period === '1M' || period === '3M' || period === '6M'
            const label = shortRange ? full.slice(0, 6) : full.slice(3) // "DD MMM" vs "MMM YYYY"
            return (
              <text
                key={i} x={t.x} y={H - 6}
                textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
                fontSize={9} fill="var(--subtle)"
                fontFamily="ui-monospace, monospace"
              >
                {label}
              </text>
            )
          })}

          {/* Area fill — fades in */}
          {areaD && (
            <path
              d={areaD}
              fill={`url(#${gradId})`}
              clipPath="url(#chart-clip)"
              style={{
                opacity: animated ? 1 : 0,
                transition: 'opacity 0.8s ease-out 0.2s',
              }}
            />
          )}

          {/* Line — draws in */}
          {pathD && (
            <path
              ref={pathRef}
              d={pathD}
              fill="none"
              stroke={stroke}
              strokeWidth={1.5}
              clipPath="url(#chart-clip)"
              style={{
                strokeDasharray: pathLen || 2000,
                strokeDashoffset: animated ? 0 : (pathLen || 2000),
                transition: animated ? 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' : 'none',
              }}
            />
          )}

          {/* Tooltip crosshair */}
          {tooltip && (
            <g>
              <line
                x1={tooltip.x} y1={PAD.top}
                x2={tooltip.x} y2={PAD.top + innerH}
                stroke="var(--border-strong)" strokeWidth={1} strokeDasharray="3 2"
              />
              <circle
                cx={tooltip.x} cy={tooltip.y} r={3.5}
                fill={stroke} stroke="white" strokeWidth={1.5}
              />
            </g>
          )}
        </svg>

        {/* Tooltip box */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 bg-card border border-border rounded-md shadow-[var(--shadow-dropdown)] px-3 py-2 space-y-0.5"
            style={{
              left: `${Math.min(tooltip.x / W * 100, 72)}%`,
              top: `${Math.max(0, (tooltip.y / H * 100) - 40)}%`,
              transform: 'translateX(-50%)',
              minWidth: 120,
            }}
          >
            <p className="font-mono text-[10px] text-muted-foreground">{formatDate(tooltip.date)}</p>
            <p className="font-mono text-[13px] font-semibold text-foreground">₹{tooltip.nav.toFixed(4)}</p>
            {tooltip.pct !== null && (
              <p
                className="font-mono text-[11px] font-medium"
                style={{ color: tooltip.pct >= 0 ? 'var(--delta-positive)' : 'var(--delta-negative)' }}
              >
                {tooltip.pct >= 0 ? '+' : ''}{(tooltip.pct * 100).toFixed(2)}%
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default React.memo(NavChart)
