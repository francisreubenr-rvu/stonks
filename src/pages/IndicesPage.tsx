import { useIndicesSnapshot } from '@/hooks/useIndicesSnapshot'

function SkeletonCard() {
  return (
    <div className="border border-border rounded-md p-4 bg-card space-y-2 animate-pulse">
      <div className="flex justify-between">
        <div className="h-3 w-20 bg-muted rounded" />
        <div className="h-5 w-6 bg-muted rounded-full" />
      </div>
      <div className="h-3 w-28 bg-muted rounded" />
      <div className="h-6 w-32 bg-muted rounded" />
      <div className="h-3 w-24 bg-muted rounded" />
    </div>
  )
}

export default function IndicesPage() {
  const { data, isLoading, error } = useIndicesSnapshot()

  if (isLoading) return (
    <div className="space-y-4">
      <div className="h-5 w-32 bg-muted rounded animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(9)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )
  if (error) return <p className="text-sm text-destructive">{error?.message}</p>

  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-semibold text-foreground">Market Indices</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.map(idx => {
          const pos = idx.change >= 0
          return (
            <div
              key={idx.symbol}
              className="border border-border rounded-md p-4 bg-card space-y-1.5 hover:border-[var(--border-strong)] transition-colors duration-150"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-medium text-muted-foreground tracking-wide">
                  {idx.symbol}
                </span>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={pos
                    ? { background: 'var(--delta-positive-bg)', color: 'var(--delta-positive)' }
                    : { background: 'var(--delta-negative-bg)', color: 'var(--delta-negative)' }
                  }
                >
                  {pos ? '▲' : '▼'}
                </span>
              </div>
              <p className="text-[13px] text-muted-foreground">{idx.name}</p>
              <p className="font-mono text-xl font-semibold text-foreground tabular-nums tracking-tight">
                {idx.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
              <p
                className="font-mono text-[13px] tabular-nums"
                style={{ color: pos ? 'var(--delta-positive)' : 'var(--delta-negative)' }}
              >
                {pos ? '+' : ''}{idx.change.toFixed(2)}{' '}
                <span className="opacity-75 text-xs">
                  ({pos ? '+' : ''}{idx.changePct.toFixed(2)}%)
                </span>
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
