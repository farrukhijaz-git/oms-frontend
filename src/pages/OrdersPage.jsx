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

function SortTh({ label, field, sort, onSort, style }) {
  const active = sort.sort_by === field
  const nextDir = active && sort.sort_dir === 'desc' ? 'asc' : 'desc'
  return (
    <th
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', ...style }}
      onClick={() => onSort(field, nextDir)}
    >
      {label}
      <span style={{ marginLeft: 4, fontSize: 10, color: active ? 'var(--oms-navy-accent)' : 'var(--oms-border)' }}>
        {active ? (sort.sort_dir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </th>
  )
}

const OMS_STATUS_ORDER = ['new', 'label_generated', 'inventory_ordered', 'packed', 'ready', 'shipped', 'delivered', 'cancelled']
const OMS_STATUS_LABEL = {
  new: 'New', label_generated: 'Label Gen.', inventory_ordered: 'Inv. Ordered',
  packed: 'Packed', ready: 'Ready', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
}

const WM_STATUS_ORDER = ['Created', 'Acknowledged', 'Shipped', 'Delivered', 'Cancelled']
const WM_STATUS_LABEL = {
  Created: 'Created', Acknowledged: 'Acknowledged', Shipped: 'Shipped',
  Delivered: 'Delivered', Cancelled: 'Cancelled',
}

function WalmartStatusBadge({ status }) {
  if (!status) return <span className="oms-text-muted">—</span>
  const cls = `oms-wm-status oms-wm-${status.toLowerCase()}`
  return <span className={cls}>{status}</span>
}

function trackingUrl(tn) {
  if (!tn) return null
  if (/^1Z[A-Z0-9]{16}$/i.test(tn)) return `https://www.ups.com/track?tracknum=${tn}`
  if (/^(9[2345][0-9]{20,}|420[0-9]{5}9[0-9]{21,})/.test(tn)) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tn}`
  if (/^[A-Z]{2}[0-9]{9}US$/.test(tn)) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tn}`
  if (/^[0-9]{12,22}$/.test(tn)) return `https://www.fedex.com/fedextrack/?trknbr=${tn}`
  return null
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
    <Modal title="Update OMS Status" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label="Status">
            <Select value={status} onChange={setStatus}>
              {OMS_STATUS_ORDER.map(s => (
                <option key={s} value={s}>{OMS_STATUS_LABEL[s] || s}</option>
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
  const [filters, setFilters] = useState({ search: '', status: [], page: 1, date_from: '', date_to: '', ship_node: '', ship_by_from: '', ship_by_to: '', deliver_by_from: '', deliver_by_to: '' })
  const [sort, setSort] = useState({ sort_by: 'order_date', sort_dir: 'desc' })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [limit, setLimit] = useState(20)
  const [statusModal, setStatusModal] = useState(null)
  const [showNewOrder, setShowNewOrder] = useState(false)
  const importCsv = useImportCsv()

  const activeFilters = { ...filters, ...sort, limit }
  // Convert status array to comma-separated string for the API
  if (activeFilters.status && activeFilters.status.length > 0) {
    activeFilters.status = activeFilters.status.join(',')
  } else {
    delete activeFilters.status
  }
  // Convert date-only values (YYYY-MM-DD) to full UTC timestamps using the
  // browser's local timezone so the backend comparison aligns with what the
  // user sees in the UI (dates are displayed in local timezone).
  const dateKeys = ['date_from', 'ship_by_from', 'date_to', 'ship_by_to', 'deliver_by_from', 'deliver_by_to']
  dateKeys.forEach(k => {
    if (activeFilters[k] && activeFilters[k].length === 10) {
      if (k.endsWith('_to')) {
        activeFilters[k] = new Date(activeFilters[k] + 'T23:59:59.999').toISOString()
      } else {
        activeFilters[k] = new Date(activeFilters[k] + 'T00:00:00').toISOString()
      }
    }
  })
  // Strip empty string params so they don't get sent as empty query strings
  Object.keys(activeFilters).forEach(k => { if (activeFilters[k] === '') delete activeFilters[k] })
  const { data, isLoading } = useOrders(activeFilters)
  const orders = data?.orders || []
  const total = data?.total ?? null

  const hasAdvancedFilters = filters.date_from || filters.date_to || filters.ship_node || filters.ship_by_from || filters.ship_by_to || filters.deliver_by_from || filters.deliver_by_to
  const clearAdvanced = () => setFilters(f => ({ ...f, date_from: '', date_to: '', ship_node: '', ship_by_from: '', ship_by_to: '', deliver_by_from: '', deliver_by_to: '', page: 1 }))
  const handleSort = (field, dir) => { setSort({ sort_by: field, sort_dir: dir }); setFilters(f => ({ ...f, page: 1 })) }

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

        {/* Row 1: Search + OMS status pills + Filters button */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <SearchBox
            value={filters.search}
            onChange={v => setFilters(f => ({ ...f, search: v, page: 1 }))}
            placeholder="Search by name or order ID…"
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <FilterPill
              active={filters.status.length === 0}
              onClick={() => setFilters(f => ({ ...f, status: [], page: 1 }))}
            >
              All
            </FilterPill>
            {OMS_STATUS_ORDER.map(s => (
              <FilterPill
                key={s}
                active={filters.status.includes(s)}
                onClick={() => setFilters(f => {
                  const cur = f.status
                  const next = cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s]
                  return { ...f, status: next, page: 1 }
                })}
              >
                {OMS_STATUS_LABEL[s]}
              </FilterPill>
            ))}
          </div>
          <button
            className={`oms-btn oms-btn-secondary oms-btn-sm${showAdvanced ? ' active' : ''}`}
            onClick={() => setShowAdvanced(v => !v)}
            style={{ whiteSpace: 'nowrap', position: 'relative', marginLeft: 'auto' }}
          >
            Filters
            {hasAdvancedFilters && (
              <span style={{
                position: 'absolute', top: -4, right: -4, width: 8, height: 8,
                borderRadius: '50%', background: 'var(--oms-navy-accent)', border: '2px solid var(--oms-surface)'
              }} />
            )}
          </button>
        </div>

        {/* Row 2: Advanced filters (collapsible) */}
        {showAdvanced && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end',
            padding: '12px 16px', background: 'var(--oms-navy-pale)', borderRadius: 8,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--oms-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Date</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="date" className="oms-input" value={filters.date_from}
                  onChange={e => setFilters(f => ({ ...f, date_from: e.target.value, page: 1 }))}
                  style={{ fontSize: 12, padding: '4px 8px', width: 140 }} />
                <span style={{ fontSize: 12, color: 'var(--oms-text-muted)' }}>to</span>
                <input type="date" className="oms-input" value={filters.date_to}
                  onChange={e => setFilters(f => ({ ...f, date_to: e.target.value, page: 1 }))}
                  style={{ fontSize: 12, padding: '4px 8px', width: 140 }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--oms-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ship Node</span>
              <input type="text" className="oms-input" value={filters.ship_node}
                onChange={e => setFilters(f => ({ ...f, ship_node: e.target.value, page: 1 }))}
                placeholder="e.g. Texas Faheem"
                style={{ fontSize: 12, padding: '4px 8px', width: 180 }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--oms-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ship By</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="date" className="oms-input" value={filters.ship_by_from}
                  onChange={e => setFilters(f => ({ ...f, ship_by_from: e.target.value, page: 1 }))}
                  style={{ fontSize: 12, padding: '4px 8px', width: 140 }} />
                <span style={{ fontSize: 12, color: 'var(--oms-text-muted)' }}>to</span>
                <input type="date" className="oms-input" value={filters.ship_by_to}
                  onChange={e => setFilters(f => ({ ...f, ship_by_to: e.target.value, page: 1 }))}
                  style={{ fontSize: 12, padding: '4px 8px', width: 140 }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--oms-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deliver By</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="date" className="oms-input" value={filters.deliver_by_from}
                  onChange={e => setFilters(f => ({ ...f, deliver_by_from: e.target.value, page: 1 }))}
                  style={{ fontSize: 12, padding: '4px 8px', width: 140 }} />
                <span style={{ fontSize: 12, color: 'var(--oms-text-muted)' }}>to</span>
                <input type="date" className="oms-input" value={filters.deliver_by_to}
                  onChange={e => setFilters(f => ({ ...f, deliver_by_to: e.target.value, page: 1 }))}
                  style={{ fontSize: 12, padding: '4px 8px', width: 140 }} />
              </div>
            </div>

            {hasAdvancedFilters && (
              <button className="oms-btn oms-btn-secondary oms-btn-sm" onClick={clearAdvanced}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Row 3: Pagination controls + total count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
          {total !== null && (
            <span style={{ fontSize: 12, color: 'var(--oms-text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
              {total.toLocaleString()} {total === 1 ? 'order' : 'orders'}
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
            <TableSkeleton rows={8} cols={8} />
          ) : orders.length === 0 ? (
            <EmptyState title="No orders found" sub="Try adjusting your filters or create a new order." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
            <table className="oms-table" style={{ minWidth: 1000 }}>
              <thead>
                <tr>
                  <th>Order #</th>
                  <SortTh label="Order Date"  field="order_date"     sort={sort} onSort={handleSort} />
                  <SortTh label="Customer"    field="customer_name"  sort={sort} onSort={handleSort} />
                  <SortTh label="Total"       field="order_total"    sort={sort} onSort={handleSort} style={{ textAlign: 'right' }} />
                  <th>Items</th>
                  <th>Ship Node</th>
                  <SortTh label="Ship By"     field="ship_by_date"   sort={sort} onSort={handleSort} />
                  <SortTh label="Deliver By"  field="deliver_by_date" sort={sort} onSort={handleSort} />
                  <th>Tracking</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} onClick={() => navigate(`/orders/${order.id}`)}>
                    <td>
                      <OrderId id={order.external_id ? `#${order.external_id}` : order.id.slice(0, 8)} />
                      {order.customer_order_id && (
                        <div className="oms-text-muted" style={{ fontSize: 10, marginTop: 2 }}>
                          CO# {order.customer_order_id}
                        </div>
                      )}
                    </td>
                    <td className="oms-text-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(order.order_date || order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{order.customer_name}</div>
                      {(order.city || order.state) && (
                        <div className="oms-text-muted" style={{ fontSize: 11, marginTop: 1 }}>
                          {[order.city, order.state].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="oms-text-secondary" style={{ fontSize: 13, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {order.order_total ? `$${parseFloat(order.order_total).toFixed(2)}` : <span className="oms-text-muted">—</span>}
                    </td>
                    <td className="oms-text-secondary">{order.item_count ?? '—'}</td>
                    <td className="oms-text-secondary" style={{ fontSize: 12 }}>
                      {order.ship_node || <span className="oms-text-muted">—</span>}
                    </td>
                    <td className="oms-text-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {order.ship_by_date
                        ? new Date(order.ship_by_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : <span className="oms-text-muted">—</span>
                      }
                    </td>
                    <td className="oms-text-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {order.deliver_by_date
                        ? new Date(order.deliver_by_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : <span className="oms-text-muted">—</span>
                      }
                    </td>
                    <td style={{ fontSize: 11 }}>
                      {order.tracking_number ? (
                        trackingUrl(order.tracking_number) ? (
                          <a
                            href={trackingUrl(order.tracking_number)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="oms-order-id"
                            style={{ fontSize: 11, color: 'var(--oms-navy-mid)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                            onClick={e => e.stopPropagation()}
                          >
                            {order.tracking_number}
                          </a>
                        ) : (
                          <span className="oms-order-id" style={{ fontSize: 11 }}>{order.tracking_number}</span>
                        )
                      ) : (
                        <span className="oms-text-muted">—</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={e => { e.stopPropagation(); setStatusModal(order) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                      >
                        <StatusBadge status={order.status} />
                      </button>
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
