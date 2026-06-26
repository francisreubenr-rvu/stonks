import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFundList, type EnrichedScheme, type RiskLevel } from '@/hooks/useFundList'
import { useDebounce } from '@/hooks/useDebounce'
import { Input } from '@/components/ui/input'
import { ScreenerFilters, type FundFilters } from '@/components/ScreenerFilters'

const PAGE_SIZE = 50

const RISK_COLORS: Record<RiskLevel, { bg: string; fg: string }> = {
  'Low':       { bg: 'var(--risk-low-bg)',   fg: 'var(--risk-low-fg)' },
  'Moderate':  { bg: 'var(--risk-mod-bg)',   fg: 'var(--risk-mod-fg)' },
  'High':      { bg: 'var(--risk-high-bg)',  fg: 'var(--risk-high-fg)' },
  'Very High': { bg: 'var(--risk-vhigh-bg)', fg: 'var(--risk-vhigh-fg)' },
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

  useEffect(() => { setPage(0) }, [debouncedQuery, filters])

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>()
    schemes.forEach(s => { if (s.category) set.add(s.category) })
    return Array.from(set).sort()
  }, [schemes])

  const fundHouses = useMemo(() => {
    const set = new Set<string>()
    schemes.forEach(s => { if (s.fundHouse) set.add(s.fundHouse) })
    return Array.from(set).sort()
  }, [schemes])

  const filtered = useMemo(() => {
    let result = schemes

    const q = debouncedQuery.toLowerCase()
    if (q) {
      result = result.filter(f => f.schemeName.toLowerCase().includes(q))
    }

    if (filters.categories.length > 0) {
      result = result.filter(f =>
        filters.categories.some(c => f.category === c)
      )
    }

    if (filters.riskLevels.length > 0) {
      result = result.filter(f => filters.riskLevels.includes(f.risk))
    }

    if (filters.fundHouse) {
      result = result.filter(f =>
        f.fundHouse.toLowerCase().includes(filters.fundHouse.toLowerCase())
      )
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
            {filtered.length.toLocaleString()} of {schemes.length.toLocaleString()} schemes
            {schemes.length > 0 && (
              <span className="ml-2 text-[10px]" style={{ color: 'var(--primary)' }}>
                {schemes.length >= 37000 ? '· 37K+ indexed ready' : ''}
              </span>
            )}
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
        <div className="grid grid-cols-[48px_1fr_120px_80px] bg-muted border-b border-border px-4 py-2.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">#</span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Scheme Name</span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-right">Category</span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-right">Risk</span>
        </div>

        {pageData.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-[13px] text-muted-foreground">No funds match your criteria</p>
            <p className="text-[11px] text-muted-foreground">Try adjusting filters or search query</p>
          </div>
        ) : (
          pageData.map((scheme: EnrichedScheme, i: number) => {
            const rc = RISK_COLORS[scheme.risk]
            return (
              <button
                key={scheme.schemeCode}
                onClick={() => navigate(`/fund/${scheme.schemeCode}`)}
                className="grid grid-cols-[48px_1fr_120px_80px] w-full px-4 py-3 border-b border-border last:border-0 text-left hover:bg-white/[0.03] transition-colors duration-100 cursor-pointer group"
              >
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums pt-0.5">
                  {(page * PAGE_SIZE + i + 1).toLocaleString()}
                </span>
                <div className="min-w-0">
                  <span className="text-[13px] text-foreground group-hover:text-primary transition-colors duration-100 leading-snug block truncate">
                    {scheme.schemeName}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground text-right truncate self-center px-1">
                  {scheme.category.length > 16 ? scheme.category.slice(0, 16) + '…' : scheme.category}
                </span>
                <span className="text-right self-center">
                  <span
                    className="inline-block text-[9px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{ background: rc.bg, color: rc.fg }}
                  >
                    {scheme.risk}
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
            Page {page + 1} of {totalPages.toLocaleString()}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="text-[11px] font-medium px-3 py-1.5 border border-border rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              const start = Math.max(0, Math.min(page - 3, totalPages - 7))
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
