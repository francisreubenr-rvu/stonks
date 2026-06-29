import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFundList, RISK_LABELS } from '@/hooks/useFundList'
import { useBanker } from '@/hooks/useBanker'
import { useDashboard } from '@/hooks/useDashboard'
import { PROFILE_LABELS, type BankerRisk, type InvestmentProfile } from '@/lib/banker'
import { oracleQuote, oracleWisdom, oracleSignOff, PRINCIPLES } from '@/lib/buffett'
import { getApiKey, setApiKey, clearApiKey, analyzePortfolio } from '@/api/deepseekClient'

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
  { value: '<1Y',  label: '< 1 Year' },
  { value: '1-3Y', label: '1 – 3 Years' },
  { value: '3-5Y', label: '3 – 5 Years' },
  { value: '5-10Y',label: '5 – 10 Years' },
  { value: '10Y+', label: '10+ Years' },
] as const

const FUND_COUNTS = [1, 2, 3, 5, 8, 12] as const

export default function BankerPage() {
  const navigate = useNavigate()
  const { data: schemes } = useFundList()
  const { data: dashboard } = useDashboard()
  const [step, setStep] = useState<'profile' | 'questions' | 'scan'>('profile')
  const [riskProfile, setRiskProfile] = useState<BankerRisk>('Moderate')
  const [horizon, setHorizon] = useState<string>('3-5Y')
  const [fundCount, setFundCount] = useState<number>(5)
  const [amount, setAmount] = useState('50000')
  const [frequency, setFrequency] = useState('Monthly')
  const [rescanKey, setRescanKey] = useState(0)
  const [deepseekKey, setDeepseekKey] = useState(getApiKey() ?? '')
  const [keySaved, setKeySaved] = useState(!!getApiKey())
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const quote = useMemo(() => oracleQuote(step === 'scan' ? 'patience' : 'value'), [step])

  const investProfile: InvestmentProfile = { horizon, fundCount, amount, frequency }
  const wisdom = useMemo(() => oracleWisdom(investProfile), [investProfile])
  const signOff = useMemo(() => oracleSignOff(), [])

  const { candidates, isScanning, progress, total } = useBanker(
    schemes ?? [], riskProfile, investProfile, Math.min(fundCount * 3, 18), rescanKey,
  )

  // topPicks is ALWAYS exactly fundCount items — enforced at every render
  const topPicks = candidates
    .slice() // defensive copy
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(fundCount, candidates.length))

  const { title, desc } = PROFILE_LABELS[riskProfile]

  function startScan() { setStep('scan') }

  // If scanning, show progress even while funds load
  if (step === 'scan' && (!schemes || schemes.length === 0)) {
    return (
      <div className="space-y-6">
        <div className="border border-border rounded-lg p-5 bg-card space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            <span className="text-[12px] text-foreground font-medium">
              Loading fund universe…
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with quote */}
      <div className="border border-border rounded-lg p-5 bg-card space-y-3"
        style={{ borderColor: 'rgba(52,211,153,0.15)' }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏛️</span>
          <div>
            <h2 className="text-[16px] font-bold text-foreground">The Oracle of Omaha</h2>
            <p className="text-[11px] text-muted-foreground">
              Investment philosophy of Warren E. Buffett · Value. Patience. Discipline.
            </p>
          </div>
        </div>
        <div className="pl-10 border-l-2 border-primary/30">
          <p className="text-[13px] italic text-foreground leading-relaxed">
            "{quote}"
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">{signOff}</p>
        </div>
      </div>

      {/* Market snapshot */}
      {dashboard && dashboard.indices && (
        <div className="grid grid-cols-3 gap-2">
          {(dashboard.indices ?? []).slice(0, 3).map(idx => {
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

      {/* ── QUESTIONNAIRE ───────────────────────────────────────────────────── */}
      {step !== 'scan' && (
        <>
          {/* Step 1: Risk Profile */}
          <div className="border border-border rounded-lg p-5 bg-card space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                STEP 1
              </span>
              <p className="text-[13px] font-semibold text-foreground">
                What is your tolerance for temporary market declines?
              </p>
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
                    {p === 'Conservative' ? 'Preserve capital'
                      : p === 'Moderate' ? 'Balanced approach'
                      : 'Maximize returns'}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              <span className="text-primary font-medium">{title}</span> — {desc}
            </p>
          </div>

          {/* Step 2: Investment Questions */}
          <div className="border border-border rounded-lg p-5 bg-card space-y-5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                STEP 2
              </span>
              <p className="text-[13px] font-semibold text-foreground">
                "Someone's sitting in the shade today because someone planted a tree long ago."
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium text-foreground mb-2">
                How long will this money stay invested?
              </p>
              <div className="flex flex-wrap gap-2">
                {HORIZONS.map(h => (
                  <button
                    key={h.value}
                    onClick={() => setHorizon(h.value)}
                    className={`px-3 py-2 rounded-lg border text-left transition-all duration-150 cursor-pointer ${
                      horizon === h.value
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/20 hover:text-foreground'
                    }`}
                  >
                    <span className="text-[12px] font-medium">{h.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-medium text-foreground mb-2">
                "Diversification is protection against ignorance." — How many funds?
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
                      {n === 1 ? 'Concentrated'
                        : n <= 3 ? 'Focused'
                        : n <= 5 ? 'Balanced'
                        : 'Diversified'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-medium text-foreground mb-2">
                How much do you plan to invest (₹)?
              </p>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full h-9 bg-muted border border-border rounded-lg px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <p className="text-[11px] font-medium text-foreground mb-2">
                Investment interval
              </p>
              <div className="flex gap-2">
                {['Monthly', 'Quarterly', 'Yearly', 'Lumpsum'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setFrequency(opt)}
                    className={`px-4 py-2 rounded-lg border transition-all duration-150 cursor-pointer text-[13px] font-medium ${
                      frequency === opt
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/20 hover:text-foreground'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-medium text-foreground mb-2">
                DeepSeek API key <span className="text-[10px] text-muted-foreground">(optional — AI analysis)</span>
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={deepseekKey}
                  onChange={e => setDeepseekKey(e.target.value)}
                  placeholder="sk-..."
                  className="flex-1 h-9 bg-muted border border-border rounded-lg px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
                {keySaved ? (
                  <button
                    onClick={() => { clearApiKey(); setDeepseekKey(''); setKeySaved(false); setAiAnalysis(null) }}
                    className="px-3 h-9 text-[12px] font-medium border border-border rounded-lg text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={() => { if (deepseekKey) { setApiKey(deepseekKey); setKeySaved(true) } }}
                    className="px-3 h-9 text-[12px] font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 cursor-pointer shrink-0"
                  >
                    Save
                  </button>
                )}
              </div>
              {keySaved && (
                <p className="text-[10px] text-primary mt-1">API key saved — AI analysis runs after scan</p>
              )}
            </div>
          </div>

          <button
            onClick={startScan}
            className="w-full py-4 rounded-lg font-semibold text-[14px] cursor-pointer transition-all duration-200
              bg-primary text-primary-foreground hover:opacity-90"
            style={{ boxShadow: '0 0 24px rgba(52, 211, 153, 0.2)' }}
          >
            Seek the Oracle's Counsel →
          </button>
        </>
      )}

      {/* ── SCANNING & RESULTS ───────────────────────────────────────────────── */}
      {step === 'scan' && (
        <>
          {!isScanning && topPicks.length > 0 && (
            <div className="flex flex-wrap gap-2 text-[10px]">
              {[riskProfile, horizon, `${fundCount} funds`, frequency].map(tag => (
                <span key={tag} className="px-2 py-1 rounded-full border border-border text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {isScanning && (
            <div className="border border-border rounded-lg p-5 bg-card space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                <span className="text-[12px] text-foreground font-medium">
                  The Oracle is analyzing {total} funds…
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%`, background: 'var(--primary)' }} />
              </div>
              <p className="text-[10px] text-muted-foreground text-right">{progress}%</p>
            </div>
          )}

          {/* Show results as soon as they appear */}
          {topPicks.length > 0 && (
            <div className={isScanning ? 'opacity-90' : ''}>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-foreground">
                    The Oracle's Picks
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    Scored by Buffett's principles
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {topPicks.map(({ scheme, stats, score, reasoning }, idx) => {
                    const scoreColor = score >= 70 ? 'var(--delta-positive)'
                      : score >= 55 ? 'var(--primary)' : 'var(--muted-foreground)'
                    return (
                      <button
                        key={scheme.c}
                        onClick={() => navigate(`/fund/${scheme.c}`)}
                        className="border border-border rounded-lg p-4 bg-card text-left hover:border-primary/30 transition-all duration-200 cursor-pointer group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            #{idx + 1} of {fundCount}
                          </span>
                          <span className="font-mono text-[11px] font-bold tabular-nums"
                            style={{ color: scoreColor }}>
                            {score.toFixed(1)}/100
                          </span>
                        </div>
                        <p className="text-[12px] font-medium text-foreground leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
                          {scheme.n.split(' — ')[0]}
                        </p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
                            {scheme.g}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                            style={{
                              background: scheme.r === 0 ? 'var(--risk-low-bg)'
                                : scheme.r === 1 ? 'var(--risk-mod-bg)'
                                : scheme.r === 2 ? 'var(--risk-high-bg)'
                                : 'var(--risk-vhigh-bg)',
                              color: scheme.r === 0 ? 'var(--risk-low-fg)'
                                : scheme.r === 1 ? 'var(--risk-mod-fg)'
                                : scheme.r === 2 ? 'var(--risk-high-fg)'
                                : 'var(--risk-vhigh-fg)',
                            }}>
                            {RISK_LABELS[scheme.r]}
                          </span>
                        </div>
                        {reasoning.length > 0 && (
                          <div className="text-[9px] text-muted-foreground italic border-t border-border pt-2 mt-1">
                            {reasoning.map((r, i) => (
                              <p key={i}>◆ {r}</p>
                            ))}
                          </div>
                        )}
                        {stats && (
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-2 border-t border-border mt-2">
                            <div>
                              <span className="text-[9px] text-muted-foreground">1Y Return</span>
                              <span className="block font-mono text-[12px] font-semibold tabular-nums"
                                style={{ color: (stats.cagr1y ?? 0) >= 0 ? 'var(--delta-positive)' : 'var(--delta-negative)' }}>
                                {pct(stats.cagr1y)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] text-muted-foreground">Score</span>
                              <span className="block font-mono text-[12px] font-semibold tabular-nums text-foreground">
                                {num(stats.sortino)}
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
                              <span className="text-[9px] text-muted-foreground">Win Rate</span>
                              <span className="block font-mono text-[12px] font-semibold tabular-nums text-foreground">
                                {(stats.winRate * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Principles panel */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-foreground">The Oracle's Principles</p>
                <div className="space-y-2">
                  {PRINCIPLES.slice(0, 5).map((p, i) => (
                    <div key={i} className="border border-border rounded-lg p-3 bg-card space-y-1"
                      style={{ borderColor: 'rgba(52,211,153,0.1)' }}>
                      <p className="text-[11px] font-medium text-primary">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground italic">"{p.quote}"</p>
                      <p className="text-[9px] text-muted-foreground leading-relaxed">{p.rule}</p>
                    </div>
                  ))}
                </div>

                {/* Oracle's critique */}
                {wisdom.length > 0 && (
                  <div className="border border-border rounded-lg p-3 bg-card space-y-2"
                    style={{ borderColor: 'rgba(52,211,153,0.2)' }}>
                    <p className="text-[10px] font-medium text-primary uppercase tracking-wider">
                      The Oracle Observes
                    </p>
                    {wisdom.map((w, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-[9px] text-primary mt-0.5">◆</span>
                        <p className="text-[10px] text-foreground leading-relaxed">{w}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </div>
            )}

            {aiAnalysis && (
              <div className="border border-border rounded-lg p-4 bg-card mt-4"
                style={{ borderColor: 'rgba(52,211,153,0.2)' }}>
                <p className="text-[10px] font-medium text-primary uppercase tracking-wider mb-2">
                  🤖 DeepSeek Analysis
                </p>
                <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-wrap">
                  {aiAnalysis}
                </p>
              </div>
            )}

            {keySaved && !aiAnalysis && !isScanning && topPicks.length > 0 && (
              <div className="text-center pt-1">
                <button
                  onClick={async () => {
                    setAiLoading(true)
                    try {
                      const funds = topPicks.map(p => ({
                        name: p.scheme.n.split(' — ')[0],
                        score: p.score,
                        category: p.scheme.g,
                      }))
                      const analysis = await analyzePortfolio(funds, investProfile)
                      setAiAnalysis(analysis)
                    } catch (e: any) {
                      setAiAnalysis(`Analysis unavailable: ${e.message}`)
                    } finally {
                      setAiLoading(false)
                    }
                  }}
                  disabled={aiLoading}
                  className="px-6 py-2 rounded-lg border border-primary/30 text-[12px] font-medium text-primary hover:bg-primary/5 transition-all duration-200 cursor-pointer disabled:opacity-50"
                >
                  {aiLoading ? 'Analyzing…' : '🤖 Run AI Analysis'}
                </button>
              </div>
            )}

            <p className="text-center text-[10px] text-muted-foreground pt-2">
              Algorithmic interpretation · Not financial advice
            </p>

          {!isScanning && topPicks.length > 0 && (
            <div className="text-center pt-1">
              <button
                onClick={() => setRescanKey(k => k + 1)}
                className="px-6 py-2 rounded-lg border border-border text-[12px] font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-200 cursor-pointer"
              >
                ↻ Re-scan
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
