// Direction badge per DESIGN.md §6.4/6.6 — ▲/▼ + colored pill.
export function DeltaBadge({ pct, positive, className = '' }: { pct: string; positive: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-mono text-xs font-medium tabular-nums ${className}`}
      style={{
        background: positive ? 'var(--delta-positive-bg)' : 'var(--delta-negative-bg)',
        color: positive ? 'var(--delta-positive)' : 'var(--delta-negative)',
      }}
    >
      {positive ? '▲' : '▼'} {pct}
    </span>
  )
}
