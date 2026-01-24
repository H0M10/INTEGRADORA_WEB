import api from './api'
import type { 
  AppUser, 
  CreateAppUserRequest, 
  UpdateAppUserRequest,
  PaginatedResponse,
  UserFilters 
} from '@/types'

export const appUsersService = {
  // Listar usuarios de la app móvil
  async getAll(params?: UserFilters): Promise<PaginatedResponse<AppUser>> {
    const response = await api.get('/admin/app-users', { params })
    return response.data
  },
  
  // Obtener un usuario
  async getById(id: string): Promise<AppUser> {
    const response = await api.get(`/admin/app-users/${id}`)
    return response.data
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
    return response.data
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
    return response.data
  },
  
  // Activar/Desactivar usuario
  async toggleActive(id: string, isActive: boolean): Promise<AppUser> {
    const response = await api.patch(`/admin/app-users/${id}/status`, { is_active: isActive })
    return response.data
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
