import { Link } from 'react-router-dom'
import { useDashboard } from '../hooks/useOrders'
import { useWalmartStatus } from '../hooks/useWalmart'
import StatusBadge from '../components/StatusBadge'

const STATUS_ORDER = ['new', 'label_generated', 'inventory_ordered', 'packed', 'ready', 'shipped']

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString()
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboard()
  const { data: walmartStatus } = useWalmartStatus()

  if (isLoading) return <div className="text-gray-400">Loading...</div>

  const counts = data?.counts || {}
  const activity = data?.recent_activity || []

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Status counts */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {STATUS_ORDER.map(status => (
          <Link key={status} to={`/orders?status=${status}`}
            className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 transition-colors">
            <div className="text-2xl font-bold text-gray-900">{counts[status] || 0}</div>
            <StatusBadge status={status} />
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {activity.length === 0 ? (
            <p className="text-gray-400 text-sm">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {activity.map(item => (
                <div key={item.id} className="flex items-start gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <Link to={`/orders/${item.order_id}`} className="font-medium text-blue-600 hover:underline truncate block">
                      {item.customer_name || item.order_id?.slice(0, 8)}
                    </Link>
                    <p className="text-gray-500">
                      → <StatusBadge status={item.to_status} />
                      {item.changed_by_name && <span className="ml-1">by {item.changed_by_name}</span>}
                    </p>
                  </div>
                  <span className="text-gray-400 whitespace-nowrap">{formatDate(item.changed_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Walmart sync */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Walmart Sync</h2>
          {walmartStatus ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`font-medium ${walmartStatus.configured ? 'text-green-600' : 'text-red-500'}`}>
                  {walmartStatus.configured ? 'Connected' : 'Not configured'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last polled</span>
                <span className="text-gray-700">{formatDate(walmartStatus.last_polled_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Poll interval</span>
                <span className="text-gray-700">{walmartStatus.poll_interval_seconds / 60} min</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Not available</p>
          )}
        </div>
      </div>
    </div>
  )
}
