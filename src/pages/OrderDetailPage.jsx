import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useOrder, useUpdateOrderStatus } from '../hooks/useOrders'
import {
  Topbar, Panel, PanelHeader, PanelTitle, PanelBody,
  StatusBadge, StatusDot, StatusStepper, PlatformBadge,
  BtnPrimary, BtnSecondary, Modal, ModalActions,
  Select, FormField, EmptyState, useToast,
} from '../components.jsx'
import api from '../api/client'

const STATUS_ORDER = ['new', 'label_generated', 'inventory_ordered', 'packed', 'ready', 'shipped', 'delivered']
const STATUS_LABEL = {
  new: 'New', label_generated: 'Label Gen.', inventory_ordered: 'Inv. Ordered',
  packed: 'Packed', ready: 'Ready', shipped: 'Shipped', delivered: 'Delivered',
}

function trackingUrl(tn) {
  if (!tn) return null
  if (/^1Z[A-Z0-9]{16}$/i.test(tn)) return `https://www.ups.com/track?tracknum=${tn}`
  if (/^(9[2345][0-9]{20,}|420[0-9]{5}9[0-9]{21,})/.test(tn)) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tn}`
  if (/^[A-Z]{2}[0-9]{9}US$/.test(tn)) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tn}`
  if (/^[0-9]{12,22}$/.test(tn)) return `https://www.fedex.com/fedextrack/?trknbr=${tn}`
  return null
}

const STAT_LABEL = { fontSize: 11, color: 'var(--oms-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5, fontWeight: 500 }
const STAT_VALUE = { fontSize: 14, fontWeight: 600, color: 'var(--oms-text-primary)' }

export default function OrderDetailPage() {
  const { id } = useParams()
  const toast = useToast()
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
    <div className="oms-main">
      <Topbar title="Order" />
      <div className="oms-content">
        <div className="oms-text-muted" style={{ fontSize: 13 }}>Loading…</div>
      </div>
    </div>
  )
  if (!order) return (
    <div className="oms-main">
      <Topbar title="Order" />
      <div className="oms-content">
        <EmptyState title="Order not found" sub="This order does not exist or was deleted." />
      </div>
    </div>
  )

  const handleStatusUpdate = async (e) => {
    e.preventDefault()
    try {
      await mutation.mutateAsync({ id, status: newStatus, note: note || undefined, tracking_number: tracking || undefined })
      toast.success('Status updated')
      setShowStatusModal(false)
      setNote('')
    } catch {
      toast.error('Failed to update')
    }
  }

  const handleDownloadLabel = async () => {
    if (!order.label_id) return
    try {
      const { data } = await api.get(`/labels/${order.label_id}/download`)
      window.open(data.url, '_blank')
    } catch {
      toast.error('Could not download label')
    }
  }

  return (
    <div className="oms-main">

      <Topbar title={order.customer_name}>
        <Link to="/orders" style={{ fontSize: 12, color: 'var(--oms-text-muted)', textDecoration: 'none' }}>
          ← Orders
        </Link>
        {order.external_id && (
          <span className="oms-order-id" style={{ fontSize: 12 }}>#{order.external_id}</span>
        )}
        <PlatformBadge platform={order.platform} />
        <StatusBadge status={order.status} />
        <BtnPrimary size="sm" onClick={() => setShowStatusModal(true)}>Update Status</BtnPrimary>
      </Topbar>

      <div className="oms-content" style={{ maxWidth: 900 }}>

        {/* Customer info */}
        <Panel>
          <PanelHeader>
            <PanelTitle>Customer &amp; Address</PanelTitle>
          </PanelHeader>
          <PanelBody>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--oms-text-primary)' }}>{order.customer_name}</div>
                {order.external_id && (
                  <div className="oms-order-id" style={{ marginTop: 4 }}>Order #{order.external_id}</div>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--oms-text-secondary)', lineHeight: 1.6 }}>
                <div>{order.address_line1}{order.address_line2 ? `, ${order.address_line2}` : ''}</div>
                <div>{order.city}, {order.state} {order.zip}</div>
                {order.country && order.country !== 'US' && <div>{order.country}</div>}
              </div>
            </div>
          </PanelBody>
        </Panel>

        {/* Order info */}
        <Panel>
          <PanelHeader><PanelTitle>Order Details</PanelTitle></PanelHeader>
          <PanelBody>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px 24px' }}>

              <div>
                <div style={STAT_LABEL}>Order Date</div>
                <div style={STAT_VALUE}>
                  {order.order_date 
                    ? new Date(order.order_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                    : new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                  }
                </div>
              </div>

              {(() => {
                // Use marketplace-provided total if available, otherwise calculate from items
                const total = order.order_total || 
                  (order.items?.length > 0 
                    ? order.items.reduce((s, i) => s + (parseFloat(i.unit_price) || 0) * (i.quantity || 1), 0)
                    : 0);
                return total > 0 ? (
                  <div>
                    <div style={STAT_LABEL}>Order Total</div>
                    <div style={STAT_VALUE}>${parseFloat(total).toFixed(2)}</div>
                  </div>
                ) : null
              })()}

              <div>
                <div style={STAT_LABEL}>Platform</div>
                <div style={{ marginTop: 2 }}><PlatformBadge platform={order.platform} /></div>
              </div>

              <div>
                <div style={STAT_LABEL}>Items</div>
                <div style={STAT_VALUE}>{order.items?.length ?? '—'}</div>
              </div>

              {order.ship_by_date && (
                <div>
                  <div style={STAT_LABEL}>Ship By</div>
                  <div style={STAT_VALUE}>
                    {new Date(order.ship_by_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              )}

              {order.deliver_by_date && (
                <div>
                  <div style={STAT_LABEL}>Deliver By</div>
                  <div style={STAT_VALUE}>
                    {new Date(order.deliver_by_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              )}

              {order.ship_node && (
                <div>
                  <div style={STAT_LABEL}>Ship Node</div>
                  <div style={STAT_VALUE}>{order.ship_node}</div>
                </div>
              )}

              {order.tracking_number && (
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={STAT_LABEL}>Tracking Number</div>
                  <div style={{ marginTop: 2 }}>
                    {trackingUrl(order.tracking_number) ? (
                      <a href={trackingUrl(order.tracking_number)} target="_blank" rel="noopener noreferrer"
                        className="oms-order-id"
                        style={{ fontSize: 13, color: 'var(--oms-navy-mid)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                        {order.tracking_number}
                      </a>
                    ) : (
                      <span className="oms-order-id" style={{ fontSize: 13 }}>{order.tracking_number}</span>
                    )}
                  </div>
                </div>
              )}

              {order.notes && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={STAT_LABEL}>Notes</div>
                  <div style={{ fontSize: 13, color: 'var(--oms-text-secondary)', marginTop: 2 }}>{order.notes}</div>
                </div>
              )}

            </div>
          </PanelBody>
        </Panel>

        {/* Status stepper */}
        <Panel>
          <StatusStepper currentStatus={order.status} />
        </Panel>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          {/* Items */}
          <Panel>
            <PanelHeader><PanelTitle>Items</PanelTitle></PanelHeader>
            {order.items?.length ? (
              <table className="oms-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ width: 48 }}>Qty</th>
                    <th style={{ width: 64 }}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map(item => (
                    <tr key={item.id}>
                      <td>
                        {item.name}
                        {item.sku && <span className="oms-order-id" style={{ marginLeft: 4 }}>({item.sku})</span>}
                      </td>
                      <td className="oms-text-secondary">{item.quantity}</td>
                      <td className="oms-text-secondary">{item.unit_price ? `$${item.unit_price}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <PanelBody>
                <span className="oms-text-muted" style={{ fontSize: 13 }}>No items</span>
              </PanelBody>
            )}
          </Panel>

          {/* Shipping label */}
          <Panel>
            <PanelHeader><PanelTitle>Shipping Label</PanelTitle></PanelHeader>
            <PanelBody>
              {order.label_id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--oms-label-text)', display: 'inline-block' }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--oms-label-text)' }}>Label attached</span>
                  </div>
                  {order.tracking_number && (
                    <div style={{ fontSize: 13, color: 'var(--oms-text-secondary)' }}>
                      Tracking: <span className="oms-order-id">{order.tracking_number}</span>
                    </div>
                  )}
                  <div style={{ marginTop: 4 }}>
                    <BtnSecondary size="sm" onClick={handleDownloadLabel}>Download Label</BtnSecondary>
                  </div>
                </div>
              ) : (
                <span className="oms-text-muted" style={{ fontSize: 13 }}>No label attached</span>
              )}
            </PanelBody>
          </Panel>
        </div>

        {/* Status history */}
        <Panel>
          <PanelHeader><PanelTitle>Status History</PanelTitle></PanelHeader>
          {order.status_log?.length ? (
            <div style={{ padding: '8px 18px 16px' }}>
              {order.status_log.map((entry, i) => (
                <div key={entry.id} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
                    <StatusDot status={entry.to_status} />
                    {i < order.status_log.length - 1 && (
                      <div style={{ width: 1, flex: 1, background: 'var(--oms-border)', margin: '4px 0' }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: 16, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <StatusBadge status={entry.to_status} />
                      {entry.changed_by_name && (
                        <span className="oms-text-muted" style={{ fontSize: 12 }}>by {entry.changed_by_name}</span>
                      )}
                      <span className="oms-text-muted" style={{ fontSize: 11 }}>
                        {new Date(entry.changed_at).toLocaleString()}
                      </span>
                    </div>
                    {entry.note && (
                      <div style={{ fontSize: 12, color: 'var(--oms-text-secondary)', marginTop: 4 }}>{entry.note}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <PanelBody>
              <span className="oms-text-muted" style={{ fontSize: 13 }}>No history</span>
            </PanelBody>
          )}
        </Panel>

      </div>

      {/* Status update modal */}
      {showStatusModal && (
        <Modal title="Update Status" onClose={() => setShowStatusModal(false)}>
          <form onSubmit={handleStatusUpdate}>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <FormField label="Status">
                <Select value={newStatus} onChange={setNewStatus}>
                  {STATUS_ORDER.map(s => (
                    <option key={s} value={s}>{STATUS_LABEL[s] || s}</option>
                  ))}
                </Select>
              </FormField>
              {newStatus === 'shipped' && (
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
              <BtnSecondary onClick={() => setShowStatusModal(false)}>Cancel</BtnSecondary>
              <BtnPrimary loading={mutation.isPending}>
                {mutation.isPending ? 'Saving…' : 'Confirm'}
              </BtnPrimary>
            </ModalActions>
          </form>
        </Modal>
      )}
    </div>
  )
}
