import { useState, useRef } from 'react'
import { useLabelQueue, useLabelUnmatched, useUploadLabels, useConfirmLabel, useAssignLabel } from '../hooks/useLabels'
import { useOrders } from '../hooks/useOrders'
import { showToast } from '../components/Toast'

function ConfidenceBadge({ score }) {
  const pct = Math.round(score * 100)
  const cls = score >= 0.85 ? 'bg-green-100 text-green-700' : score >= 0.65 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{pct}%</span>
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
        <h3 className="font-semibold text-gray-900 mb-4">Assign to Order</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <select value={orderId} onChange={e => setOrderId(e.target.value)} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Select order...</option>
            {orders.map(o => (
              <option key={o.id} value={o.id}>{o.customer_name} — {o.city}, {o.state}</option>
            ))}
          </select>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Assign</button>
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
      showToast(`${total} PDF(s) uploaded, ${matched} auto-matched`)
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
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Label Queue</h1>

      {/* Upload zone */}
      <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 p-8 text-center mb-6 cursor-pointer transition-colors"
        onClick={() => fileRef.current?.click()}>
        <input ref={fileRef} type="file" accept=".pdf" multiple className="hidden" onChange={handleUpload} />
        {uploadMutation.isPending ? (
          <p className="text-gray-500">Uploading and extracting...</p>
        ) : (
          <>
            <p className="text-gray-600 font-medium">Click to upload PDFs</p>
            <p className="text-sm text-gray-400 mt-1">Multiple files supported</p>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {['queue', 'unmatched'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
            {t === 'queue' ? `Review Queue (${queue.length})` : `Unmatched (${unmatched.length})`}
          </button>
        ))}
      </div>

      {/* Queue table */}
      {tab === 'queue' && (
        queueLoading ? <div className="text-gray-400">Loading...</div> :
        queue.length === 0 ? <div className="text-center py-16 text-gray-400">No labels pending review</div> : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">File</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Extracted Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Matched Order</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Confidence</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {queue.map(label => (
                  <tr key={label.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 max-w-[150px] truncate">{label.original_filename}</td>
                    <td className="px-4 py-3 text-gray-700">{label.extracted_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{label.matched_customer_name || '—'}</td>
                    <td className="px-4 py-3"><ConfidenceBadge score={label.match_confidence || 0} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleConfirm(label)}
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">Confirm</button>
                        <button onClick={() => setAssignModal(label)}
                          className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">Change</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Unmatched tab */}
      {tab === 'unmatched' && (
        unmatched.length === 0 ? <div className="text-center py-16 text-gray-400">No unmatched labels</div> : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">File</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Extracted Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Address</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {unmatched.map(label => (
                  <tr key={label.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 max-w-[150px] truncate">{label.original_filename}</td>
                    <td className="px-4 py-3 text-gray-700">{label.extracted_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[200px] truncate">{label.extracted_address || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setAssignModal(label)}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">Assign</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {assignModal && <AssignModal label={assignModal} onClose={() => setAssignModal(null)} />}
    </div>
  )
}
