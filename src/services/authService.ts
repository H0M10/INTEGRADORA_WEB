import api from './api'
import { config } from '@/config'
import type { LoginCredentials, AuthTokens, AdminUser, AdminRole } from '@/types'

// Interfaz para la respuesta REAL del backend (simple_api.py)
interface BackendUser {
  id: string
  email: string
  firstName: string      // camelCase del backend
  lastName: string       // camelCase del backend
  name: string           // nombre completo
  phone?: string | null
  photoUrl?: string | null  // camelCase
  isActive: boolean      // camelCase
  isVerified: boolean    // camelCase
  role: string           // admin, operator, client
  createdAt: string      // camelCase
}

interface LoginResponse {
  success: boolean
  data: {
    user: BackendUser
    token: string        // NO es access_token
    refreshToken: string // NO es refresh_token
  }
}

export const authService = {
  // Login de administrador
  async login(credentials: LoginCredentials): Promise<{ tokens: AuthTokens; user: AdminUser }> {
    const response = await api.post<LoginResponse>('/auth/login', {
      email: credentials.email,
      password: credentials.password,
    })
    
    console.log('Login response:', response.data) // Debug
    
    // Extraer de la estructura anidada: response.data.data
    const { data: responseData } = response.data
    const { user: backendUser, token, refreshToken } = responseData
    
    const tokens: AuthTokens = {
      access_token: token,
      refresh_token: refreshToken,
      token_type: 'bearer',
    }
    
    // Mapear rol del backend a nuestro tipo
    const roleMap: Record<string, AdminRole> = {
      'admin': 'admin',
      'operator': 'operador',
      'client': 'operador' // No debería llegar aquí, pero por si acaso
    }
    
    // Mapear usuario del backend (camelCase) a nuestro tipo (snake_case)
    const user: AdminUser = {
      id: backendUser.id,
      email: backendUser.email,
      first_name: backendUser.firstName,
      last_name: backendUser.lastName,
      full_name: backendUser.name,
      phone: backendUser.phone,
      photo_url: backendUser.photoUrl,
      is_active: backendUser.isActive,
      is_email_verified: backendUser.isVerified,
      created_at: backendUser.createdAt,
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
