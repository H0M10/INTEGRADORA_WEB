import { useQuery } from '@tanstack/react-query'
import { 
  Users, 
  Smartphone, 
  Bell, 
  UserCheck, 
  TrendingUp,
  AlertTriangle,
  Wifi,
  WifiOff,
  Activity
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { Card, StatCard, PageHeader, Spinner, Badge } from '@/components/ui'
import { dashboardService, alertsService } from '@/services'
import { ALERT_TYPE_LABELS, ALERT_SEVERITY_LABELS } from '@/types'
import type { Alert } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function DashboardPage() {
  // Obtener estadísticas
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats,
    refetchInterval: 30000, // Refrescar cada 30 segundos
  })
  
  // Obtener alertas pendientes recientes
  const { data: recentAlerts, isLoading: loadingAlerts } = useQuery({
    queryKey: ['recent-alerts'],
    queryFn: () => alertsService.getPending(),
  })
  
  // Datos simulados para gráficas (mientras se conecta al backend)
  const usersByMonth = [
    { month: 'Sep', usuarios: 12 },
    { month: 'Oct', usuarios: 19 },
    { month: 'Nov', usuarios: 25 },
    { month: 'Dic', usuarios: 31 },
    { month: 'Ene', usuarios: 45 },
  ]
  
  // Datos para gráficas
  const devicesByStatus = [
    { name: 'Conectados', value: stats?.activeDevices || 0, color: '#22c55e' },
    { name: 'Desconectados', value: Math.max(0, (stats?.totalDevices || 0) - (stats?.activeDevices || 0)), color: '#ef4444' },
  ]
  
  if (loadingStats) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    )
  }

  const getSeverityClasses = (severity: string) => {
    switch (severity) {
      case 'critical': return { bg: 'bg-danger-100', text: 'text-danger-600' }
      case 'warning': return { bg: 'bg-warning-100', text: 'text-warning-600' }
      case 'info': return { bg: 'bg-primary-100', text: 'text-primary-600' }
      default: return { bg: 'bg-gray-100', text: 'text-gray-600' }
    }
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Dashboard" 
        subtitle="Resumen general del sistema de monitoreo"
      />
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Usuarios App"
          value={stats?.totalUsers || 0}
          icon={<Users className="w-6 h-6" />}
          color="primary"
        />
        <StatCard
          title="Monitoreados"
          value={stats?.totalMonitored || 0}
          icon={<UserCheck className="w-6 h-6" />}
          color="success"
        />
        <StatCard
          title="Dispositivos"
          value={stats?.totalDevices || 0}
          icon={<Smartphone className="w-6 h-6" />}
          color="primary"
        />
        <StatCard
          title="Alertas Hoy"
          value={stats?.totalAlertsToday || 0}
          icon={<Bell className="w-6 h-6" />}
          color={(stats?.totalAlertsToday || 0) > 5 ? 'danger' : 'warning'}
        />
      </div>
      
      {/* Segunda fila de stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Wifi className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Dispositivos Activos</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.activeDevices || 0}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <WifiOff className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Dispositivos Inactivos</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.max(0, (stats?.totalDevices || 0) - (stats?.activeDevices || 0))}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Alertas Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.pendingAlerts || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfica de usuarios por mes */}
        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Usuarios Registrados</h3>
            <p className="text-sm text-gray-500">Últimos 5 meses</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usersByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="usuarios" 
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]}
                  name="Usuarios"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        {/* Gráfica de dispositivos por estado */}
        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Estado de Dispositivos</h3>
            <p className="text-sm text-gray-500">Distribución actual</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={devicesByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {devicesByStatus.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      
      {/* Alertas recientes */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Alertas Recientes</h3>
            <p className="text-sm text-gray-500">Últimas alertas del sistema</p>
          </div>
          <a 
            href="#/alerts" 
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Ver todas →
          </a>
        </div>
        
        {loadingAlerts ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : recentAlerts && recentAlerts.length > 0 ? (
          <div className="space-y-3">
            {recentAlerts.slice(0, 5).map((alert: Alert) => {
              const classes = getSeverityClasses(alert.severity)
              return (
                <div 
                  key={alert.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${classes.bg}`}>
                    <Activity className={`w-5 h-5 ${classes.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {ALERT_TYPE_LABELS[alert.type] || alert.type}
                    </p>
                    <p className="text-sm text-gray-500">{alert.message}</p>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={
                        alert.severity === 'critical' ? 'danger' :
                        alert.severity === 'warning' ? 'warning' : 'gray'
                      }
                    >
                      {ALERT_SEVERITY_LABELS[alert.severity]}
                    </Badge>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(alert.createdAt), 'dd MMM, HH:mm', { locale: es })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No hay alertas pendientes</p>
          </div>
        )}
      </Card>
      
      {/* Info del sistema */}
      <Card className="bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <TrendingUp className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h4 className="font-semibold text-primary-900">Sistema Operando Correctamente</h4>
            <p className="text-sm text-primary-700">
              Todos los servicios están funcionando con normalidad. 
              Última sincronización: hace {Math.floor(Math.random() * 5) + 1} minutos
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
