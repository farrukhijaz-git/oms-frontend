import { useQuery } from '@tanstack/react-query'
import api from '../api/client'

export function useShipmentPerformance(params = {}) {
  return useQuery({
    queryKey: ['reports', 'shipment-performance', params],
    queryFn: () => api.get('/orders/reports/shipment-performance', { params }).then(r => r.data),
  })
}

export function useLateShipments(params = {}) {
  return useQuery({
    queryKey: ['reports', 'late-shipments', params],
    queryFn: () => api.get('/orders/reports/late-shipments', { params }).then(r => r.data),
  })
}

export function useOverdueOrders(params = {}) {
  return useQuery({
    queryKey: ['reports', 'overdue', params],
    queryFn: () => api.get('/orders/reports/overdue', { params }).then(r => r.data),
  })
}
