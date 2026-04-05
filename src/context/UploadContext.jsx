import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import api from '../api/client'

const UploadContext = createContext(null)

/**
 * Tracks background label upload jobs.
 * Jobs are polled every 2 s until done/error, then cleared after 6 s so the
 * progress card has time to show a "complete" state before disappearing.
 */
export function UploadProvider({ children }) {
  const [jobs, setJobs] = useState({})
  const qc = useQueryClient()

  const addJob = useCallback((jobId, totalFiles) => {
    setJobs(prev => ({
      ...prev,
      [jobId]: {
        status: 'processing',
        current: 0,
        total: totalFiles,
        current_file: null,
        results: null,
        error: null,
      },
    }))
  }, [])

  // Poll all active jobs every 2 s
  useEffect(() => {
    const activeIds = Object.keys(jobs).filter(
      id => jobs[id].status === 'processing'
    )
    if (activeIds.length === 0) return

    let cancelled = false

    const poll = async () => {
      for (const jobId of activeIds) {
        if (cancelled) return
        try {
          const { data } = await api.get(`/labels/jobs/${jobId}`)
          if (cancelled) return

          setJobs(prev => {
            if (!prev[jobId]) return prev
            return { ...prev, [jobId]: { ...prev[jobId], ...data } }
          })

          if (data.status === 'done') {
            qc.invalidateQueries({ queryKey: ['labels'] })
            qc.invalidateQueries({ queryKey: ['orders'] })
            // Remove card after a short delay so the user can see "complete"
            setTimeout(() => {
              if (cancelled) return
              setJobs(prev => {
                const next = { ...prev }
                delete next[jobId]
                return next
              })
            }, 6000)
          }

          if (data.status === 'error') {
            // Keep visible for a while so user sees the failure message
            setTimeout(() => {
              if (cancelled) return
              setJobs(prev => {
                const next = { ...prev }
                delete next[jobId]
                return next
              })
            }, 10000)
          }
        } catch {
          // Silently ignore network errors during polling
        }
      }
    }

    const interval = setInterval(poll, 2000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [jobs, qc])

  const dismissJob = useCallback((jobId) => {
    setJobs(prev => {
      const next = { ...prev }
      delete next[jobId]
      return next
    })
  }, [])

  const activeJobs = Object.entries(jobs).map(([id, job]) => ({ id, ...job }))

  return (
    <UploadContext.Provider value={{ addJob, dismissJob, activeJobs }}>
      {children}
    </UploadContext.Provider>
  )
}

export function useUploadContext() {
  const ctx = useContext(UploadContext)
  if (!ctx) throw new Error('useUploadContext must be used inside UploadProvider')
  return ctx
}
