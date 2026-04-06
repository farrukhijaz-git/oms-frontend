import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLabelQueue, useLabelUnmatched, useUploadLabels, useConfirmLabel, useAssignLabel, useGetLabelUrl, useDeleteLabel } from '../hooks/useLabels'
import { useOrders } from '../hooks/useOrders'
import { useSendShipmentToWalmart } from '../hooks/useWalmart'
import { useUploadContext } from '../context/UploadContext'
import {
  Topbar, Panel, BtnPrimary, BtnSecondary,
  Modal, ModalActions, Tabs, ConfidenceBar,
  StatusBadge, EmptyState, TableSkeleton, useToast,
} from '../components.jsx'

// ── Icons ─────────────────────────────────────────────────────────────────────
const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const WarningIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)

const UploadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#378ADD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
)

// ── Utilities ─────────────────────────────────────────────────────────────────

/** "p3_document-abc.pdf" → "Page 3" | "document.pdf" → "Label" */
function labelDisplay(filename) {
  const m = filename?.match(/^p(\d+)_/i)
  return m ? `Page ${m[1]}` : 'Label'
}

// ── PreviewButton ─────────────────────────────────────────────────────────────
function PreviewButton({ labelId }) {
  const toast = useToast()
  const getUrl = useGetLabelUrl()
  const handleClick = async () => {
    try {
      const { url } = await getUrl.mutateAsync(labelId)
      window.open(url, '_blank', 'noopener')
    } catch {
      toast.error('Could not load preview')
    }
  }
  return (
    <BtnSecondary size="sm" onClick={handleClick} disabled={getUrl.isPending}>
      <EyeIcon />
      {getUrl.isPending ? '…' : ' View'}
    </BtnSecondary>
  )
}

// ── OrderHoverCard ────────────────────────────────────────────────────────────
// Uses a fixed-position portal so the card is never clipped by overflow:auto
// containers (e.g. the horizontal-scroll table wrapper).
function OrderHoverCard({ label, children }) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const timerRef = useRef(null)

  const CARD_HEIGHT = 190 // approximate max height for flip logic
  const CARD_WIDTH  = 232

  const show = () => {
    clearTimeout(timerRef.current)
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const top = spaceBelow >= CARD_HEIGHT + 10
        ? rect.bottom + 6
        : rect.top - CARD_HEIGHT - 6
      const left = Math.min(rect.left, window.innerWidth - CARD_WIDTH - 8)
      setCoords({ top: Math.max(4, top), left: Math.max(4, left) })
    }
    setVisible(true)
  }
  const hide = () => { timerRef.current = setTimeout(() => setVisible(false), 120) }

  const hasAddress = label.matched_address_line1 || label.matched_city
  const addressParts = [
    label.matched_address_line1,
    label.matched_address_line2,
    [label.matched_city, label.matched_state].filter(Boolean).join(', '),
    label.matched_zip,
  ].filter(Boolean)

  const card = visible ? createPortal(
    <div
      style={{
        position: 'fixed', zIndex: 9999,
        top: coords.top, left: coords.left,
        background: '#fff', border: '1px solid var(--oms-border)', borderRadius: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.14)', padding: 12,
        width: CARD_WIDTH, fontSize: 12, pointerEvents: 'auto',
      }}
      onMouseEnter={() => clearTimeout(timerRef.current)}
      onMouseLeave={hide}
    >
      <div style={{ fontWeight: 600, color: 'var(--oms-text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
        {label.matched_customer_name}
        {label.matched_order_status && <StatusBadge status={label.matched_order_status} />}
      </div>
      {label.matched_order_external_id && (
        <div className="oms-order-id" style={{ fontSize: 11, marginBottom: 6 }}>
          #{label.matched_order_external_id}
        </div>
      )}
      {hasAddress && (
        <div className="oms-text-muted" style={{ lineHeight: 1.7 }}>
          {addressParts.map((p, i) => <div key={i}>{p}</div>)}
        </div>
      )}
      {label.order_tracking_number && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--oms-border)' }} className="oms-order-id">
          <span style={{ fontFamily: 'inherit', fontWeight: 500, fontSize: 11 }}>Tracking: </span>
          {label.order_tracking_number}
        </div>
      )}
    </div>,
    document.body
  ) : null

  return (
    <div ref={triggerRef} style={{ display: 'inline-block' }} onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {card}
    </div>
  )
}

// ── AssignModal ───────────────────────────────────────────────────────────────
function AssignModal({ label, onClose, onAssigned }) {
  const toast = useToast()
  const confirmMutation = useConfirmLabel()
  const assignMutation = useAssignLabel()
  const [orderId, setOrderId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const modalRef = useRef(null)
  const searchInputRef = useRef(null)
  const dropdownRef = useRef(null)

  const { data } = useOrders({ limit: 200, status: 'new,label_generated,inventory_ordered,packed,ready,shipped,delivered,cancelled' })
  const orders = data?.orders || []

  useEffect(() => {
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect()
      setPosition({
        x: (window.innerWidth - rect.width) / 2,
        y: (window.innerHeight - rect.height) / 2,
      })
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchInputRef.current && !searchInputRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMouseDown = (e) => {
    if (e.target.closest('.modal-content')) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  useEffect(() => {
    if (!isDragging) return
    const handleMouseMove = (e) => setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    const handleMouseUp = () => setIsDragging(false)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart])

  const filteredOrders = orders.filter(o => {
    if (!searchTerm) return true
    const s = searchTerm.toLowerCase()
    return (
      (o.external_id?.toLowerCase() || '').includes(s) ||
      (o.customer_name?.toLowerCase() || '').includes(s) ||
      (o.city?.toLowerCase() || '').includes(s) ||
      (o.state?.toLowerCase() || '').includes(s)
    )
  })

  const selectedOrder = orders.find(o => o.id === orderId)

  const handleSelectOrder = (order) => {
    setOrderId(order.id)
    setSearchTerm(`#${order.external_id || order.id.slice(0, 8)} — ${order.customer_name} (${order.city}, ${order.state})`)
    setShowDropdown(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (label.match_status === 'pending' || label.match_status === 'tracking_conflict') {
        await confirmMutation.mutateAsync({ labelId: label.id, orderId })
      } else {
        await assignMutation.mutateAsync({ labelId: label.id, orderId })
      }
      toast.success('Label assigned')
      if (onAssigned) {
        onAssigned(selectedOrder, label.tracking_number)
      } else {
        onClose()
      }
    } catch {
      toast.error('Failed to assign')
    }
  }

  return (
    <div className="oms-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div
        ref={modalRef}
        className="oms-modal"
        style={{ position: 'absolute', left: `${position.x}px`, top: `${position.y}px`, cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div onMouseDown={handleMouseDown} style={{ paddingBottom: 12, borderBottom: '1px solid var(--oms-border)', userSelect: 'none' }}>
          <div className="oms-modal-title">Assign to Order</div>
          <div className="oms-text-muted" style={{ fontSize: 11, marginTop: 2 }}>{label.original_filename}</div>
        </div>

        <div className="modal-content" style={{ paddingTop: 16 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <input
                ref={searchInputRef}
                type="text"
                className="oms-input"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setShowDropdown(true)
                  if (!e.target.value) setOrderId('')
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search by order #, name, city, state…"
              />
              {showDropdown && (
                <div
                  ref={dropdownRef}
                  style={{
                    position: 'absolute', zIndex: 10, width: '100%', marginTop: 4,
                    background: '#fff', border: '1px solid var(--oms-border)', borderRadius: 8,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxHeight: 240, overflowY: 'auto',
                  }}
                >
                  {filteredOrders.length === 0 ? (
                    <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--oms-text-muted)' }}>No orders found</div>
                  ) : (
                    filteredOrders.map(o => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => handleSelectOrder(o)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 13,
                          background: o.id === orderId ? 'var(--oms-navy-pale)' : 'transparent',
                          border: 'none', borderBottom: '1px solid var(--oms-border)', cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontWeight: 500, color: 'var(--oms-text-primary)' }}>
                          {o.external_id ? `#${o.external_id}` : o.id.slice(0, 8)}
                        </div>
                        <div className="oms-text-muted" style={{ fontSize: 11 }}>
                          {o.customer_name} — {o.city}, {o.state}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedOrder && (
              <div style={{ fontSize: 12, color: 'var(--oms-text-secondary)', background: 'var(--oms-page-bg)', borderRadius: 6, padding: 10 }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>Selected Order:</div>
                <div>#{selectedOrder.external_id || selectedOrder.id.slice(0, 8)}</div>
                <div>{selectedOrder.customer_name}</div>
                <div>{selectedOrder.city}, {selectedOrder.state}</div>
              </div>
            )}

            <ModalActions>
              <BtnSecondary onClick={onClose}>Cancel</BtnSecondary>
              <BtnPrimary disabled={!orderId} loading={confirmMutation.isPending || assignMutation.isPending}>
                Assign
              </BtnPrimary>
            </ModalActions>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── DeleteConfirmModal ────────────────────────────────────────────────────────
function DeleteConfirmModal({ label, onConfirm, onClose, isPending }) {
  return (
    <div className="oms-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="oms-modal" style={{ maxWidth: 380 }}>
        <div className="oms-modal-title">Delete Label?</div>
        <p style={{ fontSize: 13, color: 'var(--oms-text-secondary)', margin: '12px 0 0' }}>
          This will permanently delete <strong>{label.original_filename}</strong> and remove the file from storage. This cannot be undone.
        </p>
        <ModalActions>
          <BtnSecondary onClick={onClose} disabled={isPending}>Cancel</BtnSecondary>
          <button
            className="oms-btn oms-btn-danger"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? 'Deleting…' : 'Delete'}
          </button>
        </ModalActions>
      </div>
    </div>
  )
}

// ── Walmart helpers ───────────────────────────────────────────────────────────

function detectCarrier(tn) {
  if (!tn) return 'UPS'
  if (/^1Z[A-Z0-9]{16}$/i.test(tn)) return 'UPS'
  if (/^(9[0-9]{21,34}|[A-Z]{2}[0-9]{9}US|420[0-9]{5})/.test(tn)) return 'USPS'
  if (/^[0-9]{12,22}$/.test(tn)) return 'FedEx'
  return 'UPS'
}

/** Returns true when tracking should be offered to push to Walmart. */
function needsWalmartShip(platform, walmartStatus, trackingPushed, trackingNumber) {
  if (platform !== 'walmart') return false
  if (!trackingNumber) return false
  if (trackingPushed) return false
  const ws = (walmartStatus || '').toLowerCase()
  return !['shipped', 'delivered', 'cancelled'].includes(ws)
}

// ── WalmartShipModal ──────────────────────────────────────────────────────────
function WalmartShipModal({ orderId, trackingNumber, onClose }) {
  const toast = useToast()
  const [carrier, setCarrier] = useState(() => detectCarrier(trackingNumber))
  const mutation = useSendShipmentToWalmart()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await mutation.mutateAsync({ order_id: orderId, tracking_number: trackingNumber, carrier })
      toast.success('Tracking sent to Walmart')
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Failed to send tracking to Walmart')
    }
  }

  return (
    <div className="oms-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="oms-modal" style={{ maxWidth: 400 }}>
        <div className="oms-modal-title">Send Tracking to Walmart</div>
        <p style={{ fontSize: 13, color: 'var(--oms-text-secondary)', margin: '8px 0 16px' }}>
          Walmart hasn't received the tracking number for this order yet. Send it now to mark the order as shipped.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div className="oms-label">Tracking Number</div>
            <input
              className="oms-input"
              value={trackingNumber}
              readOnly
              style={{ background: 'var(--oms-page-bg)', color: 'var(--oms-text-secondary)', cursor: 'default' }}
            />
          </div>
          <div>
            <div className="oms-label">Carrier</div>
            <select className="oms-select" value={carrier} onChange={e => setCarrier(e.target.value)}>
              <option value="UPS">UPS</option>
              <option value="USPS">USPS</option>
              <option value="FedEx">FedEx</option>
              <option value="DHL">DHL</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <ModalActions>
            <BtnSecondary onClick={onClose} disabled={mutation.isPending}>Skip</BtnSecondary>
            <BtnPrimary loading={mutation.isPending}>
              {mutation.isPending ? 'Sending…' : 'Send to Walmart'}
            </BtnPrimary>
          </ModalActions>
        </form>
      </div>
    </div>
  )
}

// ── LabelQueuePage ────────────────────────────────────────────────────────────
export default function LabelQueuePage() {
  const toast = useToast()
  const [tab, setTab] = useState('queue')
  const [assignModal, setAssignModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [walmartShipPrompt, setWalmartShipPrompt] = useState(null)
  const fileRef = useRef()
  const { data: queueData, isLoading: queueLoading } = useLabelQueue()
  const { data: unmatchedData } = useLabelUnmatched()
  const uploadMutation = useUploadLabels()
  const confirmMutation = useConfirmLabel()
  const deleteMutation = useDeleteLabel()
  const { addJob } = useUploadContext()

  const queue = queueData?.labels || []
  const unmatched = unmatchedData?.labels || []

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    try {
      const result = await uploadMutation.mutateAsync(files)
      if (result.job_id) {
        addJob(result.job_id, result.total_files)
        toast.info(`Processing ${result.total_files} file(s) in the background`)
      }
    } catch {
      toast.error('Upload failed')
    }
    e.target.value = ''
  }

  const handleConfirm = async (label) => {
    if (!label.order_id) { setAssignModal(label); return }
    try {
      await confirmMutation.mutateAsync({ labelId: label.id, orderId: label.order_id })
      toast.success('Label confirmed')
      if (needsWalmartShip(
        label.matched_platform,
        label.matched_walmart_status,
        label.matched_tracking_pushed_to_walmart,
        label.tracking_number
      )) {
        setWalmartShipPrompt({ orderId: label.order_id, trackingNumber: label.tracking_number })
      }
    } catch {
      toast.error('Failed to confirm')
    }
  }

  const handleDelete = async () => {
    if (!deleteModal) return
    try {
      await deleteMutation.mutateAsync(deleteModal.id)
      toast.success('Label deleted')
      setDeleteModal(null)
    } catch {
      toast.error('Failed to delete label')
    }
  }

  const TABS = [
    { value: 'queue', label: `Review Queue (${queue.length})` },
    { value: 'unmatched', label: `Unmatched (${unmatched.length})` },
  ]

  return (
    <div className="oms-main">

      <Topbar title="Label Queue">
        <span className="oms-text-muted" style={{ fontSize: 12 }}>
          {queue.length} pending · {unmatched.length} unmatched
        </span>
      </Topbar>

      <div className="oms-content">

        {/* Upload zone */}
        <div
          className="oms-panel"
          style={{ textAlign: 'center', cursor: 'pointer', borderStyle: 'dashed', padding: 32 }}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display: 'none' }} onChange={handleUpload} />
          {uploadMutation.isPending ? (
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--oms-text-secondary)' }}>Uploading…</div>
              <div className="oms-text-muted" style={{ fontSize: 12, marginTop: 4 }}>Starting background processing</div>
            </div>
          ) : (
            <div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--oms-navy-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <UploadIcon />
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--oms-text-primary)' }}>Click to upload PDFs</div>
              <div className="oms-text-muted" style={{ fontSize: 12, marginTop: 4 }}>Multi-page PDFs are split per label · processing runs in the background</div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs tabs={TABS} active={tab} onChange={setTab} />

        {/* Review queue */}
        {tab === 'queue' && (
          queueLoading ? (
            <Panel><TableSkeleton rows={5} cols={7} /></Panel>
          ) : queue.length === 0 ? (
            <EmptyState title="No labels pending review" sub="Upload PDF labels to get started." />
          ) : (
            <Panel>
              <div style={{ overflowX: 'auto' }}>
              <table className="oms-table" style={{ minWidth: 860 }}>
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Extracted Name</th>
                    <th>Extracted Address</th>
                    <th>Tracking (label)</th>
                    <th>Matched Order</th>
                    <th>Confidence</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map(label => {
                    const isConflict = label.match_status === 'tracking_conflict'
                    return (
                      <tr key={label.id} style={isConflict ? { background: 'rgba(245,158,11,0.05)' } : {}}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <PreviewButton labelId={label.id} />
                            <span className="oms-text-muted" style={{ fontSize: 12 }}>{labelDisplay(label.original_filename)}</span>
                          </div>
                        </td>

                        <td style={{ fontWeight: 500, fontSize: 13 }}>
                          {label.extracted_name || '—'}
                        </td>

                        <td>
                          <span className="oms-text-muted" style={{ fontSize: 11, display: 'block', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label.extracted_address || ''}>
                            {label.extracted_address || '—'}
                          </span>
                        </td>

                        <td>
                          {label.tracking_number ? (
                            <span className="oms-order-id">{label.tracking_number}</span>
                          ) : (
                            <span className="oms-text-muted">—</span>
                          )}
                        </td>

                        <td>
                          {label.matched_customer_name ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {isConflict && (
                                  <span title="Tracking number points to a different order than name/address match" style={{ color: '#D97706', flexShrink: 0 }}>
                                    <WarningIcon />
                                  </span>
                                )}
                                <OrderHoverCard label={label}>
                                  <span style={{ fontSize: 13, color: 'var(--oms-text-primary)', textDecoration: 'underline', textDecorationStyle: 'dotted', textDecorationColor: '#9CA3AF', cursor: 'default' }}>
                                    {label.matched_customer_name}
                                  </span>
                                </OrderHoverCard>
                                {label.matched_order_external_id && (
                                  <span className="oms-order-id">#{label.matched_order_external_id}</span>
                                )}
                              </div>
                              {isConflict && (
                                <div style={{ fontSize: 10, color: '#D97706', marginTop: 2 }}>
                                  Tracking → different order
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="oms-text-muted">—</span>
                          )}
                        </td>

                        <td>
                          <ConfidenceBar score={label.match_confidence || 0} />
                        </td>

                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => handleConfirm(label)}
                              className="oms-btn oms-btn-sm"
                              style={{ color: 'var(--oms-label-text)', background: 'var(--oms-label-bg)', border: 'none' }}
                            >
                              Confirm
                            </button>
                            <BtnSecondary size="sm" onClick={() => setAssignModal(label)}>Change</BtnSecondary>
                            <button
                              onClick={() => setDeleteModal(label)}
                              className="oms-btn oms-btn-sm oms-btn-danger"
                              title="Delete label"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </Panel>
          )
        )}

        {/* Unmatched */}
        {tab === 'unmatched' && (
          unmatched.length === 0 ? (
            <EmptyState title="No unmatched labels" sub="All labels have been matched to orders." />
          ) : (
            <Panel>
              <div style={{ overflowX: 'auto' }}>
              <table className="oms-table" style={{ minWidth: 600 }}>
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Extracted Name</th>
                    <th>Address</th>
                    <th>Tracking (label)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {unmatched.map(label => (
                    <tr key={label.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <PreviewButton labelId={label.id} />
                          <span className="oms-text-muted" style={{ fontSize: 12 }}>{labelDisplay(label.original_filename)}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 13 }}>{label.extracted_name || '—'}</td>
                      <td>
                        <span className="oms-text-muted" style={{ fontSize: 11, display: 'block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {label.extracted_address || '—'}
                        </span>
                      </td>
                      <td>
                        {label.tracking_number ? (
                          <span className="oms-order-id">{label.tracking_number}</span>
                        ) : (
                          <span className="oms-text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => setAssignModal(label)}
                            className="oms-btn oms-btn-sm"
                            style={{ color: 'var(--oms-new-text)', background: 'var(--oms-new-bg)', border: 'none' }}
                          >
                            Assign
                          </button>
                          <button
                            onClick={() => setDeleteModal(label)}
                            className="oms-btn oms-btn-sm oms-btn-danger"
                            title="Delete label"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </Panel>
          )
        )}

      </div>

      {assignModal && (
        <AssignModal
          label={assignModal}
          onClose={() => setAssignModal(null)}
          onAssigned={(order, trackingNumber) => {
            setAssignModal(null)
            if (needsWalmartShip(
              order?.platform,
              order?.walmart_status,
              order?.tracking_pushed_to_walmart,
              trackingNumber || assignModal?.tracking_number
            )) {
              setWalmartShipPrompt({ orderId: order.id, trackingNumber: trackingNumber || assignModal?.tracking_number })
            }
          }}
        />
      )}
      {deleteModal && (
        <DeleteConfirmModal
          label={deleteModal}
          onConfirm={handleDelete}
          onClose={() => setDeleteModal(null)}
          isPending={deleteMutation.isPending}
        />
      )}
      {walmartShipPrompt && (
        <WalmartShipModal
          orderId={walmartShipPrompt.orderId}
          trackingNumber={walmartShipPrompt.trackingNumber}
          onClose={() => setWalmartShipPrompt(null)}
        />
      )}
    </div>
  )
}
