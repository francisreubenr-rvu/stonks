import { useState, useEffect, useCallback, useRef } from 'react'
import type { LightFund } from '@/hooks/useFundList'
import type { FundStats } from '@/api/dataTypes'
import { cacheGet, cacheSet, cacheKey } from '@/lib/cache'
import { fetchFundDetail } from '@/api/mfapiClient'
import { computeStats } from '@/lib/fundStats'
import { filterByProfile, type BankerRisk, type InvestmentProfile } from '@/lib/banker'
import { buffettScore, stonksScore } from '@/lib/buffett'

const BATCH_SIZE = 5
const STATS_TTL = 86_400_000

async function getCached(code: number): Promise<FundStats | null> {
  return cacheGet<FundStats>(cacheKey(['fstat', String(code)]))
}

async function fetchAndCache(code: number): Promise<FundStats | null> {
  const detail = await fetchFundDetail(String(code))
  const stats = computeStats(detail.data)
  if (stats) cacheSet(cacheKey(['fstat', String(code)]), stats, STATS_TTL)
  return stats
}

interface ScoredFund {
  scheme: LightFund
  stats: FundStats | null
  score: number
  reasoning: string[]
}

export function useBanker(
  schemes: LightFund[],
  profile: BankerRisk,
  investProfile: InvestmentProfile,
  scanCount = 15,
  rescanKey = 0,
  enabled = false,
) {
  const [candidates, setCandidates] = useState<ScoredFund[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const scanningRef = useRef(false)
  const versionRef = useRef(0)
  const investProfileRef = useRef(investProfile)
  investProfileRef.current = investProfile
  // Read the fund list via a ref so scan()'s identity — and therefore the
  // trigger effect below — doesn't churn every time React Query hands back a
  // fresh array reference for the same data. A background refetch used to
  // restart a full scan mid-flight, discarding in-progress batch fetches.
  const schemesRef = useRef(schemes)
  schemesRef.current = schemes

  const scan = useCallback(() => {
    const allSchemes = schemesRef.current
    if (allSchemes.length === 0) return
    const profileInputs = investProfileRef.current
    scanningRef.current = true
    setIsScanning(true)
    setProgress(0)

    versionRef.current += 1
    const version = versionRef.current

    const eligible = filterByProfile(allSchemes, profile)
    const byCategory = new Map<string, LightFund[]>()
    for (const s of eligible) {
      const list = byCategory.get(s.g) || []
      list.push(s)
      byCategory.set(s.g, list)
    }

    const cats = Array.from(byCategory.keys()).sort((a, b) =>
      (byCategory.get(b)?.length ?? 0) - (byCategory.get(a)?.length ?? 0))

    // Deterministic pre-selection, two passes:
    //  1) breadth — the best fund (by stats-free Buffett pre-score) from each
    //     category, so the shortlist spans styles;
    //  2) backfill — if eligible categories < scanCount, top up with the
    //     next-best remaining funds across ALL categories by pre-score, so a
    //     strong category's 2nd-best can still make the cut and the scan
    //     never silently returns fewer candidates than requested.
    // No randomness — same inputs must yield the same shortlist.
    const preScore = (f: LightFund) => buffettScore(f, null, profileInputs).score
    const rankedByCategory = new Map<string, LightFund[]>()
    for (const cat of cats) {
      rankedByCategory.set(cat, [...(byCategory.get(cat) ?? [])].sort((a, b) => preScore(b) - preScore(a)))
    }

    const final: LightFund[] = []
    const taken = new Set<number>()
    for (const cat of cats) {
      const best = rankedByCategory.get(cat)?.[0]
      if (!best) continue
      final.push(best)
      taken.add(best.c)
      if (final.length >= scanCount) break
    }

    if (final.length < scanCount) {
      const rest = eligible
        .filter(f => !taken.has(f.c))
        .sort((a, b) => preScore(b) - preScore(a))
      for (const f of rest) {
        final.push(f)
        if (final.length >= scanCount) break
      }
    }

    // Show baseline immediately
    const initial: ScoredFund[] = final.map(s => {
      const { reasoning } = buffettScore(s, null, profileInputs)
      const score = stonksScore(s, null, profileInputs)
      return { scheme: s, stats: null, score, reasoning }
    })
    if (version !== versionRef.current) return
    setCandidates(initial)
    setProgress(5)

    // Load cache and fetch in parallel
    ;(async () => {
      const codes = final.map(f => f.c)

      // Phase A: check cache for all candidates in parallel
      const cacheResults = await Promise.allSettled(codes.map(getCached))
      if (version !== versionRef.current) return
      const cachedMap = new Map<number, FundStats>()
      const needFetch: number[] = []

      cacheResults.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value) {
          cachedMap.set(codes[i], r.value)
        } else {
          needFetch.push(codes[i])
        }
      })

      // Update with cached stats
      if (cachedMap.size > 0) {
        if (version !== versionRef.current) return
        setCandidates(prev => prev.map(c => {
          const s = cachedMap.get(c.scheme.c)
          if (s) {
            const sScore = stonksScore(c.scheme, s, profileInputs)
            const { reasoning } = buffettScore(c.scheme, s, profileInputs)
            return { ...c, stats: s, score: sScore, reasoning }
          }
          return c
        }))
      }
      setProgress(15)

      // Phase B: fetch missing in parallel batches
      for (let i = 0; i < needFetch.length; i += BATCH_SIZE) {
        if (version !== versionRef.current) return
        const batch = needFetch.slice(i, i + BATCH_SIZE)

        const results = await Promise.allSettled(
          batch.map(code => fetchAndCache(code))
        )
        if (version !== versionRef.current) return

        const fetched = new Map<number, FundStats>()
        results.forEach((r, j) => {
          if (r.status === 'fulfilled' && r.value) fetched.set(batch[j], r.value)
        })

        if (fetched.size > 0) {
          setCandidates(prev => prev.map(c => {
            const s = fetched.get(c.scheme.c)
            if (s) {
              const sScore = stonksScore(c.scheme, s, profileInputs)
              const { reasoning } = buffettScore(c.scheme, s, profileInputs)
              return { ...c, stats: s, score: sScore, reasoning }
            }
            return c
          }))
        }

        // Count the batch just completed (i + batch.length), not its start
        // index, so the bar doesn't lag a full batch behind reality.
        setProgress(Math.round(15 + ((i + batch.length) / needFetch.length) * 85))
      }

      if (version !== versionRef.current) return
      setIsScanning(false)
      setProgress(100)
      scanningRef.current = false
    })()
  }, [profile, scanCount])

  // Keyed on schemes.length (a stable primitive), not the array reference —
  // scans restart only when the fund universe actually changes size, the
  // profile/scan settings change, or the user explicitly rescans.
  useEffect(() => {
    if (!enabled || schemes.length === 0) return
    scanningRef.current = false
    setIsScanning(false)
    setCandidates([])
    setProgress(0)
    scan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, schemes.length, profile, scanCount, rescanKey, scan])

  return {
    candidates: candidates.slice(0, scanCount).sort((a, b) => b.score - a.score),
    isScanning,
    progress,
    total: candidates.length,
  }
}
