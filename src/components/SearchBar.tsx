import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearch } from '@/hooks/useSearch'
import type { SearchResult } from '@/api/yahooFinanceClient'

export function SearchBar({ className = '' }: { className?: string }) {
  const [query, setQuery] = useState('')
  const { results, isLoading, open, setOpen, close } = useSearch(query)
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [close])

  function select(r: SearchResult) {
    setQuery('')
    close()
    if (r.type === 'ETF' || r.type === 'Mutual Fund') {
      navigate(`/fund/${r.symbol}`)
    } else if (r.type === 'Index') {
      navigate('/indices')
    } else {
      navigate(`/symbol/${r.symbol}`)
    }
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <input
        type="text"
        placeholder="Search symbols…"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        className="h-7 w-48 bg-muted border border-border rounded-md px-2.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
      />
      {open && query.length >= 2 && (
        <div className="absolute top-full mt-1 right-0 w-72 bg-card border border-border rounded-md shadow-[0_4px_12px_-2px_rgba(15,23,42,0.10)] max-h-64 overflow-y-auto z-20">
          {isLoading ? (
            <div className="px-3 py-2 text-[11px] text-muted-foreground">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-muted-foreground">No results</div>
          ) : (
            results.slice(0, 10).map(r => (
              <button
                key={r.symbol}
                onClick={() => select(r)}
                className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors flex items-center justify-between gap-2 cursor-pointer"
              >
                <div className="min-w-0">
                  <span className="font-mono text-[12px] font-semibold text-foreground truncate block">
                    {r.symbol}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate block">
                    {r.name}
                  </span>
                </div>
                <span className="text-[9px] text-muted-foreground border border-border px-1.5 py-0.5 rounded shrink-0">
                  {r.type}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
