import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useOrder, useUpdateOrderStatus } from '../hooks/useOrders'
import StatusBadge, { STATUS_CONFIG, STATUS_ORDER, PlatformBadge, StatusDot } from '../components/StatusBadge'
import { showToast } from '../components/Toast'
import api from '../api/client'

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

  if (isLoading) return (
    <div className="flex flex-col min-h-screen">
      <div className="topbar"><span className="text-[15px] font-semibold text-gray-900">Order</span></div>
      <div className="p-6 text-sm text-gray-400">Loading…</div>
    </div>
  )
  if (!order) return (
    <div className="flex flex-col min-h-screen">
      <div className="topbar"><span className="text-[15px] font-semibold text-gray-900">Order</span></div>
      <div className="p-6 text-sm text-gray-400">Order not found</div>
    </div>
  )

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

  const currentIdx = STATUS_ORDER.indexOf(order.status)

  return (
    <div className="flex flex-col min-h-screen">

      {/* Topbar */}
      <div className="topbar">
        <div className="flex items-center gap-3">
          <Link to="/orders" className="text-xs text-gray-400 hover:text-gray-600">← Orders</Link>
          <span className="text-gray-200">|</span>
          <span className="text-[15px] font-semibold text-gray-900">{order.customer_name}</span>
          {order.external_id && (
            <span className="font-mono text-xs text-gray-400">#{order.external_id}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <PlatformBadge platform={order.platform} />
          <StatusBadge status={order.status} />
          <button
            onClick={() => setShowStatusModal(true)}
            className="px-3 py-1.5 bg-navy text-white text-xs rounded-lg hover:bg-navy-hover"
          >
            Update Status
          </button>
        </div>
      </div>

      <div className="p-6 max-w-5xl space-y-4">

        {/* Customer info card */}
        <div className="card p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Customer &amp; Address</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">{order.customer_name}</p>
              {order.external_id && (
                <p className="font-mono text-xs text-gray-400 mt-0.5">Order #{order.external_id}</p>
              )}
            </div>
            <div className="text-sm text-gray-600">
              <p>{order.address_line1}{order.address_line2 ? `, ${order.address_line2}` : ''}</p>
              <p>{order.city}, {order.state} {order.zip}</p>
              {order.country && order.country !== 'US' && <p>{order.country}</p>}
            </div>
          </div>
        </div>

        {/* Status stepper */}
        <div className="card p-5 overflow-x-auto">
          <div className="flex min-w-max gap-0">
            {STATUS_ORDER.map((s, i) => {
              const cfg = STATUS_CONFIG[s]
              const done = i <= currentIdx
              const active = i === currentIdx
              return (
                <div key={s} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        active ? 'text-white' : done ? 'text-white' : 'bg-gray-100 text-gray-400'
                      }`}
                      style={done ? { background: cfg.color } : {}}
                    >
                      {i + 1}
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1.5 text-center w-[80px] leading-tight">
                      {cfg.label}
                    </span>
                  </div>
                  {i < STATUS_ORDER.length - 1 && (
                    <div
                      className="w-12 h-0.5 mx-1 mb-4 transition-all"
                      style={{ background: i < currentIdx ? STATUS_CONFIG[STATUS_ORDER[i]].color : '#E5E7EB' }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Items */}
          <div className="card p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Items</h2>
            {order.items?.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-2 text-xs font-medium text-gray-500">Item</th>
                    <th className="text-left pb-2 text-xs font-medium text-gray-500 w-12">Qty</th>
                    <th className="text-left pb-2 text-xs font-medium text-gray-500 w-16">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {order.items.map(item => (
                    <tr key={item.id}>
                      <td className="py-2 text-gray-800">
                        {item.name}
                        {item.sku && <span className="text-gray-400 font-mono text-xs ml-1">({item.sku})</span>}
                      </td>
                      <td className="py-2 text-gray-600">{item.quantity}</td>
                      <td className="py-2 text-gray-600">{item.unit_price ? `$${item.unit_price}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-400">No items</p>
            )}
          </div>

          {/* Shipping label */}
          <div className="card p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Shipping Label</h2>
            {order.label_id ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm text-green-700 font-medium">Label attached</span>
                </div>
                {order.tracking_number && (
                  <p className="text-sm text-gray-600">
                    Tracking: <span className="font-mono">{order.tracking_number}</span>
                  </p>
                )}
                <button
                  onClick={handleDownloadLabel}
                  className="mt-2 px-3 py-1.5 bg-navy text-white text-xs rounded-lg hover:bg-navy-hover"
                >
                  Download Label
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No label attached</p>
            )}
          </div>
        </div>

        {/* Status history */}
        <div className="card p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Status History</h2>
          {order.status_log?.length ? (
            <div className="space-y-0">
              {order.status_log.map((entry, i) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center pt-1">
                    <StatusDot status={entry.to_status} size={8} />
                    {i < order.status_log.length - 1 && (
                      <div className="w-px flex-1 bg-gray-100 my-1" />
                    )}
                  </div>
                  <div className="pb-4 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={entry.to_status} />
                      {entry.changed_by_name && (
                        <span className="text-xs text-gray-500">by {entry.changed_by_name}</span>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(entry.changed_at).toLocaleString()}
                      </span>
                    </div>
                    {entry.note && (
                      <p className="text-xs text-gray-600 mt-1">{entry.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No history</p>
          )}
        </div>
      </div>

      {/* Status update modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Update Status</h3>
            <form onSubmit={handleStatusUpdate} className="space-y-4">
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {STATUS_ORDER.map(s => (
                  <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
                ))}
              </select>
              {newStatus === 'shipped' && (
                <input value={tracking} onChange={e => setTracking(e.target.value)}
                  placeholder="Tracking number"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              )}
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                placeholder="Note (optional)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowStatusModal(false)}
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
      )}
    </div>
  )
}
