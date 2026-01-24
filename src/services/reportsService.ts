import api from './api'
import type { ReportRequest, SystemConfig, AuditLog, PaginatedResponse, VitalThresholds } from '@/types'

export const reportsService = {
  // Generar reporte
  async generate(request: ReportRequest): Promise<Blob> {
    const response = await api.post('/admin/reports/generate', request, {
      responseType: 'blob',
    })
    return response.data
  },
  
  // Obtener lista de reportes disponibles
  async getAvailable() {
    const response = await api.get('/admin/reports/available')
    return response.data
  },
}

export const settingsService = {
  // Obtener configuración del sistema
  async getConfig(): Promise<SystemConfig> {
    const response = await api.get('/admin/settings/config')
    return response.data
  },
  
  // Actualizar configuración
  async updateConfig(config: Partial<SystemConfig>): Promise<SystemConfig> {
    const response = await api.put('/admin/settings/config', config)
    return response.data
  },
  
  // Obtener umbrales de alerta
  async getAlertThresholds() {
    const response = await api.get('/admin/settings/thresholds')
    return response.data
  },
  
  // Actualizar umbrales de alerta
  async updateAlertThresholds(thresholds: Partial<VitalThresholds>) {
    const response = await api.put('/admin/settings/thresholds', thresholds)
    return response.data
  },
}

export const auditService = {
  // Obtener logs de auditoría
  async getLogs(params?: { page?: number; per_page?: number; admin_id?: number; action?: string }): Promise<PaginatedResponse<AuditLog>> {
    const response = await api.get('/admin/audit/logs', { params })
    return response.data
  },
}
