import { useState } from 'react'

export interface FundFilters {
  categories: string[]
  riskLevels: string[]
  minReturns1y: number
  minAum: number
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
  const [minRet, setMinRet] = useState(0)
  const [minAum, setMinAum] = useState(0)
  const [house, setHouse] = useState('')

  function emit(
    c: string[] = cats,
    r: string[] = risks,
    ret: number = minRet,
    aum: number = minAum,
    h: string = house,
  ) {
    setCats(c); setRisks(r); setMinRet(ret); setMinAum(aum); setHouse(h)
    onChange({ categories: c, riskLevels: r, minReturns1y: ret, minAum: aum, fundHouse: h })
  }

  const toggle = (list: string[], item: string, setter: (v: string[]) => void) => {
    const next = list.includes(item) ? list.filter(x => x !== item) : [...list, item]
    setter(next)
    return next
  }

  const hasFilters = cats.length > 0 || risks.length > 0 || minRet > 0 || minAum > 0 || house !== ''

  return (
    <div className="border border-border rounded-md p-3 bg-card space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Filters</p>
        {hasFilters && (
          <button
            onClick={() => emit([], [], 0, 0, '')}
            className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground mb-1.5">Category</p>
          <div className="flex flex-wrap gap-1">
            {categories.slice(0, 12).map(c => (
              <button
                key={c}
                onClick={() => emit(toggle(cats, c, setCats))}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                  cats.includes(c)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] text-muted-foreground mb-1.5">Risk</p>
          <div className="flex flex-wrap gap-1">
            {['Low', 'Moderate', 'High', 'Very High'].map(r => (
              <button
                key={r}
                onClick={() => emit(undefined, toggle(risks, r, setRisks))}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                  risks.includes(r)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] text-muted-foreground mb-1.5">Min 1Y Return</p>
          <input
            type="range"
            min={0}
            max={100}
            value={minRet}
            onChange={e => emit(undefined, undefined, Number(e.target.value))}
            className="w-full h-1.5 accent-primary cursor-pointer"
          />
          <p className="text-[10px] text-muted-foreground mt-0.5">{minRet}%+</p>
        </div>

        <div>
          <p className="text-[10px] text-muted-foreground mb-1.5">Min AUM (Cr)</p>
          <input
            type="range"
            min={0}
            max={100000}
            step={100}
            value={minAum}
            onChange={e => emit(undefined, undefined, undefined, Number(e.target.value))}
            className="w-full h-1.5 accent-primary cursor-pointer"
          />
          <p className="text-[10px] text-muted-foreground mt-0.5">₹{minAum.toLocaleString()}+ Cr</p>
        </div>
      </div>

      <div>
        <p className="text-[10px] text-muted-foreground mb-1.5">Fund House</p>
        <select
          value={house}
          onChange={e => emit(undefined, undefined, undefined, undefined, e.target.value)}
          className="h-7 bg-muted border border-border rounded px-2 text-[11px] text-foreground cursor-pointer w-full max-w-48"
        >
          <option value="">All fund houses</option>
          {fundHouses.map(h => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
