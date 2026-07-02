import { useWatchlist } from '@/hooks/useWatchlist'
import type { WatchlistItem } from '@/api/dataTypes'

interface WatchlistToggleProps {
  symbol: string
  name: string
  type: WatchlistItem['type']
  className?: string
}

export function WatchlistToggle({ symbol, name, type, className = '' }: WatchlistToggleProps) {
  const { add, remove, has } = useWatchlist()
  const active = has(symbol, type)

  return (
    <button
      onClick={() =>
        active
          ? remove(symbol, type)
          : add({ symbol, name, type, addedAt: Date.now() })
      }
      title={active ? 'Remove from watchlist' : 'Add to watchlist'}
      aria-pressed={active}
      className={`inline-flex items-center justify-center h-7 w-7 rounded-md border transition-colors cursor-pointer ${
        active
          ? 'border-primary text-primary bg-primary/10'
          : 'border-border text-muted-foreground hover:text-foreground'
      } ${className}`}
    >
      <span className="text-sm leading-none">{active ? '★' : '☆'}</span>
    </button>
  )
}
