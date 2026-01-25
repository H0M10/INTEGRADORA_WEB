import api from './api'
import type { 
  Alert, 
  PaginatedResponse,
  AlertFilters,
  AlertsByType
} from '@/types'

// Helper para transformar alert del backend (snake_case) a frontend (camelCase)
const transformAlert = (alert: any): Alert => ({
  id: alert.id,
  type: alert.alert_type || alert.type,
  severity: alert.severity,
  message: alert.message || alert.title || '',
  deviceId: alert.device_id || alert.deviceId || '',
  deviceName: alert.device_name || alert.deviceName || '',
  personName: alert.person_name || alert.personName || '',
  isRead: alert.is_read ?? alert.isRead ?? false,
  isResolved: alert.is_resolved ?? alert.isResolved ?? false,
  resolvedAt: alert.resolved_at || alert.resolvedAt || null,
  createdAt: alert.created_at || alert.createdAt || new Date().toISOString(),
})

export const alertsService = {
  // Listar alertas
  async getAll(params?: AlertFilters & { resolved?: boolean; from?: string; to?: string }): Promise<PaginatedResponse<Alert>> {
    const response = await api.get('/admin/alerts', { params })
    const data = response.data
    return {
      items: (data.items || []).map(transformAlert),
      total: data.total || 0,
      page: data.page || 1,
      limit: data.limit || 100,
      pages: data.pages || 1,
    }
  },
  
  // Obtener alertas pendientes
  async getPending(): Promise<Alert[]> {
    const response = await api.get('/admin/alerts/pending')
    const items = response.data.items || response.data || []
    return items.map(transformAlert)
  },
  
  // Obtener estadísticas de alertas
  async getStats(): Promise<{ by_type: AlertsByType[]; by_severity: Record<string, number>; total_today: number }> {
    const response = await api.get('/admin/alerts/stats')
    return response.data
  },
  
  // Resolver alerta
  async resolve(id: string, notes?: string): Promise<Alert> {
    const response = await api.post(`/admin/alerts/${id}/resolve`, { notes })
    return transformAlert(response.data)
  },
  
  // Descartar alerta
  async dismiss(id: string): Promise<Alert> {
    const response = await api.post(`/admin/alerts/${id}/dismiss`)
    return transformAlert(response.data)
  },
  
  // Eliminar alerta
  async delete(id: string): Promise<void> {
    await api.delete(`/admin/alerts/${id}`)
  },
}
