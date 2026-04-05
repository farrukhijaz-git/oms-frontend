import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useOrder, useUpdateOrderStatus } from '../hooks/useOrders'
import { useOrderLabels } from '../hooks/useLabels'
import {
  Topbar, Panel, PanelHeader, PanelTitle, PanelBody,
  StatusBadge, StatusDot, StatusStepper, PlatformBadge,
  BtnPrimary, BtnSecondary, Modal, ModalActions,
  Select, FormField, EmptyState, useToast,
} from '../components.jsx'
import api from '../api/client'

const OMS_STATUS_ORDER = ['new', 'label_generated', 'inventory_ordered', 'packed', 'ready', 'shipped', 'delivered', 'cancelled']
const OMS_STATUS_LABEL = {
  new: 'New', label_generated: 'Label Gen.', inventory_ordered: 'Inv. Ordered',
  packed: 'Packed', ready: 'Ready', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
}

function WalmartStatusBadge({ status }) {
  if (!status) return null
  const cls = `oms-wm-status oms-wm-${status.toLowerCase()}`
  return <span className={cls}>{status}</span>
}

function trackingLink(tn) {
  if (!tn) return null
  if (/^1Z[A-Z0-9]{16}$/i.test(tn)) return `https://www.ups.com/track?tracknum=${tn}`
  if (/^(9[2345][0-9]{20,}|420[0-9]{5}9[0-9]{21,})/.test(tn)) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tn}`
  if (/^[A-Z]{2}[0-9]{9}US$/.test(tn)) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tn}`
  if (/^[0-9]{12,22}$/.test(tn)) return `https://www.fedex.com/fedextrack/?trknbr=${tn}`
  return null
}

const LBL = { fontSize: 11, color: 'var(--oms-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 500 }
const VAL = { fontSize: 14, fontWeight: 600, color: 'var(--oms-text-primary)' }
const VAL_SM = { fontSize: 13, color: 'var(--oms-text-secondary)' }

function Field({ label, children }) {
  return (
    <div>
      <div style={LBL}>{label}</div>
      <div style={VAL}>{children}</div>
    </div>
  )
}

function FieldSm({ label, children }) {
  return (
    <div>
      <div style={LBL}>{label}</div>
      <div style={VAL_SM}>{children}</div>
    </div>
  )
}

function TrackingLink({ tn, tUrl, style }) {
  if (!tn) return <span className="oms-text-muted">—</span>
  const url = tUrl || trackingLink(tn)
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="oms-order-id"
        style={{ fontSize: 12, color: 'var(--oms-navy-mid)', textDecoration: 'underline', textDecorationStyle: 'dotted', ...style }}>
        {tn}
      </a>
    )
  }
  return <span className="oms-order-id" style={{ fontSize: 12, ...style }}>{tn}</span>
}

function ItemCard({ item }) {
  const tn = item.line_tracking_number
  const tUrl = item.tracking_url || trackingLink(tn)
  const lineTotal = (parseFloat(item.unit_price) || 0) * (item.quantity || 1)

  return (
    <div style={{
      display: 'flex', gap: 14, padding: '14px 0',
      borderBottom: '1px solid var(--oms-border)', minWidth: 0,
    }}>
      {/* Image placeholder */}
      <div style={{
        width: 64, height: 64, flexShrink: 0,
        background: '#f0f2f5', borderRadius: 8, border: '1px solid var(--oms-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c0c8d4" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>

      {/* Middle: name, variant, sku, condition */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--oms-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name || '—'}
        </div>
        {item.variant && (
          <div style={{ fontSize: 12, color: 'var(--oms-text-secondary)' }}>{item.variant}</div>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {item.sku && (
            <span className="oms-order-id" style={{ fontSize: 11, background: '#f0f2f5', padding: '2px 6px', borderRadius: 4 }}>
              {item.sku}
            </span>
          )}
          {item.condition && (
            <span style={{ fontSize: 11, color: 'var(--oms-text-muted)', background: '#f0f2f5', padding: '2px 6px', borderRadius: 4 }}>
              {item.condition}
            </span>
          )}
        </div>
      </div>

      {/* Right: price, qty, status, tracking, ship date */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0, justifyContent: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--oms-text-primary)' }}>
          {lineTotal > 0
            ? `$${lineTotal.toFixed(2)}`
            : item.unit_price ? `$${parseFloat(item.unit_price).toFixed(2)}` : '—'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--oms-text-secondary)' }}>Qty: {item.quantity}</div>
        {item.line_status && <WalmartStatusBadge status={item.line_status} />}
        {tn && <TrackingLink tn={tn} tUrl={tUrl} />}
        {item.ship_datetime && (
          <div style={{ fontSize: 11, color: 'var(--oms-text-muted)', whiteSpace: 'nowrap' }}>
            {new Date(item.ship_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const toast = useToast()
  const { data: order, isLoading } = useOrder(id)
  const { data: labelsData } = useOrderLabels(id)
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

  const handleDownloadLabel = async (labelId) => {
    try {
      const { data } = await api.get(`/labels/${labelId}/download`)
      window.open(data.url, '_blank')
    } catch {
      toast.error('Could not download label')
    }
  }

  const orderTotal = order.order_total ||
    (order.items?.length > 0
      ? order.items.reduce((s, i) => s + (parseFloat(i.unit_price) || 0) * (i.quantity || 1), 0)
      : 0)

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
        {order.walmart_status && <WalmartStatusBadge status={order.walmart_status} />}
        <StatusBadge status={order.status} />
        <BtnPrimary size="sm" onClick={() => setShowStatusModal(true)}>Update Status</BtnPrimary>
      </Topbar>

      <div className="oms-content">

        {/* Status stepper — full width */}
        <Panel>
          <StatusStepper currentStatus={order.status} />
        </Panel>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14, alignItems: 'start', minWidth: 0 }}>

          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

            {/* Order Summary */}
            <Panel>
              <PanelHeader><PanelTitle>Order Summary</PanelTitle></PanelHeader>
              <PanelBody>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '14px 20px' }}>
                  <Field label="Purchase Order #">
                    {order.external_id
                      ? <span className="oms-order-id">#{order.external_id}</span>
                      : <span className="oms-text-muted">—</span>}
                  </Field>
                  {order.customer_order_id && (
                    <Field label="Customer Order #">
                      <span className="oms-order-id">{order.customer_order_id}</span>
                    </Field>
                  )}
                  <Field label="Order Date">
                    {new Date(order.order_date || order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </Field>
                  {orderTotal > 0 && (
                    <Field label="Order Total">
                      ${parseFloat(orderTotal).toFixed(2)}
                      {order.total_tax && (
                        <span className="oms-text-muted" style={{ fontSize: 11, fontWeight: 400, marginLeft: 4 }}>
                          (tax ${parseFloat(order.total_tax).toFixed(2)})
                        </span>
                      )}
                    </Field>
                  )}
                  <Field label="Items">{order.items?.length ?? '—'}</Field>
                  <div>
                    <div style={LBL}>Walmart Status</div>
                    <div style={{ marginTop: 2 }}>
                      {order.walmart_status
                        ? <WalmartStatusBadge status={order.walmart_status} />
                        : <span className="oms-text-muted" style={{ fontSize: 13 }}>—</span>}
                    </div>
                  </div>
                  <div>
                    <div style={LBL}>OMS Status</div>
                    <div style={{ marginTop: 2 }}>
                      <button
                        onClick={() => setShowStatusModal(true)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <StatusBadge status={order.status} />
                      </button>
                    </div>
                  </div>
                </div>
              </PanelBody>
            </Panel>

            {/* Customer & Shipping */}
            <Panel>
              <PanelHeader><PanelTitle>Customer &amp; Shipping</PanelTitle></PanelHeader>
              <PanelBody>
                {/* Name + address block */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--oms-text-primary)' }}>{order.customer_name}</div>
                  <div style={{ fontSize: 13, color: 'var(--oms-text-secondary)', marginTop: 6, lineHeight: 1.7 }}>
                    <div>{order.address_line1}{order.address_line2 ? `, ${order.address_line2}` : ''}</div>
                    <div>{order.city}, {order.state} {order.zip}</div>
                    {order.country && order.country !== 'US' && <div>{order.country}</div>}
                  </div>
                </div>

                {/* 3-column meta grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px 20px', minWidth: 0 }}>
                  {order.customer_email && (
                    <FieldSm label="Email">
                      <span style={{ wordBreak: 'break-all' }}>{order.customer_email}</span>
                    </FieldSm>
                  )}
                  {order.address_type && (
                    <FieldSm label="Address Type">{order.address_type}</FieldSm>
                  )}
                  {(order.shipping_method || order.ship_method || order.carrier_method) && (
                    <FieldSm label="Shipping Method">
                      {order.shipping_method || order.ship_method || order.carrier_method}
                    </FieldSm>
                  )}
                  {order.ship_by_date && (
                    <FieldSm label="Ship By">
                      {new Date(order.ship_by_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </FieldSm>
                  )}
                  {order.deliver_by_date && (
                    <FieldSm label="Deliver By">
                      {new Date(order.deliver_by_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </FieldSm>
                  )}
                  {order.ship_node && (
                    <FieldSm label="Ship Node">{order.ship_node}</FieldSm>
                  )}
                </div>

                {/* Tracking number — full-width row */}
                {order.tracking_number && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--oms-border)' }}>
                    <div style={LBL}>Tracking Number</div>
                    <div style={{ marginTop: 4 }}>
                      <TrackingLink tn={order.tracking_number} style={{ fontSize: 13 }} />
                    </div>
                  </div>
                )}
              </PanelBody>
            </Panel>

            {/* Order Lines */}
            <Panel>
              <PanelHeader><PanelTitle>Order Lines</PanelTitle></PanelHeader>
              {order.items?.length ? (
                <div style={{ padding: '0 18px 4px' }}>
                  {order.items.map((item, idx) => (
                    <div key={item.id} style={idx === order.items.length - 1 ? { borderBottom: 'none' } : {}}>
                      <ItemCard item={item} />
                    </div>
                  ))}
                </div>
              ) : (
                <PanelBody>
                  <span className="oms-text-muted" style={{ fontSize: 13 }}>No items</span>
                </PanelBody>
              )}
            </Panel>

          </div>{/* end left column */}

          {/* ── Right column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

            {/* Shipping labels (multi-label) */}
            <Panel>
              <PanelHeader>
                <PanelTitle>
                  Shipping Labels
                  {labelsData?.labels?.length > 0 && (
                    <span style={{
                      marginLeft: 8, fontSize: 11, fontWeight: 600,
                      background: 'var(--oms-navy-pale)', color: 'var(--oms-navy-mid)',
                      padding: '2px 7px', borderRadius: 10,
                    }}>
                      {labelsData.labels.length}
                    </span>
                  )}
                </PanelTitle>
              </PanelHeader>
              <PanelBody>
                {labelsData?.labels?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {labelsData.labels.map((lbl, idx) => (
                      <div key={lbl.id} style={{
                        padding: '10px 12px',
                        background: 'var(--oms-page-bg)',
                        borderRadius: 8,
                        border: '1px solid var(--oms-border)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--oms-navy-mid)" strokeWidth="2" style={{ flexShrink: 0 }}>
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--oms-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {lbl.original_filename}
                            </span>
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                            padding: '2px 6px', borderRadius: 4, flexShrink: 0,
                            background: lbl.match_status === 'confirmed' ? '#EAF3DE' : lbl.match_status === 'manually_assigned' ? '#EDE9FE' : '#F3F4F6',
                            color: lbl.match_status === 'confirmed' ? '#639922' : lbl.match_status === 'manually_assigned' ? '#5B21B6' : '#6B7280',
                          }}>
                            {lbl.match_status === 'manually_assigned' ? 'assigned' : lbl.match_status}
                          </span>
                        </div>

                        {lbl.tracking_number && (
                          <div style={{ marginBottom: 6 }}>
                            <TrackingLink tn={lbl.tracking_number} style={{ fontSize: 11 }} />
                          </div>
                        )}

                        {lbl.extracted_name && (
                          <div style={{ fontSize: 11, color: 'var(--oms-text-muted)', marginBottom: 6 }}>
                            {lbl.extracted_name}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                          <span style={{ fontSize: 10, color: 'var(--oms-text-muted)' }}>
                            {new Date(lbl.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <button
                            onClick={() => handleDownloadLabel(lbl.id)}
                            style={{
                              fontSize: 11, fontWeight: 500, color: 'var(--oms-navy-mid)',
                              background: 'none', border: '1px solid var(--oms-navy-mid)',
                              borderRadius: 4, padding: '2px 8px', cursor: 'pointer',
                            }}
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="oms-text-muted" style={{ fontSize: 13 }}>No labels attached</span>
                )}
              </PanelBody>
            </Panel>

            {/* Notes */}
            {order.notes && (
              <Panel>
                <PanelHeader><PanelTitle>Notes</PanelTitle></PanelHeader>
                <PanelBody>
                  <div style={{ fontSize: 13, color: 'var(--oms-text-secondary)', lineHeight: 1.6 }}>{order.notes}</div>
                </PanelBody>
              </Panel>
            )}

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
                      <div style={{ paddingBottom: 16, flex: 1, minWidth: 0 }}>
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

          </div>{/* end right column */}

        </div>{/* end two-column grid */}

      </div>

      {/* Status update modal */}
      {showStatusModal && (
        <Modal title="Update OMS Status" onClose={() => setShowStatusModal(false)}>
          <form onSubmit={handleStatusUpdate}>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <FormField label="Status">
                <Select value={newStatus} onChange={setNewStatus}>
                  {OMS_STATUS_ORDER.map(s => (
                    <option key={s} value={s}>{OMS_STATUS_LABEL[s] || s}</option>
                  ))}
                </Select>
              </FormField>
              {(newStatus === 'shipped' || newStatus === 'delivered') && (
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
