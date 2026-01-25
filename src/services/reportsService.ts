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

// Helper para transformar audit log del backend (snake_case) a frontend
const transformAuditLog = (log: any): AuditLog => ({
  id: log.id,
  admin_id: log.admin_id || log.adminId,
  action: log.action || '',
  entity_type: log.entity_type || log.resourceType || '',
  entity_id: log.entity_id || log.resourceId || 0,
  old_values: log.old_values || log.details || null,
  new_values: log.new_values || null,
  ip_address: log.ip_address || log.ipAddress || '',
  user_agent: log.user_agent || log.userAgent || '',
  created_at: log.created_at || log.createdAt || new Date().toISOString(),
  admin: log.admin,
})

export const auditService = {
  // Obtener logs de auditoría
  async getLogs(params?: { page?: number; per_page?: number; admin_id?: number; action?: string }): Promise<PaginatedResponse<AuditLog>> {
    const response = await api.get('/admin/audit/logs', { params })
    const data = response.data
    return {
      items: (data.items || []).map(transformAuditLog),
      total: data.total || 0,
      page: data.page || 1,
      limit: data.limit || 100,
      pages: data.pages || 1,
    }
  },
}
