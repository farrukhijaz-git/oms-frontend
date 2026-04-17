import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'

export function useWalmartStatus() {
  return useQuery({
    queryKey: ['walmart', 'status'],
    queryFn: () => api.get('/walmart/sync/status').then(r => r.data),
  })
}

export function useWalmartLog() {
  return useQuery({
    queryKey: ['walmart', 'log'],
    queryFn: () => api.get('/walmart/sync/log').then(r => r.data),
  })
}

export function usePollNow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/walmart/sync/pull').then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['walmart'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useReconcileNow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/walmart/sync/reconcile').then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['walmart'] }),
  })
}

export function useBackfill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (from_date) => api.post('/walmart/sync/backfill', { from_date }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['walmart'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useSaveCredentials() {
  return useMutation({
    mutationFn: (data) => api.post('/walmart/credentials', data).then(r => r.data),
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.patch('/walmart/settings', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['walmart'] }),
  })
}

export function useSendShipmentToWalmart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ order_id, tracking_number, carrier, ship_datetime }) =>
      api.post('/walmart/ship', { order_id, tracking_number, carrier, ship_datetime }).then(r => r.data),
    onSuccess: (_, { order_id }) => {
      qc.invalidateQueries({ queryKey: ['orders', order_id] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
