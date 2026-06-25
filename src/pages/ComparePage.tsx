import { useNavigate } from 'react-router-dom'
import { useCompareSet } from '@/hooks/useCompareSet'
import type { Quote } from '@/api/dataTypes'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

interface Row { label: string; key: keyof Quote; fmt?: (v: number) => string }

const ROWS: Row[] = [
  { label: 'Price',        key: 'price',     fmt: v => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
  { label: 'Change %',    key: 'changePct',  fmt: v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` },
  { label: 'Market Cap',  key: 'marketCap',  fmt: v => `₹${(v / 1e7).toFixed(0)} Cr` },
  { label: 'P/E',          key: 'pe',         fmt: v => v.toFixed(1) },
  { label: 'Volume',       key: 'volume',     fmt: v => v.toLocaleString('en-IN') },
  { label: 'Exchange',     key: 'exchange' },
]

export default function ComparePage() {
  const navigate = useNavigate()
  const { data, isLoading, error } = useCompareSet()

  if (isLoading) return (
    <div className="space-y-4">
      <div className="h-5 w-20 bg-zinc-100 rounded animate-pulse" />
      <div className="border border-border rounded-lg overflow-hidden animate-pulse">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-10 border-b border-border last:border-0 bg-white" style={{ opacity: 1 - i * 0.1 }} />
        ))}
      </div>
    </div>
  )
  if (error) return <p className="text-sm text-destructive">{error}</p>

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-foreground">Compare</h2>
        <p className="text-xs text-muted-foreground">Click a symbol to view detail</p>
      </div>
      <div className="border border-border rounded-lg overflow-x-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-32 font-medium text-foreground">Metric</TableHead>
              {data.map(q => (
                <TableHead key={q.symbol} className="text-right min-w-32">
                  <button
                    onClick={() => navigate(`/symbol/${q.symbol}`)}
                    className="font-mono text-xs font-semibold text-primary hover:underline cursor-pointer block ml-auto"
                  >
                    {q.symbol}
                  </button>
                  <span className="block font-normal text-muted-foreground text-xs truncate max-w-32 ml-auto">
                    {q.name.split(' ').slice(0, 2).join(' ')}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map(row => (
              <TableRow key={row.key} className="hover:bg-muted/20">
                <TableCell className="text-sm text-muted-foreground font-medium">{row.label}</TableCell>
                {data.map(q => {
                  const raw = q[row.key]
                  const display = row.fmt && typeof raw === 'number' ? row.fmt(raw) : String(raw)
                  const isChange = row.key === 'changePct'
                  const pos = isChange && typeof raw === 'number' && raw >= 0
                  const neg = isChange && typeof raw === 'number' && raw < 0
                  return (
                    <TableCell
                      key={q.symbol}
                      className={`text-right tabular-nums text-sm ${
                        pos ? 'text-green-700' : neg ? 'text-red-600' : 'text-foreground'
                      }`}
                    >
                      {display}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
