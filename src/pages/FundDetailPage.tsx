import React from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useFundDetail } from '@/hooks/useFundDetail'
import { useSxEffects } from '@/hooks/useSxEffects'
import { riskFromCategory } from '@/lib/riskFromCategory'
import { computeYearlyReturns } from '@/lib/fundStats'
import { fetchAllSchemes } from '@/api/mfapiClient'
import NavChart from '@/components/NavChart'

const RISK_STYLE: Record<string, React.CSSProperties> = {
  'Low':       { background: 'var(--risk-low-bg)',   color: 'var(--risk-low-fg)',   border: '1px solid var(--risk-low-border)' },
  'Moderate':  { background: 'var(--risk-mod-bg)',   color: 'var(--risk-mod-fg)',   border: '1px solid var(--risk-mod-border)' },
  'High':      { background: 'var(--risk-high-bg)',  color: 'var(--risk-high-fg)',  border: '1px solid var(--risk-high-border)' },
  'Very High': { background: 'var(--risk-vhigh-bg)', color: 'var(--risk-vhigh-fg)', border: '1px solid var(--risk-vhigh-border)' },
}

function pct(v: number | null, decimals = 2): string {
  if (v === null) return '—'
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(decimals)}%`
}

function num(v: number | null, decimals = 2): string {
  if (v === null) return '—'
  return v.toFixed(decimals)
}

function StatCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="border border-border rounded-md p-4 bg-card space-y-1">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{label}</p>
      <p
        className="font-mono text-lg font-semibold tabular-nums"
        style={positive !== undefined
          ? { color: positive ? 'var(--delta-positive)' : 'var(--delta-negative)' }
          : undefined
        }
      >
        {value}
      </p>
      {sub && <p className="text-[10px] text-muted-foreground font-mono">{sub}</p>}
    </div>
  )
}

function ReturnBar({ label, value }: { label: string; value: number | null }) {
  const pctVal = value !== null ? value * 100 : null
  const isPos = pctVal !== null && pctVal >= 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-muted-foreground w-8 shrink-0">{label}</span>
      <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden relative">
        {pctVal !== null && (
          <div
            className="h-full rounded-sm transition-[width] duration-700 ease-out"
            style={{
              width: `${Math.min(Math.abs(pctVal), 100)}%`,
              background: isPos ? 'var(--delta-positive)' : 'var(--delta-negative)',
              opacity: 0.7,
            }}
          />
        )}
      </div>
      <span
        className="font-mono text-[12px] font-medium tabular-nums w-16 text-right shrink-0"
        style={pctVal === null ? {} : { color: isPos ? 'var(--delta-positive)' : 'var(--delta-negative)' }}
      >
        {pct(value, 1)}
      </span>
    </div>
  )
}

function DrawdownBar({ value }: { value: number }) {
  const pctVal = Math.abs(value * 100)
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-muted-foreground w-24 shrink-0">Max Drawdown</span>
      <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
        <div
          className="h-full rounded-sm transition-[width] duration-700 ease-out"
          style={{ width: `${Math.min(pctVal, 100)}%`, background: 'var(--delta-negative)', opacity: 0.5 }}
        />
      </div>
      <span className="font-mono text-[12px] font-medium tabular-nums w-16 text-right shrink-0"
        style={{ color: 'var(--delta-negative)' }}>
        {pct(value, 1)}
      </span>
    </div>
  )
}

function WinRateRing({ winRate, pos, neg }: { winRate: number; pos: number; neg: number }) {
  if (pos + neg === 0) {
    return (
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 shrink-0 flex items-center justify-center">
          <span className="font-mono text-[12px] text-muted-foreground">No monthly data</span>
        </div>
      </div>
    )
  }
  const r = 32
  const circ = 2 * Math.PI * r
  const filled = winRate * circ
  return (
    <div className="flex items-center gap-6">
      <div className="relative w-20 h-20 shrink-0">
        <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
          <circle cx={40} cy={40} r={r} fill="none" stroke="var(--muted)" strokeWidth={8} />
          <circle
            cx={40} cy={40} r={r} fill="none"
            stroke="var(--delta-positive)" strokeWidth={8}
            strokeDasharray={`${filled} ${circ - filled}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-[13px] font-semibold text-foreground">{(winRate * 100).toFixed(0)}%</span>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--delta-positive)' }} />
          <span className="text-[12px] text-muted-foreground">Positive months: <strong className="text-foreground">{pos}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--delta-negative)' }} />
          <span className="text-[12px] text-muted-foreground">Negative months: <strong className="text-foreground">{neg}</strong></span>
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="border border-border rounded-lg p-6 bg-card space-y-3">
        <div className="h-4 w-16 bg-muted rounded" />
        <div className="h-6 w-3/4 bg-muted rounded" />
        <div className="flex gap-2">
          <div className="h-5 w-24 bg-muted rounded-full" />
          <div className="h-5 w-20 bg-muted rounded-full" />
        </div>
        <div className="h-8 w-32 bg-muted rounded mt-2" />
      </div>
      <div className="border border-border rounded-lg p-5 bg-card">
        <div className="flex gap-1 mb-4">{[...Array(6)].map((_, i) => <div key={i} className="h-6 w-10 bg-muted rounded" />)}</div>
        <div className="h-[200px] bg-muted rounded" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-md border border-border" />)}
      </div>
    </div>
  )
}

export default function FundDetailPage() {
  const { schemeCode } = useParams<{ schemeCode: string }>()
  const navigate = useNavigate()
  const { data: queryData, isLoading, error, refetch, isFetching } = useFundDetail(schemeCode ?? '')
  const { data: allSchemes } = useQuery({
    queryKey: ['allSchemes'],
    queryFn: fetchAllSchemes,
    staleTime: 3_600_000,
  })
  const rootRef = useSxEffects<HTMLDivElement>([isLoading])

  if (isLoading) return <LoadingSkeleton />
  if (error || !queryData) {
    const msg = error?.message ?? ''
    const isUnavailable = /50\d|timeout|aborted|Failed to fetch|NetworkError/i.test(msg)
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">
          {isUnavailable
            ? 'The fund data service (MFAPI) is temporarily unavailable. Please try again in a moment.'
            : msg || 'Fund not found'}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs text-primary hover:underline cursor-pointer disabled:opacity-50"
          >
            {isFetching ? 'Retrying…' : '↻ Retry'}
          </button>
          <button onClick={() => navigate(-1)} className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer">
            ← Go back
          </button>
        </div>
      </div>
    )
  }

  const { detail, stats } = queryData
  const { meta, data } = detail
  const risk = riskFromCategory(meta.scheme_category)
  const isPos = (stats.cagr1y ?? 0) >= 0

  return (
    <div ref={rootRef} className="space-y-5 max-w-3xl">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors flex items-center gap-1">
        ← Funds
      </button>

      {/* Header card */}
      <div data-reveal className="border border-border rounded-lg p-6 bg-card space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{meta.fund_house}</p>
            <h1 className="text-[15px] font-semibold text-foreground leading-snug">{meta.scheme_name}</h1>
          </div>
          <div className="flex flex-wrap gap-2 items-start shrink-0">
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={RISK_STYLE[risk]}>{risk}</span>
            <span className="text-[11px] text-muted-foreground border border-border px-2.5 py-1 rounded-full bg-muted">
              {meta.scheme_category}
            </span>
          </div>
        </div>
        <div className="flex items-baseline gap-3 flex-wrap pt-1">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Current NAV</p>
            <p className="font-mono text-2xl font-semibold text-foreground tabular-nums">
              ₹{stats.currentNav.toFixed(4)}
            </p>
          </div>
          {stats.cagr1y !== null && (
            <span
              className="font-mono text-[12px] font-medium px-2.5 py-1 rounded-full tabular-nums"
              style={isPos
                ? { background: 'var(--delta-positive-bg)', color: 'var(--delta-positive)' }
                : { background: 'var(--delta-negative-bg)', color: 'var(--delta-negative)' }
              }
            >
              {pct(stats.cagr1y)} 1Y CAGR
            </span>
          )}
        </div>
        <p className="font-mono text-[10px] text-muted-foreground">
          {data.length} trading days · Since {data[0]?.date}
        </p>
      </div>

      {/* Chart */}
      <div data-reveal className="border border-border rounded-lg p-5 bg-card">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-4">NAV History</p>
        <NavChart data={data} positive={isPos} />
      </div>

      {/* CAGR Returns */}
      <div className="border border-border rounded-lg bg-card">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Trailing Returns (CAGR)</p>
        </div>
        <div className="px-5 py-4 space-y-2.5">
          <ReturnBar label="1M"  value={stats.cagr1m} />
          <ReturnBar label="3M"  value={stats.cagr3m} />
          <ReturnBar label="6M"  value={stats.cagr6m} />
          <ReturnBar label="1Y"  value={stats.cagr1y} />
          <ReturnBar label="3Y"  value={stats.cagr3y} />
          <ReturnBar label="5Y"  value={stats.cagr5y} />
          <ReturnBar label="All" value={stats.cagrInception} />
        </div>
      </div>

      {/* Key stats grid */}
      <div data-reveal className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Sharpe Ratio"
          value={num(stats.sharpe)}
          sub="Risk-free: 6.5%"
          positive={stats.sharpe !== null ? stats.sharpe >= 0 : undefined}
        />
        <StatCard
          label="Sortino Ratio"
          value={num(stats.sortino)}
          sub="Downside deviation"
          positive={stats.sortino !== null ? stats.sortino >= 0 : undefined}
        />
        <StatCard
          label="Annualised Vol"
          value={stats.annualizedVol !== null ? `${(stats.annualizedVol * 100).toFixed(1)}%` : '—'}
          sub="Std dev × √252"
        />
        <StatCard
          label="Max Drawdown"
          value={pct(stats.maxDrawdown, 1)}
          sub={`${stats.maxDrawdownDurationDays}d duration`}
          positive={false}
        />
        <StatCard
          label="Recovery"
          value={stats.recoveryDays !== null ? `${stats.recoveryDays}d` : 'Ongoing'}
          sub="Days to new ATH"
        />
        <StatCard
          label="Best Month"
          value={pct(stats.bestMonth, 1)}
          positive={true}
        />
        <StatCard
          label="Worst Month"
          value={pct(stats.worstMonth, 1)}
          positive={false}
        />
        <StatCard
          label="Avg Monthly"
          value={pct(stats.avgMonthlyReturn, 2)}
          positive={stats.avgMonthlyReturn >= 0}
        />
      </div>

      {/* Drawdown */}
      <div className="border border-border rounded-lg bg-card">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Drawdown</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <DrawdownBar value={stats.maxDrawdown} />
          <div className="flex items-center gap-6 pt-1 flex-wrap">
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Duration</p>
              <p className="font-mono text-[13px] font-semibold text-foreground">{stats.maxDrawdownDurationDays} days</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Recovery</p>
              <p className="font-mono text-[13px] font-semibold text-foreground">
                {stats.recoveryDays !== null ? `${stats.recoveryDays} days` : 'Not yet recovered'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Win rate */}
      <div className="border border-border rounded-lg bg-card">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Monthly Win Rate</p>
        </div>
        <div className="px-5 py-4">
          <WinRateRing winRate={stats.winRate} pos={stats.positiveMonths} neg={stats.negativeMonths} />
        </div>
      </div>

      {/* Rolling 1Y */}
      {(stats.rolling1yMin !== null || stats.rolling1yMax !== null) && (
        <div className="border border-border rounded-lg bg-card">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Rolling 1Y Return Range</p>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] text-muted-foreground w-8">Min</span>
              <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                <div className="h-full rounded-sm" style={{
                  width: `${Math.min(Math.abs((stats.rolling1yMin ?? 0) * 100), 100)}%`,
                  background: (stats.rolling1yMin ?? 0) >= 0 ? 'var(--delta-positive)' : 'var(--delta-negative)',
                  opacity: 0.5,
                  transition: 'width 0.7s ease-out',
                }} />
              </div>
              <span className="font-mono text-[12px] font-medium w-16 text-right shrink-0"
                style={{ color: (stats.rolling1yMin ?? 0) >= 0 ? 'var(--delta-positive)' : 'var(--delta-negative)' }}>
                {pct(stats.rolling1yMin, 1)}
              </span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] text-muted-foreground w-8">Avg</span>
              <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                <div className="h-full rounded-sm" style={{
                  width: `${Math.min(Math.abs((stats.rolling1yAvg ?? 0) * 100), 100)}%`,
                  background: (stats.rolling1yAvg ?? 0) >= 0 ? 'var(--delta-positive)' : 'var(--delta-negative)',
                  opacity: 0.65,
                  transition: 'width 0.7s ease-out 0.1s',
                }} />
              </div>
              <span className="font-mono text-[12px] font-medium w-16 text-right shrink-0"
                style={{ color: (stats.rolling1yAvg ?? 0) >= 0 ? 'var(--delta-positive)' : 'var(--delta-negative)' }}>
                {pct(stats.rolling1yAvg, 1)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-muted-foreground w-8">Max</span>
              <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                <div className="h-full rounded-sm" style={{
                  width: `${Math.min(Math.abs((stats.rolling1yMax ?? 0) * 100), 100)}%`,
                  background: (stats.rolling1yMax ?? 0) >= 0 ? 'var(--delta-positive)' : 'var(--delta-negative)',
                  opacity: 0.85,
                  transition: 'width 0.7s ease-out 0.2s',
                }} />
              </div>
              <span className="font-mono text-[12px] font-medium w-16 text-right shrink-0"
                style={{ color: (stats.rolling1yMax ?? 0) >= 0 ? 'var(--delta-positive)' : 'var(--delta-negative)' }}>
                {pct(stats.rolling1yMax, 1)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Yearly Returns */}
      {(() => {
        const yr = computeYearlyReturns(data)
        if (yr.length < 2) return null
        const last5 = yr.slice(-5)
        const maxAbs = Math.max(...last5.map(y => Math.abs(y.return)), 0.01)
        return (
          <div className="border border-border rounded-lg bg-card">
            <div className="px-5 py-3 border-b border-border">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Calendar Year Returns</p>
            </div>
            <div className="px-5 py-4 flex items-end gap-3" style={{ height: 140 }}>
              {last5.map(({ year, return: ret }) => {
                const isPos = ret >= 0
                const barH = Math.max(4, (Math.abs(ret) / maxAbs) * 100)
                return (
                  <div key={year} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                    <span
                      className="font-mono text-[11px] font-medium tabular-nums"
                      style={{ color: isPos ? 'var(--delta-positive)' : 'var(--delta-negative)' }}
                    >
                      {ret >= 0 ? '+' : ''}{(ret * 100).toFixed(1)}%
                    </span>
                    <div
                      className="w-full rounded-sm transition-[height] duration-700 ease-out"
                      style={{
                        height: `${barH}%`,
                        background: isPos ? 'var(--delta-positive)' : 'var(--delta-negative)',
                        opacity: 0.7,
                      }}
                    />
                    <span className="text-[10px] text-muted-foreground">{year}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Peer Comparison */}
      {allSchemes && allSchemes.length > 0 && (() => {
        const category = meta.scheme_category
        const peers = allSchemes
          .filter(s => s.schemeCode !== meta.scheme_code && s.schemeName.toLowerCase().includes(category.toLowerCase()))
          .slice(0, 5)
        if (peers.length === 0) return null
        return (
          <div className="border border-border rounded-lg bg-card">
            <div className="px-5 py-3 border-b border-border">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Top {peers.length} in {category}</p>
            </div>
            <div className="px-5 py-3 space-y-1.5">
              {peers.map(p => (
                <Link
                  key={p.schemeCode}
                  to={`/fund/${p.schemeCode}`}
                  className="block text-[12px] text-muted-foreground hover:text-foreground transition-colors truncate"
                >
                  {p.schemeName}
                </Link>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
