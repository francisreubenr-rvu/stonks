import { useState, useMemo } from 'react'
import { useFundsUniverse } from '@/hooks/useFundsUniverse'
import type { Fund } from '@/api/dataTypes'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

const RISK_STYLE: Record<Fund['riskRating'], string> = {
  Low:        'bg-green-50  text-green-700  ring-1 ring-green-200',
  Moderate:   'bg-amber-50  text-amber-700  ring-1 ring-amber-200',
  High:       'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  'Very High':'bg-red-50    text-red-700    ring-1 ring-red-200',
}

function pct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

function PctCell({ value }: { value: number }) {
  return (
    <TableCell className={`text-right tabular-nums text-sm ${value >= 0 ? 'text-green-700' : 'text-red-600'}`}>
      {pct(value)}
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
      <div className="h-5 w-28 bg-zinc-100 rounded animate-pulse" />
      <div className="border border-border rounded-lg overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 border-b border-border last:border-0 bg-white animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
        ))}
      </div>
    </div>
  )
  if (error) return <p className="text-sm text-destructive">{error}</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-foreground">Mutual Funds</h2>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filter by name, category, risk…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="h-8 w-64 text-sm"
          />
          {query && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {filtered.length} of {data.length}
            </span>
          )}
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-medium text-foreground">Scheme</TableHead>
              <TableHead className="font-medium text-foreground">Category</TableHead>
              <TableHead className="text-right font-medium text-foreground">NAV</TableHead>
              <TableHead className="text-right font-medium text-foreground">1Y</TableHead>
              <TableHead className="text-right font-medium text-foreground">3Y</TableHead>
              <TableHead className="text-right font-medium text-foreground">5Y</TableHead>
              <TableHead className="font-medium text-foreground">Risk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                  No funds match "{query}"
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(fund => (
                <TableRow key={fund.schemeCode} className="hover:bg-muted/30">
                  <TableCell className="max-w-xs">
                    <span className="text-sm leading-snug text-foreground font-medium line-clamp-2">
                      {fund.schemeName}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fund.category}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-foreground">
                    ₹{fund.nav.toFixed(2)}
                  </TableCell>
                  <PctCell value={fund.returns1y} />
                  <PctCell value={fund.returns3y} />
                  <PctCell value={fund.returns5y} />
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_STYLE[fund.riskRating]}`}>
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
