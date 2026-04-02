import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDashboard, useOrders, useImportCsv } from '../hooks/useOrders'
import { useWalmartStatus, usePollNow } from '../hooks/useWalmart'
import StatusBadge, { STATUS_CONFIG, STATUS_ORDER, StatusDot, PlatformBadge } from '../components/StatusBadge'
import { showToast } from '../components/Toast'
import NewOrderModal from '../components/NewOrderModal'

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
  const next = new Date(new Date(lastPolledAt).getTime() + intervalSeconds * 1000)
  const diffMs = next - Date.now()
  if (diffMs <= 0) return 'due now'
  const mins = Math.ceil(diffMs / 60000)
  return `${mins}m`
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboard()
  const { data: ordersData } = useOrders({ limit: 8 })
  const { data: walmartStatus, refetch: refetchWalmart } = useWalmartStatus()
  const pollMutation = usePollNow()
  const importCsv = useImportCsv()
  const [showNewOrder, setShowNewOrder] = useState(false)

  const counts = data?.counts || {}
  const activity = data?.recent_activity || []
  const recentOrders = ordersData?.orders || []

  const handlePollNow = async () => {
    try {
      const result = await pollMutation.mutateAsync()
      showToast(`Polled: ${result.pulled} new, ${result.updated ?? 0} updated`)
      refetchWalmart()
    } catch {
      showToast('Poll failed', 'error')
    }
  }

  const handleCsvImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const result = await importCsv.mutateAsync(file)
      showToast(`Imported ${result.imported}, skipped ${result.skipped}`)
    } catch {
      showToast('CSV import failed', 'error')
    }
    e.target.value = ''
  }

  const nextPoll = formatNextPoll(walmartStatus?.last_polled_at, walmartStatus?.poll_interval_seconds)

  return (
    <div className="flex flex-col min-h-screen">

      {/* Topbar */}
      <div className="topbar">
        <h1 className="text-[15px] font-semibold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-2">
          {walmartStatus?.configured && (
            <>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-xs text-green-700 font-medium">Walmart connected</span>
              </div>
              {walmartStatus.last_polled_at && (
                <span className="text-xs text-gray-400">Last sync {formatRelative(walmartStatus.last_polled_at)}</span>
              )}
            </>
          )}
          <label className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 cursor-pointer hover:bg-gray-50">
            Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
          </label>
          <button
            onClick={() => setShowNewOrder(true)}
            className="px-3 py-1.5 bg-navy text-white rounded-lg text-xs hover:bg-navy-hover"
          >
            + New Order
          </button>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="text-sm text-gray-400">Loading…</div>
        ) : (
          <>
            {/* ── Status summary cards ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
              {STATUS_ORDER.map(status => {
                const cfg = STATUS_CONFIG[status]
                return (
                  <Link
                    key={status}
                    to={`/orders?status=${status}`}
                    className="card p-4 hover:shadow-sm transition-shadow group block"
                  >
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                      <span className="text-xs text-gray-500 group-hover:text-gray-700 leading-tight">
                        {cfg.label}
                      </span>
                    </div>
                    <div className="text-[26px] font-bold text-gray-900 leading-none">
                      {counts[status] || 0}
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* ── 2-column layout ──────────────────────────────────────────── */}
            <div className="flex gap-5 items-start">

              {/* Left: Recent orders table */}
              <div className="flex-1 min-w-0 card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">Recent Orders</h2>
                  <Link to="/orders" className="text-xs text-blue-600 hover:underline">View all</Link>
                </div>
                {recentOrders.length === 0 ? (
                  <p className="px-5 py-10 text-sm text-gray-400">No orders yet</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Order ID</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Customer</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Platform</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Items</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Updated</th>
                        <th className="px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {recentOrders.map(order => (
                        <tr key={order.id} className="hover:bg-gray-50/60">
                          <td className="px-5 py-3">
                            <span className="font-mono text-xs text-gray-700 font-medium">
                              {order.external_id ? `#${order.external_id}` : order.id.slice(0, 8)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900 text-sm block">{order.customer_name}</span>
                            {(order.city || order.state) && (
                              <span className="text-xs text-gray-400">{[order.city, order.state].filter(Boolean).join(', ')}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <PlatformBadge platform={order.platform} />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{order.item_count ?? '—'}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                            {formatRelative(order.updated_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              to={`/orders/${order.id}`}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Right column: 340px */}
              <div className="w-[340px] shrink-0 space-y-4">

                {/* Activity feed */}
                <div className="card overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
                  </div>
                  <div className="p-4">
                    {activity.length === 0 ? (
                      <p className="text-sm text-gray-400">No recent activity</p>
                    ) : (
                      <div className="space-y-3">
                        {activity.slice(0, 8).map(item => (
                          <div key={item.id} className="flex items-start gap-2.5">
                            <StatusDot status={item.to_status} />
                            <div className="flex-1 min-w-0">
                              <Link
                                to={`/orders/${item.order_id}`}
                                className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block leading-tight"
                              >
                                {item.customer_name || item.order_id?.slice(0, 8)}
                              </Link>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <StatusBadge status={item.to_status} />
                                <span className="text-xs text-gray-400">
                                  by {item.changed_by_name || 'System'}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                              {formatRelative(item.changed_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Walmart sync */}
                <div className="card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900">Walmart Sync</h2>
                    {walmartStatus?.configured && (
                      <button
                        onClick={handlePollNow}
                        disabled={pollMutation.isPending}
                        className="px-2.5 py-1 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {pollMutation.isPending ? 'Polling…' : 'Poll now'}
                      </button>
                    )}
                  </div>
                  <div className="p-4">
                    {walmartStatus ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${walmartStatus.configured ? 'bg-green-500' : 'bg-red-400'}`} />
                            <span className={`text-xs font-medium ${walmartStatus.configured ? 'text-green-600' : 'text-red-500'}`}>
                              {walmartStatus.configured ? 'Connected' : 'Not configured'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">
                            every {walmartStatus.poll_interval_seconds / 60} min
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Last polled: <span className="text-gray-700">{formatRelative(walmartStatus.last_polled_at)}</span>
                          {nextPoll && (
                            <> · Next: <span className="text-gray-700">{nextPoll}</span></>
                          )}
                        </div>
                        {walmartStatus.last_sync && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="bg-gray-50 rounded-lg p-2.5">
                              <div className="text-lg font-bold text-gray-900 leading-none">
                                {walmartStatus.last_sync.orders_pulled ?? 0}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">Last pull</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2.5">
                              <div className="text-lg font-bold text-gray-900 leading-none">
                                {walmartStatus.last_sync.status === 'success' ? (
                                  <span className="text-green-600">✓</span>
                                ) : (
                                  <span className="text-red-500">!</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {walmartStatus.last_sync.status}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Not available</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </>
        )}
      </div>

      {showNewOrder && <NewOrderModal onClose={() => setShowNewOrder(false)} />}
    </div>
  )
}
