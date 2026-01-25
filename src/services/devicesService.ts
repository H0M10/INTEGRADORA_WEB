import api from './api'
import type { 
  Device, 
  CreateDeviceRequest, 
  UpdateDeviceRequest,
  PaginatedResponse,
  DeviceFilters 
} from '@/types'

// Helper para transformar device del backend (snake_case) a frontend (camelCase)
const transformDevice = (device: any): Device => ({
  id: device.id,
  serialNumber: device.serial_number || device.serialNumber || '',
  code: device.device_code || device.code || '',
  name: device.name || null,
  model: device.model || '',
  status: device.status || 'disconnected',
  batteryLevel: device.battery_level ?? device.batteryLevel ?? 0,
  isConnected: device.is_connected ?? device.isConnected ?? false,
  isActive: device.is_active ?? device.isActive ?? true,
  firmwareVersion: device.firmware_version || device.firmwareVersion || '',
  personName: device.person_name || device.personName || null,
  ownerEmail: device.owner_email || device.ownerEmail || null,
  lastSeen: device.last_seen || device.lastSeen || null,
  createdAt: device.created_at || device.createdAt || new Date().toISOString(),
})

export const devicesService = {
  // Listar dispositivos
  async getAll(params?: DeviceFilters & { limit?: number }): Promise<PaginatedResponse<Device>> {
    const response = await api.get('/admin/devices', { params })
    const data = response.data
    return {
      items: (data.items || []).map(transformDevice),
      total: data.total || 0,
      page: data.page || 1,
      limit: data.limit || 100,
      pages: data.pages || 1,
    }
  },
  
  // Obtener un dispositivo
  async getById(id: string): Promise<Device> {
    const response = await api.get(`/admin/devices/${id}`)
    return transformDevice(response.data)
  },
  
  // Crear/Registrar dispositivo
  async create(data: CreateDeviceRequest): Promise<Device> {
    const response = await api.post('/admin/devices', data)
    return transformDevice(response.data)
  },
  
  // Actualizar dispositivo
  async update(id: string, data: UpdateDeviceRequest): Promise<Device> {
    const response = await api.put(`/admin/devices/${id}`, data)
    return transformDevice(response.data)
  },
  
  // Eliminar dispositivo
  async delete(id: string): Promise<void> {
    await api.delete(`/admin/devices/${id}`)
  },
  
  // Desvincular dispositivo de usuario
  async unlink(id: string): Promise<Device> {
    const response = await api.post(`/admin/devices/${id}/unlink`)
    return transformDevice(response.data)
  },
  
  // Generar nuevo código de dispositivo
  async generateCode(): Promise<{ device_code: string }> {
    const response = await api.get('/admin/devices/generate-code')
    return response.data
  },
}
