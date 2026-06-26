import { Outlet, NavLink } from 'react-router-dom'
import { SearchBar } from '@/components/SearchBar'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', end: false },
  { to: '/funds',     label: 'Funds',     end: false },
  { to: '/indices',   label: 'Indices',   end: false },
  { to: '/compare',   label: 'Compare',   end: false },
  { to: '/watchlist', label: 'Watchlist', end: false },
  { to: '/portfolio', label: 'Portfolio', end: false },
  { to: '/about',     label: 'About',     end: false },
]

export default function RootLayout() {
  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="max-w-[1200px] mx-auto px-6 flex items-center h-12 gap-3">
          <NavLink to="/dashboard" className="flex items-center pr-4 border-r border-border shrink-0">
            <span className="text-sm font-semibold text-foreground tracking-tight select-none">
              stonks
            </span>
          </NavLink>
          <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `relative shrink-0 flex items-center px-2.5 py-1 text-[12px] font-medium transition-colors duration-150 ${
                    isActive
                      ? 'text-foreground after:absolute after:bottom-0 after:inset-x-2 after:h-0.5 after:bg-primary after:rounded-t-sm'
                      : 'text-muted-foreground hover:text-foreground'
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
        <Outlet />
      </main>

      <footer className="border-t border-border py-4">
        <p className="text-center text-xs text-muted-foreground">
          Personal research only · Data may be delayed · Not financial advice
        </p>
      </footer>
    </div>
  )
}
