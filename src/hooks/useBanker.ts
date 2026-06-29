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

async function fetchAndCache(code: number): Promise<FundStats> {
  const detail = await fetchFundDetail(String(code))
  const stats = computeStats(detail.data)
  cacheSet(cacheKey(['fstat', String(code)]), stats, STATS_TTL)
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

  const scan = useCallback(() => {
    if (schemes.length === 0) return
    const profileInputs = investProfileRef.current
    scanningRef.current = true
    setIsScanning(true)
    setProgress(0)

    versionRef.current += 1
    const version = versionRef.current

    const eligible = filterByProfile(schemes, profile)
    const byCategory = new Map<string, LightFund[]>()
    for (const s of eligible) {
      const list = byCategory.get(s.g) || []
      list.push(s)
      byCategory.set(s.g, list)
    }

    const cats = Array.from(byCategory.keys()).sort((a, b) =>
      (byCategory.get(b)?.length ?? 0) - (byCategory.get(a)?.length ?? 0))

    const final: LightFund[] = []
    for (const cat of cats) {
      const funds = byCategory.get(cat) ?? []
      final.push(funds[Math.floor(Math.random() * Math.min(3, funds.length))])
      if (final.length >= scanCount) break
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
          if (r.status === 'fulfilled') fetched.set(batch[j], r.value)
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

        setProgress(Math.round(15 + (i / needFetch.length) * 85))
      }

      if (version !== versionRef.current) return
      setIsScanning(false)
      setProgress(100)
      scanningRef.current = false
    })()
  }, [schemes, profile, scanCount])

  useEffect(() => {
    if (!enabled || schemes.length === 0) return
    scanningRef.current = false
    setIsScanning(false)
    setCandidates([])
    setProgress(0)
    scan()
  }, [enabled, schemes, profile, scanCount, rescanKey, scan])

  return {
    candidates: candidates.slice(0, scanCount).sort((a, b) => b.score - a.score),
    isScanning,
    progress,
    total: candidates.length,
  }
}
