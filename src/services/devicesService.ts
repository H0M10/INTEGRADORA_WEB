import api from './api'
import type { 
  Device, 
  CreateDeviceRequest, 
  UpdateDeviceRequest,
  PaginatedResponse,
  DeviceFilters 
} from '@/types'

export const devicesService = {
  // Listar dispositivos
  async getAll(params?: DeviceFilters & { limit?: number }): Promise<PaginatedResponse<Device>> {
    const response = await api.get('/admin/devices', { params })
    return response.data
  },
  
  // Obtener un dispositivo
  async getById(id: string): Promise<Device> {
    const response = await api.get(`/admin/devices/${id}`)
    return response.data
  },
  
  // Crear/Registrar dispositivo
  async create(data: CreateDeviceRequest): Promise<Device> {
    const response = await api.post('/admin/devices', data)
    return response.data
  },
  
  // Actualizar dispositivo
  async update(id: string, data: UpdateDeviceRequest): Promise<Device> {
    const response = await api.put(`/admin/devices/${id}`, data)
    return response.data
  },
  
  // Eliminar dispositivo
  async delete(id: string): Promise<void> {
    await api.delete(`/admin/devices/${id}`)
  },
  
  // Desvincular dispositivo de usuario
  async unlink(id: string): Promise<Device> {
    const response = await api.post(`/admin/devices/${id}/unlink`)
    return response.data
  },
  
  // Generar nuevo código de dispositivo
  async generateCode(): Promise<{ device_code: string }> {
    const response = await api.get('/admin/devices/generate-code')
    return response.data
  },
}
