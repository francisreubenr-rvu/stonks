import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import RootLayout from '@/layouts/RootLayout'
import { PageSkeleton } from '@/components/PageSkeleton'

const LandingPage       = lazy(() => import('@/pages/LandingPage'))
const DashboardPage     = lazy(() => import('@/pages/DashboardPage'))
const FundsPage         = lazy(() => import('@/pages/FundsPage'))
const FundDetailPage    = lazy(() => import('@/pages/FundDetailPage'))
const IndicesPage       = lazy(() => import('@/pages/IndicesPage'))
const ComparePage       = lazy(() => import('@/pages/ComparePage'))
const SymbolDetailPage  = lazy(() => import('@/pages/SymbolDetailPage'))
const WatchlistPage     = lazy(() => import('@/pages/WatchlistPage'))
const PortfolioPage     = lazy(() => import('@/pages/PortfolioPage'))
const BankerPage        = lazy(() => import('@/pages/BankerPage'))
const AboutPage         = lazy(() => import('@/pages/AboutPage'))

export default function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<RootLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/funds"     element={<FundsPage />} />
          <Route path="/fund/:schemeCode" element={<FundDetailPage />} />
          <Route path="/indices"   element={<IndicesPage />} />
          <Route path="/compare"   element={<ComparePage />} />
          <Route path="/symbol/:symbolId" element={<SymbolDetailPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/banker"    element={<BankerPage />} />
          <Route path="/about"     element={<AboutPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
