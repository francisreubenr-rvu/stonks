import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFundList, type LightFund, RISK_LABELS } from '@/hooks/useFundList'
import { useDebounce } from '@/hooks/useDebounce'
import { useSxEffects } from '@/hooks/useSxEffects'
import { Input } from '@/components/ui/input'
import { ScreenerFilters, type FundFilters } from '@/components/ScreenerFilters'
import { RiskBadge } from '@/components/RiskBadge'
import { SectionEyebrow } from '@/components/SectionEyebrow'

const PAGE_SIZE = 50

// 'Popularity' and '1Y Return' were removed — LightFund carries no
// popularity/return data to sort by (that lives behind a per-fund NAV
// fetch on FundDetailPage), so those options previously highlighted as
// "selected" while silently leaving the list in natural order.
const SORT_OPTIONS = [
  { key: 'name_asc', label: 'Name A–Z' },
  { key: 'risk_asc', label: 'Risk (Low first)' },
] as const
type SortKey = typeof SORT_OPTIONS[number]['key']

function Shimmer() {
  return (
    <div className="flex gap-5">
      <div className="w-52 shrink-0 space-y-3 animate-pulse">
        <div className="h-4 w-16 bg-muted rounded" />
        <div className="h-8 w-full bg-muted rounded" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 w-full bg-muted rounded" />
          ))}
        </div>
        <div className="h-4 w-20 bg-muted rounded mt-3" />
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-7 w-full bg-muted rounded" />
          ))}
        </div>
      </div>
      <div className="flex-1 space-y-3">
        <div className="flex gap-2">
          <div className="h-8 w-64 bg-muted rounded animate-pulse" />
          <div className="h-8 w-20 bg-muted rounded animate-pulse" />
        </div>
        <div className="border border-border rounded-md overflow-hidden">
          <div className="h-9 bg-muted border-b border-border" />
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-11 border-b border-border last:border-0 bg-card"
              style={{ opacity: 1 - i * 0.07 }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function FundsPage() {
  const { data, isLoading, error, refetch } = useFundList()
  const navigate = useNavigate()
  const rootRef = useSxEffects<HTMLDivElement>([isLoading])
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sort, setSort] = useState<SortKey>('name_asc')
  const [filters, setFilters] = useState<FundFilters>({
    categories: [], riskLevels: [], fundHouse: '',
  })

  const debouncedQuery = useDebounce(query, 200)
  const schemes = data ?? []

  useEffect(() => { setPage(0) }, [debouncedQuery, filters, sort])

  const uniqueCategories = useMemo(() => {
    const counts = new Map<string, number>()
    schemes.forEach(s => { if (s.g) counts.set(s.g, (counts.get(s.g) || 0) + 1) })
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat)
  }, [schemes])

  const fundHouses = useMemo(() => {
    const set = new Set<string>()
    schemes.forEach(s => { if (s.h) set.add(s.h) })
    return Array.from(set).sort()
  }, [schemes])

  const filtered = useMemo(() => {
    let result = schemes

    const q = debouncedQuery.toLowerCase()
    if (q) {
      result = result.filter(f => f.n.toLowerCase().includes(q))
    }

    if (filters.categories.length > 0) {
      result = result.filter(f => filters.categories.includes(f.g))
    }

    if (filters.riskLevels.length > 0) {
      result = result.filter(f => filters.riskLevels.includes(RISK_LABELS[f.r]))
    }

    if (filters.fundHouse) {
      const h = filters.fundHouse.toLowerCase()
      result = result.filter(f =>
        f.h.toLowerCase().includes(h) || h.includes(f.h.toLowerCase())
      )
    }

    if (sort === 'risk_asc') result = [...result].sort((a, b) => a.r - b.r)
    else result = [...result].sort((a, b) => a.n.localeCompare(b.n))

    return result
  }, [schemes, debouncedQuery, filters, sort])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageData = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  if (isLoading) return <Shimmer />
  if (error) return (
    <div className="space-y-3">
      <p className="text-sm text-destructive">{error?.message}</p>
      <p className="text-xs text-muted-foreground">Could not reach api.mfapi.in</p>
      <button
        onClick={() => refetch()}
        className="px-4 py-2 rounded-md border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-[var(--border-strong)] transition-colors duration-150 cursor-pointer"
      >
        ↻ Retry
      </button>
    </div>
  )

  const activeFilterCount =
    (filters.categories.length > 0 ? 1 : 0) +
    (filters.riskLevels.length > 0 ? 1 : 0) +
    (filters.fundHouse ? 1 : 0)

  return (
    <div ref={rootRef}>
      <div data-reveal>
        <SectionEyebrow eyebrow="Fund Screener" title="Mutual Funds" />
      </div>

      <div data-reveal className="flex flex-col lg:flex-row gap-5">
        {/* Left sidebar — Filters (stacks above the table on mobile) */}
        <aside className={`shrink-0 w-full lg:w-[220px] ${sidebarOpen ? '' : 'hidden'}`}>
          <div className="border border-border rounded-lg p-4 bg-card lg:sticky lg:top-16">
            <ScreenerFilters
              categories={uniqueCategories}
              fundHouses={fundHouses}
              onChange={setFilters}
            />
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Top bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="shrink-0 text-xs font-medium px-2.5 py-1.5 border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              {sidebarOpen ? '◄ Filters' : 'Filters ►'}
              {activeFilterCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px]">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground inline mr-3">
                Mutual Funds
              </h2>
              <span className="text-xs text-muted-foreground">
                {filtered.length.toLocaleString()} of {schemes.length.toLocaleString()}
              </span>
            </div>

            <div className="flex gap-1.5 shrink-0">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSort(opt.key)}
                  className={`text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors cursor-pointer ${
                    sort === opt.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <Input
              placeholder="Search by name…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="h-8 w-56 text-sm shrink-0"
            />
          </div>

          {/* Table (horizontally scrollable on narrow screens) */}
          <div className="border border-border rounded-md overflow-hidden bg-card">
            <div className="overflow-x-auto">
            <div className="min-w-[560px] lg:min-w-0">
            <div className="grid grid-cols-[48px_80px_1fr_100px_130px_80px] bg-muted border-b border-border px-4 py-2.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">#</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Code</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Scheme Name</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">Fund House</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">Category</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">Risk</span>
            </div>

            {pageData.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <p className="text-sm text-muted-foreground">No funds match your criteria</p>
                <p className="text-xs text-muted-foreground">Try adjusting filters or search</p>
              </div>
            ) : (
            pageData.map((fund: LightFund, i: number) => (
                <button
                  key={fund.c}
                  onClick={() => navigate(`/fund/${fund.c}`)}
                  className="grid grid-cols-[48px_80px_1fr_100px_130px_80px] w-full px-4 py-2.5 border-b border-border last:border-0 text-left hover:bg-muted transition-colors duration-100 cursor-pointer group"
                >
                  <span className="font-mono text-xs text-muted-foreground tabular-nums self-center">
                    {(page * PAGE_SIZE + i + 1).toLocaleString()}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums self-center">
                    {fund.c}
                  </span>
                  <div className="min-w-0 pr-2">
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors duration-100 leading-snug block truncate">
                      {fund.n}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground text-right truncate self-center px-1">
                    {fund.h.length > 14 ? fund.h.slice(0, 14) + '…' : fund.h}
                  </span>
                  <span className="text-xs text-muted-foreground text-right truncate self-center px-1">
                    {fund.g.length > 18 ? fund.g.slice(0, 18) + '…' : fund.g}
                  </span>
                  <span className="text-right self-center">
                    <RiskBadge risk={fund.r} />
                  </span>
                </button>
              ))
            )}
            </div>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pb-6">
              <p className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages.toLocaleString()}
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  className="text-xs font-medium px-3 py-1.5 border border-border rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
                      className={`text-xs font-medium px-2.5 py-1.5 border rounded tabular-nums transition-colors cursor-pointer ${
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
                  className="text-xs font-medium px-3 py-1.5 border border-border rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
