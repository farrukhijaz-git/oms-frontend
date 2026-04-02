import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const NAV_ITEMS = [
  {
    group: 'Main',
    items: [
      { to: '/',             label: 'Dashboard',   badge: null,
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1.2" fill="currentColor"/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1.2" fill="currentColor" opacity=".5"/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1.2" fill="currentColor" opacity=".5"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.2" fill="currentColor" opacity=".5"/></svg> },
      { to: '/orders',       label: 'Orders',      badge: null,
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="2" width="13" height="2" rx="1" fill="currentColor"/><rect x="1" y="6.5" width="13" height="2" rx="1" fill="currentColor" opacity=".6"/><rect x="1" y="11" width="13" height="2" rx="1" fill="currentColor" opacity=".4"/></svg> },
      { to: '/labels/queue', label: 'Label Queue',  badge: 'labelCount',
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 1.5h6.5l3.5 3.5V13.5H3V1.5Z" stroke="currentColor" strokeWidth="1.2" fill="none"/><path d="M9.5 1.5V5H13" stroke="currentColor" strokeWidth="1.2"/><path d="M5 8.5h5M5 11h3.5" stroke="currentColor" strokeWidth="1" opacity=".6"/></svg> },
    ]
  },
  {
    group: 'Admin',
    adminOnly: true,
    items: [
      { to: '/admin/users',   label: 'Users',       badge: null,
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="5" r="3" stroke="currentColor" strokeWidth="1.2"/><path d="M1.5 13.5C1.5 10.5 4.2 8.5 7.5 8.5s6 2 6 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
      { to: '/admin/walmart', label: 'Walmart API', badge: null,
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7.5 4.5v3l2.5 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
    ]
  }
]

const MOBILE_TABS = [
  { to: '/',             label: 'Dashboard',
    icon: <svg width="20" height="20" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1.2" fill="currentColor"/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1.2" fill="currentColor" opacity=".5"/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1.2" fill="currentColor" opacity=".5"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.2" fill="currentColor" opacity=".5"/></svg> },
  { to: '/orders',       label: 'Orders',
    icon: <svg width="20" height="20" viewBox="0 0 15 15" fill="none"><rect x="1" y="2" width="13" height="2" rx="1" fill="currentColor"/><rect x="1" y="6.5" width="13" height="2" rx="1" fill="currentColor" opacity=".6"/><rect x="1" y="11" width="13" height="2" rx="1" fill="currentColor" opacity=".4"/></svg> },
  { to: '/labels/queue', label: 'Labels',
    icon: <svg width="20" height="20" viewBox="0 0 15 15" fill="none"><path d="M3 1.5h6.5l3.5 3.5V13.5H3V1.5Z" stroke="currentColor" strokeWidth="1.2" fill="none"/><path d="M9.5 1.5V5H13" stroke="currentColor" strokeWidth="1.2"/></svg> },
  { to: '/admin/users',  label: 'Admin',    adminOnly: true,
    icon: <svg width="20" height="20" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="5" r="3" stroke="currentColor" strokeWidth="1.2"/><path d="M1.5 13.5C1.5 10.5 4.2 8.5 7.5 8.5s6 2 6 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
]

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U'
}

export default function Layout({ children, labelQueueCount = 0 }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  return (
    <div className="oms-shell">

      {/* ── Sidebar ── */}
      <nav className="oms-sidebar">
        <div className="oms-sb-brand">
          <div className="oms-sb-brand-title">OMS</div>
          <div className="oms-sb-brand-sub">Order Management</div>
        </div>

        <div className="oms-sb-section">
          {NAV_ITEMS.map(group => {
            if (group.adminOnly && !isAdmin) return null
            return (
              <div key={group.group}>
                <div className="oms-sb-label">{group.group}</div>
                {group.items.map(item => {
                  if (item.adminOnly && !isAdmin) return null
                  const count = item.badge === 'labelCount' ? labelQueueCount : null
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        `oms-nav-item${isActive ? ' active' : ''}`
                      }
                    >
                      {item.icon}
                      {item.label}
                      {count > 0 && (
                        <span className="oms-nav-badge">{count}</span>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            )
          })}
        </div>

        <div className="oms-sb-footer">
          <div className="oms-avatar">{getInitials(user?.display_name)}</div>
          <div>
            <div className="oms-sb-username">{user?.display_name || 'User'}</div>
            <div className="oms-sb-userrole">{user?.role}</div>
          </div>
        </div>
      </nav>

      {/* ── Main area ── */}
      <div className="oms-main">
        {children}
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="oms-mobile-nav">
        {MOBILE_TABS.filter(t => !t.adminOnly || isAdmin).map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `oms-mobile-nav-item${isActive ? ' active' : ''}`
            }
          >
            {tab.icon}
            {tab.label}
          </NavLink>
        ))}
      </nav>

    </div>
  )
}
