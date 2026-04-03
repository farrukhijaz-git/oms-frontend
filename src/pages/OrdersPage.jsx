import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrders, useUpdateOrderStatus, useImportCsv } from '../hooks/useOrders'
import {
  Topbar, Panel, BtnPrimary, BtnSecondary,
  StatusBadge, PlatformBadge, OrderId,
  FilterPill, SearchBox, Modal, ModalActions,
  Select, FormField, Pagination, TableSkeleton, EmptyState, useToast,
} from '../components.jsx'
import NewOrderModal from '../components/NewOrderModal'

const STATUS_ORDER = ['new', 'label_generated', 'inventory_ordered', 'packed', 'ready', 'shipped', 'delivered']
const STATUS_LABEL = {
  new: 'New', label_generated: 'Label Gen.', inventory_ordered: 'Inv. Ordered',
  packed: 'Packed', ready: 'Ready', shipped: 'Shipped', delivered: 'Delivered',
}

function StatusUpdateModal({ order, onClose }) {
  const toast = useToast()
  const [status, setStatus] = useState(order.status)
  const [note, setNote] = useState('')
  const [tracking, setTracking] = useState(order.tracking_number || '')
  const mutation = useUpdateOrderStatus()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await mutation.mutateAsync({ id: order.id, status, note: note || undefined, tracking_number: tracking || undefined })
      toast.success('Status updated')
      onClose()
    } catch {
      toast.error('Failed to update status')
    }
  }

  return (
    <Modal title="Update Status" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label="Status">
            <Select value={status} onChange={setStatus}>
              {STATUS_ORDER.map(s => (
                <option key={s} value={s}>{STATUS_LABEL[s] || s}</option>
              ))}
            </Select>
          </FormField>
          {(status === 'shipped' || status === 'delivered') && (
            <FormField label="Tracking Number">
              <input
                className="oms-input"
                value={tracking}
                onChange={e => setTracking(e.target.value)}
                placeholder="Enter tracking number"
              />
            </FormField>
          )}
          <FormField label="Note (optional)">
            <textarea
              className="oms-input"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              style={{ resize: 'none' }}
            />
          </FormField>
        </div>
        <ModalActions>
          <BtnSecondary onClick={onClose}>Cancel</BtnSecondary>
          <BtnPrimary loading={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Confirm'}
          </BtnPrimary>
        </ModalActions>
      </form>
    </Modal>
  )
}

export default function OrdersPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [filters, setFilters] = useState({ search: '', status: '', page: 1 })
  const [limit, setLimit] = useState(20)
  const [statusModal, setStatusModal] = useState(null)
  const [showNewOrder, setShowNewOrder] = useState(false)
  const importCsv = useImportCsv()

  const { data, isLoading } = useOrders({ ...filters, limit })
  const orders = data?.orders || []

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

      <Topbar title="Orders">
        <label className="oms-btn oms-btn-secondary oms-btn-sm" style={{ cursor: 'pointer' }}>
          Import CSV
          <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvImport} />
        </label>
        <BtnPrimary size="sm" onClick={() => setShowNewOrder(true)}>+ New Order</BtnPrimary>
      </Topbar>

      <div className="oms-content">

        {/* Search + status filter pills + row count */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <SearchBox
            value={filters.search}
            onChange={v => setFilters(f => ({ ...f, search: v, page: 1 }))}
            placeholder="Search by name or order ID…"
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 }}>
            <FilterPill
              active={!filters.status}
              onClick={() => setFilters(f => ({ ...f, status: '', page: 1 }))}
            >
              All
            </FilterPill>
            {STATUS_ORDER.map(s => (
              <FilterPill
                key={s}
                active={filters.status === s}
                onClick={() => setFilters(f => ({ ...f, status: f.status === s ? '' : s, page: 1 }))}
              >
                {STATUS_LABEL[s]}
              </FilterPill>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: 'var(--oms-text-muted)', whiteSpace: 'nowrap' }}>Rows per page</span>
            <select
              className="oms-select"
              value={limit}
              onChange={e => { setLimit(Number(e.target.value)); setFilters(f => ({ ...f, page: 1 })) }}
              style={{ width: 72, fontSize: 12, padding: '4px 8px' }}
            >
              {[20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Orders table */}
        <Panel>
          {isLoading ? (
            <TableSkeleton rows={8} cols={7} />
          ) : orders.length === 0 ? (
            <EmptyState title="No orders found" sub="Try adjusting your filters or create a new order." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
            <table className="oms-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Platform</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Order Date</th>
                  <th>Ship By</th>
                  <th>Ship Node</th>
                  <th>Tracking</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
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
                    <td>
                      <button
                        onClick={e => { e.stopPropagation(); setStatusModal(order) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <StatusBadge status={order.status} />
                      </button>
                    </td>
                    <td className="oms-text-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(order.order_date || order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="oms-text-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {order.ship_by_date
                        ? new Date(order.ship_by_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : <span className="oms-text-muted">—</span>
                      }
                    </td>
                    <td className="oms-text-secondary" style={{ fontSize: 12 }}>
                      {order.ship_node || <span className="oms-text-muted">—</span>}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {order.tracking_number
                        ? <span className="oms-order-id" style={{ fontSize: 11 }}>{order.tracking_number}</span>
                        : <span className="oms-text-muted">—</span>
                      }
                    </td>
                    <td>
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/orders/${order.id}`) }}
                        className="oms-btn oms-btn-secondary oms-btn-sm"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </Panel>

        {data?.total > limit && (
          <Pagination
            page={filters.page}
            total={data.total}
            limit={limit}
            onChange={p => setFilters(f => ({ ...f, page: p }))}
          />
        )}

      </div>

      {statusModal && <StatusUpdateModal order={statusModal} onClose={() => setStatusModal(null)} />}
      {showNewOrder && <NewOrderModal onClose={() => setShowNewOrder(false)} />}
    </div>
  )
}
