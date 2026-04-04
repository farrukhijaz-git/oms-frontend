import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/client'

const BackgroundJobsContext = createContext(null)
let _nextId = 1

export function BackgroundJobsProvider({ children }) {
  const [jobs, setJobs] = useState([])

  const addJob = useCallback((type, label) => {
    const id = String(_nextId++)
    setJobs(prev => [{
      id, type, label,
      status: 'running',
      startedAt: Date.now(),
      completedAt: null,
      result: null,
      error: null,
    }, ...prev].slice(0, 20))
    return id
  }, [])

  const completeJob = useCallback((id, result, status = 'done') => {
    setJobs(prev => prev.map(j =>
      j.id === id && j.status === 'running'
        ? { ...j, status, completedAt: Date.now(), result }
        : j
    ))
  }, [])

  const failJob = useCallback((id, error) => {
    setJobs(prev => prev.map(j =>
      j.id === id && j.status === 'running'
        ? { ...j, status: 'failed', completedAt: Date.now(), error }
        : j
    ))
  }, [])

  const clearCompleted = useCallback(() => {
    setJobs(prev => prev.filter(j => j.status === 'running'))
  }, [])

  // Poll sync log every 5s to detect when server-side backfill jobs complete.
  // Backfill returns 200 immediately — actual work runs async on the server.
  // We look for a new sync_log entry with synced_at > job.startedAt.
  useEffect(() => {
    const runningBackfills = jobs.filter(j => j.type === 'backfill' && j.status === 'running')
    if (runningBackfills.length === 0) return

    let cancelled = false

    const poll = async () => {
      if (cancelled) return
      try {
        const { data } = await api.get('/walmart/sync/log')
        if (cancelled) return
        const entries = data.log || []

        for (const job of runningBackfills) {
          const match = entries.find(e => new Date(e.synced_at).getTime() > job.startedAt)
          if (match) {
            const finalStatus = match.status === 'success' ? 'done'
              : match.status === 'partial' ? 'partial'
              : 'failed'
            completeJob(job.id, {
              pulled: match.orders_pulled,
              error_message: match.error_message,
            }, finalStatus)
          }
        }
      } catch { /* ignore network errors during polling */ }
    }

    const interval = setInterval(poll, 5000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [jobs, completeJob])

  return (
    <BackgroundJobsContext.Provider value={{ jobs, addJob, completeJob, failJob, clearCompleted }}>
      {children}
    </BackgroundJobsContext.Provider>
  )
}

export function useBackgroundJobs() {
  // Safe fallback so components don't crash if used outside the provider
  return useContext(BackgroundJobsContext) || {
    jobs: [],
    addJob: () => '',
    completeJob: () => {},
    failJob: () => {},
    clearCompleted: () => {},
  }
}
