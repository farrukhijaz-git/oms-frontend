import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useOrder, useUpdateOrderStatus } from '../hooks/useOrders'
import StatusBadge from '../components/StatusBadge'
import { showToast } from '../components/Toast'
import api from '../api/client'

const STATUSES = ['new', 'label_generated', 'inventory_ordered', 'packed', 'ready', 'shipped']

export default function OrderDetailPage() {
  const { id } = useParams()
  const { data: order, isLoading } = useOrder(id)
  const mutation = useUpdateOrderStatus()
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [note, setNote] = useState('')
  const [tracking, setTracking] = useState('')

  useEffect(() => {
    if (id) api.post(`/orders/${id}/view`).catch(() => {})
  }, [id])

  useEffect(() => {
    if (order) setNewStatus(order.status)
  }, [order])

  if (isLoading) return <div className="text-gray-400">Loading...</div>
  if (!order) return <div className="text-gray-400">Order not found</div>

  const handleStatusUpdate = async (e) => {
    e.preventDefault()
    try {
      await mutation.mutateAsync({ id, status: newStatus, note: note || undefined, tracking_number: tracking || undefined })
      showToast('Status updated')
      setShowStatusModal(false)
      setNote('')
    } catch {
      showToast('Failed to update', 'error')
    }
  }

  const handleDownloadLabel = async () => {
    if (!order.label_id) return
    try {
      const { data } = await api.get(`/labels/${order.label_id}/download`)
      window.open(data.url, '_blank')
    } catch {
      showToast('Could not download label', 'error')
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/orders" className="text-blue-600 hover:underline text-sm">← Orders</Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{order.customer_name}</h1>
            <p className="text-gray-500 text-sm mt-1">
              {order.address_line1}{order.address_line2 ? `, ${order.address_line2}` : ''}, {order.city}, {order.state} {order.zip}
            </p>
            {order.external_id && <p className="text-xs text-gray-400 mt-1">Order #{order.external_id}</p>}
          </div>
          <div className="flex items-center gap-3">
            <span className="capitalize text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">{order.platform}</span>
            <StatusBadge status={order.status} />
            <button onClick={() => setShowStatusModal(true)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
              Update Status
            </button>
          </div>
        </div>
      </div>

      {/* Status stepper */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4 overflow-x-auto">
        <div className="flex min-w-max">
          {STATUSES.map((s, i) => {
            const idx = STATUSES.indexOf(order.status)
            const done = i <= idx
            return (
              <div key={s} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    {i + 1}
                  </div>
                  <span className="text-xs text-gray-500 mt-1 text-center w-20">{s.replace(/_/g, ' ')}</span>
                </div>
                {i < STATUSES.length - 1 && (
                  <div className={`w-16 h-1 mx-1 ${i < idx ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {/* Items */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Items</h2>
          {order.items?.length ? (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500">
                <th className="pb-2">Item</th><th className="pb-2">Qty</th><th className="pb-2">Price</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {order.items.map(item => (
                  <tr key={item.id}>
                    <td className="py-2">{item.name} {item.sku && <span className="text-gray-400">({item.sku})</span>}</td>
                    <td className="py-2">{item.quantity}</td>
                    <td className="py-2">{item.unit_price ? `$${item.unit_price}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-gray-400 text-sm">No items</p>}
        </div>

        {/* Label */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Shipping Label</h2>
          {order.label_id ? (
            <div>
              <p className="text-sm text-green-600 mb-2">Label attached</p>
              {order.tracking_number && <p className="text-sm text-gray-600 mb-3">Tracking: {order.tracking_number}</p>}
              <button onClick={handleDownloadLabel}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                Download Label
              </button>
            </div>
          ) : <p className="text-gray-400 text-sm">No label attached</p>}
        </div>
      </div>

      {/* Audit log */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Status History</h2>
        {order.status_log?.length ? (
          <div className="space-y-3">
            {order.status_log.map((entry, i) => (
              <div key={entry.id} className="flex gap-3 text-sm">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5" />
                  {i < order.status_log.length - 1 && <div className="w-0.5 h-full bg-gray-200 mt-1" />}
                </div>
                <div className="pb-3">
                  <div className="flex gap-2 items-center flex-wrap">
                    <StatusBadge status={entry.to_status} />
                    {entry.changed_by_name && <span className="text-gray-500">by {entry.changed_by_name}</span>}
                    <span className="text-gray-400 text-xs">{new Date(entry.changed_at).toLocaleString()}</span>
                  </div>
                  {entry.note && <p className="text-gray-600 mt-0.5">{entry.note}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-gray-400 text-sm">No history</p>}
      </div>

      {/* Status update modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Update Status</h3>
            <form onSubmit={handleStatusUpdate} className="space-y-4">
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
              {newStatus === 'shipped' && (
                <input value={tracking} onChange={e => setTracking(e.target.value)}
                  placeholder="Tracking number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              )}
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                placeholder="Note (optional)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowStatusModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={mutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
                  {mutation.isPending ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
