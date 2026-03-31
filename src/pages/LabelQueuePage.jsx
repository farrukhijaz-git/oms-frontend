import { useState, useRef } from 'react'
import { useLabelQueue, useLabelUnmatched, useUploadLabels, useConfirmLabel, useAssignLabel } from '../hooks/useLabels'
import { useOrders } from '../hooks/useOrders'
import { showToast } from '../components/Toast'

function ConfidenceBadge({ score }) {
  const pct = Math.round(score * 100)
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

function AssignModal({ label, onClose }) {
  const confirmMutation = useConfirmLabel()
  const assignMutation = useAssignLabel()
  const [orderId, setOrderId] = useState('')
  const { data } = useOrders({ limit: 50, status: 'new,label_generated,inventory_ordered,packed,ready' })
  const orders = data?.orders || []

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (label.match_status === 'pending') {
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
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Assign to Order</h3>
        <p className="text-xs text-gray-400 mb-4">{label.original_filename}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <select
            value={orderId}
            onChange={e => setOrderId(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select order…</option>
            {orders.map(o => (
              <option key={o.id} value={o.id}>
                {o.external_id ? `#${o.external_id}` : o.id.slice(0, 8)} — {o.customer_name} ({o.city}, {o.state})
              </option>
            ))}
          </select>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2 bg-navy text-white rounded-lg text-sm hover:bg-navy-hover">
              Assign
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LabelQueuePage() {
  const [tab, setTab] = useState('queue')
  const [assignModal, setAssignModal] = useState(null)
  const fileRef = useRef()
  const { data: queueData, isLoading: queueLoading } = useLabelQueue()
  const { data: unmatchedData } = useLabelUnmatched()
  const uploadMutation = useUploadLabels()
  const confirmMutation = useConfirmLabel()

  const queue = queueData?.labels || []
  const unmatched = unmatchedData?.labels || []

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    try {
      const result = await uploadMutation.mutateAsync(files)
      const total = result.results?.length || 0
      const matched = result.results?.filter(r => r.match_status === 'pending').length || 0
      showToast(`${total} label(s) processed, ${matched} auto-matched`)
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
              <div className="text-sm text-gray-500 font-medium">Processing labels…</div>
              <div className="text-xs text-gray-400 mt-1">Extracting text and matching to orders</div>
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
              <p className="text-xs text-gray-400 mt-1">Multi-page PDFs are split per label automatically</p>
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
              <table className="w-full text-sm min-w-[700px]">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">File</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Extracted Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Matched Order</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Confidence</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {queue.map(label => (
                    <tr key={label.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 text-gray-700 max-w-[160px] truncate text-xs font-mono">
                        {label.original_filename}
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-sm">{label.extracted_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-700 text-sm">{label.matched_customer_name || '—'}</td>
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
                  ))}
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
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">File</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Extracted Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Address</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {unmatched.map(label => (
                    <tr key={label.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 text-gray-700 max-w-[160px] truncate text-xs font-mono">
                        {label.original_filename}
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-sm">{label.extracted_name || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate">
                        {label.extracted_address || '—'}
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
