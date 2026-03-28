import { useState } from 'react'
import { useWalmartStatus, useWalmartLog, usePollNow, useSaveCredentials, useUpdateSettings } from '../hooks/useWalmart'
import { showToast } from '../components/Toast'

const INTERVALS = [
  { label: '5 minutes', value: 300 },
  { label: '15 minutes', value: 900 },
  { label: '30 minutes', value: 1800 },
  { label: '1 hour', value: 3600 },
]

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
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Walmart Integration</h1>

      {/* Status card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3">Connection Status</h2>
        {isLoading ? <div className="text-gray-400">Loading...</div> : (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${status?.configured ? 'bg-green-500' : 'bg-red-400'}`} />
              <span className="text-sm font-medium">{status?.configured ? 'Connected' : 'Not configured'}</span>
            </div>
            {status?.last_polled_at && (
              <p className="text-sm text-gray-500">Last poll: {new Date(status.last_polled_at).toLocaleString()}</p>
            )}
            <button onClick={handlePollNow} disabled={pollMutation.isPending || !status?.configured}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {pollMutation.isPending ? 'Polling...' : 'Poll Now'}
            </button>
          </div>
        )}
      </div>

      {/* Credentials form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3">API Credentials</h2>
        <form onSubmit={handleSaveCreds} className="space-y-3">
          <input type="password" required value={clientId} onChange={e => setClientId(e.target.value)}
            placeholder="Client ID"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input type="password" required value={clientSecret} onChange={e => setClientSecret(e.target.value)}
            placeholder="Client Secret"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <button type="submit" disabled={credsMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {credsMutation.isPending ? 'Saving...' : 'Save Credentials'}
          </button>
        </form>
      </div>

      {/* Poll interval */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3">Poll Interval</h2>
        <div className="flex gap-3 items-center flex-wrap">
          <select value={interval} onChange={e => setInterval(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
          <button onClick={handleSaveInterval} disabled={settingsMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
            Save
          </button>
        </div>
      </div>

      {/* Sync log */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Sync Log</h2>
        {log.length === 0 ? (
          <p className="text-gray-400 text-sm">No sync history</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="pb-2 pr-4">Time</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Pulled</th>
                  <th className="pb-2">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {log.map(entry => (
                  <tr key={entry.id}>
                    <td className="py-2 pr-4 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(entry.synced_at).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{entry.sync_type}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        entry.status === 'success' ? 'bg-green-100 text-green-700' :
                        entry.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>{entry.status}</span>
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{entry.orders_pulled}</td>
                    <td className="py-2 text-red-500 text-xs max-w-[200px] truncate">{entry.error_message || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
