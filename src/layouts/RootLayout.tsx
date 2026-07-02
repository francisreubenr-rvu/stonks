import { Suspense } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { SearchBar } from '@/components/SearchBar'
import { PageSkeleton } from '@/components/PageSkeleton'
import { Logo } from '@/components/Logo'

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
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-[var(--color-card)] border-b border-border">
        <div className="max-w-[1200px] mx-auto px-6 flex items-center h-12 gap-3">
          <NavLink to="/dashboard" className="flex items-center pr-4 shrink-0 border-r border-border">
            <Logo size={24} />
          </NavLink>
          <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `relative shrink-0 flex items-center px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {label}
                    {isActive && (
                      <span className="absolute left-3 right-3 bottom-0 h-0.5 bg-primary rounded-t-sm" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <NavLink
            to="/watchlist"
            title="Watchlist"
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-border-strong transition-colors duration-150"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          </NavLink>
          <SearchBar className="shrink-0 hidden md:block" />
        </div>
        {/* Mobile search row — below md the inline search is hidden, and
            without this, mobile users would have no search at all. */}
        <div className="md:hidden border-t border-border bg-[var(--color-card)] px-6 py-2">
          <SearchBar className="w-full [&>input]:w-full" />
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-8">
        <Suspense fallback={<PageSkeleton />}>
          <div className="animate-[fadeIn_200ms_ease-out]" key={location.pathname}>
            <Outlet />
          </div>
        </Suspense>
      </main>

      <footer className="border-t border-border py-4">
        <p className="text-center text-[11px] text-muted-foreground font-mono tracking-wide">
          <span style={{ color: 'var(--primary)' }} aria-hidden="true">$</span> personal research only · data may be delayed · not financial advice
        </p>
      </footer>
    </div>
  )
}
