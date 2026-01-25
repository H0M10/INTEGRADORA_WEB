import api from './api'
import { config } from '@/config'
import type { LoginCredentials, AuthTokens, AdminUser, AdminRole } from '@/types'

// Interfaz para la respuesta REAL del backend
interface BackendUser {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name?: string
  phone?: string | null
  photo_url?: string | null
  is_active: boolean
  is_verified?: boolean
  role: string
  created_at: string
}

interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: BackendUser
}

export const authService = {
  // Login de administrador
  async login(credentials: LoginCredentials): Promise<{ tokens: AuthTokens; user: AdminUser }> {
    const response = await api.post<LoginResponse>('/auth/login', {
      email: credentials.email,
      password: credentials.password,
    })
    
    console.log('Login response:', response.data) // Debug
    
    // Extraer directamente de response.data (sin wrapper)
    const { access_token, refresh_token, token_type, user: backendUser } = response.data
    
    const tokens: AuthTokens = {
      access_token,
      refresh_token,
      token_type,
    }
    
    // Mapear rol del backend a nuestro tipo
    const roleMap: Record<string, AdminRole> = {
      'super_admin': 'super_admin',
      'admin': 'admin',
      'operator': 'operador',
      'operador': 'operador',
      'client': 'operador'
    }
    
    // Mapear usuario del backend a nuestro tipo
    const user: AdminUser = {
      id: backendUser.id,
      email: backendUser.email,
      first_name: backendUser.first_name,
      last_name: backendUser.last_name,
      full_name: backendUser.full_name || `${backendUser.first_name} ${backendUser.last_name}`,
      phone: backendUser.phone,
      photo_url: backendUser.photo_url,
      is_active: backendUser.is_active,
      is_email_verified: backendUser.is_verified ?? true,
      created_at: backendUser.created_at,
      role: roleMap[backendUser.role] || 'operador',
    }
    
    // Guardar tokens
    localStorage.setItem(config.tokenKey, tokens.access_token)
    if (tokens.refresh_token) {
      localStorage.setItem(config.refreshTokenKey, tokens.refresh_token)
    }
    
    // Guardar usuario
    localStorage.setItem(config.userKey, JSON.stringify(user))
    
    return { tokens, user }
  },
  
  // Obtener usuario actual
  async getCurrentUser(): Promise<AdminUser> {
    const response = await api.get<AdminUser>('/auth/me')
    return response.data
  },
  
  // Cerrar sesión
  logout(): void {
    localStorage.removeItem(config.tokenKey)
    localStorage.removeItem(config.refreshTokenKey)
    localStorage.removeItem(config.userKey)
  },
  
  // Verificar si hay sesión activa
  isAuthenticated(): boolean {
    return !!localStorage.getItem(config.tokenKey)
  },
  
  // Obtener usuario guardado
  getStoredUser(): AdminUser | null {
    const userStr = localStorage.getItem(config.userKey)
    if (userStr) {
      try {
        return JSON.parse(userStr)
      } catch {
        return null
      }
    }
    return null
  },
  
  // Cambiar contraseña
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
  },
}
