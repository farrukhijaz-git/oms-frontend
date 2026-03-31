import { useState } from 'react'
import { useWalmartStatus, useWalmartLog, usePollNow, useSaveCredentials, useUpdateSettings } from '../hooks/useWalmart'
import { showToast } from '../components/Toast'

const INTERVALS = [
  { label: '5 minutes', value: 300 },
  { label: '15 minutes', value: 900 },
  { label: '30 minutes', value: 1800 },
  { label: '1 hour', value: 3600 },
]

function SyncStatusBadge({ status }) {
  const styles = {
    success: { color: '#639922', bg: '#EAF3DE' },
    partial:  { color: '#BA7517', bg: '#FAEEDA' },
    error:    { color: '#993556', bg: '#FBEAF0' },
  }
  const s = styles[status] || styles.error
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ color: s.color, background: s.bg }}>
      {status}
    </span>
  )
}

export default function AdminWalmartPage() {
  const { data: status, isLoading } = useWalmartStatus()
  const { data: logData } = useWalmartLog()
  const pollMutation = usePollNow()
  const credsMutation = useSaveCredentials()
  const settingsMutation = useUpdateSettings()

  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [interval, setInterval] = useState(900)

  const log = logData?.log || []

  const handleSaveCreds = async (e) => {
    e.preventDefault()
    try {
      await credsMutation.mutateAsync({ client_id: clientId, client_secret: clientSecret })
      showToast('Credentials saved')
      setClientId('')
      setClientSecret('')
    } catch {
      showToast('Failed to save credentials', 'error')
    }
  }

  const handleSaveInterval = async () => {
    try {
      await settingsMutation.mutateAsync({ poll_interval_seconds: interval })
      showToast('Settings saved')
    } catch {
      showToast('Failed to save settings', 'error')
    }
  }

  const handlePollNow = async () => {
    try {
      const result = await pollMutation.mutateAsync()
      showToast(`Polled: ${result.pulled} new, ${result.skipped} skipped`)
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Poll failed', 'error')
    }
  }

  return (
    <div className="flex flex-col min-h-screen">

      {/* Topbar */}
      <div className="topbar">
        <h1 className="text-[15px] font-semibold text-gray-900">Walmart Integration</h1>
        <button
          onClick={handlePollNow}
          disabled={pollMutation.isPending || !status?.configured}
          className="px-3 py-1.5 bg-navy text-white rounded-lg text-xs hover:bg-navy-hover disabled:opacity-50"
        >
          {pollMutation.isPending ? 'Polling…' : 'Poll Now'}
        </button>
      </div>

      <div className="p-6 max-w-3xl space-y-4">

        {/* Connection status */}
        <div className="card p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Connection</h2>
          {isLoading ? (
            <div className="text-sm text-gray-400">Loading…</div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${status?.configured ? 'bg-green-500' : 'bg-red-400'}`} />
                <span className={`text-sm font-medium ${status?.configured ? 'text-green-700' : 'text-red-600'}`}>
                  {status?.configured ? 'Connected' : 'Not configured'}
                </span>
              </div>
              {status?.last_polled_at && (
                <span className="text-xs text-gray-500">
                  Last poll: {new Date(status.last_polled_at).toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* API credentials */}
        <div className="card p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">API Credentials</h2>
          <form onSubmit={handleSaveCreds} className="space-y-3">
            <input
              type="password" required value={clientId} onChange={e => setClientId(e.target.value)}
              placeholder="Client ID"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="password" required value={clientSecret} onChange={e => setClientSecret(e.target.value)}
              placeholder="Client Secret"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <button type="submit" disabled={credsMutation.isPending}
              className="px-4 py-2 bg-navy text-white text-sm rounded-lg hover:bg-navy-hover disabled:opacity-50">
              {credsMutation.isPending ? 'Saving…' : 'Save Credentials'}
            </button>
          </form>
        </div>

        {/* Poll interval */}
        <div className="card p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Poll Interval</h2>
          <div className="flex items-center gap-3">
            <select
              value={interval}
              onChange={e => setInterval(parseInt(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
            <button
              onClick={handleSaveInterval}
              disabled={settingsMutation.isPending}
              className="px-4 py-2 bg-navy text-white text-sm rounded-lg hover:bg-navy-hover disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>

        {/* Sync log */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Sync Log</h2>
          </div>
          {log.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400">No sync history</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Time</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Pulled</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {log.map(entry => (
                    <tr key={entry.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(entry.synced_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{entry.sync_type}</td>
                      <td className="px-4 py-3">
                        <SyncStatusBadge status={entry.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{entry.orders_pulled}</td>
                      <td className="px-4 py-3 text-xs text-red-500 max-w-[200px] truncate">
                        {entry.error_message || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
