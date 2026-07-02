import { useState, useEffect, useCallback, useRef } from 'react'
import type { LightFund } from '@/hooks/useFundList'
import type { FundStats } from '@/api/dataTypes'
import { cacheGet, cacheSet, cacheKey } from '@/lib/cache'
import { fetchFundDetail } from '@/api/mfapiClient'
import { computeStats } from '@/lib/fundStats'
import { filterByProfile, type BankerRisk, type InvestmentProfile } from '@/lib/banker'
import { scoreCohort, isGrowthPlan, dedupePlans, type Candidate, type ScoredCandidate } from '@/lib/bankerScore'
import { amcTier } from '@/lib/amc'

// ─────────────────────────────────────────────────────────────────────────────
//  Banker scan pipeline (redesigned).
//
//  The old pipeline evaluated ~15 funds picked by a stats-free score that
//  tied within category — effectively alphabetical order — and scored them
//  against fixed thresholds that saturated at 100. Good funds never even
//  entered the race.
//
//  New funnel:
//   1. ELIGIBLE   risk-tier match → growth plans only (IDCW NAVs lie) →
//                 Direct/Regular twins collapsed (prefer Direct)
//   2. POOL       up to POOL_SIZE candidates spread across categories,
//                 prioritized by AMC reputation tier — deterministic
//   3. EVIDENCE   full NAV history fetched per candidate (IndexedDB-cached),
//                 minimum 1 year of data to be scoreable
//   4. SCORE      cohort-relative percentile scoring, horizon-aware windows
// ─────────────────────────────────────────────────────────────────────────────

const BATCH_SIZE = 5
const POOL_SIZE = 42
const MIN_HISTORY_DAYS = 250 // ≈1 trading year — less is noise, not evidence
const STATS_TTL = 86_400_000

async function getStats(code: number): Promise<FundStats | null> {
  const key = cacheKey(['fstat', String(code)])
  const cached = await cacheGet<FundStats>(key)
  if (cached) return cached
  const detail = await fetchFundDetail(String(code))
  const stats = computeStats(detail.data)
  if (stats) cacheSet(key, stats, STATS_TTL)
  return stats
}

export type ScoredFund = ScoredCandidate

export function useBanker(
  schemes: LightFund[],
  profile: BankerRisk,
  investProfile: InvestmentProfile,
  scanCount = 15, // retained for API compatibility; the pool is larger
  rescanKey = 0,
  enabled = false,
) {
  const [candidates, setCandidates] = useState<ScoredFund[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [scannedCount, setScannedCount] = useState(0)
  const versionRef = useRef(0)
  const investProfileRef = useRef(investProfile)
  investProfileRef.current = investProfile
  const schemesRef = useRef(schemes)
  schemesRef.current = schemes

  const scan = useCallback(() => {
    const allSchemes = schemesRef.current
    if (allSchemes.length === 0) return
    const { horizon } = investProfileRef.current
    setIsScanning(true)
    setProgress(0)
    setScannedCount(0)

    versionRef.current += 1
    const version = versionRef.current

    // 1. ELIGIBLE — risk match, growth plans only, plan twins collapsed
    const eligible = dedupePlans(
      filterByProfile(allSchemes, profile).filter(f => isGrowthPlan(f.n)),
    )

    // 2. POOL — spread across categories; within a category, established
    //    houses first, then scheme code DESC (a deterministic spread that
    //    doesn't collapse into alphabetical order the way name-sort did).
    const byCategory = new Map<string, LightFund[]>()
    for (const f of eligible) {
      const list = byCategory.get(f.g) ?? []
      list.push(f)
      byCategory.set(f.g, list)
    }
    const cats = [...byCategory.keys()].sort()
    const perCat = Math.max(2, Math.ceil(POOL_SIZE / Math.max(1, cats.length)))
    const pool: LightFund[] = []
    for (const cat of cats) {
      const ranked = (byCategory.get(cat) ?? []).sort((a, b) =>
        amcTier(a.n) - amcTier(b.n) || b.c - a.c)
      pool.push(...ranked.slice(0, perCat))
    }
    const finalPool = pool.slice(0, POOL_SIZE)

    ;(async () => {
      // 3. EVIDENCE — batched, cache-first
      const gathered: Candidate[] = []
      for (let i = 0; i < finalPool.length; i += BATCH_SIZE) {
        if (version !== versionRef.current) return
        const batch = finalPool.slice(i, i + BATCH_SIZE)
        const results = await Promise.allSettled(batch.map(f => getStats(f.c)))
        if (version !== versionRef.current) return

        results.forEach((r, j) => {
          if (r.status === 'fulfilled' && r.value && r.value.dataPoints >= MIN_HISTORY_DAYS) {
            gathered.push({ scheme: batch[j], stats: r.value })
          }
        })

        // 4. SCORE — re-rank the cohort gathered so far for live feedback;
        //    the final pass over the full cohort is what stands. Weights
        //    follow the investor's risk appetite.
        const scored = scoreCohort(gathered, horizon, profile).sort((a, b) => b.score - a.score)
        setCandidates(scored)
        setScannedCount(Math.min(i + batch.length, finalPool.length))
        setProgress(Math.round(((i + batch.length) / finalPool.length) * 100))
      }

      if (version !== versionRef.current) return
      setIsScanning(false)
      setProgress(100)
    })()
  }, [profile])

  useEffect(() => {
    if (!enabled || schemes.length === 0) return
    setIsScanning(false)
    setCandidates([])
    setProgress(0)
    scan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, schemes.length, profile, scanCount, rescanKey, scan])

  return {
    candidates,
    isScanning,
    progress,
    total: candidates.length,
    scannedCount,
  }
}
