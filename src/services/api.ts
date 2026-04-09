import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { config } from '@/config'

// Instancia de Axios configurada
const api = axios.create({
  baseURL: config.apiUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Función para decodificar JWT y obtener expiración
function getTokenExpiration(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const decoded = JSON.parse(atob(payload))
    return decoded.exp ? decoded.exp * 1000 : null // Convertir a milisegundos
  } catch {
    return null
  }
}

// Función para verificar si el token está expirado
export function isTokenExpired(token: string): boolean {
  const expiration = getTokenExpiration(token)
  if (!expiration) return true
  // Considerar expirado si quedan menos de 30 segundos
  return Date.now() >= expiration - 30000
}

// Función para limpiar sesión y redirigir
function clearSessionAndRedirect(reason: string = 'session_expired') {
  console.log(`[Auth] Cerrando sesión: ${reason}`)
  localStorage.removeItem(config.tokenKey)
  localStorage.removeItem(config.refreshTokenKey)
  localStorage.removeItem(config.userKey)
  
  // Guardar razón para mostrar mensaje en login
  if (reason === 'session_expired') {
    sessionStorage.setItem('auth_redirect_reason', 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.')
  }
  
  // Usar replace para evitar que el usuario vuelva atrás (HashRouter compatible)
  window.location.hash = '#/login'
  window.location.reload()
}

// Variable para evitar múltiples redirects simultáneos
let isRedirecting = false

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  (axiosConfig: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(config.tokenKey)
    
    if (token) {
      // Verificar si el token ya expiró ANTES de hacer la request
      if (isTokenExpired(token) && !isRedirecting) {
        console.log('[Auth] Token expirado detectado antes de request')
        // Intentar refresh antes de la request
        const refreshToken = localStorage.getItem(config.refreshTokenKey)
        if (!refreshToken) {
          isRedirecting = true
          clearSessionAndRedirect('session_expired')
          return Promise.reject(new Error('Token expirado'))
        }
      }
      
      if (axiosConfig.headers) {
        axiosConfig.headers.Authorization = `Bearer ${token}`
      }
    }
    return axiosConfig
  },
  (error) => Promise.reject(error)
)

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    
    // Evitar múltiples redirects simultáneos
    if (isRedirecting) {
      return Promise.reject(error)
    }
    
    // Si el token expiró (401), intentar refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      const refreshToken = localStorage.getItem(config.refreshTokenKey)
      
      // Si hay refresh token, intentar renovar
      if (refreshToken && !isTokenExpired(refreshToken)) {
        try {
          console.log('[Auth] Intentando refresh token...')
          const response = await axios.post(`${config.apiUrl}/auth/refresh`, {
            refresh_token: refreshToken,
          })
          
          // El backend puede devolver en diferentes formatos
          const data = response.data.data || response.data
          const newAccessToken = data.token || data.access_token
          const newRefreshToken = data.refreshToken || data.refresh_token
          
          if (newAccessToken) {
            console.log('[Auth] Refresh exitoso, nuevo token obtenido')
            localStorage.setItem(config.tokenKey, newAccessToken)
            if (newRefreshToken) {
              localStorage.setItem(config.refreshTokenKey, newRefreshToken)
            }
            
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
            }
            return api(originalRequest)
          }
        } catch (refreshError) {
          console.error('[Auth] Error en refresh token:', refreshError)
        }
      } else {
        console.log('[Auth] No hay refresh token válido disponible')
      }
      
      // Si llegamos aquí, el refresh falló o no hay refresh token
      isRedirecting = true
      clearSessionAndRedirect('session_expired')
      return Promise.reject(error)
    }
    
    // Para errores 403, también cerrar sesión (sin permiso)
    if (error.response?.status === 403) {
      console.log('[Auth] Error 403 - Sin permisos')
      isRedirecting = true
      clearSessionAndRedirect('no_permission')
      return Promise.reject(error)
    }
    
    return Promise.reject(error)
  }
)

// Función para verificar estado de sesión (usar en componentes)
export function checkSessionValidity(): boolean {
  const token = localStorage.getItem(config.tokenKey)
  if (!token) return false
  return !isTokenExpired(token)
}

export default api
