/* ============================================================
   OMS UI Components — drop into src/components/ui/
   All components use oms-theme.css classes exclusively.
   No Tailwind. No inline styles.
   ============================================================ */

// ── StatusBadge ──────────────────────────────────────────────
const STATUS_CLASS = {
  new:               'oms-status-new',
  label_generated:   'oms-status-label',
  inventory_ordered: 'oms-status-inventory',
  packed:            'oms-status-packed',
  ready:             'oms-status-ready',
  shipped:           'oms-status-shipped',
  delivered:         'oms-status-delivered',
}
const STATUS_LABEL = {
  new:               'New',
  label_generated:   'Label Gen.',
  inventory_ordered: 'Inv. Ordered',
  packed:            'Packed',
  ready:             'Ready',
  shipped:           'Shipped',
  delivered:         'Delivered',
}
export function StatusBadge({ status }) {
  return (
    <span className={`oms-status ${STATUS_CLASS[status] || ''}`}>
      {STATUS_LABEL[status] || status}
    </span>
  )
}

// ── StatusDot ────────────────────────────────────────────────
const DOT_CLASS = {
  new:               'oms-dot-new',
  label_generated:   'oms-dot-label',
  inventory_ordered: 'oms-dot-inventory',
  packed:            'oms-dot-packed',
  ready:             'oms-dot-ready',
  shipped:           'oms-dot-shipped',
  delivered:         'oms-dot-delivered',
}
export function StatusDot({ status, style }) {
  return <div className={`oms-dot ${DOT_CLASS[status] || ''}`} style={style} />
}

// ── PlatformBadge ─────────────────────────────────────────────
const PLATFORM_CLASS = {
  walmart: 'oms-platform-walmart',
  manual:  'oms-platform-manual',
  ebay:    'oms-platform-ebay',
  amazon:  'oms-platform-amazon',
}
const PLATFORM_LABEL = {
  walmart: 'Walmart',
  manual:  'Manual',
  ebay:    'eBay',
  amazon:  'Amazon',
}
export function PlatformBadge({ platform }) {
  return (
    <span className={`oms-platform ${PLATFORM_CLASS[platform] || 'oms-platform-manual'}`}>
      {PLATFORM_LABEL[platform] || platform}
    </span>
  )
}

// ── OrderId ───────────────────────────────────────────────────
export function OrderId({ id }) {
  return <span className="oms-order-id">{id}</span>
}

// ── Panel ─────────────────────────────────────────────────────
export function Panel({ children, className = '' }) {
  return <div className={`oms-panel ${className}`}>{children}</div>
}
export function PanelHeader({ children }) {
  return <div className="oms-panel-header">{children}</div>
}
export function PanelTitle({ children }) {
  return <div className="oms-panel-title">{children}</div>
}
export function PanelBody({ children }) {
  return <div className="oms-panel-body">{children}</div>
}

// ── Buttons ───────────────────────────────────────────────────
export function BtnPrimary({ children, onClick, disabled, loading, size = '' }) {
  return (
    <button
      className={`oms-btn oms-btn-primary ${size === 'sm' ? 'oms-btn-sm' : ''}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? 'Loading…' : children}
    </button>
  )
}
export function BtnSecondary({ children, onClick, disabled, loading, size = '' }) {
  return (
    <button
      className={`oms-btn oms-btn-secondary ${size === 'sm' ? 'oms-btn-sm' : ''}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? 'Loading…' : children}
    </button>
  )
}
export function BtnDanger({ children, onClick, disabled, size = '' }) {
  return (
    <button
      className={`oms-btn oms-btn-danger ${size === 'sm' ? 'oms-btn-sm' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

// ── StatCard ──────────────────────────────────────────────────
export function StatCard({ status, count, onClick }) {
  const DOT_COLOR = {
    new: '#378ADD', label_generated: '#639922', inventory_ordered: '#D97706',
    packed: '#534AB7', ready: '#9D174D', shipped: '#9CA3AF', delivered: '#0D9488',
  }
  return (
    <div className="oms-stat-card" onClick={onClick}>
      <div className="oms-stat-dot" style={{ background: DOT_COLOR[status] }} />
      <div className="oms-stat-num">{count ?? 0}</div>
      <div className="oms-stat-label">{STATUS_LABEL[status] || status}</div>
    </div>
  )
}

// ── Topbar ────────────────────────────────────────────────────
export function Topbar({ title, children }) {
  return (
    <div className="oms-topbar">
      <div className="oms-topbar-title">{title}</div>
      {children}
    </div>
  )
}

// ── FilterPill ────────────────────────────────────────────────
export function FilterPill({ children, active, onClick }) {
  return (
    <button
      className={`oms-filter-pill${active ? ' active' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

// ── SearchBox ─────────────────────────────────────────────────
export function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  return (
    <input
      className="oms-search"
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}

// ── ViewToggle ────────────────────────────────────────────────
export function ViewToggle({ view, onChange }) {
  return (
    <div className="oms-view-toggle">
      <button
        className={`oms-vt-btn${view === 'table' ? ' active' : ''}`}
        onClick={() => onChange('table')}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="0" y="1" width="12" height="1.5" rx=".5" fill="currentColor"/>
          <rect x="0" y="5" width="12" height="1.5" rx=".5" fill="currentColor"/>
          <rect x="0" y="9" width="12" height="1.5" rx=".5" fill="currentColor"/>
        </svg>
        Table
      </button>
      <button
        className={`oms-vt-btn${view === 'kanban' ? ' active' : ''}`}
        onClick={() => onChange('kanban')}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="0" y="0" width="5.5" height="12" rx="1" fill="currentColor" opacity=".6"/>
          <rect x="6.5" y="0" width="5.5" height="12" rx="1" fill="currentColor" opacity=".6"/>
        </svg>
        Kanban
      </button>
    </div>
  )
}

// ── ConfidenceBar ─────────────────────────────────────────────
export function ConfidenceBar({ score }) {
  const pct = Math.round((score || 0) * 100)
  const tier = pct >= 85 ? 'high' : pct >= 65 ? 'mid' : 'low'
  return (
    <div className={`oms-conf-wrap oms-conf-${tier}`}>
      <div className="oms-conf-track">
        <div className="oms-conf-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="oms-conf-label">{pct}%</span>
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────────
export function Pagination({ page, total, limit, onChange }) {
  const totalPages = Math.ceil(total / limit) || 1
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1)
  return (
    <div className="oms-pagination">
      <span className="oms-pg-meta">
        {total > 0
          ? `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`
          : 'No results'}
      </span>
      <button className="oms-pg-btn" onClick={() => onChange(Math.max(1, page - 1))}>‹</button>
      {pages.map(p => (
        <button
          key={p}
          className={`oms-pg-btn${p === page ? ' active' : ''}`}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      <button className="oms-pg-btn" onClick={() => onChange(Math.min(totalPages, page + 1))}>›</button>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────
export function Modal({ title, children, onClose }) {
  // Close on Escape
  if (typeof window !== 'undefined') {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler, { once: true })
  }
  return (
    <div className="oms-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="oms-modal">
        <div className="oms-modal-title">{title}</div>
        {children}
      </div>
    </div>
  )
}
export function ModalActions({ children }) {
  return <div className="oms-modal-actions">{children}</div>
}

// ── Tabs ──────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="oms-tabs">
      {tabs.map(tab => (
        <div
          key={tab.value}
          className={`oms-tab${active === tab.value ? ' active' : ''}`}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </div>
      ))}
    </div>
  )
}

// ── StatusStepper ─────────────────────────────────────────────
const STATUSES = ['new','label_generated','inventory_ordered','packed','ready','shipped']
const STEP_LABELS = {
  new: 'New', label_generated: 'Label', inventory_ordered: 'Inventory',
  packed: 'Packed', ready: 'Ready', shipped: 'Shipped'
}
export function StatusStepper({ currentStatus }) {
  const currentIdx = STATUSES.indexOf(currentStatus)
  return (
    <div className="oms-stepper">
      {STATUSES.map((s, i) => {
        const done    = i < currentIdx
        const current = i === currentIdx
        return (
          <div key={s} className={`oms-step${done ? ' done' : ''}${current ? ' current' : ''}`}>
            <div className="oms-step-circle">
              {done ? '✓' : i + 1}
            </div>
            <div className="oms-step-label">{STEP_LABELS[s]}</div>
            {i < STATUSES.length - 1 && <div className="oms-step-line" />}
          </div>
        )
      })}
    </div>
  )
}

// ── Toast system ──────────────────────────────────────────────
// Usage: import { useToast } from './ui/components'
// const toast = useToast()
// toast.success('Label confirmed')
// toast.error('Something went wrong')
import { createContext, useContext, useState, useCallback } from 'react'
const ToastCtx = createContext(null)
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const add = useCallback((msg, type = 'info') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])
  const toast = {
    success: msg => add(msg, 'success'),
    error:   msg => add(msg, 'error'),
    info:    msg => add(msg, 'info'),
  }
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="oms-toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`oms-toast oms-toast-${t.type}`}>
            {t.type === 'success' && '✓ '}
            {t.type === 'error'   && '✕ '}
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
export function useToast() {
  return useContext(ToastCtx)
}

// ── UploadZone ────────────────────────────────────────────────
export function UploadZone({ onFiles, loading }) {
  const handleChange = e => {
    if (e.target.files?.length) onFiles(Array.from(e.target.files))
  }
  const handleDrop = e => {
    e.preventDefault()
    if (e.dataTransfer.files?.length) onFiles(Array.from(e.dataTransfer.files))
  }
  return (
    <div
      className="oms-upload-zone"
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      onClick={() => document.getElementById('oms-file-input')?.click()}
    >
      <input
        id="oms-file-input"
        type="file"
        accept=".pdf"
        multiple
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
      <div className="oms-upload-title">
        {loading ? 'Processing…' : 'Drop PDF labels here'}
      </div>
      <div className="oms-upload-sub">
        or click to select files — multiple PDFs supported
      </div>
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────
export function EmptyState({ title, sub, action }) {
  return (
    <div className="oms-empty">
      <div className="oms-empty-title">{title}</div>
      <div className="oms-empty-sub">{sub}</div>
      {action}
    </div>
  )
}

// ── LoadingSkeleton ───────────────────────────────────────────
export function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <table className="oms-table">
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: cols }).map((_, c) => (
              <td key={c}>
                <div
                  className="oms-skeleton"
                  style={{ height: 14, width: c === 0 ? 80 : c === 1 ? 120 : 60, borderRadius: 4 }}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── FormField ─────────────────────────────────────────────────
export function FormField({ label, children }) {
  return (
    <div className="oms-field">
      <label className="oms-label">{label}</label>
      {children}
    </div>
  )
}
export function Input({ value, onChange, placeholder, type = 'text', ...props }) {
  return (
    <input
      className="oms-input"
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      {...props}
    />
  )
}
export function Select({ value, onChange, children, ...props }) {
  return (
    <select
      className="oms-select"
      value={value}
      onChange={e => onChange(e.target.value)}
      {...props}
    >
      {children}
    </select>
  )
}
