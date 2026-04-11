import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShipmentPerformance, useLateShipments, useOverdueOrders } from '../hooks/useReports'
import {
  Topbar, Panel, PanelHeader, PanelTitle, PanelBody,
  StatusBadge, PlatformBadge, OrderId,
  FilterPill, Select, FormField, Input, Pagination, TableSkeleton, EmptyState,
} from '../components.jsx'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateTime(date) {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Format a week group_key (ISO timestamp from DATE_TRUNC) as "Apr 7 – Apr 13"
function fmtWeek(iso) {
  if (!iso) return '—'
  const start = new Date(iso)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

function DaysLateCell({ days }) {
  if (days == null) return <span className="oms-text-muted">—</span>
  const color = days > 7 ? '#991B1B' : '#BA7517'
  return <span style={{ color, fontWeight: 600 }}>{Number(days).toFixed(1)}d</span>
}

function OnTimeRate({ rate }) {
  if (rate == null) return <span className="oms-text-muted">—</span>
  const pct = parseFloat(rate)
  const color = pct >= 90 ? '#0D7C66' : pct >= 75 ? '#BA7517' : '#991B1B'
  return <span style={{ color, fontWeight: 700 }}>{pct}%</span>
}

// ── Performance Tab ───────────────────────────────────────────────────────────

function PerformanceTab() {
  const [filters, setFilters] = useState({
    date_from: '', date_to: '', platform: '', ship_node: '', group_by: '',
  })

  const activeParams = {}
  if (filters.date_from) activeParams.date_from = new Date(filters.date_from + 'T00:00:00').toISOString()
  if (filters.date_to) activeParams.date_to = new Date(filters.date_to + 'T23:59:59.999').toISOString()
  if (filters.platform) activeParams.platform = filters.platform
  if (filters.ship_node) activeParams.ship_node = filters.ship_node
  if (filters.group_by) activeParams.group_by = filters.group_by

  const { data, isLoading } = useShipmentPerformance(activeParams)

  const summary = data?.summary
  const groups = data?.groups

  const set = (k) => (v) => setFilters(f => ({ ...f, [k]: v }))
  const hasFilters = filters.date_from || filters.date_to || filters.platform || filters.ship_node

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filters */}
      <Panel>
        <PanelBody>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <FormField label="Ship By From">
              <Input type="date" value={filters.date_from} onChange={set('date_from')} />
            </FormField>
            <FormField label="Ship By To">
              <Input type="date" value={filters.date_to} onChange={set('date_to')} />
            </FormField>
            <FormField label="Platform">
              <Select value={filters.platform} onChange={set('platform')}>
                <option value="">All platforms</option>
                <option value="walmart">Walmart</option>
                <option value="amazon">Amazon</option>
                <option value="ebay">eBay</option>
                <option value="manual">Manual</option>
              </Select>
            </FormField>
            <FormField label="Ship Node">
              <Input placeholder="Filter ship node…" value={filters.ship_node} onChange={set('ship_node')} />
            </FormField>
            <FormField label="Group By">
              <Select value={filters.group_by} onChange={set('group_by')}>
                <option value="">No grouping</option>
                <option value="week">Week</option>
                <option value="platform">Platform</option>
                <option value="ship_node">Ship Node</option>
              </Select>
            </FormField>
            {hasFilters && (
              <button
                className="oms-btn oms-btn-secondary oms-btn-sm"
                style={{ marginBottom: 1 }}
                onClick={() => setFilters(f => ({ ...f, date_from: '', date_to: '', platform: '', ship_node: '' }))}
              >
                Clear filters
              </button>
            )}
          </div>
        </PanelBody>
      </Panel>

      {/* Summary stat cards */}
      <div className="oms-stat-row">
        <div className="oms-stat-card">
          <div className="oms-stat-num">{isLoading ? '…' : (summary?.total ?? 0)}</div>
          <div className="oms-stat-label">Orders with Ship-By</div>
        </div>
        <div className="oms-stat-card">
          <div className="oms-stat-num" style={{ color: '#0D7C66' }}>{isLoading ? '…' : (summary?.on_time ?? 0)}</div>
          <div className="oms-stat-label">On Time</div>
        </div>
        <div className="oms-stat-card">
          <div className="oms-stat-num" style={{ color: '#BA7517' }}>{isLoading ? '…' : (summary?.late ?? 0)}</div>
          <div className="oms-stat-label">Shipped Late</div>
        </div>
        <div className="oms-stat-card">
          <div className="oms-stat-num" style={{ color: '#991B1B' }}>{isLoading ? '…' : (summary?.overdue ?? 0)}</div>
          <div className="oms-stat-label">Currently Overdue</div>
        </div>
        <div className="oms-stat-card">
          <div className="oms-stat-num">
            {isLoading ? '…' : <OnTimeRate rate={summary?.on_time_rate} />}
          </div>
          <div className="oms-stat-label">On-Time Rate</div>
        </div>
        <div className="oms-stat-card">
          <div className="oms-stat-num" style={{ color: '#BA7517' }}>
            {isLoading ? '…' : (summary?.avg_days_late != null ? `${summary.avg_days_late}d` : '—')}
          </div>
          <div className="oms-stat-label">Avg Days Late</div>
        </div>
      </div>

      {/* Grouped breakdown table */}
      {filters.group_by && (
        <Panel>
          <PanelHeader>
            <PanelTitle>
              Breakdown by {filters.group_by === 'week' ? 'Week' : filters.group_by === 'platform' ? 'Platform' : 'Ship Node'}
            </PanelTitle>
          </PanelHeader>
          {isLoading ? (
            <div style={{ padding: 24 }}><TableSkeleton rows={5} cols={6} /></div>
          ) : !groups || groups.length === 0 ? (
            <EmptyState title="No data" sub="No orders match the selected filters." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="oms-table">
                <thead>
                  <tr>
                    <th>{filters.group_by === 'week' ? 'Week' : filters.group_by === 'platform' ? 'Platform' : 'Ship Node'}</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>On Time</th>
                    <th style={{ textAlign: 'right' }}>Late</th>
                    <th style={{ textAlign: 'right' }}>Overdue</th>
                    <th style={{ textAlign: 'right' }}>On-Time Rate</th>
                    <th style={{ textAlign: 'right' }}>Avg Days Late</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((row, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>
                        {filters.group_by === 'week'
                          ? fmtWeek(row.group_key)
                          : row.group_key || <span className="oms-text-muted">Unknown</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>{row.total}</td>
                      <td style={{ textAlign: 'right', color: '#0D7C66' }}>{row.on_time}</td>
                      <td style={{ textAlign: 'right', color: '#BA7517' }}>{row.late}</td>
                      <td style={{ textAlign: 'right', color: '#991B1B' }}>{row.overdue}</td>
                      <td style={{ textAlign: 'right' }}>
                        <OnTimeRate rate={row.on_time_rate != null ? parseFloat(row.on_time_rate) : null} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {row.avg_days_late != null
                          ? <DaysLateCell days={parseFloat(row.avg_days_late)} />
                          : <span className="oms-text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </div>
  )
}

// ── Late Shipments Tab ────────────────────────────────────────────────────────

const LATE_FILTER_OPTS = [
  { value: 'all', label: 'All' },
  { value: 'late', label: 'Shipped Late' },
  { value: 'overdue', label: 'Overdue' },
]

function LateShipmentsTab() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({ date_from: '', date_to: '', platform: '', status: 'all' })
  const [page, setPage] = useState(1)
  const limit = 20

  const activeParams = { page, limit }
  if (filters.date_from) activeParams.date_from = new Date(filters.date_from + 'T00:00:00').toISOString()
  if (filters.date_to) activeParams.date_to = new Date(filters.date_to + 'T23:59:59.999').toISOString()
  if (filters.platform) activeParams.platform = filters.platform
  if (filters.status !== 'all') activeParams.status = filters.status

  const { data, isLoading } = useLateShipments(activeParams)
  const orders = data?.orders || []
  const total = data?.total ?? 0

  const setFilter = (k) => (v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1) }
  const hasFilters = filters.date_from || filters.date_to || filters.platform

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filters */}
      <Panel>
        <PanelBody>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <FormField label="Ship By From">
              <Input type="date" value={filters.date_from} onChange={setFilter('date_from')} />
            </FormField>
            <FormField label="Ship By To">
              <Input type="date" value={filters.date_to} onChange={setFilter('date_to')} />
            </FormField>
            <FormField label="Platform">
              <Select value={filters.platform} onChange={setFilter('platform')}>
                <option value="">All platforms</option>
                <option value="walmart">Walmart</option>
                <option value="amazon">Amazon</option>
                <option value="ebay">eBay</option>
                <option value="manual">Manual</option>
              </Select>
            </FormField>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingBottom: 1 }}>
              {LATE_FILTER_OPTS.map(opt => (
                <FilterPill
                  key={opt.value}
                  active={filters.status === opt.value}
                  onClick={() => setFilter('status')(opt.value)}
                >
                  {opt.label}
                </FilterPill>
              ))}
            </div>
            {hasFilters && (
              <button
                className="oms-btn oms-btn-secondary oms-btn-sm"
                style={{ marginBottom: 1 }}
                onClick={() => { setFilters(f => ({ ...f, date_from: '', date_to: '', platform: '' })); setPage(1) }}
              >
                Clear filters
              </button>
            )}
          </div>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader>
          <PanelTitle>
            {isLoading ? 'Loading…' : `${total.toLocaleString()} order${total !== 1 ? 's' : ''}`}
          </PanelTitle>
        </PanelHeader>
        {isLoading ? (
          <div style={{ padding: 24 }}><TableSkeleton rows={8} cols={8} /></div>
        ) : orders.length === 0 ? (
          <EmptyState title="No results" sub="No late or overdue shipments match the selected filters." />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="oms-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Platform</th>
                    <th>Customer</th>
                    <th>Ship By</th>
                    <th>Shipped At</th>
                    <th>Days</th>
                    <th>Ship Node</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr
                      key={o.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/orders/${o.id}`)}
                    >
                      <td>
                        <OrderId id={o.external_id ? `#${o.external_id}` : o.id.slice(0, 8)} />
                      </td>
                      <td><PlatformBadge platform={o.platform} /></td>
                      <td style={{ fontWeight: 500 }}>{o.customer_name}</td>
                      <td style={{ whiteSpace: 'nowrap', color: '#991B1B' }}>{fmtDate(o.ship_by_date)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {o.shipped_at
                          ? fmtDateTime(o.shipped_at)
                          : <span className="oms-text-muted">Not shipped</span>}
                      </td>
                      <td><DaysLateCell days={o.days_late != null ? parseFloat(o.days_late) : null} /></td>
                      <td className="oms-text-secondary" style={{ fontSize: 12 }}>{o.ship_node || <span className="oms-text-muted">—</span>}</td>
                      <td><StatusBadge status={o.current_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > limit && (
              <div style={{ padding: '12px 16px' }}>
                <Pagination page={page} limit={limit} total={total} onChange={setPage} />
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  )
}

// ── Overdue Tab ───────────────────────────────────────────────────────────────

function OverdueTab() {
  const navigate = useNavigate()
  const [sortDir, setSortDir] = useState('desc')
  const [platform, setPlatform] = useState('')
  const [page, setPage] = useState(1)
  const limit = 50

  const activeParams = { sort_dir: sortDir, page, limit }
  if (platform) activeParams.platform = platform

  const { data, isLoading } = useOverdueOrders(activeParams)
  const orders = data?.orders || []
  const total = data?.total ?? 0

  const handlePlatformChange = (v) => { setPlatform(v); setPage(1) }
  const handleSortChange = (v) => { setSortDir(v); setPage(1) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: total > 0 ? '#FEE2E2' : '#CCFBF1',
          color: total > 0 ? '#991B1B' : '#0D7C66',
          borderRadius: 8, padding: '6px 14px', fontWeight: 600, fontSize: 14,
        }}>
          {isLoading ? '…' : total} overdue order{total !== 1 ? 's' : ''}
        </div>
        <FormField label="Platform">
          <Select value={platform} onChange={handlePlatformChange}>
            <option value="">All platforms</option>
            <option value="walmart">Walmart</option>
            <option value="amazon">Amazon</option>
            <option value="ebay">eBay</option>
            <option value="manual">Manual</option>
          </Select>
        </FormField>
        <FormField label="Sort">
          <Select value={sortDir} onChange={handleSortChange}>
            <option value="desc">Most overdue first</option>
            <option value="asc">Least overdue first</option>
          </Select>
        </FormField>
      </div>

      <Panel>
        {isLoading ? (
          <div style={{ padding: 24 }}><TableSkeleton rows={6} cols={7} /></div>
        ) : orders.length === 0 ? (
          <EmptyState title="No overdue orders" sub="All orders with a ship-by date have shipped on time." />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="oms-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Platform</th>
                    <th>Customer</th>
                    <th>Ship By</th>
                    <th>Days Overdue</th>
                    <th>Ship Node</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr
                      key={o.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/orders/${o.id}`)}
                    >
                      <td>
                        <OrderId id={o.external_id ? `#${o.external_id}` : o.id.slice(0, 8)} />
                      </td>
                      <td><PlatformBadge platform={o.platform} /></td>
                      <td style={{ fontWeight: 500 }}>{o.customer_name}</td>
                      <td style={{ whiteSpace: 'nowrap', color: '#991B1B' }}>{fmtDate(o.ship_by_date)}</td>
                      <td>
                        <DaysLateCell days={o.days_overdue != null ? parseFloat(o.days_overdue) : null} />
                      </td>
                      <td className="oms-text-secondary" style={{ fontSize: 12 }}>{o.ship_node || <span className="oms-text-muted">—</span>}</td>
                      <td><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > limit && (
              <div style={{ padding: '12px 16px' }}>
                <Pagination page={page} limit={limit} total={total} onChange={setPage} />
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'performance', label: 'Shipment Performance' },
  { id: 'late', label: 'Late Shipments' },
  { id: 'overdue', label: 'Overdue Now' },
]

const ChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

export default function ReportsPage() {
  const [tab, setTab] = useState('performance')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  const selectTab = (id) => { setTab(id); setDropdownOpen(false) }
  const currentLabel = TABS.find(t => t.id === tab)?.label

  return (
    <div className="oms-main">
      <Topbar title="Reports" />
      <div className="oms-content">

        {/* Desktop: horizontal tab bar */}
        <div className="oms-tabs" style={{ marginBottom: 20 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`oms-tab${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Mobile: dropdown tab switcher */}
        <div className="oms-tab-dropdown" ref={dropdownRef}>
          <button
            className={`oms-tab-dropdown-btn${dropdownOpen ? ' open' : ''}`}
            onClick={() => setDropdownOpen(o => !o)}
          >
            <span>{currentLabel}</span>
            <ChevronDown />
          </button>
          {dropdownOpen && (
            <div className="oms-tab-dropdown-list">
              {TABS.map(t => (
                <button
                  key={t.id}
                  className={`oms-tab-dropdown-item${tab === t.id ? ' active' : ''}`}
                  onClick={() => selectTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {tab === 'performance' && <PerformanceTab />}
        {tab === 'late' && <LateShipmentsTab />}
        {tab === 'overdue' && <OverdueTab />}
      </div>
    </div>
  )
}
