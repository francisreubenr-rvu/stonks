import { useIndicesSnapshot } from '@/hooks/useIndicesSnapshot'
import { useSxEffects } from '@/hooks/useSxEffects'
import { SectionEyebrow } from '@/components/SectionEyebrow'
import { IndexCard } from '@/components/IndexCard'

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
  const rootRef = useSxEffects<HTMLDivElement>([isLoading])

  if (isLoading) return (
    <div className="space-y-4">
      <div className="h-5 w-32 bg-muted rounded animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(9)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )
  if (error) return <p className="text-sm text-destructive">{error?.message}</p>

  const indices = data?.indices ?? []
  const isSnapshot = data?.source === 'snapshot' && indices.length > 0

  if (indices.length === 0) return (
    <p className="text-sm text-muted-foreground">
      Index data is unavailable right now — the live feed is unreachable and no local snapshot exists.
    </p>
  )

  return (
    <div ref={rootRef}>
      {isSnapshot && (
        <div className="px-4 py-2 rounded-lg border border-border bg-card text-xs text-muted-foreground mb-6">
          📡 Showing the last market close snapshot — live feed unavailable
        </div>
      )}
      <div data-reveal>
        <SectionEyebrow eyebrow="Market Pulse" title="Every index, drawn live" />
      </div>
      <div data-reveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {indices.map((idx) => {
          const pos = idx.change >= 0
          return (
            <IndexCard
              key={idx.symbol}
              name={idx.name}
              value={idx.value}
              pctStr={`${pos ? '+' : ''}${idx.changePct.toFixed(2)}%`}
              positive={pos}
              size="lg"
            />
          )
        })}
      </div>
    </div>
  )
}
