import { Routes, Route } from 'react-router-dom'
import RootLayout from '@/layouts/RootLayout'
import LandingPage from '@/pages/LandingPage'
import DashboardPage from '@/pages/DashboardPage'
import FundsPage from '@/pages/FundsPage'
import FundDetailPage from '@/pages/FundDetailPage'
import IndicesPage from '@/pages/IndicesPage'
import ComparePage from '@/pages/ComparePage'
import SymbolDetailPage from '@/pages/SymbolDetailPage'
import WatchlistPage from '@/pages/WatchlistPage'
import PortfolioPage from '@/pages/PortfolioPage'
import AboutPage from '@/pages/AboutPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<RootLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/funds" element={<FundsPage />} />
        <Route path="/fund/:schemeCode" element={<FundDetailPage />} />
        <Route path="/indices" element={<IndicesPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/symbol/:symbolId" element={<SymbolDetailPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Route>
    </Routes>
  )
}
