import { useParams, useNavigate } from 'react-router-dom'
import { useSymbolDetail } from '@/hooks/useSymbolDetail'

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-2 py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground tabular-nums text-right">{value}</span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-40 bg-zinc-100 rounded" />
        <div className="h-10 w-48 bg-zinc-100 rounded" />
      </div>
      <div className="border border-border rounded-lg p-4 space-y-2">
        <div className="h-3 w-32 bg-zinc-100 rounded" />
        <div className="h-20 bg-zinc-100 rounded" />
      </div>
      <div className="border border-border rounded-lg p-4 space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-4 bg-zinc-100 rounded" style={{ width: `${60 + (i % 3) * 15}%` }} />
        ))}
      </div>
    </div>
  )
}

export default function SymbolDetailPage() {
  const { symbolId } = useParams<{ symbolId: string }>()
  const navigate = useNavigate()
  const { quote, fundamentals, eodBars, isLoading, error } = useSymbolDetail(symbolId ?? '')

  if (isLoading) return <LoadingSkeleton />
  if (error || !quote) return (
    <div className="space-y-3">
      <p className="text-sm text-destructive">{error ?? 'Symbol not found'}</p>
      <button
        onClick={() => navigate(-1)}
        className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
      >
        ← Go back
      </button>
    </div>
  )

  const pos = quote.change >= 0
  const closes = eodBars.map(b => b.close)
  const maxClose = Math.max(...closes)
  const minClose = Math.min(...closes)

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h2 className="text-2xl font-semibold text-foreground font-mono tracking-tight">
            {quote.symbol}
          </h2>
          <span className="text-xs text-muted-foreground border border-border px-1.5 py-0.5 rounded font-mono">
            {quote.exchange}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{quote.name}</p>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-semibold text-foreground tabular-nums tracking-tight">
            ₹{quote.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={`inline-flex items-center gap-1 text-sm tabular-nums font-medium px-2 py-0.5 rounded ${
            pos ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}>
            {pos ? '▲' : '▼'}
            {Math.abs(quote.change).toFixed(2)}{' '}
            ({pos ? '+' : ''}{quote.changePct.toFixed(2)}%)
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 tabular-nums">
          Vol: {quote.volume.toLocaleString('en-IN')}
        </p>
      </div>

      {/* EOD bar chart */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            30-day Price (stub)
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
            <span>L ₹{minClose.toFixed(0)}</span>
            <span>H ₹{maxClose.toFixed(0)}</span>
          </div>
        </div>
        <div className="flex items-end gap-px h-20">
          {eodBars.map(bar => {
            const range = maxClose - minClose || 1
            const heightPct = Math.max(6, ((bar.close - minClose) / range) * 100)
            const isUp = bar.close >= bar.open
            return (
              <div
                key={bar.date}
                title={`${bar.date}  ₹${bar.close.toFixed(2)}`}
                className={`flex-1 rounded-sm transition-opacity hover:opacity-75 cursor-default ${
                  isUp ? 'bg-green-500' : 'bg-red-400'
                }`}
                style={{ height: `${heightPct}%` }}
              />
            )
          })}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-muted-foreground tabular-nums">{eodBars[0]?.date}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{eodBars[eodBars.length - 1]?.date}</span>
        </div>
      </div>

      {/* Fundamentals */}
      {fundamentals && (
        <div className="border border-border rounded-lg bg-card">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Fundamentals
            </p>
          </div>
          <div className="px-4 divide-y-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <div>
                <StatRow label="P/E"           value={fundamentals.pe.toFixed(1)} />
                <StatRow label="P/B"           value={fundamentals.pb.toFixed(2)} />
                <StatRow label="EPS"           value={`₹${fundamentals.eps.toFixed(2)}`} />
                <StatRow label="ROE"           value={`${fundamentals.roe.toFixed(1)}%`} />
              </div>
              <div>
                <StatRow label="Debt / Equity" value={fundamentals.debtToEquity.toFixed(2)} />
                <StatRow label="Div. Yield"    value={`${fundamentals.dividendYield.toFixed(2)}%`} />
                <StatRow label="Sector"        value={fundamentals.sector} />
                <StatRow label="Industry"      value={fundamentals.industry} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
