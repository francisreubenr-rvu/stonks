import { useIndicesSnapshot } from '@/hooks/useIndicesSnapshot'

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {[...Array(9)].map((_, i) => (
        <div key={i} className="border border-border rounded-lg p-4 space-y-2 animate-pulse">
          <div className="h-3 w-20 bg-zinc-100 rounded" />
          <div className="h-4 w-32 bg-zinc-100 rounded" />
          <div className="h-6 w-28 bg-zinc-100 rounded" />
          <div className="h-3 w-24 bg-zinc-100 rounded" />
        </div>
      ))}
    </div>
  )
}

export default function IndicesPage() {
  const { data, isLoading, error } = useIndicesSnapshot()

  if (isLoading) return (
    <div className="space-y-4">
      <div className="h-5 w-32 bg-zinc-100 rounded animate-pulse" />
      <LoadingSkeleton />
    </div>
  )
  if (error) return <p className="text-sm text-destructive">{error}</p>

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-foreground">Market Indices</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.map(idx => {
          const pos = idx.change >= 0
          return (
            <div
              key={idx.symbol}
              className="border border-border rounded-lg p-4 bg-card space-y-1"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono text-muted-foreground">{idx.symbol}</p>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  pos ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {pos ? '▲' : '▼'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{idx.name}</p>
              <p className="text-2xl font-semibold text-foreground tabular-nums tracking-tight">
                {idx.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
              <p className={`text-sm tabular-nums ${pos ? 'text-green-700' : 'text-red-600'}`}>
                {pos ? '+' : ''}{idx.change.toFixed(2)}{' '}
                <span className="text-xs opacity-80">
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
