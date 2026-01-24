import api from './api'
import type { DashboardStats, ChartData, AlertsByType, UsersByMonth } from '@/types'

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
  async getRecentCriticalAlerts(limit: number = 5) {
    const response = await api.get('/admin/dashboard/recent-alerts', { params: { limit } })
    return response.data
  },
  
  // Resumen general (para el endpoint existente del backend)
  async getSummary() {
    const response = await api.get('/dashboard/summary')
    return response.data
  },
}
