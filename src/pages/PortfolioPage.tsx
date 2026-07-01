import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchMultipleWithFallback } from '@/api/backupClient'
import { NS } from '@/lib/symbols'
import type { Holding, PortfolioItem } from '@/api/dataTypes'
import { useSxEffects } from '@/hooks/useSxEffects'
import { SectionEyebrow } from '@/components/SectionEyebrow'

const STORAGE_KEY = 'stonks:portfolio'

function loadHoldings(): Holding[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveHoldings(h: Holding[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(h))
}

export default function PortfolioPage() {
  const navigate = useNavigate()
  const [holdings, setHoldings] = useState<Holding[]>(loadHoldings)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Holding>({ symbol: '', name: '', quantity: 0, buyPrice: 0, buyDate: '' })

  const { data: quotes, isLoading } = useQuery({
    queryKey: ['portfolioQuotes', ...holdings.map(h => h.symbol)],
    queryFn: () => fetchMultipleWithFallback(holdings.map(h => `${h.symbol}${NS}`)),
    enabled: holdings.length > 0,
    staleTime: 60_000,
  })
  const rootRef = useSxEffects<HTMLDivElement>([isLoading])

  const portfolio = useMemo<PortfolioItem[]>(() => {
    return holdings.map(h => {
      const q = quotes?.find(q => q.symbol === h.symbol)
      const currentPrice = q?.price ?? h.buyPrice
      const currentValue = currentPrice * h.quantity
      const invested = h.buyPrice * h.quantity
      const pnl = currentValue - invested
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0
      const dayChange = (q?.change ?? 0) * h.quantity
      const dayChangePct = q?.changePct ?? 0

      return {
        ...h,
        currentPrice,
        currentValue,
        invested,
        pnl,
        pnlPct,
        dayChange,
        dayChangePct,
      }
    })
  }, [holdings, quotes])

  const totals = useMemo(() => ({
    invested: portfolio.reduce((s, i) => s + i.invested, 0),
    current: portfolio.reduce((s, i) => s + i.currentValue, 0),
    dayChange: portfolio.reduce((s, i) => s + i.dayChange, 0),
  }), [portfolio])

  const totalPnl = totals.current - totals.invested
  const totalPnlPct = totals.invested > 0 ? (totalPnl / totals.invested) * 100 : 0

  function addHolding() {
    if (!form.symbol || !form.quantity || !form.buyPrice) return
    const next = [...holdings, { ...form, buyDate: form.buyDate || new Date().toISOString().slice(0, 10) }]
    saveHoldings(next)
    setHoldings(next)
    setForm({ symbol: '', name: '', quantity: 0, buyPrice: 0, buyDate: '' })
    setShowForm(false)
  }

  function removeHolding(symbol: string) {
    const next = holdings.filter(h => h.symbol !== symbol)
    saveHoldings(next)
    setHoldings(next)
  }

  if (holdings.length === 0 && !showForm) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <SectionEyebrow eyebrow="Holdings" title="Portfolio" />
          <button
            onClick={() => setShowForm(true)}
            className="h-9 text-sm font-medium px-4 bg-primary text-primary-foreground rounded-md hover:bg-[var(--primary-hover)] transition-colors cursor-pointer"
          >
            + Add Holding
          </button>
        </div>
        <div className="border border-border rounded-lg bg-card py-16 text-center space-y-2">
          <p className="text-sm text-muted-foreground">No holdings yet</p>
          <p className="text-xs text-muted-foreground">
            Track your portfolio by adding your holdings manually.
          </p>
        </div>
      </div>
    )
  }

  const pos = totalPnl >= 0

  return (
    <div ref={rootRef}>
      <div data-reveal className="flex items-center justify-between mb-6">
        <SectionEyebrow eyebrow="Holdings" title="Portfolio" />
        <button
          onClick={() => setShowForm(!showForm)}
          className="h-9 text-sm font-medium px-4 bg-primary text-primary-foreground rounded-md hover:bg-[var(--primary-hover)] transition-colors cursor-pointer"
        >
          + Add
        </button>
      </div>

      {showForm && (
        <div data-reveal className="border border-border rounded-lg p-4 bg-card grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <input
            placeholder="Symbol (e.g. RELIANCE)"
            value={form.symbol}
            onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
            className="h-8 bg-muted border border-border rounded px-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            placeholder="Name (e.g. Reliance)"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="h-8 bg-muted border border-border rounded px-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="number"
            placeholder="Quantity"
            value={form.quantity || ''}
            onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
            className="h-8 bg-muted border border-border rounded px-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="number"
            placeholder="Buy Price (₹)"
            value={form.buyPrice || ''}
            onChange={e => setForm(f => ({ ...f, buyPrice: Number(e.target.value) }))}
            className="h-8 bg-muted border border-border rounded px-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={addHolding}
            className="h-8 text-[12px] font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Save
          </button>
        </div>
      )}

      <div data-reveal className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        <div className="border border-border rounded-lg p-3 bg-card">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Invested</p>
          <p className="font-mono text-lg font-semibold text-foreground">₹{totals.invested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="border border-border rounded-lg p-3 bg-card">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Current</p>
          <p className="font-mono text-lg font-semibold text-foreground">₹{totals.current.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="border border-border rounded-lg p-3 bg-card">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">P&L</p>
          <p className="font-mono text-lg font-semibold tabular-nums" style={{ color: pos ? 'var(--delta-positive)' : 'var(--delta-negative)' }}>
            {pos ? '+' : ''}₹{totalPnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="font-mono text-[11px] tabular-nums mt-0.5" style={{ color: pos ? 'var(--delta-positive)' : 'var(--delta-negative)' }}>
            {pos ? '+' : ''}{totalPnlPct.toFixed(2)}%
          </p>
        </div>
        <div className="border border-border rounded-lg p-3 bg-card">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Day Change</p>
          <p className="font-mono text-lg font-semibold tabular-nums" style={{ color: totals.dayChange >= 0 ? 'var(--delta-positive)' : 'var(--delta-negative)' }}>
            {totals.dayChange >= 0 ? '+' : ''}₹{totals.dayChange.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div data-reveal className="border border-border rounded-md overflow-hidden bg-card">
        <div className="overflow-x-auto">
        <div className="min-w-[640px]">
        <div className="grid grid-cols-[1fr_80px_100px_100px_100px_100px_40px] bg-muted border-b border-border px-4 py-2.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Symbol</span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-right">Qty</span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-right">Buy</span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-right">Current</span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-right">Value</span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-right">P&L</span>
          <span />
        </div>
        {portfolio.map(item => {
          const itemPos = item.pnl >= 0
          return (
            <div
              key={item.symbol}
              className="grid grid-cols-[1fr_80px_100px_100px_100px_100px_40px] px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
            >
              <button
                onClick={() => navigate(`/symbol/${item.symbol}`)}
                className="text-left cursor-pointer"
              >
                <span className="font-mono text-[12px] font-semibold text-foreground block">
                  {item.symbol}
                </span>
                <span className="text-[10px] text-muted-foreground">{item.name}</span>
              </button>
              <span className="text-right font-mono text-[13px] text-foreground tabular-nums self-center">{item.quantity}</span>
              <span className="text-right font-mono text-[13px] text-muted-foreground tabular-nums self-center">₹{item.buyPrice.toFixed(2)}</span>
              <span className="text-right font-mono text-[13px] text-foreground tabular-nums self-center">₹{item.currentPrice.toFixed(2)}</span>
              <span className="text-right font-mono text-[13px] text-foreground tabular-nums self-center">₹{item.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              <span
                className="text-right font-mono text-[12px] tabular-nums self-center"
                style={{ color: itemPos ? 'var(--delta-positive)' : 'var(--delta-negative)' }}
              >
                {itemPos ? '+' : ''}₹{item.pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                <span className="block text-[10px] opacity-75">{itemPos ? '+' : ''}{item.pnlPct.toFixed(1)}%</span>
              </span>
              <button
                onClick={() => removeHolding(item.symbol)}
                className="text-[11px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer text-right pr-1 self-center"
              >
                ✕
              </button>
            </div>
          )
        })}
        </div>
        </div>
      </div>
    </div>
  )
}
