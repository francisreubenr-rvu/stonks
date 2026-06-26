import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFundList } from '@/hooks/useFundList'
import { useBanker } from '@/hooks/useBanker'
import { useDashboard } from '@/hooks/useDashboard'
import { INSIGHTS, PROFILE_LABELS, type BankerRisk, type InvestmentProfile } from '@/lib/banker'

const PROFILES: BankerRisk[] = ['Conservative', 'Moderate', 'Aggressive']

function pct(v: number | null, decimals = 1): string {
  if (v === null) return '—'
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(decimals)}%`
}
function num(v: number | null, decimals = 1): string {
  if (v === null) return '—'
  return v.toFixed(decimals)
}

const HORIZONS = [
  { value: '<1Y',  label: '< 1 Year',     desc: 'Short-term' },
  { value: '1-3Y', label: '1 – 3 Years',  desc: 'Medium-term' },
  { value: '3-5Y', label: '3 – 5 Years',  desc: 'Long-term' },
  { value: '5-10Y',label: '5 – 10 Years', desc: 'Wealth building' },
  { value: '10Y+', label: '10+ Years',    desc: 'Legacy planning' },
] as const

const FUND_COUNTS = [1, 2, 3, 5, 8, 12] as const

const AMOUNTS = [
  { value: '<50K',    label: 'Up to ₹50,000' },
  { value: '50K-2L',  label: '₹50K – ₹2 Lakh' },
  { value: '2L-10L',  label: '₹2 – ₹10 Lakh' },
  { value: '10L+',    label: '₹10 Lakh+' },
] as const

const FREQUENCIES = [
  { value: 'Lumpsum',      label: 'One-time (Lumpsum)' },
  { value: 'Monthly SIP',  label: 'Every Month (SIP)' },
  { value: 'Quarterly',    label: 'Every Quarter' },
] as const

export default function BankerPage() {
  const navigate = useNavigate()
  const { data: schemes } = useFundList()
  const { data: dashboard } = useDashboard()

  // Questionnaire state
  const [step, setStep] = useState<'profile' | 'questions' | 'scan'>('profile')
  const [riskProfile, setRiskProfile] = useState<BankerRisk>('Moderate')
  const [horizon, setHorizon] = useState<string>('3-5Y')
  const [fundCount, setFundCount] = useState<number>(5)
  const [amount, setAmount] = useState<string>('50K-2L')
  const [frequency, setFrequency] = useState<string>('Monthly SIP')

  const investProfile: InvestmentProfile = {
    horizon,
    fundCount,
    amount,
    frequency,
  }

  const { candidates, isScanning, progress, total } = useBanker(
    schemes ?? [],
    riskProfile,
    investProfile,
    fundCount * 3, // fetch 3x candidates so we can pick top N
  )

  const topPicks = candidates
    .filter(c => c.status === 'ready')
    .sort((a, b) => b.score - a.score)
    .slice(0, fundCount)

  const { title, desc } = PROFILE_LABELS[riskProfile]
  const insights = INSIGHTS[riskProfile]

  function startScan() {
    setStep('scan')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-[16px] font-bold text-foreground flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"
            style={{ boxShadow: '0 0 8px var(--primary)' }} />
          Personal Banker
        </h2>
        <p className="text-[11px] text-muted-foreground mt-1">
          AI-powered fund discovery engine · Experimental · Tailored to you
        </p>
      </div>

      {/* ── QUESTIONNAIRE ───────────────────────────────────────────────────── */}
      {step !== 'scan' && (
        <>
          {/* Step 1: Risk Profile */}
          <div className="border border-border rounded-lg p-5 bg-card space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold bg-primary/15 text-primary px-2 py-0.5 rounded-full">STEP 1</span>
              <p className="text-[13px] font-semibold text-foreground">What's your risk appetite?</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {PROFILES.map(p => (
                <button
                  key={p}
                  onClick={() => setRiskProfile(p)}
                  className={`text-center px-4 py-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                    riskProfile === p
                      ? 'bg-primary/10 border-primary/40 text-primary ring-1 ring-primary/30'
                      : 'border-border text-muted-foreground hover:border-primary/20 hover:text-foreground'
                  }`}
                >
                  <span className="block text-[13px] font-semibold">{p}</span>
                  <span className="block text-[10px] mt-1 opacity-70">
                    {p === 'Conservative' ? 'Sleep well' : p === 'Moderate' ? 'Steady growth' : 'High returns'}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-primary font-medium">{title}</span>
              <span className="text-muted-foreground">— {desc}</span>
            </div>
          </div>

          {/* Step 2: Investment Questions */}
          <div className="border border-border rounded-lg p-5 bg-card space-y-5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold bg-primary/15 text-primary px-2 py-0.5 rounded-full">STEP 2</span>
              <p className="text-[13px] font-semibold text-foreground">Tell me about your investment plan</p>
            </div>

            {/* Horizon */}
            <div>
              <p className="text-[11px] font-medium text-foreground mb-2">
                How long do you plan to invest?
              </p>
              <div className="flex flex-wrap gap-2">
                {HORIZONS.map(h => (
                  <button
                    key={h.value}
                    onClick={() => setHorizon(h.value)}
                    className={`px-3.5 py-2 rounded-lg border text-left transition-all duration-150 cursor-pointer ${
                      horizon === h.value
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/20 hover:text-foreground'
                    }`}
                  >
                    <span className="block text-[12px] font-medium">{h.label}</span>
                    <span className="block text-[9px] opacity-60">{h.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fund Count */}
            <div>
              <p className="text-[11px] font-medium text-foreground mb-2">
                How many funds do you want to invest in?
              </p>
              <div className="flex flex-wrap gap-2">
                {FUND_COUNTS.map(n => (
                  <button
                    key={n}
                    onClick={() => setFundCount(n)}
                    className={`px-4 py-2 rounded-lg border transition-all duration-150 cursor-pointer ${
                      fundCount === n
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/20 hover:text-foreground'
                    }`}
                  >
                    <span className="text-[13px] font-semibold tabular-nums">{n}</span>
                    <span className="text-[10px] ml-1.5 opacity-60">
                      {n === 1 ? 'Concentrated' : n <= 3 ? 'Focused' : n <= 5 ? 'Balanced' : 'Diversified'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <p className="text-[11px] font-medium text-foreground mb-2">
                How much do you plan to invest?
              </p>
              <div className="flex flex-wrap gap-2">
                {AMOUNTS.map(a => (
                  <button
                    key={a.value}
                    onClick={() => setAmount(a.value)}
                    className={`px-4 py-2 rounded-lg border transition-all duration-150 cursor-pointer ${
                      amount === a.value
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/20 hover:text-foreground'
                    }`}
                  >
                    <span className="text-[13px] font-medium">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency */}
            <div>
              <p className="text-[11px] font-medium text-foreground mb-2">
                How often do you plan to invest?
              </p>
              <div className="flex flex-wrap gap-2">
                {FREQUENCIES.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setFrequency(f.value)}
                    className={`px-4 py-2 rounded-lg border transition-all duration-150 cursor-pointer ${
                      frequency === f.value
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/20 hover:text-foreground'
                    }`}
                  >
                    <span className="text-[13px] font-medium">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Launch button */}
          <button
            onClick={startScan}
            className="w-full py-4 rounded-lg font-semibold text-[14px] cursor-pointer transition-all duration-200
              bg-primary text-primary-foreground hover:opacity-90"
            style={{ boxShadow: '0 0 24px rgba(52, 211, 153, 0.2)' }}
          >
            Find My Funds →
          </button>
        </>
      )}

      {/* ── SCANNING & RESULTS ───────────────────────────────────────────────── */}
      {step === 'scan' && (
        <>
          {/* Summary of choices */}
          {!isScanning && topPicks.length > 0 && (
            <div className="flex flex-wrap gap-2 text-[10px]">
              {[
                `${riskProfile} risk`,
                `${horizon} horizon`,
                `${fundCount} funds`,
                `${frequency}`,
              ].map(tag => (
                <span key={tag} className="px-2 py-1 rounded-full border border-border text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Market snapshot */}
          {dashboard && (
            <div className="grid grid-cols-3 gap-2">
              {dashboard.indices.slice(0, 3).map(idx => {
                const pos = idx.change >= 0
                return (
                  <div key={idx.symbol} className="border border-border rounded-lg p-3 bg-card"
                    style={{ borderColor: pos ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)' }}>
                    <p className="text-[9px] text-muted-foreground uppercase">{idx.name}</p>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="font-mono text-sm font-bold text-foreground tabular-nums">
                        {idx.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                      <span className="font-mono text-[10px] tabular-nums"
                        style={{ color: pos ? 'var(--delta-positive)' : 'var(--delta-negative)' }}>
                        {pos ? '+' : ''}{idx.changePct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Scanning progress */}
          {isScanning && (
            <div className="border border-border rounded-lg p-5 bg-card space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                <span className="text-[12px] text-foreground font-medium">
                  Analyzing {total} funds across categories…
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%`, background: 'var(--primary)' }} />
              </div>
              <p className="text-[10px] text-muted-foreground text-right">{progress}%</p>
            </div>
          )}

          {/* Top Picks */}
          {topPicks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-[13px] font-semibold text-foreground">Your Personal Picks</p>
                <span className="text-[10px] text-muted-foreground">
                  Top {fundCount} · Scored for {horizon} horizon
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {topPicks.map(({ scheme, stats, score }, idx) => {
                  const scoreColor = score >= 80 ? 'var(--delta-positive)'
                    : score >= 60 ? 'var(--primary)' : 'var(--muted-foreground)'
                  return (
                    <button
                      key={scheme.schemeCode}
                      onClick={() => navigate(`/fund/${scheme.schemeCode}`)}
                      className="border border-border rounded-lg p-4 bg-card text-left hover:border-primary/30 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          #{idx + 1} of {fundCount}
                        </span>
                        <span className="font-mono text-[11px] font-bold tabular-nums"
                          style={{ color: scoreColor }}>
                          {score}/100
                        </span>
                      </div>
                      <p className="text-[12px] font-medium text-foreground leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {scheme.schemeName.split(' — ')[0]}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
                          {scheme.category}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                          style={{
                            background:
                              scheme.risk === 'Low' ? 'var(--risk-low-bg)'
                              : scheme.risk === 'Moderate' ? 'var(--risk-mod-bg)'
                              : scheme.risk === 'High' ? 'var(--risk-high-bg)'
                              : 'var(--risk-vhigh-bg)',
                            color:
                              scheme.risk === 'Low' ? 'var(--risk-low-fg)'
                              : scheme.risk === 'Moderate' ? 'var(--risk-mod-fg)'
                              : scheme.risk === 'High' ? 'var(--risk-high-fg)'
                              : 'var(--risk-vhigh-fg)',
                          }}>
                          {scheme.risk}
                        </span>
                      </div>
                      {stats && (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-2 border-t border-border">
                          <div>
                            <span className="text-[9px] text-muted-foreground">1Y Return</span>
                            <span className="block font-mono text-[12px] font-semibold tabular-nums"
                              style={{ color: (stats.cagr1y ?? 0) >= 0 ? 'var(--delta-positive)' : 'var(--delta-negative)' }}>
                              {pct(stats.cagr1y)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-muted-foreground">Win Rate</span>
                            <span className="block font-mono text-[12px] font-semibold tabular-nums text-foreground">
                              {(stats.winRate * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-muted-foreground">Max DD</span>
                            <span className="block font-mono text-[12px] font-semibold tabular-nums"
                              style={{ color: 'var(--delta-negative)' }}>
                              {pct(stats.maxDrawdown)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-muted-foreground">Sortino</span>
                            <span className="block font-mono text-[12px] font-semibold tabular-nums text-foreground">
                              {num(stats.sortino)}
                            </span>
                          </div>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Insights */}
          <div className="border border-border rounded-lg p-4 bg-card">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Strategy · {riskProfile} · {horizon}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[10px] text-primary mt-0.5">◆</span>
                  <p className="text-[12px] text-foreground leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-center text-[10px] text-muted-foreground">
            Algorithmic scoring · Not financial advice · Data from mfapi.in
          </p>
        </>
      )}
    </div>
  )
}
