import { Link } from 'react-router-dom'
import { useDashboard, useOrders } from '../hooks/useOrders'
import { useWalmartStatus } from '../hooks/useWalmart'
import StatusBadge, { STATUS_CONFIG, STATUS_ORDER, StatusDot } from '../components/StatusBadge'

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

export default function DashboardPage() {
  const { data, isLoading } = useDashboard()
  const { data: ordersData } = useOrders({ limit: 8 })
  const { data: walmartStatus } = useWalmartStatus()

  const counts = data?.counts || {}
  const activity = data?.recent_activity || []
  const recentOrders = ordersData?.orders || []

  return (
    <div className="flex flex-col min-h-screen">

      {/* Topbar */}
      <div className="topbar">
        <h1 className="text-[15px] font-semibold text-gray-900">Dashboard</h1>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="text-sm text-gray-400">Loading…</div>
        ) : (
          <>
            {/* ── 6 Status summary cards ─────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
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

            {/* ── 2-column layout ────────────────────────────────────────── */}
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
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Customer</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Order ID</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {recentOrders.map(order => (
                        <tr key={order.id} className="hover:bg-gray-50/60">
                          <td className="px-5 py-3">
                            <Link
                              to={`/orders/${order.id}`}
                              className="font-medium text-gray-900 hover:text-blue-600 text-sm block"
                            >
                              {order.customer_name}
                            </Link>
                            <span className="text-xs text-gray-400">{order.city}, {order.state}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-gray-500">
                              {order.external_id ? `#${order.external_id}` : order.id.slice(0, 8)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                            {formatRelative(order.updated_at)}
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
                    <h2 className="text-sm font-semibold text-gray-900">Activity</h2>
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
                                {item.changed_by_name && (
                                  <span className="text-xs text-gray-400">by {item.changed_by_name}</span>
                                )}
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
                  <div className="px-4 py-3.5 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900">Walmart Sync</h2>
                  </div>
                  <div className="p-4">
                    {walmartStatus ? (
                      <div className="space-y-2.5 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Status</span>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${walmartStatus.configured ? 'bg-green-500' : 'bg-red-400'}`} />
                            <span className={`text-xs font-medium ${walmartStatus.configured ? 'text-green-600' : 'text-red-500'}`}>
                              {walmartStatus.configured ? 'Connected' : 'Not configured'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Last polled</span>
                          <span className="text-xs text-gray-700">{formatRelative(walmartStatus.last_polled_at)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Interval</span>
                          <span className="text-xs text-gray-700">{walmartStatus.poll_interval_seconds / 60} min</span>
                        </div>
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
    </div>
  )
}
