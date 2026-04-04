import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUploadContext } from '../context/UploadContext'

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
      className={({ isActive }) => `oms-nav-item${isActive ? ' active' : ''}`}
    >
      <Icon />
      <span>{label}</span>
    </NavLink>
  )
}

// ── Floating upload-progress indicator ───────────────────────────────────────
function UploadProgressCard({ job }) {
  const pct = job.total > 0 ? Math.round((job.current / job.total) * 100) : 0
  const isDone = job.status === 'done'
  const isError = job.status === 'error'

  return (
    <div style={{
      width: 256, background: '#fff', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      border: '1px solid var(--oms-border)', padding: 12, fontSize: 12, pointerEvents: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {isDone ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#639922" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : isError ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        ) : (
          <div style={{
            width: 14, height: 14, border: '2px solid #185FA5', borderTopColor: 'transparent',
            borderRadius: '50%', flexShrink: 0, animation: 'oms-spin 0.8s linear infinite',
          }} />
        )}
        <span style={{ fontWeight: 600, color: 'var(--oms-text-primary)', fontSize: 12 }}>
          {isDone ? 'Labels processed' : isError ? 'Processing failed' : 'Processing labels…'}
        </span>
      </div>

      {!isDone && !isError && job.total > 0 && (
        <>
          <div style={{ fontSize: 11, color: 'var(--oms-text-muted)', marginBottom: 6 }}>
            File {job.current} of {job.total}
            {job.current_file ? ` · ${job.current_file}` : ''}
          </div>
          <div style={{ width: '100%', height: 4, borderRadius: 4, background: 'var(--oms-page-bg)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, background: '#185FA5', width: `${pct}%`, transition: 'width 0.5s' }} />
          </div>
        </>
      )}

      {isDone && job.results && (
        <div style={{ fontSize: 11, color: 'var(--oms-text-muted)', marginTop: 4 }}>
          {job.results.filter(r => !r.error).length} label(s) ready for review
        </div>
      )}

      {isError && (
        <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>{job.error || 'An unexpected error occurred'}</div>
      )}
    </div>
  )
}

function UploadProgressIndicator() {
  const { activeJobs } = useUploadContext()
  if (activeJobs.length === 0) return null
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 50, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {activeJobs.map(job => <UploadProgressCard key={job.id} job={job} />)}
    </div>
  )
}

const ChevronLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('oms-sb') === '1'
  )

  const toggleSidebar = () => setCollapsed(c => {
    const next = !c
    localStorage.setItem('oms-sb', next ? '1' : '0')
    return next
  })

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
    <div className="oms-shell">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`oms-sidebar${collapsed ? ' oms-sb-collapsed' : ''}`}>
        <div className="oms-sb-brand">
          {!collapsed && (
            <div className="oms-sb-brand-text">
              <div className="oms-sb-brand-title">OMS</div>
              <div className="oms-sb-brand-sub">Order Management</div>
            </div>
          )}
          <button className="oms-sb-toggle" onClick={toggleSidebar} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>
        </div>

        <nav className="oms-sb-section">
          {NAV_ITEMS.map(item => <NavItem key={item.to} {...item} />)}

          {isAdmin && (
            <>
              <div className="oms-sb-label">Admin</div>
              {ADMIN_NAV_ITEMS.map(item => <NavItem key={item.to} {...item} />)}
            </>
          )}
        </nav>

        <div className="oms-sb-footer">
          <div className="oms-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="oms-sb-username">
              {user?.display_name || user?.email}
            </div>
            <div className="oms-sb-userrole">{user?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
            onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.7)'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="oms-main">
        <Outlet />
      </main>

      {/* ── Global upload progress ────────────────────────────────────────── */}
      <UploadProgressIndicator />

      {/* ── Mobile bottom bar ────────────────────────────────────────────────── */}
      <nav className="oms-mobile-nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => `oms-mobile-nav-item${isActive ? ' active' : ''}`}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
        {isAdmin && ADMIN_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `oms-mobile-nav-item${isActive ? ' active' : ''}`}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
