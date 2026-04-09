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
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { 
  AreaChart, 
  Area, 
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
import { PageHeader, Spinner, Badge } from '@/components/ui'
import { dashboardService, alertsService } from '@/services'
import type { Alert } from '@/types'

// Custom Stat Card Component for Dashboard
function PremiumStatCard({ title, value, icon, gradient, trend }: any) {
  return (
    <div className="card card-hover p-6 flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="text-4xl font-extrabold text-slate-800 mt-2 tracking-tight">{value}</p>
        </div>
        <div className={`p-3.5 rounded-2xl bg-gradient-to-tr ${gradient} shadow-lg shadow-primary-500/20 text-white`}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1.5">
          <div className={`flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-lg ${trend.isPositive ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'}`}>
            {trend.isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {trend.value}%
          </div>
          <span className="text-xs font-medium text-slate-400">vs mes anterior</span>
        </div>
      )}
    </div>
  )
}

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-glass border border-slate-100">
        <p className="text-sm font-bold text-slate-800 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <p className="text-xs font-medium text-slate-600">
              {entry.name}: <span className="font-bold text-slate-900">{entry.value}</span>
            </p>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function DashboardPage() {
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats,
    refetchInterval: 30000,
  })
  
  const { data: recentAlerts, isLoading: loadingAlerts } = useQuery({
    queryKey: ['recent-alerts'],
    queryFn: () => alertsService.getPending(),
  })
  
  const usersByMonth = [
    { month: 'Sep', usuarios: 12 },
    { month: 'Oct', usuarios: 19 },
    { month: 'Nov', usuarios: 25 },
    { month: 'Dic', usuarios: 31 },
    { month: 'Ene', usuarios: 45 },
  ]
  
  const devicesByStatus = [
    { name: 'Activos', value: stats?.activeDevices || 0, color: '#3b82f6' },
    { name: 'Inactivos', value: Math.max(0, (stats?.totalDevices || 0) - (stats?.activeDevices || 0)), color: '#94a3b8' },
  ]
  
  if (loadingStats) {
    return (
      <div className="flex flex-col gap-6 p-2 animate-fade-in">
        <div className="h-12 w-64 skeleton" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="h-36 skeleton" />
          <div className="h-36 skeleton" />
          <div className="h-36 skeleton" />
          <div className="h-36 skeleton" />
        </div>
        <div className="h-80 skeleton" />
      </div>
    )
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-danger-50 text-danger-600 rounded-lg border border-danger-100">Crítico</span>
      case 'warning': return <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-warning-50 text-warning-600 rounded-lg border border-warning-100">Advertencia</span>
      case 'info': return <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-primary-50 text-primary-600 rounded-lg border border-primary-100">Info</span>
      default: return <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-slate-100 text-slate-600 rounded-lg border border-slate-200">Normal</span>
    }
  }

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <Activity className="w-5 h-5 text-danger-500" />
      case 'warning': return <AlertTriangle className="w-5 h-5 text-warning-500" />
      default: return <Bell className="w-5 h-5 text-primary-500" />
    }
  }
  
  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Panorama General</h1>
        <p className="text-sm font-medium text-slate-500">Monitoreo en tiempo real de pacientes y dispositivos IoT.</p>
      </div>
      
      {/* Metrics Row - Bento Grid Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <PremiumStatCard
          title="Total Usuarios"
          value={stats?.totalUsers || 0}
          icon={<Users className="w-6 h-6" />}
          gradient="from-blue-600 to-indigo-600"
          trend={{ value: 12, isPositive: true }}
        />
        <PremiumStatCard
          title="Pacientes"
          value={stats?.totalMonitored || 0}
          icon={<UserCheck className="w-6 h-6" />}
          gradient="from-success-500 to-emerald-600"
          trend={{ value: 4, isPositive: true }}
        />
        <PremiumStatCard
          title="Dispositivos C."
          value={stats?.activeDevices || 0}
          icon={<Wifi className="w-6 h-6" />}
          gradient="from-slate-700 to-slate-900"
        />
        <PremiumStatCard
          title="Alertas Pendientes"
          value={stats?.pendingAlerts || 0}
          icon={<Bell className="w-6 h-6" />}
          gradient={(stats?.pendingAlerts || 0) > 0 ? "from-danger-500 to-rose-600" : "from-slate-400 to-slate-500"}
        />
      </div>
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart Area */}
        <div className="card p-6 lg:col-span-2 flex flex-col justify-between">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Crecimiento de Usuarios</h3>
              <p className="text-sm font-medium text-slate-500">Evolución de cuentas registradas</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-success-600 bg-success-50 px-2 py-1 rounded-lg">
                <TrendingUp className="w-3.5 h-3.5" /> +24% ESTE MES
              </span>
            </div>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usersByMonth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="usuarios" 
                  name="Usuarios"
                  stroke="#4f46e5" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorUsers)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Secondary Info Area (Pie + Status) */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <div className="card p-6 flex-1 flex flex-col">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Estado de Red</h3>
              <p className="text-sm font-medium text-slate-500">Conexión de pulseras</p>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={devicesByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {devicesByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                {devicesByStatus.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-xs font-bold text-slate-600">{d.name}: {d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Alertas Premium List */}
      <div className="card">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Alertas Recientes</h3>
            <p className="text-sm font-medium text-slate-500">Incidentes reportados por las pulseras IoT</p>
          </div>
          <a 
            href="#/alerts" 
            className="text-sm font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-4 py-2 rounded-xl transition-colors hover:bg-primary-100"
          >
            Ver todas
          </a>
        </div>
        
        <div className="p-2">
          {loadingAlerts ? (
            <div className="p-6 space-y-4">
              <div className="h-16 skeleton" />
              <div className="h-16 skeleton" />
              <div className="h-16 skeleton" />
            </div>
          ) : recentAlerts && recentAlerts.length > 0 ? (
            <div className="flex flex-col">
              {recentAlerts.slice(0, 5).map((alert: Alert) => (
                <div 
                  key={alert.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 mx-2 my-1 bg-white hover:bg-slate-50 rounded-xl transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      {getAlertIcon(alert.severity)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 leading-tight">{alert.type}</p>
                      <p className="text-sm text-slate-500 mt-0.5 max-w-lg truncate">{alert.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:ml-auto">
                    {getSeverityBadge(alert.severity)}
                    <span className="text-xs font-bold text-slate-400 min-w-[70px] text-right">
                      {/* Placeholder for date */}
                      Hace poco
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-12 h-12 bg-success-50 text-success-500 rounded-2xl flex items-center justify-center mb-4">
                <UserCheck className="w-6 h-6" />
              </div>
              <p className="text-lg font-bold text-slate-900">Todo en orden</p>
              <p className="text-sm text-slate-500 mt-1">No hay alertas pendientes en el sistema en este momento.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
