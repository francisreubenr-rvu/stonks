import { DeltaBadge } from '@/components/DeltaBadge'

interface IndexCardProps {
  name: string
  value: number
  decimals?: number
  pctStr: string
  positive: boolean
  size?: 'sm' | 'lg'
}

// Index card per DESIGN.md §6.4 — symbol, value, delta. Uses live index data only.
export function IndexCard({ name, value, decimals = 2, pctStr, positive, size = 'sm' }: IndexCardProps) {
  const color = positive ? 'var(--delta-positive)' : 'var(--delta-negative)'
  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors duration-150 hover:border-[var(--border-strong)]">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-sm text-muted-foreground">{name}</span>
        {size === 'lg' && <DeltaBadge pct={pctStr} positive={positive} />}
      </div>
      <div
        data-countup
        data-target={value}
        data-decimals={decimals}
        data-comma="1"
        className={`font-mono font-semibold tabular-nums ${size === 'lg' ? 'text-2xl' : 'text-xl'}`}
      >
        0.00
      </div>
      {size === 'sm' && (
        <div className="mt-2">
          <span className="font-mono text-sm font-medium" style={{ color }}>
            {positive ? '▲' : '▼'} {pctStr}
          </span>
        </div>
      )}
    </div>
  )
}
