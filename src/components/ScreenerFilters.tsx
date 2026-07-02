import { useState } from 'react'

export interface FundFilters {
  categories: string[]
  riskLevels: string[]
  fundHouse: string
}

interface Props {
  categories: string[]
  fundHouses: string[]
  onChange: (f: FundFilters) => void
}

export function ScreenerFilters({ categories, fundHouses, onChange }: Props) {
  const [cats, setCats] = useState<string[]>([])
  const [risks, setRisks] = useState<string[]>([])
  const [house, setHouse] = useState('')

  function emit(
    c: string[] = cats,
    r: string[] = risks,
    h: string = house,
  ) {
    setCats(c); setRisks(r); setHouse(h)
    onChange({ categories: c, riskLevels: r, fundHouse: h })
  }

  const toggle = (list: string[], item: string, setter: (v: string[]) => void) => {
    const next = list.includes(item) ? list.filter(x => x !== item) : [...list, item]
    setter(next)
    return next
  }

  const hasFilters = cats.length > 0 || risks.length > 0 || house !== ''

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Filters</p>
        {hasFilters && (
          <button
            onClick={() => emit([], [], '')}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Fund House
        </p>
        <select
          value={house}
          onChange={e => emit(undefined, undefined, e.target.value)}
          className="w-full h-8 bg-muted border border-border rounded-md px-2 text-sm text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All Houses</option>
          {fundHouses.filter(h => h.length > 1).map(h => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Risk Level
        </p>
        <div className="flex flex-col gap-1.5">
          {(['Low', 'Moderate', 'High', 'Very High'] as const).map(r => (
            <button
              key={r}
              onClick={() => emit(undefined, toggle(risks, r, setRisks))}
              className={`text-left text-sm px-2.5 py-1.5 rounded-md border transition-colors duration-150 cursor-pointer ${
                risks.includes(r)
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'border-border text-muted-foreground hover:border-[var(--border-strong)] hover:text-foreground'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Category
        </p>
        <div className="flex flex-col gap-1 max-h-[50vh] overflow-y-auto">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => emit(toggle(cats, c, setCats))}
              className={`text-left text-sm px-2.5 py-1.5 rounded-md border transition-colors duration-150 cursor-pointer ${
                cats.includes(c)
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'border-border text-muted-foreground hover:border-[var(--border-strong)] hover:text-foreground'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
