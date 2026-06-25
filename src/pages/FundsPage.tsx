import { useState, useMemo } from 'react'
import { useFundsUniverse } from '@/hooks/useFundsUniverse'
import type { Fund } from '@/api/dataTypes'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

const RISK_STYLE: Record<Fund['riskRating'], React.CSSProperties> = {
  'Low':       { background: 'var(--risk-low-bg)',   color: 'var(--risk-low-fg)',   border: '1px solid var(--risk-low-border)' },
  'Moderate':  { background: 'var(--risk-mod-bg)',   color: 'var(--risk-mod-fg)',   border: '1px solid var(--risk-mod-border)' },
  'High':      { background: 'var(--risk-high-bg)',  color: 'var(--risk-high-fg)',  border: '1px solid var(--risk-high-border)' },
  'Very High': { background: 'var(--risk-vhigh-bg)', color: 'var(--risk-vhigh-fg)', border: '1px solid var(--risk-vhigh-border)' },
}

function fmt(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

function PctCell({ value }: { value: number }) {
  return (
    <TableCell
      className="text-right tabular-nums text-[13px] font-mono"
      style={{ color: value >= 0 ? 'var(--delta-positive)' : 'var(--delta-negative)' }}
    >
      {fmt(value)}
    </TableCell>
  )
}

export default function FundsPage() {
  const { data, isLoading, error } = useFundsUniverse()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data
    return data.filter(f =>
      f.schemeName.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q) ||
      f.riskRating.toLowerCase().includes(q)
    )
  }, [data, query])

  if (isLoading) return (
    <div className="space-y-4">
      <div className="h-5 w-28 bg-muted rounded animate-pulse" />
      <div className="border border-border rounded-md overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-12 border-b border-border last:border-0 bg-card animate-pulse"
            style={{ opacity: 1 - i * 0.15 }}
          />
        ))}
      </div>
    </div>
  )
  if (error) return <p className="text-sm text-destructive">{error}</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[15px] font-semibold text-foreground">Mutual Funds</h2>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filter by name, category, risk…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="h-8 w-64 text-[13px]"
          />
          {query && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {filtered.length} of {data.length}
            </span>
          )}
        </div>
      </div>

      <div className="border border-border rounded-md overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Scheme</TableHead>
              <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Category</TableHead>
              <TableHead className="text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">NAV</TableHead>
              <TableHead className="text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">1Y</TableHead>
              <TableHead className="text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">3Y</TableHead>
              <TableHead className="text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide">5Y</TableHead>
              <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Risk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-[13px] text-muted-foreground py-10">
                  No funds match "{query}"
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(fund => (
                <TableRow key={fund.schemeCode} className="hover:bg-muted/40">
                  <TableCell className="max-w-xs py-3">
                    <span className="text-[13px] font-medium text-foreground leading-snug line-clamp-2 block">
                      {fund.schemeName}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-3">{fund.category}</TableCell>
                  <TableCell className="text-right tabular-nums text-[13px] text-foreground font-mono py-3">
                    ₹{fund.nav.toFixed(2)}
                  </TableCell>
                  <PctCell value={fund.returns1y} />
                  <PctCell value={fund.returns3y} />
                  <PctCell value={fund.returns5y} />
                  <TableCell className="py-3">
                    <span
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={RISK_STYLE[fund.riskRating]}
                    >
                      {fund.riskRating}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
