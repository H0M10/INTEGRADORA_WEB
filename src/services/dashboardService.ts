import api from './api'
import type { DashboardStats, ChartData, AlertsByType, UsersByMonth, Alert } from '@/types'

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

export const dashboardService = {
  // Obtener estadísticas generales
  async getStats(): Promise<DashboardStats> {
    const response = await api.get('/admin/dashboard/stats')
    return response.data
  },
  
  // Obtener usuarios por mes (últimos 6 meses)
  async getUsersByMonth(): Promise<UsersByMonth[]> {
    const response = await api.get('/admin/dashboard/users-by-month')
    return response.data
  },
  
  // Obtener alertas por tipo
  async getAlertsByType(): Promise<AlertsByType[]> {
    const response = await api.get('/admin/dashboard/alerts-by-type')
    return response.data
  },
  
  // Obtener dispositivos por estado
  async getDevicesByStatus(): Promise<ChartData[]> {
    const response = await api.get('/admin/dashboard/devices-by-status')
    return response.data
  },
  
  // Obtener últimas alertas críticas
  async getRecentCriticalAlerts(limit: number = 5): Promise<Alert[]> {
    const response = await api.get('/admin/dashboard/recent-alerts', { params: { limit } })
    const items = response.data.items || response.data || []
    return items.map(transformAlert)
  },
  
  // Resumen general (para el endpoint existente del backend)
  async getSummary() {
    const response = await api.get('/dashboard/summary')
    return response.data
  },
}
