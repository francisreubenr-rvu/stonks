import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompareSet } from '@/hooks/useCompareSet'
import { useSxEffects } from '@/hooks/useSxEffects'
import { Input } from '@/components/ui/input'
import { SectionEyebrow } from '@/components/SectionEyebrow'
import { WatchlistToggle } from '@/components/WatchlistToggle'

const DEFAULT = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK']

function Pct({ val }: { val: number | undefined }) {
  if (val === undefined) return <span className="font-mono text-[13px] text-muted-foreground">—</span>
  const pos = val >= 0
  return (
    <span className="font-mono text-[13px] tabular-nums" style={{ color: pos ? 'var(--delta-positive)' : 'var(--delta-negative)' }}>
      {pos ? '+' : ''}{val.toFixed(2)}%
    </span>
  )
}

export default function ComparePage() {
  const navigate = useNavigate()
  const [symbols, setSymbols] = useState(DEFAULT)
  const [input, setInput] = useState('')

  const { data: quotes, isLoading, error } = useCompareSet(symbols)
  const rootRef = useSxEffects<HTMLDivElement>([isLoading])

  function addSymbol() {
    const clean = input.trim().toUpperCase()
    if (clean && !symbols.includes(clean) && symbols.length < 8) {
      setSymbols([...symbols, clean])
      setInput('')
    }
  }

  function removeSymbol(sym: string) {
    if (symbols.length > 2) setSymbols(symbols.filter(s => s !== sym))
  }

  if (isLoading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-5 w-20 bg-muted rounded" />
      <div className="border border-border rounded-md overflow-hidden">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-10 border-b border-border last:border-0 bg-card" style={{ opacity: 1 - i * 0.1 }} />
        ))}
      </div>
    </div>
  )

  if (error) return <p className="text-sm text-destructive">{error?.message}</p>

  return (
    <div ref={rootRef}>
      <div data-reveal className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <SectionEyebrow eyebrow="Side By Side" title="Compare" />
        <div className="flex items-center gap-2">
          <Input
            placeholder="Add symbol…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSymbol()}
            className="h-9 w-40 text-sm"
          />
          <button
            onClick={addSymbol}
            className="h-9 text-sm font-medium px-4 bg-primary text-primary-foreground rounded-md hover:bg-[var(--primary-hover)] transition-colors cursor-pointer"
          >
            Add
          </button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-0.5 mb-4">
        Add up to 8 symbols. Click any symbol name to view detail.
      </p>

      <div data-reveal className="border border-border rounded-md overflow-x-auto bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide w-28">
                Metric
              </th>
              {symbols.map(sym => (
                <th key={sym} className="text-right px-3 py-2.5 min-w-28">
                  <div className="inline-flex items-center gap-1.5">
                    <WatchlistToggle
                      symbol={sym}
                      name={quotes?.find(q => q.symbol === sym)?.name ?? sym}
                      type="stock"
                      className="h-5 w-5"
                    />
                    <button
                      onClick={() => navigate(`/symbol/${sym}`)}
                      className="font-mono text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      {sym}
                    </button>
                    <button
                      onClick={() => removeSymbol(sym)}
                      className="text-[10px] text-muted-foreground hover:text-destructive cursor-pointer"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Price',       (q: { price: number }) => `₹${q.price.toFixed(2)}`],
              ['Change %',   (q: { changePct: number }) => `${q.changePct >= 0 ? '+' : ''}${q.changePct.toFixed(2)}%`],
              ['Market Cap', (q: { marketCap: number }) => q.marketCap ? `₹${(q.marketCap / 1e7).toFixed(0)} Cr` : '—'],
              ['P/E',        (q: { pe: number }) => q.pe ? q.pe.toFixed(1) : '—'],
              ['Volume',     (q: { volume: number }) => q.volume.toLocaleString('en-IN')],
              ['Exchange',   (q: { exchange: string }) => q.exchange],
            ].map(([label, fmt]) => (
              <tr key={label as string} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-2.5 text-[12px] text-muted-foreground font-medium">
                  {label as string}
                </td>
                {symbols.map(sym => {
                  const q = quotes?.find(q => q.symbol === sym)
                  if (!q) return <td key={sym} className="text-right px-3 py-2.5 text-[13px] text-muted-foreground">—</td>
                  const raw = (fmt as Function)(q)
                  if (label === 'Change %') {
                    return <td key={sym} className="text-right px-3 py-2.5"><Pct val={q.changePct} /></td>
                  }
                  return (
                    <td key={sym} className="text-right px-3 py-2.5 font-mono text-[13px] tabular-nums">
                      {raw}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
