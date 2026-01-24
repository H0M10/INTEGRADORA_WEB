import api from './api'
import type { 
  MonitoredPerson, 
  PaginatedResponse,
  PaginationParams,
  VitalSigns,
  UpdateMonitoredRequest
} from '@/types'

export interface MonitoredFilters extends PaginationParams {
  gender?: string
  limit?: number
}

export interface CreateMonitoredRequest {
  first_name: string
  last_name: string
  birth_date: string
  gender: string
  blood_type?: string
  medical_notes?: string
}

export const monitoredService = {
  // Listar personas monitoreadas
  async getAll(params?: MonitoredFilters): Promise<PaginatedResponse<MonitoredPerson>> {
    const response = await api.get('/admin/monitored', { params })
    return response.data
  },
  
  // Obtener una persona monitoreada
  async getById(id: string): Promise<MonitoredPerson> {
    const response = await api.get(`/admin/monitored/${id}`)
    return response.data
  },
  
  // Crear persona monitoreada
  async create(data: CreateMonitoredRequest): Promise<MonitoredPerson> {
    const response = await api.post('/admin/monitored', data)
    return response.data
  },
  
  // Actualizar persona monitoreada
  async update(id: string, data: UpdateMonitoredRequest): Promise<MonitoredPerson> {
    const response = await api.put(`/admin/monitored/${id}`, data)
    return response.data
  },
  
  // Eliminar persona monitoreada
  async delete(id: string): Promise<void> {
    await api.delete(`/admin/monitored/${id}`)
  },
  
  // Asignar dispositivo
  async assignDevice(personId: string, deviceId: string): Promise<MonitoredPerson> {
    const response = await api.post(`/admin/monitored/${personId}/assign-device`, { device_id: deviceId })
    return response.data
  },
  
  // Desvincular dispositivo
  async unassignDevice(personId: string): Promise<MonitoredPerson> {
    const response = await api.post(`/admin/monitored/${personId}/unassign-device`)
    return response.data
  },
  
  // Obtener vitales actuales
  async getCurrentVitals(id: string): Promise<VitalSigns> {
    const response = await api.get(`/admin/monitored/${id}/vitals/current`)
    return response.data
  },
  
  // Obtener ubicación actual
  async getLocation(id: string): Promise<{ latitude: number; longitude: number; recorded_at: string }> {
    const response = await api.get(`/admin/monitored/${id}/location`)
    return response.data
  },
}
