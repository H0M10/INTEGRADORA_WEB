import api from './api'
import type { 
  Alert, 
  PaginatedResponse,
  AlertFilters,
  AlertsByType
} from '@/types'

export const alertsService = {
  // Listar alertas
  async getAll(params?: AlertFilters & { resolved?: boolean; from?: string; to?: string }): Promise<PaginatedResponse<Alert>> {
    const response = await api.get('/admin/alerts', { params })
    return response.data
  },
  
  // Obtener alertas pendientes
  async getPending(): Promise<Alert[]> {
    const response = await api.get('/admin/alerts/pending')
    return response.data
  },
  
  // Obtener estadísticas de alertas
  async getStats(): Promise<{ by_type: AlertsByType[]; by_severity: Record<string, number>; total_today: number }> {
    const response = await api.get('/admin/alerts/stats')
    return response.data
  },
  
  // Resolver alerta
  async resolve(id: string, notes?: string): Promise<Alert> {
    const response = await api.post(`/admin/alerts/${id}/resolve`, { notes })
    return response.data
  },
  
  // Descartar alerta
  async dismiss(id: string): Promise<Alert> {
    const response = await api.post(`/admin/alerts/${id}/dismiss`)
    return response.data
  },
  
  // Eliminar alerta
  async delete(id: string): Promise<void> {
    await api.delete(`/admin/alerts/${id}`)
  },
}
