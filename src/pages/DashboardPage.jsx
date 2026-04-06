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
  const activity = data?.recent_activity || []
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

            {/* Activity feed */}
            <Panel>
              <PanelHeader>
                <PanelTitle>Recent Activity</PanelTitle>
              </PanelHeader>
              {activity.length === 0 ? (
                <EmptyState title="No activity" sub="Status changes will appear here." />
              ) : (
                activity.slice(0, 8).map(item => (
                  <div key={item.id} className="oms-activity-item">
                    <StatusDot status={item.to_status} style={{ marginTop: 3, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link
                        to={`/orders/${item.order_id}`}
                        className="oms-activity-text"
                        style={{ textDecoration: 'none', display: 'block' }}
                      >
                        {item.customer_name || item.order_id?.slice(0, 8)}
                      </Link>
                      <div className="oms-activity-sub">
                        <StatusBadge status={item.to_status} />
                        {' '}by {item.changed_by_name || 'System'}
                      </div>
                    </div>
                    <span className="oms-text-muted" style={{ fontSize: 11, whiteSpace: 'nowrap', marginTop: 2 }}>
                      {formatRelative(item.changed_at)}
                    </span>
                  </div>
                ))
              )}
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
