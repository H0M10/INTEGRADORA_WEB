// =====================================================
// TIPOS DEL PANEL DE ADMINISTRACIÓN - NOVAGUARDIAN
// =====================================================

// ===== ROLES Y PERMISOS =====
export type AdminRole = 'super_admin' | 'admin' | 'operador'

// Tipo para permisos de módulo individual
export type Permission = {
  dashboard: { view: boolean }
  users: { view: boolean; create: boolean; edit: boolean; delete: boolean }
  devices: { view: boolean; create: boolean; edit: boolean; delete: boolean }
  alerts: { view: boolean; resolve: boolean }
  monitored: { view: boolean; edit: boolean }
  admins: { view: boolean; create: boolean; edit: boolean; delete: boolean }
  reports: { view: boolean; export: boolean }
  settings: { view: boolean; edit: boolean }
}

export interface RolePermissions {
  dashboard: { view: boolean }
  users: { view: boolean; create: boolean; edit: boolean; delete: boolean }
  devices: { view: boolean; create: boolean; edit: boolean; delete: boolean }
  alerts: { view: boolean; resolve: boolean }
  monitored: { view: boolean; edit: boolean }
  admins: { view: boolean; create: boolean; edit: boolean; delete: boolean }
  reports: { view: boolean; export: boolean }
  settings: { view: boolean; edit: boolean }
}

export const ROLE_PERMISSIONS: Record<AdminRole, RolePermissions> = {
  super_admin: {
    dashboard: { view: true },
    users: { view: true, create: true, edit: true, delete: true },
    devices: { view: true, create: true, edit: true, delete: true },
    alerts: { view: true, resolve: true },
    monitored: { view: true, edit: true },
    admins: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, export: true },
    settings: { view: true, edit: true },
  },
  admin: {
    dashboard: { view: true },
    users: { view: true, create: true, edit: true, delete: true },
    devices: { view: true, create: true, edit: true, delete: true },
    alerts: { view: true, resolve: true },
    monitored: { view: true, edit: true },
    admins: { view: true, create: true, edit: true, delete: false },
    reports: { view: true, export: true },
    settings: { view: false, edit: false },
  },
  operador: {
    dashboard: { view: true },
    users: { view: true, create: false, edit: false, delete: false },
    devices: { view: true, create: false, edit: false, delete: false },
    alerts: { view: true, resolve: true },
    monitored: { view: true, edit: false },
    admins: { view: false, create: false, edit: false, delete: false },
    reports: { view: true, export: false },
    settings: { view: false, edit: false },
  },
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Administrador',
  admin: 'Administrador',
  operador: 'Operador',
}

// ===== AUTENTICACIÓN =====
export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

// ===== USUARIO AUTENTICADO (respuesta del backend) =====
export interface AdminUser {
  id: string  // UUID del backend
  email: string
  first_name: string
  last_name: string
  phone?: string | null
  photo_url?: string | null
  is_email_verified?: boolean
  is_active?: boolean
  created_at: string
  // Campos calculados en frontend
  full_name?: string
  role?: AdminRole
}

export interface CreateAdminRequest {
  email: string
  password: string
  full_name: string
  role: AdminRole
  phone?: string
}

export interface UpdateAdminRequest {
  full_name?: string
  role?: AdminRole
  is_active?: boolean
  phone?: string
}

// ===== USUARIOS DE LA APP MÓVIL (Familiares/Cuidadores) =====
export interface AppUser {
  id: string  // UUID
  email: string
  firstName: string
  lastName: string
  fullName: string
  phone: string | null
  photoUrl: string | null
  isActive: boolean
  isVerified: boolean
  createdAt: string
  lastLogin: string | null
  devicesCount: number
  monitoredCount: number
}

export interface CreateAppUserRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
}

export interface UpdateAppUserRequest {
  firstName?: string
  lastName?: string
  phone?: string
  is_active?: boolean
}

// ===== PERSONAS MONITOREADAS (Adultos Mayores) =====
export interface MonitoredPerson {
  id: string  // UUID
  firstName: string
  lastName: string
  fullName: string
  birthDate: string | null
  gender: string | null
  bloodType: string | null
  photoUrl: string | null
  isActive: boolean
  caregiverEmail: string
  caregiverName: string
  devicesCount: number
  createdAt: string
}

export interface UpdateMonitoredRequest {
  firstName?: string
  lastName?: string
  bloodType?: string
  notes?: string
  isActive?: boolean
}

// ===== DISPOSITIVOS IoT =====
export type DeviceStatus = 'connected' | 'disconnected' | 'low_battery' | 'error' | 'charging'

export interface Device {
  id: string  // UUID
  serialNumber: string
  code: string
  name: string | null
  model: string
  status: DeviceStatus
  batteryLevel: number
  isConnected: boolean
  isActive: boolean
  firmwareVersion: string
  personName: string | null
  ownerEmail: string | null
  lastSeen: string | null
  createdAt: string
}

export interface CreateDeviceRequest {
  serial_number?: string
  code?: string
  name?: string
  model?: string
}

export interface UpdateDeviceRequest {
  name?: string
  status?: DeviceStatus
  isActive?: boolean
}

// ===== SIGNOS VITALES =====
export interface VitalSigns {
  heartRate: number | null
  spo2: number | null
  temperature: number | null
  systolicBp: number | null
  diastolicBp: number | null
  steps: number
  recordedAt: string | null
}

// ===== ALERTAS =====
export type AlertType = 
  | 'HIGH_HEART_RATE'
  | 'LOW_HEART_RATE'
  | 'LOW_SPO2'
  | 'HIGH_TEMPERATURE'
  | 'LOW_TEMPERATURE'
  | 'HIGH_BLOOD_PRESSURE'
  | 'LOW_BLOOD_PRESSURE'
  | 'FALL_DETECTED'
  | 'SOS_BUTTON'
  | 'GEOFENCE_EXIT'
  | 'GEOFENCE_ENTER'
  | 'LOW_BATTERY'
  | 'DEVICE_DISCONNECTED'
  | 'DEVICE_ERROR'

export type AlertSeverity = 'critical' | 'warning' | 'info'
export type AlertStatus = 'pending' | 'acknowledged' | 'resolved' | 'dismissed'

export interface Alert {
  id: string  // UUID
  type: AlertType
  severity: AlertSeverity
  message: string
  deviceId: string
  deviceName: string
  personName: string
  isRead: boolean
  isResolved: boolean
  resolvedAt: string | null
  createdAt: string
}

export interface UpdateAlertRequest {
  status?: AlertStatus
  notes?: string
}

// ===== ESTADÍSTICAS DEL DASHBOARD =====
export interface DashboardStats {
  totalUsers: number
  totalDevices: number
  totalMonitored: number
  totalAlertsToday: number
  activeDevices: number
  pendingAlerts: number
}

export interface ChartData {
  label: string
  value: number
}

export interface AlertsByType {
  type: AlertType
  count: number
}

export interface UsersByMonth {
  month: string
  count: number
}

// ===== REPORTES =====
export type ReportType = 'users' | 'devices' | 'alerts' | 'monitoring'
export type ReportFormat = 'pdf' | 'excel' | 'csv'

export interface ReportRequest {
  type: ReportType
  format: ReportFormat
  start_date: string
  end_date: string
  filters?: Record<string, unknown>
}

// ===== UMBRALES DE SIGNOS VITALES =====
export interface VitalThresholds {
  heartRateMin: number
  heartRateMax: number
  spo2Min: number
  temperatureMin: number
  temperatureMax: number
  systolicBpMin: number
  systolicBpMax: number
  diastolicBpMin: number
  diastolicBpMax: number
}

// ===== CONFIGURACIÓN DEL SISTEMA =====
export interface SystemConfig {
  alert_thresholds: VitalThresholds
  monitoring_interval_seconds: number
  session_timeout_minutes: number
  max_login_attempts: number
  password_min_length: number
  app_version: string
  maintenance_mode: boolean
}

// ===== LOGS DE AUDITORÍA =====
export interface AuditLog {
  id: number
  admin_id: number
  action: string
  entity_type: string
  entity_id: number
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  ip_address: string
  user_agent: string
  created_at: string
  admin?: AdminUser
}

// ===== PAGINACIÓN =====
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface PaginationParams {
  page?: number
  per_page?: number
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

// ===== FILTROS =====
export interface UserFilters extends PaginationParams {
  is_active?: boolean
  is_verified?: boolean
  created_from?: string
  created_to?: string
}

export interface DeviceFilters extends PaginationParams {
  status?: DeviceStatus
  is_connected?: boolean
  has_owner?: boolean
}

export interface AlertFilters extends PaginationParams {
  type?: AlertType
  severity?: AlertSeverity
  status?: AlertStatus
  date_from?: string
  date_to?: string
  monitored_person_id?: number
}

// ===== RESPUESTAS API =====
export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  errors?: Record<string, string[]>
}

export interface ApiError {
  message: string
  code?: string
  errors?: Record<string, string[]>
}

// ===== CONSTANTES DE UI =====
export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  HIGH_HEART_RATE: 'Ritmo cardíaco alto',
  LOW_HEART_RATE: 'Ritmo cardíaco bajo',
  LOW_SPO2: 'Oxígeno bajo',
  HIGH_TEMPERATURE: 'Temperatura alta',
  LOW_TEMPERATURE: 'Temperatura baja',
  HIGH_BLOOD_PRESSURE: 'Presión arterial alta',
  LOW_BLOOD_PRESSURE: 'Presión arterial baja',
  FALL_DETECTED: 'Caída detectada',
  SOS_BUTTON: 'Botón SOS',
  GEOFENCE_EXIT: 'Fuera de zona segura',
  GEOFENCE_ENTER: 'Entró a zona',
  LOW_BATTERY: 'Batería baja',
  DEVICE_DISCONNECTED: 'Dispositivo desconectado',
  DEVICE_ERROR: 'Error de dispositivo',
}

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  critical: 'Crítica',
  warning: 'Advertencia',
  info: 'Información',
}

export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  pending: 'Pendiente',
  acknowledged: 'Reconocida',
  resolved: 'Resuelta',
  dismissed: 'Descartada',
}

export const DEVICE_STATUS_LABELS: Record<DeviceStatus, string> = {
  connected: 'Conectado',
  disconnected: 'Desconectado',
  low_battery: 'Batería baja',
  error: 'Error',
  charging: 'Cargando',
}
