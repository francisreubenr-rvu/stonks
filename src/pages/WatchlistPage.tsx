import { useNavigate } from 'react-router-dom'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useCompareSet } from '@/hooks/useCompareSet'
import { useSxEffects } from '@/hooks/useSxEffects'
import { SectionEyebrow } from '@/components/SectionEyebrow'

function EmptyState() {
  return (
    <div className="border border-border rounded-lg bg-card py-16 text-center space-y-2">
      <p className="text-[13px] text-muted-foreground">Your watchlist is empty</p>
      <p className="text-[11px] text-muted-foreground">
        Add symbols from the stock detail, compare, or fund pages.
      </p>
    </div>
  )
}

export default function WatchlistPage() {
  const navigate = useNavigate()
  const { items, remove } = useWatchlist()
  const symbols = items.filter(i => i.type !== 'fund').map(i => i.symbol)
  const { data: quotes, isLoading } = useCompareSet(symbols)
  const rootRef = useSxEffects<HTMLDivElement>([isLoading])

  if (items.length === 0) return <EmptyState />

  return (
    <div ref={rootRef}>
      <div data-reveal>
        <SectionEyebrow
          eyebrow="Tracked"
          title="Watchlist"
          aside={<span className="text-sm text-muted-foreground">{items.length} items</span>}
        />
      </div>

      <div data-reveal className="border border-border rounded-md overflow-hidden bg-card">
        <div className="overflow-x-auto">
        <div className="min-w-[420px]">
        <div className="grid grid-cols-[1fr_120px_120px_48px] bg-muted border-b border-border px-4 py-2.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Symbol</span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-right">Price</span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-right">Change %</span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide" />
        </div>
        {items.map(item => {
          const quote = quotes?.find(q =>
            q.symbol.toUpperCase() === item.symbol.toUpperCase() ||
            `${q.symbol}.NS` === item.symbol
          )
          const pos = (quote?.changePct ?? 0) >= 0
          return (
            <div
              key={`${item.type}:${item.symbol}`}
              className="grid grid-cols-[1fr_120px_120px_48px] px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              <button
                onClick={() => {
                  if (item.type === 'fund') navigate(`/fund/${item.symbol}`)
                  else navigate(`/symbol/${item.symbol}`)
                }}
                className="text-left cursor-pointer"
              >
                <span className="font-mono text-[12px] font-semibold text-foreground block">
                  {item.symbol}
                </span>
                <span className="text-[10px] text-muted-foreground">{item.name}</span>
              </button>
              <span className="text-right font-mono text-[13px] tabular-nums self-center">
                {quote ? `₹${quote.price.toFixed(2)}` : '—'}
              </span>
              <span
                className="text-right font-mono text-[13px] tabular-nums self-center"
                style={{ color: pos ? 'var(--delta-positive)' : 'var(--delta-negative)' }}
              >
                {quote ? `${pos ? '+' : ''}${quote.changePct.toFixed(2)}%` : '—'}
              </span>
              <button
                onClick={() => remove(item.symbol, item.type)}
                className="text-[11px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer text-right pr-2 self-center"
              >
                ✕
              </button>
            </div>
          )
        })}
        </div>
        </div>
      </div>
    </div>
  )
}
