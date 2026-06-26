import type { NavPoint, FundStats } from '@/api/dataTypes'

const RISK_FREE = 0.065  // 6.5% annualised
const TRADING_DAYS = 252

function parseNavDate(d: string): Date {
  // "DD-MM-YYYY"
  const [dd, mm, yyyy] = d.split('-').map(Number)
  return new Date(yyyy, mm - 1, dd)
}

function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 86_400_000)
}

function navAtDaysAgo(data: NavPoint[], daysAgo: number): number | null {
  if (data.length === 0) return null
  const target = new Date(parseNavDate(data[data.length - 1].date).getTime() - daysAgo * 86_400_000)
  // find closest point at or before target
  let best: NavPoint | null = null
  for (const p of data) {
    const d = parseNavDate(p.date)
    if (d <= target) best = p
    else break
  }
  return best ? best.nav : null
}

function cagr(end: number, start: number, years: number): number {
  if (start <= 0 || years <= 0) return 0
  return Math.pow(end / start, 1 / years) - 1
}

function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function std(arr: number[], avg: number): number {
  const variance = arr.reduce((s, v) => s + (v - avg) ** 2, 0) / arr.length
  return Math.sqrt(variance)
}

export function computeYearlyReturns(data: NavPoint[]): { year: number; return: number }[] {
  const byYear = new Map<number, NavPoint[]>()
  for (const p of data) {
    const [, , yyyy] = p.date.split('-')
    const year = parseInt(yyyy)
    if (isNaN(year)) continue
    const entry = byYear.get(year)
    if (!entry) byYear.set(year, [p])
    else entry.push(p)
  }

  const results: { year: number; return: number }[] = []
  for (const [year, points] of byYear) {
    if (points.length < 2) continue
    const firstNav = points[0].nav
    const lastNav = points[points.length - 1].nav
    if (firstNav <= 0) continue
    results.push({ year, return: (lastNav - firstNav) / firstNav })
  }

  results.sort((a, b) => a.year - b.year)
  return results
}

export function computeStats(data: NavPoint[]): FundStats {
  const n = data.length
  const currentNav = data[n - 1].nav
  const inceptionNav = data[0].nav

  const totalDays = n > 1 ? daysBetween(parseNavDate(data[0].date), parseNavDate(data[n - 1].date)) : 0
  const totalYears = totalDays / 365.25

  // ── CAGR ─────────────────────────────────────────────────────────────────
  const nav1m  = navAtDaysAgo(data, 30)
  const nav3m  = navAtDaysAgo(data, 91)
  const nav6m  = navAtDaysAgo(data, 182)
  const nav1y  = navAtDaysAgo(data, 365)
  const nav3y  = navAtDaysAgo(data, 1095)
  const nav5y  = navAtDaysAgo(data, 1826)

  const cagr1m  = nav1m  ? cagr(currentNav, nav1m,  1/12) : null
  const cagr3m  = nav3m  ? cagr(currentNav, nav3m,  3/12) : null
  const cagr6m  = nav6m  ? cagr(currentNav, nav6m,  6/12) : null
  const cagr1y  = nav1y  ? cagr(currentNav, nav1y,  1)    : null
  const cagr3y  = nav3y  ? cagr(currentNav, nav3y,  3)    : null
  const cagr5y  = nav5y  ? cagr(currentNav, nav5y,  5)    : null
  const cagrInception = totalYears > 0.1 ? cagr(currentNav, inceptionNav, totalYears) : null

  // ── Daily returns ─────────────────────────────────────────────────────────
  const dailyReturns: number[] = []
  for (let i = 1; i < n; i++) {
    dailyReturns.push((data[i].nav - data[i - 1].nav) / data[i - 1].nav)
  }

  let annualizedVol: number | null = null
  let sharpe: number | null = null
  let sortino: number | null = null

  if (dailyReturns.length >= 20) {
    const avgDaily = mean(dailyReturns)
    const volDaily = std(dailyReturns, avgDaily)
    annualizedVol = volDaily * Math.sqrt(TRADING_DAYS)

    if (cagr1y !== null && annualizedVol > 0) {
      sharpe = (cagr1y - RISK_FREE) / annualizedVol
      const downside = dailyReturns.filter(r => r < 0)
      const downsideVol = downside.length > 0
        ? std(downside, 0) * Math.sqrt(TRADING_DAYS)
        : 0
      sortino = downsideVol > 0 ? (cagr1y - RISK_FREE) / downsideVol : null
    }
  }

  // ── Max drawdown ──────────────────────────────────────────────────────────
  let peak = data[0].nav
  let peakIdx = 0
  let maxDD = 0
  let maxDDStart = 0
  let maxDDEnd = 0

  for (let i = 1; i < n; i++) {
    if (data[i].nav > peak) {
      peak = data[i].nav
      peakIdx = i
    }
    const dd = (data[i].nav - peak) / peak
    if (dd < maxDD) {
      maxDD = dd
      maxDDStart = peakIdx
      maxDDEnd = i
    }
  }

  const maxDrawdownDurationDays = maxDDStart < maxDDEnd
    ? daysBetween(parseNavDate(data[maxDDStart].date), parseNavDate(data[maxDDEnd].date))
    : 0

  // Recovery: find first point after trough that exceeds the peak
  let recoveryDays: number | null = null
  const troughNav = data[maxDDEnd]?.nav ?? 0
  const peakNav = data[maxDDStart]?.nav ?? 0
  if (troughNav > 0 && maxDDEnd < n - 1) {
    for (let i = maxDDEnd + 1; i < n; i++) {
      if (data[i].nav >= peakNav) {
        recoveryDays = daysBetween(
          parseNavDate(data[maxDDEnd].date),
          parseNavDate(data[i].date)
        )
        break
      }
    }
  }

  // ── Monthly returns ───────────────────────────────────────────────────────
  // Bucket data by month, take first and last NAV in each month
  const byMonth = new Map<string, { first: number; last: number }>()
  for (const p of data) {
    const [, mm, yyyy] = p.date.split('-')
    const key = `${yyyy}-${mm}`
    const entry = byMonth.get(key)
    if (!entry) byMonth.set(key, { first: p.nav, last: p.nav })
    else entry.last = p.nav
  }

  const monthlyReturns: number[] = []
  for (const { first, last } of byMonth.values()) {
    if (first > 0) monthlyReturns.push((last - first) / first)
  }

  const positiveMonths = monthlyReturns.filter(r => r > 0).length
  const negativeMonths = monthlyReturns.filter(r => r < 0).length
  const winRate = monthlyReturns.length > 0 ? positiveMonths / monthlyReturns.length : 0
  const bestMonth = monthlyReturns.length > 0 ? Math.max(...monthlyReturns) : 0
  const worstMonth = monthlyReturns.length > 0 ? Math.min(...monthlyReturns) : 0
  const avgMonthlyReturn = monthlyReturns.length > 0 ? mean(monthlyReturns) : 0

  // ── Rolling 1Y returns (two-pointer sliding window, O(n)) ──────────────
  const rolling1y: number[] = []
  let left = 0
  for (let i = 0; i < n; i++) {
    const target = parseNavDate(data[i].date).getTime() - 365 * 86_400_000
    while (left < i && parseNavDate(data[left].date).getTime() < target) left++
    if (left < i && data[left].nav > 0) {
      rolling1y.push(cagr(data[i].nav, data[left].nav, 1))
    }
  }

  return {
    currentNav,
    inceptionNav,
    dataPoints: n,
    cagr1m,  cagr3m,  cagr6m,
    cagr1y,  cagr3y,  cagr5y,
    cagrInception,
    annualizedVol,
    maxDrawdown: maxDD,
    maxDrawdownDurationDays,
    recoveryDays,
    sharpe,
    sortino,
    positiveMonths,
    negativeMonths,
    winRate,
    bestMonth,
    worstMonth,
    avgMonthlyReturn,
    rolling1yMin: rolling1y.length > 0 ? Math.min(...rolling1y) : null,
    rolling1yMax: rolling1y.length > 0 ? Math.max(...rolling1y) : null,
    rolling1yAvg: rolling1y.length > 0 ? mean(rolling1y) : null,
  }
}
