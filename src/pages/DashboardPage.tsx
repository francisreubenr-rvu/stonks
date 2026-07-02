import { useDashboard } from '@/hooks/useDashboard'
import { useSxEffects } from '@/hooks/useSxEffects'
import { SectionEyebrow } from '@/components/SectionEyebrow'
import { IndexCard } from '@/components/IndexCard'
import { NewsTicker } from '@/components/NewsTicker'

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
  const rootRef = useSxEffects<HTMLDivElement>([isLoading])

  if (isLoading) return <Skeleton />
  if (error) return <p className="text-sm text-destructive">{error?.message}</p>
  if (!data) return null

  const isSnapshot = !data.isLive && data.indices.length > 0

  // Real gainers/losers drive the scrolling ticker — no fabricated headlines.
  const tickerItems = [
    ...data.gainers.slice(0, 3).map(g => ({ tag: 'GAINER', text: `${g.symbol} ${g.name} +${g.changePct.toFixed(2)}%` })),
    ...data.losers.slice(0, 3).map(l => ({ tag: 'LOSER', text: `${l.symbol} ${l.name} ${l.changePct.toFixed(2)}%` })),
    ...data.sectors.slice(0, 3).map(s => ({ tag: 'SECTOR', text: `${s.name} ${s.changePct >= 0 ? '+' : ''}${s.changePct.toFixed(2)}%` })),
  ]

  return (
    <div ref={rootRef}>
      {isSnapshot && (
        <div className="px-4 py-2 rounded-lg border border-border bg-card text-xs text-muted-foreground mb-6">
          📡 Showing the last market close snapshot — live feed unavailable
        </div>
      )}

      <div data-reveal>
        <SectionEyebrow
          eyebrow="Market Overview"
          title="Good session, let's see the tape"
          aside={
            <span className="font-mono text-sm text-muted-foreground inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {data.lastUpdated
                ? `Updated ${new Date(data.lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                : 'EOD snapshot'}
            </span>
          }
        />
      </div>

      <div data-reveal>
        <NewsTicker items={tickerItems} />
      </div>

      <div data-reveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {data.indices.slice(0, 4).map((idx) => {
          const pos = idx.change >= 0
          return (
            <IndexCard
              key={idx.symbol}
              name={idx.symbol}
              value={idx.value}
              pctStr={`${pos ? '+' : ''}${idx.changePct.toFixed(2)}%`}
              positive={pos}
            />
          )
        })}
      </div>

      <div data-reveal className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="border border-border rounded-lg bg-card">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              All Indices
            </p>
          </div>
          <div className="divide-y divide-border">
            {data.indices.map(idx => {
              const pos = idx.change >= 0
              return (
                <div key={idx.symbol} className="flex items-center justify-between px-5 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{idx.name}</p>
                    <p className="text-xs text-muted-foreground">{idx.symbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold text-foreground tabular-nums">
                      {idx.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                    <p
                      className="font-mono text-xs tabular-nums"
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
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Sector Breadth
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Sector indices up vs. down — not stock-level market breadth
            </p>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-center gap-12 py-6">
              <div className="text-center">
                <p className="font-mono text-2xl font-semibold" style={{ color: 'var(--delta-positive)' }}>
                  {data.advanceDecline.advances}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Advances</p>
              </div>
              <div className="text-center">
                <p className="font-mono text-2xl font-semibold text-muted-foreground">
                  {data.advanceDecline.unchanged}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Unchanged</p>
              </div>
              <div className="text-center">
                <p className="font-mono text-2xl font-semibold" style={{ color: 'var(--delta-negative)' }}>
                  {data.advanceDecline.declines}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Declines</p>
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden flex">
              {data.advanceDecline.advances + data.advanceDecline.declines + data.advanceDecline.unchanged > 0 && (
                <>
                  <div
                    className="h-full"
                    style={{
                      width: `${(data.advanceDecline.advances / (data.advanceDecline.advances + data.advanceDecline.declines + data.advanceDecline.unchanged)) * 100}%`,
                      background: 'var(--delta-positive)',
                    }}
                  />
                  <div
                    className="h-full"
                    style={{
                      width: `${(data.advanceDecline.unchanged / (data.advanceDecline.advances + data.advanceDecline.declines + data.advanceDecline.unchanged)) * 100}%`,
                      background: 'var(--border-strong)',
                    }}
                  />
                  <div
                    className="h-full"
                    style={{
                      width: `${(data.advanceDecline.declines / (data.advanceDecline.advances + data.advanceDecline.declines + data.advanceDecline.unchanged)) * 100}%`,
                      background: 'var(--delta-negative)',
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {data.sectors.length > 0 && (
        <div data-reveal className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-border rounded-lg bg-card">
            <div className="px-5 py-3 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Sector Performance
              </p>
            </div>
            <div className="divide-y divide-border">
              {data.sectors.map(s => {
                const pos = s.changePct >= 0
                return (
                  <div key={s.name} className="flex items-center justify-between px-5 py-2.5">
                    <span className="text-sm font-medium text-foreground">{s.name}</span>
                    <span
                      className="font-mono text-sm font-semibold tabular-nums"
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
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest"
                    style={{ color: 'var(--delta-positive)' }}>
                    Sector Leaders
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {data.gainers.map(g => (
                    <div key={g.symbol} className="flex items-center justify-between px-5 py-2.5">
                      <div>
                        <span className="font-mono text-xs font-medium text-foreground">{g.symbol}</span>
                        <span className="text-xs text-muted-foreground ml-2">{g.name}</span>
                      </div>
                      <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: 'var(--delta-positive)' }}>
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
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest"
                    style={{ color: 'var(--delta-negative)' }}>
                    Sector Laggards
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {data.losers.map(l => (
                    <div key={l.symbol} className="flex items-center justify-between px-5 py-2.5">
                      <div>
                        <span className="font-mono text-xs font-medium text-foreground">{l.symbol}</span>
                        <span className="text-xs text-muted-foreground ml-2">{l.name}</span>
                      </div>
                      <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: 'var(--delta-negative)' }}>
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
