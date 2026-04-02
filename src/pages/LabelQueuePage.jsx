import { useState, useRef, useEffect } from 'react'
import { useLabelQueue, useLabelUnmatched, useUploadLabels, useConfirmLabel, useAssignLabel, useGetLabelUrl } from '../hooks/useLabels'
import { useOrders } from '../hooks/useOrders'
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
function OrderHoverCard({ label, children }) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)

  const show = () => { clearTimeout(timerRef.current); setVisible(true) }
  const hide = () => { timerRef.current = setTimeout(() => setVisible(false), 120) }

  const hasAddress = label.matched_address_line1 || label.matched_city
  const addressParts = [
    label.matched_address_line1,
    label.matched_address_line2,
    [label.matched_city, label.matched_state].filter(Boolean).join(', '),
    label.matched_zip,
  ].filter(Boolean)

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div
          style={{
            position: 'absolute', zIndex: 50, left: 0, top: '100%', marginTop: 6,
            background: '#fff', border: '1px solid var(--oms-border)', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 12, width: 224, fontSize: 12,
          }}
          onMouseEnter={show}
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
        </div>
      )}
    </div>
  )
}

// ── AssignModal ───────────────────────────────────────────────────────────────
function AssignModal({ label, onClose }) {
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

  const { data } = useOrders({ limit: 50, status: 'new,label_generated,inventory_ordered,packed,ready' })
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
      onClose()
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

// ── LabelQueuePage ────────────────────────────────────────────────────────────
export default function LabelQueuePage() {
  const toast = useToast()
  const [tab, setTab] = useState('queue')
  const [assignModal, setAssignModal] = useState(null)
  const fileRef = useRef()
  const { data: queueData, isLoading: queueLoading } = useLabelQueue()
  const { data: unmatchedData } = useLabelUnmatched()
  const uploadMutation = useUploadLabels()
  const confirmMutation = useConfirmLabel()
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
    } catch {
      toast.error('Failed to confirm')
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
                        <button
                          onClick={() => setAssignModal(label)}
                          className="oms-btn oms-btn-sm"
                          style={{ color: 'var(--oms-new-text)', background: 'var(--oms-new-bg)', border: 'none' }}
                        >
                          Assign
                        </button>
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

      {assignModal && <AssignModal label={assignModal} onClose={() => setAssignModal(null)} />}
    </div>
  )
}
