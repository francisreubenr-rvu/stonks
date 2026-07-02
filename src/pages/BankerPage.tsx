import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFundList, type LightFund } from '@/hooks/useFundList'
import { useBanker } from '@/hooks/useBanker'
import { useDashboard } from '@/hooks/useDashboard'
import { useSxEffects } from '@/hooks/useSxEffects'
import { PROFILE_LABELS, type BankerRisk, type InvestmentProfile } from '@/lib/banker'
import { oracleQuote, oracleWisdom, oracleSignOff, PRINCIPLES } from '@/lib/buffett'
import { commentOnPicks, NimUnavailableError } from '@/api/nimClient'
import { RiskBadge } from '@/components/RiskBadge'
import { SectionEyebrow } from '@/components/SectionEyebrow'

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
const EMPTY_SCHEMES: LightFund[] = []

function chipClass(active: boolean) {
  return `px-3 py-2 rounded-md border text-left transition-colors duration-150 cursor-pointer text-sm font-medium ${
    active
      ? 'bg-primary/10 border-primary text-primary'
      : 'border-border text-muted-foreground hover:border-[var(--border-strong)] hover:text-foreground'
  }`
}

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
  const [aiText, setAiText] = useState<string | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const rootRef = useSxEffects<HTMLDivElement>([step])

  const quote = useMemo(() => oracleQuote(step === 'scan' ? 'patience' : 'value'), [step])

  const investProfile = useMemo<InvestmentProfile>(
    () => ({ horizon, fundCount, amount, frequency }),
    [horizon, fundCount, amount, frequency],
  )
  const wisdom = useMemo(() => oracleWisdom(investProfile), [investProfile])
  const signOff = useMemo(() => oracleSignOff(), [])

  const { candidates, isScanning, progress, total, scannedCount } = useBanker(
    schemes ?? EMPTY_SCHEMES,
    riskProfile,
    investProfile,
    Math.min(fundCount * 3, 18),
    rescanKey,
    step === 'scan',
  )

  // topPicks: best-scoring funds with a category-diversity cap, so a cohort
  // where low-volatility debt categories rank well on drawdown/win-rate
  // percentiles can't sweep every slot. At most ceil(N/3) per category,
  // relaxed in a second pass if that leaves the list short.
  const topPicks = useMemo(() => {
    const sorted = [...candidates].sort((a, b) => b.score - a.score)
    const cap = Math.max(1, Math.ceil(fundCount / 3))
    const perCat = new Map<string, number>()
    const picks: typeof sorted = []
    for (const c of sorted) {
      if (picks.length >= fundCount) break
      const n = perCat.get(c.scheme.g) ?? 0
      if (n >= cap) continue
      perCat.set(c.scheme.g, n + 1)
      picks.push(c)
    }
    for (const c of sorted) {
      if (picks.length >= fundCount) break
      if (!picks.includes(c)) picks.push(c)
    }
    return picks
  }, [candidates, fundCount])

  const { title, desc } = PROFILE_LABELS[riskProfile]

  // New scan invalidates prior AI commentary — it described the old shortlist.
  function startScan() { setAiText(null); setStep('scan') }

  // If scanning, show progress even while funds load
  if (step === 'scan' && (!schemes || schemes.length === 0)) {
    return (
      <div className="space-y-6">
        <div className="border border-border rounded-lg p-5 bg-card space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-primary" style={{ animation: 'sxPulse 1.1s ease-in-out infinite' }} />
            <span className="text-sm text-foreground font-medium">
              Loading fund universe…
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="max-w-3xl">
      {/* Header with quote */}
      <div data-reveal className="border rounded-lg p-6 bg-card space-y-3 mb-6"
        style={{ borderColor: 'var(--primary-subtle)', background: 'linear-gradient(180deg, var(--primary-subtle), var(--card))' }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏛️</span>
          <div>
            <h1 className="text-lg font-semibold text-foreground">The Oracle of Omaha</h1>
            <p className="text-xs text-muted-foreground">
              Investment philosophy of Warren E. Buffett · Value. Patience. Discipline.
            </p>
          </div>
        </div>
        <div className="pl-4 border-l-2 border-primary/40">
          <p className="text-sm italic text-foreground leading-relaxed">
            "{quote}"
          </p>
          <p className="text-xs text-muted-foreground mt-1">{signOff}</p>
        </div>
      </div>

      {/* Market snapshot */}
      {dashboard && dashboard.indices && (
        <div data-reveal className="grid grid-cols-3 gap-3 mb-6">
          {(dashboard.indices ?? []).slice(0, 3).map(idx => {
            const pos = idx.change >= 0
            return (
              <div key={idx.symbol} className="border border-border rounded-lg p-3 bg-card">
                <p className="text-xs text-muted-foreground uppercase">{idx.name}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-mono text-sm font-semibold text-foreground tabular-nums">
                    {idx.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="font-mono text-xs tabular-nums"
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
          <div data-reveal className="mb-6">
            <SectionEyebrow eyebrow="Investment Advisor" title="Seek the Oracle's counsel" />
          </div>

          {/* Step 1: Risk Profile */}
          <div data-reveal className="border border-border rounded-lg p-5 bg-card space-y-4 mb-6">
            <p className="text-sm font-semibold text-foreground">
              What is your tolerance for temporary market declines?
            </p>
            <div className="grid grid-cols-3 gap-3">
              {PROFILES.map(p => (
                <button
                  key={p}
                  onClick={() => setRiskProfile(p)}
                  className={`text-center px-4 py-4 rounded-lg border transition-colors duration-150 cursor-pointer ${
                    riskProfile === p
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'border-border text-muted-foreground hover:border-[var(--border-strong)] hover:text-foreground'
                  }`}
                >
                  <span className="block text-sm font-semibold">{p}</span>
                  <span className="block text-xs mt-1 opacity-80">
                    {p === 'Conservative' ? 'Preserve capital'
                      : p === 'Moderate' ? 'Balanced approach'
                      : 'Maximize returns'}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-primary font-medium">{title}</span> — {desc}
            </p>
          </div>

          {/* Step 2: Investment Questions */}
          <div data-reveal className="border border-border rounded-lg p-5 bg-card space-y-5 mb-6">
            <p className="text-sm font-medium text-foreground italic">
              "Someone's sitting in the shade today because someone planted a tree long ago."
            </p>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">
                How long will this money stay invested?
              </p>
              <div className="flex flex-wrap gap-2">
                {HORIZONS.map(h => (
                  <button key={h.value} onClick={() => setHorizon(h.value)} className={chipClass(horizon === h.value)}>
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">
                "Diversification is protection against ignorance." — How many funds?
              </p>
              <div className="flex flex-wrap gap-2">
                {FUND_COUNTS.map(n => (
                  <button key={n} onClick={() => setFundCount(n)} className={chipClass(fundCount === n)}>
                    <span className="font-mono font-semibold tabular-nums">{n}</span>
                    <span className="ml-1.5 opacity-70 text-xs">
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
              <p className="text-sm font-medium text-foreground mb-2">
                How much do you plan to invest (₹)?
              </p>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full h-10 bg-muted border border-border rounded-md px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">
                Investment interval
              </p>
              <div className="flex gap-2">
                {['Monthly', 'Quarterly', 'Yearly', 'Lumpsum'].map(opt => (
                  <button key={opt} onClick={() => setFrequency(opt)} className={chipClass(frequency === opt)}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>

          </div>

          <button
            data-reveal
            onClick={startScan}
            className="w-full py-4 rounded-lg font-semibold text-sm cursor-pointer transition-colors duration-150
              bg-primary text-primary-foreground hover:bg-[var(--primary-hover)]"
          >
            Seek the Oracle's Counsel →
          </button>
        </>
      )}

      {/* ── SCANNING & RESULTS ───────────────────────────────────────────────── */}
      {step === 'scan' && (
        <>
          {topPicks.length > 0 && (
            <div data-reveal className="flex flex-wrap gap-2 text-xs mb-6">
              {[riskProfile, horizon, `${fundCount} funds`, frequency].map(tag => (
                <span key={tag} className="px-2.5 py-1 rounded-full border border-border text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {isScanning && (
            <div data-reveal className="border border-border rounded-lg p-5 bg-card space-y-3 mb-6">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-primary" style={{ animation: 'sxPulse 1.1s ease-in-out infinite' }} />
                <span className="text-sm text-foreground font-medium">
                  The Oracle is reading NAV histories — {scannedCount} funds examined, {total} scoreable…
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%`, background: 'var(--primary)' }} />
              </div>
              <p className="text-xs text-muted-foreground text-right">{progress}%</p>
            </div>
          )}

          {/* Show results as soon as they appear */}
          {topPicks.length > 0 && (
            <div className={isScanning ? 'opacity-90' : ''}>
              <div data-reveal className="space-y-3 mb-6">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    The Oracle's Picks
                  </p>
                  <span className="text-xs text-muted-foreground">
                    Growth plans only · scored against {total} scanned peers · established houses weighted
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
                        className="border border-border rounded-lg p-4 bg-card text-left hover:border-[var(--border-strong)] transition-colors duration-150 cursor-pointer group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            #{idx + 1} of {fundCount}
                          </span>
                          <span className="font-mono text-xs font-bold tabular-nums"
                            style={{ color: scoreColor }}>
                            {Math.min(100, score).toFixed(1)}/100
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
                          {scheme.n.split(' — ')[0]}
                        </p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                            {scheme.g}
                          </span>
                          <RiskBadge risk={scheme.r} />
                        </div>
                        {reasoning.length > 0 && (
                          <div className="text-xs text-muted-foreground italic border-t border-border pt-2 mt-1">
                            {reasoning.map((r, i) => (
                              <p key={i}>◆ {r}</p>
                            ))}
                          </div>
                        )}
                        {stats && (
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-2 border-t border-border mt-2">
                            <div>
                              <span className="text-xs text-muted-foreground">1Y Return</span>
                              <span className="block font-mono text-sm font-semibold tabular-nums"
                                style={{ color: (stats.cagr1y ?? 0) >= 0 ? 'var(--delta-positive)' : 'var(--delta-negative)' }}>
                                {pct(stats.cagr1y)}
                              </span>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">Sortino</span>
                              <span className="block font-mono text-sm font-semibold tabular-nums text-foreground">
                                {num(stats.sortino)}
                              </span>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">Max DD</span>
                              <span className="block font-mono text-sm font-semibold tabular-nums"
                                style={{ color: 'var(--delta-negative)' }}>
                                {pct(stats.maxDrawdown)}
                              </span>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">Win Rate</span>
                              <span className="block font-mono text-sm font-semibold tabular-nums text-foreground">
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
              <div data-reveal className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">The Oracle's Principles</p>
                  <div className="space-y-2">
                    {PRINCIPLES.slice(0, 5).map((p, i) => (
                      <div key={i} className="border border-border rounded-lg p-3 bg-card space-y-1">
                        <p className="text-sm font-medium text-primary">{p.name}</p>
                        <p className="text-xs text-muted-foreground italic">"{p.quote}"</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{p.rule}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Oracle's critique */}
                {wisdom.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">The Oracle Observes</p>
                    <div className="border border-border rounded-lg p-4 bg-card space-y-2">
                      {wisdom.map((w, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-xs text-primary mt-0.5">◆</span>
                          <p className="text-sm text-foreground leading-relaxed">{w}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Optional AI commentary — narrates the real computed numbers via
                  the NIM proxy (key lives as a Worker secret, never client-side). */}
              {!isScanning && topPicks.length > 0 && (
                <div className="mb-6">
                  {aiText ? (
                    <div data-reveal className="border border-border rounded-lg p-4 bg-card">
                      <p className="text-xs font-medium text-primary uppercase tracking-wider mb-2">
                        Oracle's Commentary
                      </p>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{aiText}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <button
                        disabled={aiBusy}
                        onClick={async () => {
                          setAiBusy(true)
                          try {
                            const text = await commentOnPicks(
                              topPicks.map(p => ({
                                name: p.scheme.n.split(' - ')[0],
                                category: p.scheme.g,
                                score: p.score,
                                cagr1y: p.stats.cagr1y,
                                sortino: p.stats.sortino,
                                maxDrawdown: p.stats.maxDrawdown,
                                winRate: p.stats.winRate,
                              })),
                              { risk: riskProfile, horizon, fundCount, frequency },
                            )
                            setAiText(text)
                          } catch (e) {
                            setAiText(
                              e instanceof NimUnavailableError
                                ? 'AI commentary is not configured — set NIM_API_KEY on the proxy worker to enable it.'
                                : `Commentary unavailable: ${e instanceof Error ? e.message : 'unknown error'}`,
                            )
                          } finally {
                            setAiBusy(false)
                          }
                        }}
                        className="px-6 py-2 rounded-md border border-primary/40 text-sm font-medium text-primary hover:bg-primary/5 transition-colors duration-150 cursor-pointer disabled:opacity-50"
                      >
                        {aiBusy ? 'Reading the numbers…' : "Get the Oracle's commentary"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <p className="text-center text-xs text-muted-foreground pt-2">
                Algorithmic interpretation · Not financial advice
              </p>

              {topPicks.length > 0 && (
                <div className="text-center pt-1">
                  <button
                    onClick={() => { setAiText(null); setRescanKey(k => k + 1) }}
                    className="px-6 py-2 rounded-md border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-[var(--border-strong)] transition-colors duration-150 cursor-pointer"
                  >
                    ↻ Re-scan
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
