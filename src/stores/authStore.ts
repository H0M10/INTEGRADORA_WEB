import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService } from '@/services'
import type { AdminUser, AdminRole, RolePermissions, LoginCredentials } from '@/types'
import { ROLE_PERMISSIONS } from '@/types'
import { config } from '@/config'

interface AuthState {
  // Estado
  user: AdminUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Acciones
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  clearError: () => void
  
  // Permisos
  hasPermission: (module: keyof RolePermissions, action: string) => boolean
  hasRole: (roles: AdminRole[]) => boolean
  getPermissions: () => RolePermissions | null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      // Login
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null })
        try {
          const { user } = await authService.login(credentials)
          
          // Verificar que el usuario existe
          if (!user) {
            throw new Error('No se recibieron datos del usuario')
          }
          
          // Agregar nombre completo y rol por defecto si no viene del backend
          const enrichedUser: AdminUser = {
            ...user,
            full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
            role: user.role || 'admin', // Rol por defecto
          }
          set({ 
            user: enrichedUser, 
            isAuthenticated: true, 
            isLoading: false,
            error: null 
          })
        } catch (error: unknown) {
          let message = 'Error al iniciar sesión. Verifica tus credenciales.'
          if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { detail?: string } } }
            message = axiosError.response?.data?.detail || message
          } else if (error instanceof Error) {
            message = error.message
          }
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false,
            error: message 
          })
          throw error
        }
      },
      
      // Logout
      logout: () => {
        authService.logout()
        set({ 
          user: null, 
          isAuthenticated: false,
          error: null 
        })
      },
      
      // Verificar autenticación
      checkAuth: async () => {
        const token = localStorage.getItem(config.tokenKey)
        if (!token) {
          set({ user: null, isAuthenticated: false })
          return
        }
        
        set({ isLoading: true })
        try {
          const user = await authService.getCurrentUser()
          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false 
          })
        } catch {
          authService.logout()
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
          })
        }
      },
      
      // Limpiar error
      clearError: () => set({ error: null }),
      
      // Verificar permiso específico
      hasPermission: (module: keyof RolePermissions, action: string): boolean => {
        const { user } = get()
        if (!user || !user.role) return false
        
        const permissions = ROLE_PERMISSIONS[user.role]
        if (!permissions) return false
        
        const modulePermissions = permissions[module] as Record<string, boolean>
        return modulePermissions?.[action] === true
      },
      
      // Verificar si tiene alguno de los roles
      hasRole: (roles: AdminRole[]): boolean => {
        const { user } = get()
        if (!user || !user.role) return false
        return roles.includes(user.role)
      },
      
      // Obtener permisos del rol actual
      getPermissions: (): RolePermissions | null => {
        const { user } = get()
        if (!user || !user.role) return null
        return ROLE_PERMISSIONS[user.role]
      },
    }),
    {
      name: 'ng-admin-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
