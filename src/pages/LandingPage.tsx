import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

const QUICK = [
  { sym: 'RELIANCE', label: 'Reliance' },
  { sym: 'TCS',      label: 'TCS' },
  { sym: 'HDFCBANK', label: 'HDFC Bank' },
  { sym: 'INFY',     label: 'Infosys' },
  { sym: 'ICICIBANK',label: 'ICICI Bank' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-10 text-center">
      <div className="space-y-4 max-w-lg">
        <p className="text-[11px] font-medium text-primary uppercase tracking-[0.12em]">
          NSE · BSE · Research Tool
        </p>
        <h1 className="text-4xl font-semibold text-foreground tracking-tight leading-[1.15]">
          Indian Market Screener
        </h1>
        <p className="text-[15px] text-muted-foreground leading-relaxed max-w-sm mx-auto">
          Screen mutual funds, track indices, and compare equities.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap justify-center">
        <Button onClick={() => navigate('/funds')}>Browse Funds</Button>
        <Button variant="outline" onClick={() => navigate('/indices')}>View Indices</Button>
        <Button variant="outline" onClick={() => navigate('/compare')}>Compare</Button>
      </div>

      <div className="pt-2 border-t border-border w-full max-w-sm space-y-2.5">
        <p className="text-[11px] text-muted-foreground">Quick jump to symbol</p>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {QUICK.map(({ sym, label }) => (
            <button
              key={sym}
              onClick={() => navigate(`/symbol/${sym}`)}
              className="text-[11px] font-medium px-2.5 py-1 border border-border rounded bg-card text-muted-foreground hover:text-foreground hover:border-[var(--border-strong)] transition-colors duration-150 cursor-pointer font-mono"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
