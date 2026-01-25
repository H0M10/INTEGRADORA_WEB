import api from './api'
import type { 
  AdminUser, 
  CreateAdminRequest, 
  UpdateAdminRequest,
  PaginatedResponse,
  PaginationParams 
} from '@/types'

// Helper para transformar admin del backend (snake_case) a frontend
const transformAdmin = (admin: any): AdminUser => ({
  id: admin.id,
  email: admin.email,
  first_name: admin.first_name || admin.firstName || '',
  last_name: admin.last_name || admin.lastName || '',
  phone: admin.phone || null,
  photo_url: admin.photo_url || admin.photoUrl || null,
  is_email_verified: admin.is_email_verified ?? admin.isEmailVerified ?? false,
  is_active: admin.is_active ?? admin.isActive ?? true,
  created_at: admin.created_at || admin.createdAt || new Date().toISOString(),
  full_name: admin.full_name || `${admin.first_name || ''} ${admin.last_name || ''}`.trim(),
  role: admin.role || 'admin',
})

export const adminsService = {
  // Listar administradores
  async getAll(params?: PaginationParams): Promise<PaginatedResponse<AdminUser>> {
    const response = await api.get('/admin/administrators', { params })
    const data = response.data
    return {
      items: (data.items || []).map(transformAdmin),
      total: data.total || 0,
      page: data.page || 1,
      limit: data.limit || 100,
      pages: data.pages || 1,
    }
  },
  
  // Obtener un administrador
  async getById(id: number): Promise<AdminUser> {
    const response = await api.get(`/admin/administrators/${id}`)
    return transformAdmin(response.data)
  },
  
  // Crear administrador
  async create(data: CreateAdminRequest): Promise<AdminUser> {
    const response = await api.post('/admin/administrators', data)
    return transformAdmin(response.data)
  },
  
  // Actualizar administrador
  async update(id: number, data: UpdateAdminRequest): Promise<AdminUser> {
    const response = await api.put(`/admin/administrators/${id}`, data)
    return transformAdmin(response.data)
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
