import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDashboard, useOrders, useImportCsv } from '../hooks/useOrders'
import { useWalmartStatus, usePollNow } from '../hooks/useWalmart'
import {
  Topbar, Panel, PanelHeader, PanelTitle, BtnPrimary, BtnSecondary,
  StatCard, StatusBadge, StatusDot, PlatformBadge, OrderId,
  TableSkeleton, EmptyState, useToast,
} from '../components.jsx'
import NewOrderModal from '../components/NewOrderModal'

const STATUS_ORDER = ['new', 'label_generated', 'inventory_ordered', 'packed', 'ready', 'shipped', 'delivered']

// ── At-risk helpers ───────────────────────────────────────────────────────────

/** Days from now (negative = overdue). */
function daysFromNow(dateStr) {
  if (!dateStr) return null
  const diffMs = new Date(dateStr).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)
  return Math.ceil(diffMs / 86400000)
}

/** Visual grade based on days remaining. */
function urgencyGrade(days) {
  if (days === null) return null
  if (days < 0)  return { color: '#991B1B', bg: '#FEE2E2', label: `${Math.abs(days)}d overdue`, weight: 600 }
  if (days === 0) return { color: '#9A3412', bg: '#FFEDD5', label: 'Due today',   weight: 600 }
  if (days === 1) return { color: '#92400E', bg: '#FEF3C7', label: 'Tomorrow',    weight: 500 }
  if (days <= 3)  return { color: '#78350F', bg: '#FEF9C3', label: `${days}d left`, weight: 500 }
  return              { color: '#6B7280',  bg: '#F3F4F6', label: `${days}d left`, weight: 400 }
}

function AtRiskRow({ order, navigate }) {
  const shipDays     = daysFromNow(order.ship_by_date)
  const deliverDays  = daysFromNow(order.deliver_by_date)

  // Determine which dates are actually at risk for this order's status
  const shipAtRisk    = order.ship_by_date   && !['shipped','delivered'].includes(order.status) && shipDays <= 7
  const deliverAtRisk = order.deliver_by_date && order.status !== 'delivered'                    && deliverDays <= 7

  // Most urgent date drives the row's visual prominence
  const urgentDays = (() => {
    const candidates = [
      shipAtRisk    ? shipDays    : null,
      deliverAtRisk ? deliverDays : null,
    ].filter(d => d !== null)
    if (!candidates.length) return null
    return Math.min(...candidates)
  })()

  const grade = urgencyGrade(urgentDays)
  if (!grade) return null

  return (
    <div
      onClick={() => navigate(`/orders/${order.id}`)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
        background: grade.bg, marginBottom: 6,
        border: `1px solid ${grade.color}22`,
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >
      {/* Urgency pill */}
      <div style={{
        flexShrink: 0, fontSize: 11, fontWeight: grade.weight,
        color: grade.color, minWidth: 72, paddingTop: 1,
      }}>
        {grade.label}
      </div>

      {/* Order info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--oms-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {order.customer_name}
          </span>
          {order.external_id && (
            <span className="oms-order-id" style={{ fontSize: 11 }}>#{order.external_id}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          <StatusBadge status={order.status} />
          {shipAtRisk && (
            <span style={{ fontSize: 11, color: grade.color }}>
              Ship by {new Date(order.ship_by_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {deliverAtRisk && (
            <span style={{ fontSize: 11, color: deliverDays <= 1 ? grade.color : 'var(--oms-text-muted)' }}>
              {shipAtRisk ? '· ' : ''}Deliver by {new Date(order.deliver_by_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function formatRelative(dt) {
  if (!dt) return '—'
  const diff = Date.now() - new Date(dt).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(dt).toLocaleDateString()
}

function formatNextPoll(lastPolledAt, intervalSeconds) {
  if (!lastPolledAt || !intervalSeconds) return null
  const diffMs = new Date(lastPolledAt).getTime() + intervalSeconds * 1000 - Date.now()
  if (diffMs <= 0) return 'due now'
  return `${Math.ceil(diffMs / 60000)}m`
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { data, isLoading } = useDashboard()
  const { data: ordersData, isLoading: ordersLoading } = useOrders({ limit: 8 })
  const { data: walmartStatus } = useWalmartStatus()
  const pollMutation = usePollNow()
  const importCsv = useImportCsv()
  const [showNewOrder, setShowNewOrder] = useState(false)

  const counts = data?.counts || {}
  const atRiskOrders = data?.at_risk_orders || []
  const recentOrders = ordersData?.orders || []
  const nextPoll = formatNextPoll(walmartStatus?.last_polled_at, walmartStatus?.poll_interval_seconds)

  const handlePollNow = async () => {
    try {
      const result = await pollMutation.mutateAsync()
      toast.success(`Polled: ${result.pulled} new, ${result.updated ?? 0} updated`)
    } catch {
      toast.error('Poll failed')
    }
  }

  const handleCsvImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const result = await importCsv.mutateAsync(file)
      toast.success(`Imported ${result.imported}, skipped ${result.skipped}`)
    } catch {
      toast.error('CSV import failed')
    }
    e.target.value = ''
  }

  return (
    <div className="oms-main">
      <Topbar title="Dashboard">
        {walmartStatus?.configured && (
          <span className="oms-hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="oms-pill oms-pill-green">● Walmart connected</span>
            {walmartStatus.last_polled_at && (
              <span className="oms-text-muted" style={{ fontSize: 12 }}>
                Last sync {formatRelative(walmartStatus.last_polled_at)}
              </span>
            )}
          </span>
        )}
        <label className="oms-btn oms-btn-secondary oms-btn-sm" style={{ cursor: 'pointer' }}>
          Import CSV
          <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvImport} />
        </label>
        <BtnPrimary size="sm" onClick={() => setShowNewOrder(true)}>+ New Order</BtnPrimary>
      </Topbar>

      <div className="oms-content">

        {/* ── Status stat cards ─────────────────────────────── */}
        {isLoading ? (
          <div className="oms-stat-row">
            {STATUS_ORDER.map(s => (
              <div key={s} className="oms-stat-card">
                <div className="oms-skeleton" style={{ width: 8, height: 8, borderRadius: '50%', marginBottom: 10 }} />
                <div className="oms-skeleton" style={{ width: 40, height: 26, marginBottom: 6 }} />
                <div className="oms-skeleton" style={{ width: 60, height: 11 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="oms-stat-row">
            {STATUS_ORDER.map(s => (
              <StatCard key={s} status={s} count={counts[s]} onClick={() => navigate(`/orders?status=${s}`)} />
            ))}
          </div>
        )}

        {/* ── Two-column layout ─────────────────────────────── */}
        <div className="oms-two-col">

          {/* Left: Recent orders */}
          <Panel>
            <PanelHeader>
              <PanelTitle>Recent Orders</PanelTitle>
              <Link to="/orders" style={{ fontSize: 12, color: 'var(--oms-navy-mid)', textDecoration: 'none' }}>
                View all
              </Link>
            </PanelHeader>
            {ordersLoading ? (
              <TableSkeleton rows={6} cols={6} />
            ) : recentOrders.length === 0 ? (
              <EmptyState title="No orders yet" sub="Orders will appear here once imported or created." />
            ) : (
              <table className="oms-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Platform</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => (
                    <tr key={order.id} onClick={() => navigate(`/orders/${order.id}`)}>
                      <td>
                        <OrderId id={order.external_id ? `#${order.external_id}` : order.id.slice(0, 8)} />
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{order.customer_name}</div>
                        {(order.city || order.state) && (
                          <div className="oms-text-muted" style={{ fontSize: 11, marginTop: 1 }}>
                            {[order.city, order.state].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </td>
                      <td><PlatformBadge platform={order.platform} /></td>
                      <td className="oms-text-secondary">{order.item_count ?? '—'}</td>
                      <td><StatusBadge status={order.status} /></td>
                      <td className="oms-text-muted" style={{ fontSize: 12 }}>{formatRelative(order.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          {/* Right column */}
          <div className="oms-right-col">

            {/* At-risk orders */}
            <Panel>
              <PanelHeader>
                <PanelTitle>At-Risk Orders</PanelTitle>
                {atRiskOrders.length > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: '#991B1B',
                    background: '#FEE2E2', borderRadius: 10, padding: '2px 8px',
                  }}>
                    {atRiskOrders.length}
                  </span>
                )}
              </PanelHeader>
              <div style={{ padding: '4px 0' }}>
                {isLoading ? (
                  <TableSkeleton rows={4} cols={1} />
                ) : atRiskOrders.length === 0 ? (
                  <EmptyState title="All clear" sub="No orders with approaching deadlines." />
                ) : (
                  atRiskOrders.map(order => (
                    <AtRiskRow key={order.id} order={order} navigate={navigate} />
                  ))
                )}
              </div>
            </Panel>

            {/* Walmart sync */}
            <Panel>
              <PanelHeader>
                <PanelTitle>Walmart Sync</PanelTitle>
                {walmartStatus?.configured && (
                  <BtnSecondary size="sm" onClick={handlePollNow} loading={pollMutation.isPending}>
                    Poll now
                  </BtnSecondary>
                )}
              </PanelHeader>
              <div className="oms-panel-body">
                {walmartStatus ? (
                  <>
                    <div className="oms-flex-center oms-gap-8" style={{ marginBottom: 10 }}>
                      <div className={walmartStatus.configured ? 'oms-sync-live' : 'oms-dot'} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: walmartStatus.configured ? 'var(--oms-label-text)' : 'var(--oms-text-muted)' }}>
                        {walmartStatus.configured ? 'Connected' : 'Not configured'}
                      </span>
                      <span className="oms-text-muted" style={{ marginLeft: 'auto', fontSize: 11 }}>
                        every {walmartStatus.poll_interval_seconds / 60} min
                      </span>
                    </div>
                    <div className="oms-text-muted" style={{ fontSize: 11, marginBottom: 10 }}>
                      Last polled: <span className="oms-text-secondary">{formatRelative(walmartStatus.last_polled_at)}</span>
                      {nextPoll && <> · Next: <span className="oms-text-secondary">{nextPoll}</span></>}
                    </div>
                    {walmartStatus.last_sync && (
                      <div className="oms-sync-grid">
                        <div className="oms-sync-stat">
                          <div className="oms-sync-stat-num">{walmartStatus.last_sync.orders_pulled ?? 0}</div>
                          <div className="oms-sync-stat-lbl">Last pull</div>
                        </div>
                        <div className="oms-sync-stat">
                          <div className="oms-sync-stat-num" style={{ color: walmartStatus.last_sync.status === 'success' ? 'var(--oms-label-text)' : '#DC2626' }}>
                            {walmartStatus.last_sync.status === 'success' ? '✓' : '!'}
                          </div>
                          <div className="oms-sync-stat-lbl">{walmartStatus.last_sync.status}</div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="oms-text-muted" style={{ fontSize: 13 }}>Not available</span>
                )}
              </div>
            </Panel>

          </div>
        </div>
      </div>

      {showNewOrder && <NewOrderModal onClose={() => setShowNewOrder(false)} />}
    </div>
  )
}
