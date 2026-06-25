import { Outlet, NavLink } from 'react-router-dom'

const NAV = [
  { to: '/',        label: 'Home',    end: true },
  { to: '/funds',   label: 'Funds',   end: false },
  { to: '/indices', label: 'Indices', end: false },
  { to: '/compare', label: 'Compare', end: false },
  { to: '/about',   label: 'About',   end: false },
]

export default function RootLayout() {
  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="max-w-[1200px] mx-auto px-6 flex items-stretch h-12">
          <div className="flex items-center pr-4 border-r border-border">
            <span className="text-sm font-semibold text-foreground tracking-tight select-none">
              stonks
            </span>
          </div>
          <nav className="flex items-stretch ml-1">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `relative flex items-center px-3 text-[13px] font-medium transition-colors duration-150 ${
                    isActive
                      ? 'text-foreground after:absolute after:bottom-0 after:inset-x-3 after:h-0.5 after:bg-primary after:rounded-t-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
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
