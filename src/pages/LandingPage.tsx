import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

const QUICK = [
  { sym: 'RELIANCE', label: 'Reliance' },
  { sym: 'TCS', label: 'TCS' },
  { sym: 'HDFCBANK', label: 'HDFC Bank' },
  { sym: 'INFY', label: 'Infosys' },
  { sym: 'ICICIBANK', label: 'ICICI Bank' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-8 text-center">
      <div className="space-y-3 max-w-lg">
        <p className="text-xs font-medium text-primary uppercase tracking-widest">
          NSE · BSE · Research Tool
        </p>
        <h1 className="text-4xl font-semibold text-foreground tracking-tight leading-tight">
          Indian Market Screener
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed">
          Screen mutual funds, track indices, and compare equities.
          Stub clients wired — replace with live API keys when ready.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap justify-center">
        <Button onClick={() => navigate('/funds')}>Browse Funds</Button>
        <Button variant="outline" onClick={() => navigate('/indices')}>
          View Indices
        </Button>
        <Button variant="outline" onClick={() => navigate('/compare')}>
          Compare
        </Button>
      </div>

      <div className="flex flex-col items-center gap-2 pt-4 border-t border-border w-full max-w-sm">
        <p className="text-xs text-muted-foreground">Quick jump to symbol</p>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {QUICK.map(({ sym, label }) => (
            <button
              key={sym}
              onClick={() => navigate(`/symbol/${sym}`)}
              className="text-xs px-2.5 py-1 border border-border rounded-md text-muted-foreground hover:text-foreground hover:border-zinc-400 transition-colors cursor-pointer"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
