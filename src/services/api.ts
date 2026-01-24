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

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  (axiosConfig: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(config.tokenKey)
    if (token && axiosConfig.headers) {
      axiosConfig.headers.Authorization = `Bearer ${token}`
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
    
    // Si el token expiró, intentar refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      const refreshToken = localStorage.getItem(config.refreshTokenKey)
      if (refreshToken) {
        try {
          const response = await axios.post(`${config.apiUrl}/auth/refresh`, {
            refresh_token: refreshToken,
          })
          
          const { access_token, refresh_token: newRefreshToken } = response.data
          localStorage.setItem(config.tokenKey, access_token)
          localStorage.setItem(config.refreshTokenKey, newRefreshToken)
          
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`
          }
          return api(originalRequest)
        } catch {
          // Si falla el refresh, limpiar sesión y redirigir al login
          localStorage.removeItem(config.tokenKey)
          localStorage.removeItem(config.refreshTokenKey)
          localStorage.removeItem(config.userKey)
          window.location.href = '/login'
        }
      } else {
        // No hay refresh token, redirigir al login
        localStorage.removeItem(config.tokenKey)
        localStorage.removeItem(config.userKey)
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

export default api
