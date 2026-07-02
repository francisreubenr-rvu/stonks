import { useParams, useNavigate } from 'react-router-dom'
import { useSymbolDetail } from '@/hooks/useSymbolDetail'
import { useSxEffects } from '@/hooks/useSxEffects'
import { WatchlistToggle } from '@/components/WatchlistToggle'

function StatRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-medium text-foreground font-mono tabular-nums">{value ?? '—'}</span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5 max-w-2xl animate-pulse">
      <div className="border border-border rounded-lg p-6 space-y-3 bg-card">
        <div className="flex items-center gap-2">
          <div className="h-7 w-36 bg-muted rounded" />
          <div className="h-5 w-10 bg-muted rounded" />
        </div>
        <div className="h-4 w-48 bg-muted rounded" />
        <div className="flex items-center gap-3 pt-1">
          <div className="h-9 w-40 bg-muted rounded" />
          <div className="h-6 w-32 bg-muted rounded-full" />
        </div>
        <div className="h-3 w-24 bg-muted rounded" />
      </div>
      <div className="border border-border rounded-lg p-4 space-y-2 bg-card">
        <div className="h-3 w-32 bg-muted rounded" />
        <div className="h-24 bg-muted rounded mt-2" />
      </div>
      <div className="border border-border rounded-lg bg-card">
        <div className="px-6 py-3 border-b border-border">
          <div className="h-3 w-28 bg-muted rounded" />
        </div>
        <div className="px-6 divide-y divide-border">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex justify-between py-3">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-4 bg-muted rounded" style={{ width: `${48 + (i % 3) * 20}px` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function SymbolDetailPage() {
  const { symbolId } = useParams<{ symbolId: string }>()
  const navigate = useNavigate()
  const { data: queryData, isLoading, error } = useSymbolDetail(symbolId ?? '')
  const rootRef = useSxEffects<HTMLDivElement>([isLoading])

  if (isLoading) return <LoadingSkeleton />
  if (error || !queryData) return (
    <div className="space-y-3">
      <p className="text-sm text-destructive">{error?.message ?? 'Symbol not found'}</p>
      <button
        onClick={() => navigate(-1)}
        className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
      >
        ← Go back
      </button>
    </div>
  )

  const { quote, fundamentals, eodBars, isFallback } = queryData
  const pos = quote.change >= 0
  const closes = eodBars.map(b => b.close)
  const maxClose = closes.length > 0 ? Math.max(...closes) : 0
  const minClose = closes.length > 0 ? Math.min(...closes) : 0

  return (
    <div ref={rootRef} className="space-y-5 max-w-2xl">
      {/* Symbol header card */}
      <div data-reveal className="border border-border rounded-lg p-6 bg-card space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-mono text-2xl font-bold text-foreground tracking-tight">
            {quote.symbol}
          </h2>
          <span className="font-mono text-[11px] font-medium text-muted-foreground border border-border px-2 py-0.5 rounded bg-muted">
            {quote.exchange}
          </span>
          <WatchlistToggle symbol={quote.symbol} name={quote.name} type="stock" className="ml-auto" />
        </div>
        <p className="text-[13px] text-muted-foreground">{quote.name}</p>
        <div className="flex items-center gap-3 pt-2 flex-wrap">
          <span className="font-mono text-[30px] font-semibold text-foreground tabular-nums leading-none">
            ₹{quote.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span
            className="inline-flex items-center font-mono text-[13px] font-medium tabular-nums px-2.5 py-1 rounded-full"
            style={pos
              ? { background: 'var(--delta-positive-bg)', color: 'var(--delta-positive)' }
              : { background: 'var(--delta-negative-bg)', color: 'var(--delta-negative)' }
            }
          >
            {pos ? '▲' : '▼'}{' '}
            {Math.abs(quote.change).toFixed(2)}{' '}
            ({pos ? '+' : ''}{quote.changePct.toFixed(2)}%)
          </span>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <p className="font-mono text-[11px]" style={{ color: 'var(--subtle)' }}>
            Vol: {quote.volume.toLocaleString('en-IN')}
          </p>
          {isFallback && (
            <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--risk-mod-border)', background: 'var(--risk-mod-bg)', color: 'var(--risk-mod-fg)' }}>
              using cached data
            </span>
          )}
        </div>
      </div>

      {/* EOD chart */}
      {eodBars.length > 0 && (
        <div data-reveal className="border border-border rounded-lg p-4 bg-card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
              30-Day Price
            </p>
            <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground tabular-nums">
              <span>L ₹{minClose.toFixed(0)}</span>
              <span>H ₹{maxClose.toFixed(0)}</span>
            </div>
          </div>
          <div className="flex items-end gap-px h-24">
            {eodBars.map(bar => {
              const range = maxClose - minClose || 1
              const heightPct = Math.max(4, ((bar.close - minClose) / range) * 100)
              const isUp = bar.close >= bar.open
              return (
                <div
                  key={bar.date}
                  title={`${bar.date}  ₹${bar.close.toFixed(2)}`}
                  className="flex-1 cursor-default transition-opacity hover:opacity-70"
                  style={{
                    height: `${heightPct}%`,
                    background: isUp ? 'var(--delta-positive)' : 'var(--delta-negative)',
                    borderRadius: 0,
                    minHeight: '2px',
                  }}
                />
              )
            })}
          </div>
          <div className="h-px bg-border mt-1 mb-1.5" />
          <div className="flex justify-between">
            <span className="font-mono text-[10px]" style={{ color: 'var(--subtle)' }}>{eodBars[0]?.date}</span>
            <span className="font-mono text-[10px]" style={{ color: 'var(--subtle)' }}>{eodBars[eodBars.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Fundamentals */}
      {fundamentals && (
        <div data-reveal className="border border-border rounded-lg bg-card">
          <div className="px-6 py-3 border-b border-border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
              Fundamentals
            </p>
          </div>
          <div className="px-6">
            {/* Only fields NSE actually serves — no permanently-empty rows. */}
            <StatRow label="P/E"      value={fundamentals.pe !== null ? fundamentals.pe.toFixed(1) : null} />
            <StatRow label="Sector"   value={fundamentals.sector} />
            <StatRow label="Industry" value={fundamentals.industry} />
          </div>
        </div>
      )}
    </div>
  )
}
