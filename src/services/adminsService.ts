import api from './api'
import type { 
  AdminUser, 
  CreateAdminRequest, 
  UpdateAdminRequest,
  PaginatedResponse,
  PaginationParams 
} from '@/types'

export const adminsService = {
  // Listar administradores
  async getAll(params?: PaginationParams): Promise<PaginatedResponse<AdminUser>> {
    const response = await api.get('/admin/administrators', { params })
    return response.data
  },
  
  // Obtener un administrador
  async getById(id: number): Promise<AdminUser> {
    const response = await api.get(`/admin/administrators/${id}`)
    return response.data
  },
  
  // Crear administrador
  async create(data: CreateAdminRequest): Promise<AdminUser> {
    const response = await api.post('/admin/administrators', data)
    return response.data
  },
  
  // Actualizar administrador
  async update(id: number, data: UpdateAdminRequest): Promise<AdminUser> {
    const response = await api.put(`/admin/administrators/${id}`, data)
    return response.data
  },
  
  // Eliminar administrador (desactivar)
  async delete(id: number): Promise<void> {
    await api.delete(`/admin/administrators/${id}`)
  },
  
  // Resetear contraseña de administrador
  async resetPassword(id: number): Promise<{ temporary_password: string }> {
    const response = await api.post(`/admin/administrators/${id}/reset-password`)
    return response.data
  },
}
