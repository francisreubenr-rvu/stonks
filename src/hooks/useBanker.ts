import { useState, useEffect, useCallback } from 'react'
import type { EnrichedScheme } from '@/hooks/useFundList'
import type { FundStats } from '@/api/dataTypes'
import { fetchFundDetail } from '@/api/mfapiClient'
import { computeStats } from '@/lib/fundStats'
import { filterByProfile, type BankerRisk, type InvestmentProfile } from '@/lib/banker'
import { buffettScore } from '@/lib/buffett'

interface ScoredFund {
  scheme: EnrichedScheme
  stats: FundStats | null
  score: number
  buffettScore: number
  reasoning: string[]
  status: 'pending' | 'loading' | 'ready' | 'error'
}

export function useBanker(schemes: EnrichedScheme[], profile: BankerRisk, investProfile: InvestmentProfile, topN = 12) {
  const [candidates, setCandidates] = useState<ScoredFund[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [progress, setProgress] = useState(0)

  const scan = useCallback(async () => {
    if (schemes.length === 0) return
    setIsScanning(true)
    setProgress(0)

    // Filter by risk profile
    const eligible = filterByProfile(schemes, profile)

    // Group by category and pick top candidates per category
    const byCategory = new Map<string, EnrichedScheme[]>()
    for (const s of eligible) {
      const list = byCategory.get(s.category) || []
      list.push(s)
      byCategory.set(s.category, list)
    }

    // Pick diverse candidates across categories
    const selected: EnrichedScheme[] = []
    const cats = Array.from(byCategory.keys()).sort((a, b) =>
      (byCategory.get(b)?.length ?? 0) - (byCategory.get(a)?.length ?? 0)
    )

    for (const cat of cats) {
      const funds = byCategory.get(cat) ?? []
      // Take 2 funds per category to get diversity
      const sampled = funds.slice(0, 2)
      selected.push(...sampled)
      if (selected.length >= topN * 2) break
    }

    const final = selected.slice(0, topN * 2)

    // Initialize scored list
    const initial: ScoredFund[] = final.map(s => ({
      scheme: s, stats: null, score: 50, buffettScore: 50, reasoning: [], status: 'pending',
    }))
    setCandidates(initial)

    // Fetch stats one by one
    for (let i = 0; i < final.length; i++) {
      setCandidates(prev => prev.map((c, j) =>
        j === i ? { ...c, status: 'loading' as const } : c
      ))

      try {
        const detail = await fetchFundDetail(final[i].schemeCode)
        const stats = computeStats(detail.data)
        const { score: bs, reasoning } = buffettScore(final[i], stats, investProfile)
        setCandidates(prev => prev.map((c, j) =>
          j === i
            ? { ...c, stats, score: bs, buffettScore: bs, reasoning, status: 'ready' as const }
            : c
        ))
      } catch {
        const { score: bs, reasoning } = buffettScore(final[i], null, investProfile)
        setCandidates(prev => prev.map((c, j) =>
          j === i
            ? { ...c, stats: null, score: bs, buffettScore: bs, reasoning, status: 'error' as const }
            : c
        ))
      }

      setProgress(Math.round(((i + 1) / final.length) * 100))
    }

    setIsScanning(false)
  }, [schemes, profile, investProfile, topN])

  useEffect(() => {
    if (schemes.length > 0) scan()
  }, [schemes, profile, scan])

  return {
    candidates: candidates.filter(c => c.status === 'ready' || c.status === 'error').sort((a, b) => b.score - a.score),
    isScanning,
    progress,
    scanning: candidates.filter(c => c.status === 'loading').length,
    total: candidates.length,
  }
}
