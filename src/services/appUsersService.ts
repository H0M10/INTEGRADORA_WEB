import api from './api'
import type { 
  AppUser, 
  CreateAppUserRequest, 
  UpdateAppUserRequest,
  PaginatedResponse,
  UserFilters 
} from '@/types'

// Helper para transformar usuario del backend (snake_case) a frontend (camelCase)
const transformUser = (user: any): AppUser => ({
  id: user.id,
  email: user.email,
  firstName: user.first_name || user.firstName || '',
  lastName: user.last_name || user.lastName || '',
  fullName: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
  phone: user.phone || null,
  photoUrl: user.photo_url || user.photoUrl || null,
  isActive: user.is_active ?? user.isActive ?? true,
  isVerified: user.is_verified ?? user.isVerified ?? false,
  createdAt: user.created_at || user.createdAt || new Date().toISOString(),
  lastLogin: user.last_login || user.lastLogin || null,
  devicesCount: user.devices_count ?? user.devicesCount ?? 0,
  monitoredCount: user.monitored_count ?? user.monitoredCount ?? 0,
})

export const appUsersService = {
  // Listar usuarios de la app móvil
  async getAll(params?: UserFilters): Promise<PaginatedResponse<AppUser>> {
    const response = await api.get('/admin/app-users', { params })
    const data = response.data
    return {
      items: (data.items || []).map(transformUser),
      total: data.total || 0,
      page: data.page || 1,
      limit: data.limit || 100,
      pages: data.pages || 1,
    }
  },
  
  // Obtener un usuario
  async getById(id: string): Promise<AppUser> {
    const response = await api.get(`/admin/app-users/${id}`)
    return transformUser(response.data)
  },
  
  // Crear usuario
  async create(data: CreateAppUserRequest): Promise<AppUser> {
    // Transformar a snake_case para el backend
    const payload = {
      email: data.email,
      password: data.password,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone
    }
    const response = await api.post('/admin/app-users', payload)
    return transformUser(response.data)
  },
  
  // Actualizar usuario
  async update(id: string, data: UpdateAppUserRequest): Promise<AppUser> {
    // Transformar a snake_case para el backend
    const payload: Record<string, any> = {}
    if (data.firstName !== undefined) payload.first_name = data.firstName
    if (data.lastName !== undefined) payload.last_name = data.lastName
    if (data.phone !== undefined) payload.phone = data.phone
    if (data.is_active !== undefined) payload.is_active = data.is_active
    
    const response = await api.put(`/admin/app-users/${id}`, payload)
    return transformUser(response.data)
  },
  
  // Activar/Desactivar usuario
  async toggleActive(id: string, isActive: boolean): Promise<AppUser> {
    const response = await api.patch(`/admin/app-users/${id}/status`, { is_active: isActive })
    return transformUser(response.data)
  },
  
  // Eliminar usuario (soft delete)
  async delete(id: string): Promise<void> {
    await api.delete(`/admin/app-users/${id}`)
  },
  
  // Resetear contraseña
  async resetPassword(id: string): Promise<{ temporary_password: string }> {
    const response = await api.post(`/admin/app-users/${id}/reset-password`)
    return response.data
  },

  // Verificar si email existe
  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const response = await api.get(`/admin/app-users/check-email/${encodeURIComponent(email)}`)
      return response.data.exists
    } catch {
      return false
    }
  },

  // Verificar si teléfono existe
  async checkPhoneExists(phone: string): Promise<boolean> {
    try {
      const response = await api.get(`/admin/app-users/check-phone/${encodeURIComponent(phone)}`)
      return response.data.exists
    } catch {
      return false
    }
  },
}
