import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'

export function useLabelQueue() {
  return useQuery({
    queryKey: ['labels', 'queue'],
    queryFn: () => api.get('/labels/queue').then(r => r.data),
  })
}

export function useLabelUnmatched() {
  return useQuery({
    queryKey: ['labels', 'unmatched'],
    queryFn: () => api.get('/labels/unmatched').then(r => r.data),
  })
}

export function useUploadLabels() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (files) => {
      const fd = new FormData()
      files.forEach(f => fd.append('files', f))
      return api.post('/labels/upload', fd).then(r => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['labels'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useConfirmLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ labelId, orderId }) =>
      api.post(`/labels/${labelId}/confirm`, { order_id: orderId }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['labels'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useAssignLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ labelId, orderId }) =>
      api.patch(`/labels/${labelId}/assign`, { order_id: orderId }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['labels'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
