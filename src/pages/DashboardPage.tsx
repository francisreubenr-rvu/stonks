import { useDashboard } from '@/hooks/useDashboard'

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg border border-border" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-64 bg-muted rounded-lg border border-border" />
        <div className="h-64 bg-muted rounded-lg border border-border" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboard()

  if (isLoading) return <Skeleton />
  if (error) return <p className="text-sm text-destructive">{error?.message}</p>
  if (!data) return null

  const hasAllZeros = data.indices.length > 0 && data.indices.every(i => i.value === 0 && i.change === 0 && i.changePct === 0)

  return (
    <div className="space-y-6">
      {hasAllZeros && (
        <div className="px-4 py-2 rounded-lg border border-border bg-card text-[11px] text-muted-foreground">
          📡 Using cached data — live feed temporarily unavailable
        </div>
      )}
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold text-foreground">Market Dashboard</h2>
        <p className="text-[11px] text-muted-foreground font-mono">
          Updated {new Date(data.lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.indices.slice(0, 4).map(idx => {
          const pos = idx.change >= 0
          return (
            <div key={idx.symbol} className="border border-border rounded-lg p-4 bg-card space-y-1">
              <p className="font-mono text-[11px] font-medium text-muted-foreground">{idx.symbol}</p>
              <p className="font-mono text-xl font-semibold text-foreground tabular-nums">
                {idx.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
              <p
                className="font-mono text-[12px] tabular-nums"
                style={{ color: pos ? 'var(--delta-positive)' : 'var(--delta-negative)' }}
              >
                {pos ? '+' : ''}{idx.change.toFixed(2)} ({pos ? '+' : ''}{idx.changePct.toFixed(2)}%)
              </p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-border rounded-lg bg-card">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
              All Indices
            </p>
          </div>
          <div className="divide-y divide-border">
            {data.indices.map(idx => {
              const pos = idx.change >= 0
              return (
                <div key={idx.symbol} className="flex items-center justify-between px-5 py-2.5">
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{idx.name}</p>
                    <p className="text-[10px] text-muted-foreground">{idx.symbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[13px] font-semibold text-foreground tabular-nums">
                      {idx.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                    <p
                      className="font-mono text-[11px] tabular-nums"
                      style={{ color: pos ? 'var(--delta-positive)' : 'var(--delta-negative)' }}
                    >
                      {pos ? '▲' : '▼'} {Math.abs(idx.changePct).toFixed(2)}%
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="border border-border rounded-lg bg-card">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
              Market Breadth
            </p>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-center gap-12 py-6">
              <div className="text-center">
                <p className="font-mono text-2xl font-semibold" style={{ color: 'var(--delta-positive)' }}>
                  {data.advanceDecline.advances}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">Advances</p>
              </div>
              <div className="text-center">
                <p className="font-mono text-2xl font-semibold text-muted-foreground">
                  {data.advanceDecline.unchanged}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">Unchanged</p>
              </div>
              <div className="text-center">
                <p className="font-mono text-2xl font-semibold" style={{ color: 'var(--delta-negative)' }}>
                  {data.advanceDecline.declines}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">Declines</p>
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden flex">
              {data.advanceDecline.advances + data.advanceDecline.declines + data.advanceDecline.unchanged > 0 && (
                <>
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${(data.advanceDecline.advances / (data.advanceDecline.advances + data.advanceDecline.declines + data.advanceDecline.unchanged)) * 100}%`,
                      background: 'var(--delta-positive)',
                      opacity: 0.7,
                    }}
                  />
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${(data.advanceDecline.unchanged / (data.advanceDecline.advances + data.advanceDecline.declines + data.advanceDecline.unchanged)) * 100}%`,
                      background: 'var(--border-strong)',
                    }}
                  />
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${(data.advanceDecline.declines / (data.advanceDecline.advances + data.advanceDecline.declines + data.advanceDecline.unchanged)) * 100}%`,
                      background: 'var(--delta-negative)',
                      opacity: 0.7,
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {data.sectors.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-border rounded-lg bg-card">
            <div className="px-5 py-3 border-b border-border">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                Sector Performance
              </p>
            </div>
            <div className="divide-y divide-border">
              {data.sectors.map(s => {
                const pos = s.changePct >= 0
                return (
                  <div key={s.name} className="flex items-center justify-between px-5 py-2.5">
                    <span className="text-[13px] font-medium text-foreground">{s.name}</span>
                    <span
                      className="font-mono text-[13px] font-semibold tabular-nums"
                      style={{ color: pos ? 'var(--delta-positive)' : 'var(--delta-negative)' }}
                    >
                      {pos ? '+' : ''}{s.changePct.toFixed(2)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-rows-2 gap-6">
            {data.gainers.length > 0 && (
              <div className="border border-border rounded-lg bg-card">
                <div className="px-5 py-3 border-b border-border">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest"
                    style={{ color: 'var(--delta-positive)' }}>
                    Top Gainers
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {data.gainers.map(g => (
                    <div key={g.symbol} className="flex items-center justify-between px-5 py-2.5">
                      <div>
                        <span className="font-mono text-[12px] font-medium text-foreground">{g.symbol}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">{g.name}</span>
                      </div>
                      <span className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: 'var(--delta-positive)' }}>
                        +{g.changePct.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {data.losers.length > 0 && (
              <div className="border border-border rounded-lg bg-card">
                <div className="px-5 py-3 border-b border-border">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest"
                    style={{ color: 'var(--delta-negative)' }}>
                    Top Losers
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {data.losers.map(l => (
                    <div key={l.symbol} className="flex items-center justify-between px-5 py-2.5">
                      <div>
                        <span className="font-mono text-[12px] font-medium text-foreground">{l.symbol}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">{l.name}</span>
                      </div>
                      <span className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: 'var(--delta-negative)' }}>
                        {l.changePct.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
