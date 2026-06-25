import { Routes, Route } from 'react-router-dom'
import RootLayout from '@/layouts/RootLayout'
import LandingPage from '@/pages/LandingPage'
import FundsPage from '@/pages/FundsPage'
import FundDetailPage from '@/pages/FundDetailPage'
import IndicesPage from '@/pages/IndicesPage'
import ComparePage from '@/pages/ComparePage'
import SymbolDetailPage from '@/pages/SymbolDetailPage'
import AboutPage from '@/pages/AboutPage'

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/funds" element={<FundsPage />} />
        <Route path="/fund/:schemeCode" element={<FundDetailPage />} />
        <Route path="/indices" element={<IndicesPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/symbol/:symbolId" element={<SymbolDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Route>
    </Routes>
  )
}
