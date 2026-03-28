import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', exact: true },
  { to: '/orders', label: 'Orders', icon: '📦' },
  { to: '/labels/queue', label: 'Labels', icon: '🏷️' },
]

const adminNavItems = [
  { to: '/admin/users', label: 'Users', icon: '👥' },
  { to: '/admin/walmart', label: 'Walmart', icon: '🔗' },
]

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
    }`

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-200 px-4 py-6">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900">OMS</h1>
          <p className="text-xs text-gray-500 mt-1">Order Management</p>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.exact} className={linkClass}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          {isAdmin && (
            <>
              <div className="pt-4 pb-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">Admin</p>
              </div>
              {adminNavItems.map(item => (
                <NavLink key={item.to} to={item.to} className={linkClass}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>
        <div className="mt-auto border-t pt-4">
          <p className="text-sm font-medium text-gray-900 truncate">{user?.display_name || user?.email}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          <button onClick={handleLogout} className="mt-2 text-sm text-red-600 hover:text-red-700">Sign out</button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        <div className="flex-1 p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.exact}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs ${isActive ? 'text-blue-600' : 'text-gray-500'}`
            }>
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
        {isAdmin && adminNavItems.map(item => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs ${isActive ? 'text-blue-600' : 'text-gray-500'}`
            }>
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
