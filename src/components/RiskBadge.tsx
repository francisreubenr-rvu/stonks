import { RISK_LABELS } from '@/hooks/useFundList'

// Risk pill per DESIGN.md §1.5/§6.5 — 0=Low 1=Moderate 2=High 3=Very High.
const RISK_STYLE: Record<number, { bg: string; fg: string; border: string }> = {
  0: { bg: 'var(--risk-low-bg)', fg: 'var(--risk-low-fg)', border: 'var(--risk-low-border)' },
  1: { bg: 'var(--risk-mod-bg)', fg: 'var(--risk-mod-fg)', border: 'var(--risk-mod-border)' },
  2: { bg: 'var(--risk-high-bg)', fg: 'var(--risk-high-fg)', border: 'var(--risk-high-border)' },
  3: { bg: 'var(--risk-vhigh-bg)', fg: 'var(--risk-vhigh-fg)', border: 'var(--risk-vhigh-border)' },
}

export function RiskBadge({ risk, className = '' }: { risk: number; className?: string }) {
  const s = RISK_STYLE[risk] ?? RISK_STYLE[1]
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${className}`}
      style={{ background: s.bg, color: s.fg, borderColor: s.border }}
    >
      {RISK_LABELS[risk] ?? 'Moderate'}
    </span>
  )
}
