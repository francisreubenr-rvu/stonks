import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFundList } from '@/hooks/useFundList'
import { useBanker } from '@/hooks/useBanker'
import { useDashboard } from '@/hooks/useDashboard'
import { INSIGHTS, PROFILE_LABELS, type BankerRisk } from '@/lib/banker'

const PROFILES: BankerRisk[] = ['Conservative', 'Moderate', 'Aggressive']

function pct(v: number | null, decimals = 1): string {
  if (v === null) return '—'
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(decimals)}%`
}

function num(v: number | null, decimals = 1): string {
  if (v === null) return '—'
  return v.toFixed(decimals)
}

export default function BankerPage() {
  const navigate = useNavigate()
  const { data: schemes } = useFundList()
  const { data: dashboard } = useDashboard()
  const [profile, setProfile] = useState<BankerRisk>('Moderate')
  const { candidates, isScanning, progress, total } = useBanker(
    schemes ?? [], profile, 15
  )

  const topPicks = candidates.slice(0, 8)
  const { title, desc } = PROFILE_LABELS[profile]
  const insights = INSIGHTS[profile]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-[16px] font-bold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"
              style={{ boxShadow: '0 0 8px var(--primary)' }} />
            Personal Banker
          </h2>
          <p className="text-[11px] text-muted-foreground mt-1">
            AI-powered fund discovery engine · Experimental
          </p>
        </div>
      </div>

      {/* Market snapshot */}
      {dashboard && (
        <div className="grid grid-cols-3 gap-3">
          {dashboard.indices.slice(0, 3).map(idx => {
            const pos = idx.change >= 0
            return (
              <div key={idx.symbol} className="border border-border rounded-lg p-3 bg-card"
                style={{ borderColor: pos ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)' }}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{idx.name}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-mono text-lg font-bold text-foreground tabular-nums">
                    {idx.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums"
                    style={{ color: pos ? 'var(--delta-positive)' : 'var(--delta-negative)' }}>
                    {pos ? '▲' : '▼'} {Math.abs(idx.changePct).toFixed(1)}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Risk Profile Selector */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Risk Profile
        </p>
        <div className="flex gap-2 mb-3">
          {PROFILES.map(p => (
            <button
              key={p}
              onClick={() => setProfile(p)}
              className={`flex-1 text-center px-4 py-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                profile === p
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/20 hover:text-foreground'
              }`}
            >
              <span className="block text-[13px] font-semibold">{p}</span>
              <span className="block text-[10px] mt-0.5 opacity-75">
                {p === 'Conservative' ? 'Safe & steady' : p === 'Moderate' ? 'Balanced growth' : 'High potential'}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-primary border border-primary/30 px-2 py-0.5 rounded-full">
            {title}
          </span>
          <span className="text-[11px] text-muted-foreground">{desc}</span>
        </div>
      </div>

      {/* Scanning progress */}
      {isScanning && (
        <div className="border border-border rounded-lg p-4 bg-card space-y-2">
          <p className="text-[11px] text-muted-foreground">
            Scanning {total} funds across categories…
          </p>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%`, background: 'var(--primary)' }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-right">{progress}%</p>
        </div>
      )}

      {/* Recommendations */}
      {topPicks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[13px] font-semibold text-foreground">Top Picks</p>
            <span className="text-[10px] text-muted-foreground">
              Scored by returns · risk · consistency
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {topPicks.map(({ scheme, stats, score }, idx) => {
              const scoreColor = score >= 80 ? 'var(--delta-positive)'
                : score >= 60 ? 'var(--primary)' : 'var(--muted-foreground)'
              return (
                <button
                  key={scheme.schemeCode}
                  onClick={() => navigate(`/fund/${scheme.schemeCode}`)}
                  className="border border-border rounded-lg p-4 bg-card text-left hover:border-primary/30 transition-all duration-200 cursor-pointer group"
                >
                  {/* Rank + Score */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      #{idx + 1} Pick
                    </span>
                    <span className="font-mono text-[11px] font-bold tabular-nums"
                      style={{ color: scoreColor }}>
                      {score}/100
                    </span>
                  </div>

                  {/* Fund name */}
                  <p className="text-[12px] font-medium text-foreground leading-snug mb-2
                    group-hover:text-primary transition-colors line-clamp-2">
                    {scheme.schemeName.split(' — ')[0]}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
                      {scheme.category}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                      style={{
                        background:
                          scheme.risk === 'Low' ? 'var(--risk-low-bg)' :
                          scheme.risk === 'Moderate' ? 'var(--risk-mod-bg)' :
                          scheme.risk === 'High' ? 'var(--risk-high-bg)' :
                          'var(--risk-vhigh-bg)',
                        color:
                          scheme.risk === 'Low' ? 'var(--risk-low-fg)' :
                          scheme.risk === 'Moderate' ? 'var(--risk-mod-fg)' :
                          scheme.risk === 'High' ? 'var(--risk-high-fg)' :
                          'var(--risk-vhigh-fg)',
                      }}>
                      {scheme.risk}
                    </span>
                  </div>

                  {/* Stats */}
                  {stats && (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-2 border-t border-border">
                      <div>
                        <span className="text-[9px] text-muted-foreground">1Y CAGR</span>
                        <span className="block font-mono text-[12px] font-semibold tabular-nums"
                          style={{ color: (stats.cagr1y ?? 0) >= 0 ? 'var(--delta-positive)' : 'var(--delta-negative)' }}>
                          {pct(stats.cagr1y)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground">Win Rate</span>
                        <span className="block font-mono text-[12px] font-semibold tabular-nums text-foreground">
                          {(stats.winRate * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground">Max DD</span>
                        <span className="block font-mono text-[12px] font-semibold tabular-nums"
                          style={{ color: 'var(--delta-negative)' }}>
                          {pct(stats.maxDrawdown)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground">Sortino</span>
                        <span className="block font-mono text-[12px] font-semibold tabular-nums text-foreground">
                          {num(stats.sortino)}
                        </span>
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Strategy Insights · {profile}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[10px] text-primary mt-0.5">◆</span>
              <p className="text-[12px] text-foreground leading-relaxed">{insight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Refresh button */}
      {!isScanning && (
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">
            Data from mfapi.in · Scores are algorithmic estimates · Not financial advice
          </p>
        </div>
      )}
    </div>
  )
}
