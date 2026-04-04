import { useState } from 'react'
import { useWalmartStatus, useWalmartLog, usePollNow, useSaveCredentials, useUpdateSettings, useBackfill } from '../hooks/useWalmart'
import {
  Topbar, Panel, PanelHeader, PanelTitle, PanelBody,
  BtnPrimary, BtnSecondary, FormField, Input, Select, useToast,
} from '../components.jsx'
import { useBackgroundJobs } from '../context/BackgroundJobsContext'

const INTERVALS = [
  { label: '5 minutes', value: 300 },
  { label: '15 minutes', value: 900 },
  { label: '30 minutes', value: 1800 },
  { label: '1 hour', value: 3600 },
]

function SyncStatusBadge({ status }) {
  const styles = {
    success: { color: 'var(--oms-label-text)', background: 'var(--oms-label-bg)' },
    partial:  { color: 'var(--oms-inventory-text)', background: 'var(--oms-inventory-bg)' },
    error:    { color: 'var(--oms-ready-text)', background: 'var(--oms-ready-bg)' },
  }
  const s = styles[status] || styles.error
  return (
    <span className="oms-status" style={s}>{status}</span>
  )
}

export default function AdminWalmartPage() {
  const toast = useToast()
  const { addJob, completeJob, failJob } = useBackgroundJobs()
  const { data: status, isLoading, isError: statusError, refetch: refetchStatus } = useWalmartStatus()
  const { data: logData, refetch: refetchLog } = useWalmartLog()

  const handleRetry = () => { refetchStatus(); refetchLog() }
  const pollMutation = usePollNow()
  const credsMutation = useSaveCredentials()
  const settingsMutation = useUpdateSettings()
  const backfillMutation = useBackfill()

  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [interval, setInterval] = useState(900)
  const [backfillDate, setBackfillDate] = useState('')

  const log = logData?.log || []

  const handleSaveCreds = async (e) => {
    e.preventDefault()
    try {
      await credsMutation.mutateAsync({ client_id: clientId, client_secret: clientSecret })
      toast.success('Credentials saved')
      setClientId('')
      setClientSecret('')
    } catch {
      toast.error('Failed to save credentials')
    }
  }

  const handleSaveInterval = async () => {
    try {
      await settingsMutation.mutateAsync({ poll_interval_seconds: interval })
      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save settings')
    }
  }

  const handlePollNow = async () => {
    const jobId = addJob('poll', 'Manual poll')
    try {
      const result = await pollMutation.mutateAsync()
      completeJob(jobId, { pulled: (result.pulled ?? 0) + (result.updated ?? 0) })
    } catch (err) {
      failJob(jobId, err.response?.data?.error?.message || 'Poll failed')
    }
  }

  const handleBackfill = async (e) => {
    e.preventDefault()
    try {
      await backfillMutation.mutateAsync(backfillDate)
      addJob('backfill', `Backfill from ${backfillDate}`)
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Backfill failed')
    }
  }

  return (
    <div className="oms-main">

      <Topbar title="Walmart Integration">
        <BtnPrimary
          size="sm"
          onClick={handlePollNow}
          disabled={!status?.configured}
          loading={pollMutation.isPending}
        >
          {pollMutation.isPending ? 'Polling…' : 'Poll Now'}
        </BtnPrimary>
      </Topbar>

      <div className="oms-content">

        {/* Connection status */}
        <Panel>
          <PanelHeader><PanelTitle>Connection</PanelTitle></PanelHeader>
          <PanelBody>
            {isLoading ? (
              <span className="oms-text-muted" style={{ fontSize: 13 }}>Loading…</span>
            ) : statusError ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="oms-text-muted" style={{ fontSize: 13 }}>Service unavailable — may be waking up</span>
                <BtnSecondary size="sm" onClick={handleRetry}>Retry</BtnSecondary>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: status?.configured ? 'var(--oms-label-text)' : '#EF4444' }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: status?.configured ? 'var(--oms-label-text)' : '#EF4444' }}>
                    {status?.configured ? 'Connected' : 'Not configured'}
                  </span>
                </div>
                {status?.last_polled_at && (
                  <span className="oms-text-muted" style={{ fontSize: 12 }}>
                    Last poll: {new Date(status.last_polled_at).toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </PanelBody>
        </Panel>

        {/* API credentials */}
        <Panel>
          <PanelHeader><PanelTitle>API Credentials</PanelTitle></PanelHeader>
          <PanelBody>
            <form onSubmit={handleSaveCreds} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <FormField label="Client ID">
                <input
                  type="password" required className="oms-input"
                  value={clientId} onChange={e => setClientId(e.target.value)}
                  placeholder="Client ID"
                />
              </FormField>
              <FormField label="Client Secret">
                <input
                  type="password" required className="oms-input"
                  value={clientSecret} onChange={e => setClientSecret(e.target.value)}
                  placeholder="Client Secret"
                />
              </FormField>
              <div>
                <BtnPrimary loading={credsMutation.isPending}>
                  {credsMutation.isPending ? 'Saving…' : 'Save Credentials'}
                </BtnPrimary>
              </div>
            </form>
          </PanelBody>
        </Panel>

        {/* Poll interval */}
        <Panel>
          <PanelHeader><PanelTitle>Poll Interval</PanelTitle></PanelHeader>
          <PanelBody>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Select value={interval} onChange={v => setInterval(parseInt(v))}>
                {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </Select>
              <BtnSecondary onClick={handleSaveInterval} loading={settingsMutation.isPending}>
                Save
              </BtnSecondary>
            </div>
          </PanelBody>
        </Panel>

        {/* Backfill */}
        <Panel>
          <PanelHeader><PanelTitle>Import Historical Orders</PanelTitle></PanelHeader>
          <PanelBody>
            <div className="oms-text-muted" style={{ fontSize: 12, marginBottom: 12 }}>
              Pull all Walmart orders from a specific date. Safe to re-run — duplicates are skipped.
            </div>
            <form onSubmit={handleBackfill} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="date" required className="oms-input" style={{ width: 'auto' }}
                value={backfillDate} onChange={e => setBackfillDate(e.target.value)}
              />
              <BtnPrimary
                disabled={!status?.configured}
                loading={backfillMutation.isPending}
              >
                {backfillMutation.isPending ? 'Importing…' : 'Import from date'}
              </BtnPrimary>
            </form>
          </PanelBody>
        </Panel>

        {/* Sync log */}
        <Panel>
          <PanelHeader><PanelTitle>Sync Log</PanelTitle></PanelHeader>
          {log.length === 0 ? (
            <PanelBody>
              <span className="oms-text-muted" style={{ fontSize: 13 }}>No sync history</span>
            </PanelBody>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="oms-table" style={{ minWidth: 500 }}>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Pulled</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map(entry => (
                    <tr key={entry.id}>
                      <td className="oms-text-muted" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                        {new Date(entry.synced_at).toLocaleString()}
                      </td>
                      <td className="oms-text-secondary" style={{ fontSize: 12 }}>{entry.sync_type}</td>
                      <td><SyncStatusBadge status={entry.status} /></td>
                      <td className="oms-text-secondary">{entry.orders_pulled}</td>
                      <td style={{ fontSize: 11, color: '#DC2626', wordBreak: 'break-word' }}>
                        {entry.error_message || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

      </div>
    </div>
  )
}
