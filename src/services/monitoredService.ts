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

// Helper para transformar monitored del backend (snake_case) a frontend (camelCase)
const transformMonitored = (person: any): MonitoredPerson => ({
  id: person.id,
  firstName: person.first_name || person.firstName || '',
  lastName: person.last_name || person.lastName || '',
  fullName: person.full_name || `${person.first_name || ''} ${person.last_name || ''}`.trim(),
  birthDate: person.birth_date || person.birthDate || null,
  gender: person.gender || null,
  bloodType: person.blood_type || person.bloodType || null,
  photoUrl: person.photo_url || person.photoUrl || null,
  isActive: person.is_active ?? person.isActive ?? true,
  caregiverEmail: person.caregiver_email || person.caregiverEmail || '',
  caregiverName: person.caregiver_name || person.caregiverName || '',
  devicesCount: person.devices_count ?? person.devicesCount ?? 0,
  createdAt: person.created_at || person.createdAt || new Date().toISOString(),
})

export const monitoredService = {
  // Listar personas monitoreadas
  async getAll(params?: MonitoredFilters): Promise<PaginatedResponse<MonitoredPerson>> {
    const response = await api.get('/admin/monitored', { params })
    const data = response.data
    return {
      items: (data.items || []).map(transformMonitored),
      total: data.total || 0,
      page: data.page || 1,
      limit: data.limit || 100,
      pages: data.pages || 1,
    }
  },
  
  // Obtener una persona monitoreada
  async getById(id: string): Promise<MonitoredPerson> {
    const response = await api.get(`/admin/monitored/${id}`)
    return transformMonitored(response.data)
  },
  
  // Crear persona monitoreada
  async create(data: CreateMonitoredRequest): Promise<MonitoredPerson> {
    const response = await api.post('/admin/monitored', data)
    return transformMonitored(response.data)
  },
  
  // Actualizar persona monitoreada
  async update(id: string, data: UpdateMonitoredRequest): Promise<MonitoredPerson> {
    const response = await api.put(`/admin/monitored/${id}`, data)
    return transformMonitored(response.data)
  },
  
  // Eliminar persona monitoreada
  async delete(id: string): Promise<void> {
    await api.delete(`/admin/monitored/${id}`)
  },
  
  // Asignar dispositivo
  async assignDevice(personId: string, deviceId: string): Promise<MonitoredPerson> {
    const response = await api.post(`/admin/monitored/${personId}/assign-device`, { device_id: deviceId })
    return transformMonitored(response.data)
  },
  
  // Desvincular dispositivo
  async unassignDevice(personId: string): Promise<MonitoredPerson> {
    const response = await api.post(`/admin/monitored/${personId}/unassign-device`)
    return transformMonitored(response.data)
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
