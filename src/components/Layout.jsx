import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ── Sidebar icons (Heroicons-style inline SVG) ────────────────────────────────
const DashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
)
const OrdersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/>
    <path d="M9 12h6M9 16h4"/>
  </svg>
)
const LabelsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
)
const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
)
const LinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </svg>
)

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: DashIcon, exact: true },
  { to: '/orders', label: 'Orders', icon: OrdersIcon },
  { to: '/labels/queue', label: 'Labels', icon: LabelsIcon },
]
const ADMIN_NAV_ITEMS = [
  { to: '/admin/users', label: 'Users', icon: UsersIcon },
  { to: '/admin/walmart', label: 'Walmart', icon: LinkIcon },
]

function NavItem({ to, label, icon: Icon, exact }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex items-center gap-2.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
          isActive
            ? 'text-white bg-white/10 border-l-[3px] border-navy-accent pl-[9px] pr-3'
            : 'text-white/65 hover:text-white hover:bg-white/10 px-3'
        }`
      }
    >
      <Icon />
      <span>{label}</span>
    </NavLink>
  )
}

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const initials = (user?.display_name || user?.email || '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-screen flex bg-[#F0F4F8]">

      {/* ── Desktop Sidebar ─────────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col w-[220px] fixed h-full z-20"
        style={{ background: '#0C447C' }}
      >
        {/* Brand */}
        <div className="px-5 pt-6 pb-5">
          <div className="text-[22px] font-bold text-white tracking-tight">OMS</div>
          <div className="text-[11px] text-white/40 mt-0.5 font-medium tracking-widest uppercase">
            Order Management
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => <NavItem key={item.to} {...item} />)}

          {isAdmin && (
            <>
              <div className="pt-5 pb-1.5 px-3">
                <span className="text-[10px] font-semibold tracking-widest uppercase text-white/30">
                  Admin
                </span>
              </div>
              {ADMIN_NAV_ITEMS.map(item => <NavItem key={item.to} {...item} />)}
            </>
          )}
        </nav>

        {/* User profile */}
        <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'rgba(133,183,235,0.25)' }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate leading-tight">
                {user?.display_name || user?.email}
              </p>
              <p className="text-white/40 text-xs capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 text-xs text-white/35 hover:text-white/70 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 md:ml-[220px] flex flex-col min-h-screen pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* ── Mobile bottom bar ────────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-20">
        {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs gap-0.5 ${
                isActive ? 'text-navy' : 'text-gray-400'
              }`
            }
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
        {isAdmin && ADMIN_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs gap-0.5 ${
                isActive ? 'text-navy' : 'text-gray-400'
              }`
            }
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
