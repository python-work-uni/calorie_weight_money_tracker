import { NavLink, Outlet } from 'react-router-dom'

type NavItem = {
  to: string
  label: string
  end?: boolean
}

const NAV: NavItem[] = [
  { to: '/', label: 'Today', end: true },
  { to: '/calories', label: 'Calories' },
  { to: '/weight', label: 'Weight' },
  { to: '/spending', label: 'Spending' },
  { to: '/insights', label: 'Insights' },
]

function linkClass({ isActive }: { isActive: boolean }) {
  return isActive
    ? 'text-slate-900 font-medium'
    : 'text-slate-500 hover:text-slate-900'
}

export default function Layout() {
  return (
    <div className="min-h-full md:flex">
      <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-slate-200 md:bg-white md:p-4">
        <h1 className="mb-6 text-lg font-semibold">Dashboard</h1>
        <nav className="flex flex-col gap-2">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
          <NavLink to="/profile" className={linkClass}>
            Profile
          </NavLink>
          <NavLink to="/categories" className={linkClass}>
            Categories
          </NavLink>
        </nav>
      </aside>

      <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-5 border-t border-slate-200 bg-white md:hidden">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex min-h-[56px] items-center justify-center px-1 text-center text-xs ${linkClass({ isActive })}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
