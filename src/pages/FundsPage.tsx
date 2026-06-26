import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFundList } from '@/hooks/useFundList'
import { useDebounce } from '@/hooks/useDebounce'
import { Input } from '@/components/ui/input'
import { ScreenerFilters, type FundFilters } from '@/components/ScreenerFilters'
import { riskFromCategory, type RiskLevel } from '@/lib/riskFromCategory'

const PAGE_SIZE = 50

function categoryPrefix(cat: string): string {
  const parts = cat.split('/')
  return parts[parts.length - 1].trim()
}

function Shimmer() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="h-5 w-32 bg-muted rounded animate-pulse" />
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
      </div>
      <div className="border border-border rounded-md overflow-hidden">
        <div className="h-9 bg-muted border-b border-border" />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-12 border-b border-border last:border-0 bg-card flex items-center px-4 gap-4 animate-pulse"
            style={{ opacity: 1 - i * 0.08 }}>
            <div className="h-3 w-8 bg-muted rounded" />
            <div className="h-3 flex-1 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function FundsPage() {
  const { data, isLoading, error } = useFundList()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState<FundFilters>({
    categories: [], riskLevels: [], minReturns1y: 0, minAum: 0, fundHouse: '',
  })

  const debouncedQuery = useDebounce(query, 200)
  const schemes = data ?? []

  // Reset page when query or filters change
  useEffect(() => { setPage(0) }, [debouncedQuery, filters])

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>()
    schemes.forEach(s => {
      const parts = s.schemeName.split(' — ')
      if (parts.length >= 2) {
        const cat = parts[parts.length - 1].trim()
        if (cat && cat.length < 60) set.add(cat)
      }
    })
    return Array.from(set).sort()
  }, [schemes])

  const fundHouses = useMemo(() => {
    const set = new Set<string>()
    schemes.forEach(s => {
      const parts = s.schemeName.split(' — ')
      if (parts.length >= 2) set.add(parts[0].trim())
    })
    return Array.from(set).sort()
  }, [schemes])

  const filtered = useMemo(() => {
    let result = schemes

    const q = debouncedQuery.toLowerCase()
    if (q) {
      result = result.filter(f => f.schemeName.toLowerCase().includes(q))
    }

    if (filters.categories.length > 0) {
      result = result.filter(f => {
        const parts = f.schemeName.split(' — ')
        const cat = categoryPrefix(parts.pop() ?? '')
        return filters.categories.some(c => cat.toLowerCase().includes(c.toLowerCase()))
      })
    }

    if (filters.riskLevels.length > 0) {
      result = result.filter(f => {
        const parts = f.schemeName.split(' — ')
        const cat = parts.pop() ?? ''
        const risk = riskFromCategory(cat)
        return filters.riskLevels.includes(risk)
      })
    }

    if (filters.fundHouse) {
      result = result.filter(f => {
        const house = f.schemeName.split(' — ')[0]?.trim() ?? ''
        return house.toLowerCase().includes(filters.fundHouse.toLowerCase())
      })
    }

    return result
  }, [schemes, debouncedQuery, filters])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageData = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  if (isLoading) return <Shimmer />
  if (error) return (
    <div className="space-y-2">
      <p className="text-sm text-destructive">{error?.message}</p>
      <p className="text-xs text-muted-foreground">Could not reach api.mfapi.in</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">Mutual Funds</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {filtered.length.toLocaleString()} of {data?.length.toLocaleString()} schemes
          </p>
        </div>
        <Input
          placeholder="Search by fund name…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="h-8 w-72 text-[13px]"
        />
      </div>

      <ScreenerFilters
        categories={uniqueCategories}
        fundHouses={fundHouses}
        onChange={setFilters}
      />

      <div className="border border-border rounded-md overflow-hidden bg-card">
        <div className="grid grid-cols-[48px_1fr_100px_80px] bg-muted border-b border-border px-4 py-2.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">#</span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Scheme Name</span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-right">Category</span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-right">Risk</span>
        </div>

        {pageData.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-muted-foreground">
            No funds match your criteria
          </div>
        ) : (
          pageData.map((scheme, i) => {
            const cat = scheme.schemeName.split(' — ').pop()?.trim() ?? ''
            const risk = riskFromCategory(cat)
            const riskColors: Record<RiskLevel, { bg: string; fg: string }> = {
              'Low':       { bg: 'var(--risk-low-bg)',   fg: 'var(--risk-low-fg)' },
              'Moderate':  { bg: 'var(--risk-mod-bg)',   fg: 'var(--risk-mod-fg)' },
              'High':      { bg: 'var(--risk-high-bg)',  fg: 'var(--risk-high-fg)' },
              'Very High': { bg: 'var(--risk-vhigh-bg)', fg: 'var(--risk-vhigh-fg)' },
            }
            return (
              <button
                key={scheme.schemeCode}
                onClick={() => navigate(`/fund/${scheme.schemeCode}`)}
                className="grid grid-cols-[48px_1fr_100px_80px] w-full px-4 py-3 border-b border-border last:border-0 text-left hover:bg-muted/40 transition-colors duration-100 cursor-pointer group"
              >
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums pt-0.5">
                  {(page * PAGE_SIZE + i + 1).toLocaleString()}
                </span>
                <span className="text-[13px] text-foreground group-hover:text-primary transition-colors duration-100 leading-snug">
                  {scheme.schemeName}
                </span>
                <span className="text-[10px] text-muted-foreground text-right truncate pt-0.5">
                  {cat.length > 22 ? cat.slice(0, 22) + '…' : cat}
                </span>
                <span className="text-right">
                  <span
                    className="inline-block text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{ background: riskColors[risk].bg, color: riskColors[risk].fg }}
                  >
                    {risk}
                  </span>
                </span>
              </button>
            )
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="text-[11px] font-medium px-3 py-1.5 border border-border rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(0, Math.min(page - 2, totalPages - 5))
              const p2 = start + i
              return (
                <button
                  key={p2}
                  onClick={() => setPage(p2)}
                  className={`text-[11px] font-medium px-2.5 py-1.5 border rounded tabular-nums transition-colors duration-150 cursor-pointer ${
                    p2 === page
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {p2 + 1}
                </button>
              )
            })}
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              className="text-[11px] font-medium px-3 py-1.5 border border-border rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
