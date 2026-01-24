// Configuración de la aplicación
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8002/api/v1',
  appName: import.meta.env.VITE_APP_NAME || 'NovaGuardian Admin',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
  
  // Configuración de sesión
  tokenKey: 'ng_admin_token',
  refreshTokenKey: 'ng_admin_refresh_token',
  userKey: 'ng_admin_user',
  
  // Paginación por defecto
  defaultPageSize: 10,
  pageSizeOptions: [10, 25, 50, 100],
  
  // Tiempos
  toastDuration: 4000,
  sessionTimeout: 60 * 60 * 1000, // 1 hora
  refreshInterval: 30 * 1000, // 30 segundos para datos en tiempo real
}
