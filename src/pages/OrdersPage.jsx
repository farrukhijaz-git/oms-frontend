import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useOrders, useUpdateOrderStatus, useCreateOrder, useImportCsv } from '../hooks/useOrders'
import StatusBadge, { STATUS_CONFIG, STATUS_ORDER, PlatformBadge } from '../components/StatusBadge'
import { showToast } from '../components/Toast'

function StatusUpdateModal({ order, onClose }) {
  const [status, setStatus] = useState(order.status)
  const [note, setNote] = useState('')
  const [tracking, setTracking] = useState(order.tracking_number || '')
  const mutation = useUpdateOrderStatus()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await mutation.mutateAsync({ id: order.id, status, note: note || undefined, tracking_number: tracking || undefined })
      showToast('Status updated')
      onClose()
    } catch {
      showToast('Failed to update status', 'error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Update Status</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {STATUS_ORDER.map(s => (
                <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
              ))}
            </select>
          </div>
          {(status === 'shipped' || status === 'delivered') && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Tracking Number</label>
              <input value={tracking} onChange={e => setTracking(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Enter tracking number" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Note (optional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 px-4 py-2 bg-navy text-white rounded-lg text-sm hover:bg-navy-hover disabled:opacity-50">
              {mutation.isPending ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function NewOrderModal({ onClose }) {
  const mutation = useCreateOrder()
  const [form, setForm] = useState({
    customer_name: '', address_line1: '', city: '', state: '', zip: '',
    platform: 'manual', notes: '',
  })
  const [items, setItems] = useState([{ name: '', quantity: 1, unit_price: '' }])
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await mutation.mutateAsync({ ...form, items: items.filter(i => i.name) })
      showToast('Order created')
      onClose()
    } catch {
      showToast('Failed to create order', 'error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold text-gray-900 mb-4">New Order</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required value={form.customer_name} onChange={e => set('customer_name', e.target.value)}
            placeholder="Customer Name"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input required value={form.address_line1} onChange={e => set('address_line1', e.target.value)}
            placeholder="Address"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <div className="grid grid-cols-3 gap-2">
            <input required value={form.city} onChange={e => set('city', e.target.value)}
              placeholder="City" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input required value={form.state} onChange={e => set('state', e.target.value)}
              placeholder="State" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input required value={form.zip} onChange={e => set('zip', e.target.value)}
              placeholder="ZIP" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Items</p>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                <input value={item.name} onChange={e => {
                  const next = [...items]; next[i].name = e.target.value; setItems(next)
                }} placeholder="Item name"
                  className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input type="number" value={item.quantity} min={1} onChange={e => {
                  const next = [...items]; next[i].quantity = parseInt(e.target.value); setItems(next)
                }} placeholder="Qty"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            ))}
            <button type="button" onClick={() => setItems([...items, { name: '', quantity: 1, unit_price: '' }])}
              className="text-xs text-blue-600 hover:underline">
              + Add item
            </button>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 px-4 py-2 bg-navy text-white rounded-lg text-sm hover:bg-navy-hover disabled:opacity-50">
              {mutation.isPending ? 'Creating…' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function OrdersPage() {
  const [filters, setFilters] = useState({ search: '', status: '', page: 1 })
  const [statusModal, setStatusModal] = useState(null)
  const [showNewOrder, setShowNewOrder] = useState(false)
  const importCsv = useImportCsv()

  const { data, isLoading } = useOrders({ ...filters, limit: 20 })
  const orders = data?.orders || []

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

  return (
    <div className="flex flex-col min-h-screen">

      {/* Topbar */}
      <div className="topbar">
        <h1 className="text-[15px] font-semibold text-gray-900">Orders</h1>
        <div className="flex items-center gap-2">
          <label className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 cursor-pointer hover:bg-gray-50">
            Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
          </label>
          <button onClick={() => setShowNewOrder(true)}
            className="px-3 py-1.5 bg-navy text-white rounded-lg text-xs hover:bg-navy-hover">
            + New Order
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Search + status filter pills */}
        <div className="flex flex-wrap gap-3 mb-5">
          <input
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
            placeholder="Search by name or order ID…"
            className="flex-1 min-w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilters(f => ({ ...f, status: '', page: 1 }))}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !filters.status
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              All
            </button>
            {STATUS_ORDER.map(s => {
              const cfg = STATUS_CONFIG[s]
              const active = filters.status === s
              return (
                <button
                  key={s}
                  onClick={() => setFilters(f => ({ ...f, status: f.status === s ? '' : s, page: 1 }))}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
                  style={active
                    ? { color: cfg.color, background: cfg.bg, borderColor: cfg.color }
                    : { color: '#6B7280', background: '#fff', borderColor: '#E5E7EB' }
                  }
                >
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Orders table */}
        {isLoading ? (
          <div className="text-sm text-gray-400">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">No orders found</div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {orders.map(order => (
                <div key={order.id} className="card p-4">
                  <div className="flex justify-between items-start mb-2">
                    <Link to={`/orders/${order.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {order.customer_name}
                    </Link>
                    <button onClick={() => setStatusModal(order)}>
                      <StatusBadge status={order.status} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">{order.city}, {order.state}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <PlatformBadge platform={order.platform} />
                    <span className="text-xs text-gray-400">{order.item_count} item(s)</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Order ID</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Customer</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Platform</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Items</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Created</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs text-gray-500">
                          {order.external_id ? `#${order.external_id}` : <span className="text-gray-300">—</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900 block">{order.customer_name}</span>
                        <span className="text-xs text-gray-400">{order.city}, {order.state}</span>
                      </td>
                      <td className="px-4 py-3">
                        <PlatformBadge platform={order.platform} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{order.item_count}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setStatusModal(order)}>
                          <StatusBadge status={order.status} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/orders/${order.id}`}
                          className="px-2.5 py-1 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data?.total > 20 && (
              <div className="flex justify-center items-center gap-2 mt-5">
                <button
                  onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                  disabled={filters.page <= 1}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 disabled:opacity-40 hover:bg-gray-50">
                  ← Prev
                </button>
                <span className="text-xs text-gray-500">Page {filters.page}</span>
                <button
                  onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                  disabled={filters.page * 20 >= data?.total}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 disabled:opacity-40 hover:bg-gray-50">
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {statusModal && <StatusUpdateModal order={statusModal} onClose={() => setStatusModal(null)} />}
      {showNewOrder && <NewOrderModal onClose={() => setShowNewOrder(false)} />}
    </div>
  )
}
