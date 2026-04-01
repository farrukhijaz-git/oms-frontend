import { useState, useRef, useEffect } from 'react'
import { useLabelQueue, useLabelUnmatched, useUploadLabels, useConfirmLabel, useAssignLabel, useGetLabelUrl } from '../hooks/useLabels'
import { useOrders } from '../hooks/useOrders'
import { useUploadContext } from '../context/UploadContext'
import { showToast } from '../components/Toast'

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

// ── Utilities ─────────────────────────────────────────────────────────────────

/** "p3_document-abc.pdf" → "Page 3" | "document.pdf" → "Label" */
function labelDisplay(filename) {
  const m = filename?.match(/^p(\d+)_/i)
  return m ? `Page ${m[1]}` : 'Label'
}

/** Inline status badge matching global STATUS_CONFIG colours */
const STATUS_STYLES = {
  new:               { color: '#185FA5', background: '#E6F1FB' },
  label_generated:   { color: '#3B6D11', background: '#EAF3DE' },
  inventory_ordered: { color: '#92400E', background: '#FFF8ED' },
  packed:            { color: '#3C3489', background: '#EEEDFE' },
  ready:             { color: '#831843', background: '#FDF2F8' },
  shipped:           { color: '#6B7280', background: '#F3F4F6' },
  delivered:         { color: '#0D7C66', background: '#CCFBF1' },
}
function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || { color: '#6B7280', background: '#F3F4F6' }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={style}>
      {status?.replace('_', ' ')}
    </span>
  )
}

// ── PreviewButton ─────────────────────────────────────────────────────────────
function PreviewButton({ labelId }) {
  const getUrl = useGetLabelUrl()
  const handleClick = async () => {
    try {
      const { url } = await getUrl.mutateAsync(labelId)
      window.open(url, '_blank', 'noopener')
    } catch {
      showToast('Could not load preview', 'error')
    }
  }
  return (
    <button
      onClick={handleClick}
      disabled={getUrl.isPending}
      title="Preview label PDF"
      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
    >
      <EyeIcon />
      {getUrl.isPending ? '…' : 'View'}
    </button>
  )
}

// ── ConfidenceBadge ───────────────────────────────────────────────────────────
function ConfidenceBadge({ score }) {
  const pct = Math.round((score || 0) * 100)
  const style =
    score >= 0.85 ? { color: '#639922', background: '#EAF3DE' } :
    score >= 0.65 ? { color: '#BA7517', background: '#FAEEDA' } :
                   { color: '#993556', background: '#FBEAF0' }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={style}>
      {pct}%
    </span>
  )
}

// ── OrderHoverCard ────────────────────────────────────────────────────────────
/**
 * Shows a popover with matched order details when user hovers the customer name.
 * The data comes directly from the queue row (joined in the SQL), no extra fetch.
 */
function OrderHoverCard({ label, children }) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)

  const show = () => {
    clearTimeout(timerRef.current)
    setVisible(true)
  }
  const hide = () => {
    timerRef.current = setTimeout(() => setVisible(false), 120)
  }

  const hasAddress = label.matched_address_line1 || label.matched_city
  const addressParts = [
    label.matched_address_line1,
    label.matched_address_line2,
    [label.matched_city, label.matched_state].filter(Boolean).join(', '),
    label.matched_zip,
  ].filter(Boolean)

  return (
    <div className="relative inline-block" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div
          className="absolute z-50 left-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-56 text-xs"
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <div className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
            {label.matched_customer_name}
            {label.matched_order_status && (
              <StatusBadge status={label.matched_order_status} />
            )}
          </div>
          {label.matched_order_external_id && (
            <div className="font-mono text-[11px] text-gray-400 mb-2">
              #{label.matched_order_external_id}
            </div>
          )}
          {hasAddress && (
            <div className="text-gray-500 leading-relaxed">
              {addressParts.map((p, i) => <div key={i}>{p}</div>)}
            </div>
          )}
          {label.order_tracking_number && (
            <div className="mt-2 pt-2 border-t border-gray-100 font-mono text-[10px] text-gray-400">
              <span className="text-gray-500 font-sans font-medium">Tracking: </span>
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

  // Center modal on mount
  useEffect(() => {
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect()
      setPosition({
        x: (window.innerWidth - rect.width) / 2,
        y: (window.innerHeight - rect.height) / 2,
      })
    }
  }, [])

  // Close dropdown when clicking outside
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

  // Drag handling
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
      showToast('Label assigned')
      onClose()
    } catch {
      showToast('Failed to assign', 'error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-xl w-full max-w-md shadow-2xl"
        style={{ position: 'absolute', left: `${position.x}px`, top: `${position.y}px`, cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div onMouseDown={handleMouseDown} className="px-6 pt-6 pb-3 border-b border-gray-100 select-none">
          <h3 className="font-semibold text-gray-900 mb-1">Assign to Order</h3>
          <p className="text-xs text-gray-400">{label.original_filename}</p>
        </div>

        <div className="modal-content p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setShowDropdown(true)
                  if (!e.target.value) setOrderId('')
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search orders by order #, name, city, state..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
              {showDropdown && (
                <div ref={dropdownRef} className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredOrders.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-400">No orders found</div>
                  ) : (
                    filteredOrders.map(o => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => handleSelectOrder(o)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0 ${o.id === orderId ? 'bg-blue-50' : ''}`}
                      >
                        <div className="font-medium text-gray-900">
                          {o.external_id ? `#${o.external_id}` : o.id.slice(0, 8)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {o.customer_name} — {o.city}, {o.state}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedOrder && (
              <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                <div className="font-medium text-gray-700 mb-1">Selected Order:</div>
                <div>#{selectedOrder.external_id || selectedOrder.id.slice(0, 8)}</div>
                <div>{selectedOrder.customer_name}</div>
                <div>{selectedOrder.city}, {selectedOrder.state}</div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={!orderId}
                className="flex-1 px-4 py-2 bg-navy text-white rounded-lg text-sm hover:bg-navy-hover disabled:opacity-50 disabled:cursor-not-allowed">
                Assign
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── LabelQueuePage ────────────────────────────────────────────────────────────
export default function LabelQueuePage() {
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
      // result = { job_id, status: 'processing', total_files }
      if (result.job_id) {
        addJob(result.job_id, result.total_files)
        showToast(`Processing ${result.total_files} file(s) in the background`)
      }
    } catch {
      showToast('Upload failed', 'error')
    }
    e.target.value = ''
  }

  const handleConfirm = async (label) => {
    if (!label.order_id) { setAssignModal(label); return }
    try {
      await confirmMutation.mutateAsync({ labelId: label.id, orderId: label.order_id })
      showToast('Label confirmed')
    } catch {
      showToast('Failed to confirm', 'error')
    }
  }

  return (
    <div className="flex flex-col min-h-screen">

      {/* Topbar */}
      <div className="topbar">
        <h1 className="text-[15px] font-semibold text-gray-900">Label Queue</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {queue.length} pending · {unmatched.length} unmatched
          </span>
        </div>
      </div>

      <div className="p-6">

        {/* Upload zone */}
        <div
          className="card p-8 text-center mb-6 cursor-pointer hover:border-navy-accent transition-colors"
          style={{ borderStyle: 'dashed' }}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".pdf" multiple className="hidden" onChange={handleUpload} />
          {uploadMutation.isPending ? (
            <div>
              <div className="text-sm text-gray-500 font-medium">Uploading…</div>
              <div className="text-xs text-gray-400 mt-1">Starting background processing</div>
            </div>
          ) : (
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#E6F1FB] flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#378ADD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">Click to upload PDFs</p>
              <p className="text-xs text-gray-400 mt-1">Multi-page PDFs are split per label · processing runs in the background</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit">
          {[
            { key: 'queue', label: `Review Queue (${queue.length})` },
            { key: 'unmatched', label: `Unmatched (${unmatched.length})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Review queue */}
        {tab === 'queue' && (
          queueLoading ? (
            <div className="text-sm text-gray-400">Loading…</div>
          ) : queue.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-400">No labels pending review</div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Label</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Extracted Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Extracted Address</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tracking (label)</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Matched Order</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Confidence</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {queue.map(label => {
                    const isConflict = label.match_status === 'tracking_conflict'
                    return (
                      <tr
                        key={label.id}
                        className={`hover:bg-gray-50/50 ${isConflict ? 'bg-amber-50/40' : ''}`}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <PreviewButton labelId={label.id} />
                            <span className="text-xs text-gray-500">{labelDisplay(label.original_filename)}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-gray-700 text-sm font-medium">
                          {label.extracted_name || '—'}
                        </td>

                        <td className="px-4 py-3 text-xs text-gray-400 max-w-[160px]">
                          <span className="block truncate" title={label.extracted_address || ''}>
                            {label.extracted_address || '—'}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {label.tracking_number ? (
                            <span className="font-mono text-[11px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                              {label.tracking_number}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {label.matched_customer_name ? (
                            <div className="flex items-center gap-1.5">
                              {isConflict && (
                                <span title="Tracking number points to a different order than name/address match" className="text-amber-500 flex-shrink-0">
                                  <WarningIcon />
                                </span>
                              )}
                              <OrderHoverCard label={label}>
                                <span className="text-sm text-gray-700 underline decoration-dotted decoration-gray-400 cursor-default">
                                  {label.matched_customer_name}
                                </span>
                              </OrderHoverCard>
                              {label.matched_order_external_id && (
                                <span className="font-mono text-[11px] text-gray-400">
                                  #{label.matched_order_external_id}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                          {isConflict && (
                            <div className="text-[10px] text-amber-600 mt-0.5">
                              Tracking → different order
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <ConfidenceBadge score={label.match_confidence || 0} />
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConfirm(label)}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium"
                              style={{ color: '#639922', background: '#EAF3DE' }}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setAssignModal(label)}
                              className="px-2.5 py-1 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                            >
                              Change
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Unmatched */}
        {tab === 'unmatched' && (
          unmatched.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-400">No unmatched labels</div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Label</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Extracted Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Address</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tracking (label)</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {unmatched.map(label => (
                    <tr key={label.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <PreviewButton labelId={label.id} />
                          <span className="text-xs text-gray-500">{labelDisplay(label.original_filename)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-sm">{label.extracted_name || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate">
                        {label.extracted_address || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {label.tracking_number ? (
                          <span className="font-mono text-[11px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                            {label.tracking_number}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setAssignModal(label)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{ color: '#378ADD', background: '#E6F1FB' }}
                        >
                          Assign
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {assignModal && <AssignModal label={assignModal} onClose={() => setAssignModal(null)} />}
    </div>
  )
}
