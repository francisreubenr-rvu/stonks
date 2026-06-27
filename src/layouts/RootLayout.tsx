import { Suspense } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { SearchBar } from '@/components/SearchBar'
import { PageSkeleton } from '@/components/PageSkeleton'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', end: false },
  { to: '/funds',     label: 'Funds',     end: false },
  { to: '/indices',   label: 'Indices',   end: false },
  { to: '/compare',   label: 'Compare',   end: false },
  { to: '/watchlist', label: 'Watchlist', end: false },
  { to: '/portfolio', label: 'Portfolio', end: false },
  { to: '/banker',    label: 'Banker',    end: false },
  { to: '/about',     label: 'About',     end: false },
]

export default function RootLayout() {
  const location = useLocation()
  return (
    <div className="min-h-dvh bg-background flex flex-col" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      <header
        className="sticky top-0 z-10 border-b backdrop-blur-xl"
        style={{
          background: 'rgba(10,14,23,0.85)',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-[1200px] mx-auto px-6 flex items-center h-12 gap-3">
          <NavLink to="/dashboard" className="flex items-center pr-4 shrink-0"
            style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2">
              <span className="relative w-2 h-2 rounded-full bg-primary"
                style={{ boxShadow: '0 0 8px #34D399' }} />
              <span className="text-sm font-bold text-foreground tracking-tight select-none">stonks</span>
            </div>
          </NavLink>
          <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `relative shrink-0 flex items-center px-3 py-1 text-[12px] font-medium rounded-md transition-all duration-150 ${
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <SearchBar className="shrink-0" />
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-8">
        <Suspense fallback={<PageSkeleton />}>
          <div className="animate-[fadeIn_200ms_ease-out]" key={location.pathname}>
            <Outlet />
          </div>
        </Suspense>
      </main>

      <footer className="border-t py-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-center text-xs text-muted-foreground">
          Personal research only · Data may be delayed · Not financial advice
        </p>
      </footer>
    </div>
  )
}
