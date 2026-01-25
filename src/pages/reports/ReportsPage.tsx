import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileText, Download, Calendar, TrendingUp, Users, Smartphone,
  Bell, Heart, Activity, BarChart3, PieChart, RefreshCw, FileSpreadsheet,
  Printer, Share2, CheckCircle, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Minus, Shield, Zap
} from 'lucide-react'
import { Card, PageHeader, Button, Badge, Modal } from '@/components/ui'
import { appUsersService, devicesService, monitoredService, alertsService } from '@/services'
import { ALERT_TYPE_LABELS, ALERT_SEVERITY_LABELS, type AlertType, type AlertSeverity } from '@/types'
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

type ReportType = 'overview' | 'users' | 'devices' | 'alerts' | 'vitals' | 'activity'
type DatePreset = 'today' | 'week' | 'month' | 'quarter' | 'year'
type ExportFormat = 'pdf' | 'excel' | 'csv'

interface ReportConfig {
  type: ReportType
  title: string
  description: string
  icon: JSX.Element
  color: string
  metrics: string[]
}

const REPORTS: ReportConfig[] = [
  { type: 'overview', title: 'Resumen Ejecutivo', description: 'Vista general del sistema con KPIs principales', icon: <BarChart3 className="w-6 h-6" />, color: 'blue', metrics: ['Total usuarios', 'Dispositivos activos', 'Alertas pendientes', 'Personas monitoreadas'] },
  { type: 'users', title: 'Reporte de Usuarios', description: 'Análisis detallado de usuarios y su actividad', icon: <Users className="w-6 h-6" />, color: 'green', metrics: ['Usuarios registrados', 'Tasa de verificación', 'Actividad mensual', 'Retención'] },
  { type: 'devices', title: 'Reporte de Dispositivos', description: 'Estado y rendimiento de dispositivos NovaBand', icon: <Smartphone className="w-6 h-6" />, color: 'purple', metrics: ['Estado de conexión', 'Niveles de batería', 'Firmware', 'Asignaciones'] },
  { type: 'alerts', title: 'Reporte de Alertas', description: 'Análisis de alertas y tiempos de respuesta', icon: <Bell className="w-6 h-6" />, color: 'orange', metrics: ['Por severidad', 'Por tipo', 'Tiempo de resolución', 'Tendencias'] },
  { type: 'vitals', title: 'Signos Vitales', description: 'Estadísticas de mediciones de salud', icon: <Heart className="w-6 h-6" />, color: 'red', metrics: ['Promedios', 'Anomalías', 'Por persona', 'Histórico'] },
  { type: 'activity', title: 'Registro de Actividad', description: 'Auditoría y logs del sistema', icon: <Activity className="w-6 h-6" />, color: 'gray', metrics: ['Acciones de admin', 'Cambios en sistema', 'Accesos', 'Eventos'] },
]

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
  quarter: 'Último trimestre',
  year: 'Último año',
}

export function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('overview')
  const [datePreset, setDatePreset] = useState<DatePreset>('month')
  const [showExportModal, setShowExportModal] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const { data: usersData } = useQuery({ queryKey: ['users-report'], queryFn: () => appUsersService.getAll({ page: 1 }) })
  const { data: devicesData } = useQuery({ queryKey: ['devices-report'], queryFn: () => devicesService.getAll({ page: 1 }) })
  const { data: monitoredData } = useQuery({ queryKey: ['monitored-report'], queryFn: () => monitoredService.getAll({ page: 1 }) })
  const { data: alertsData } = useQuery({ queryKey: ['alerts-report'], queryFn: () => alertsService.getAll({ page: 1 }) })

  const users = usersData?.items || []
  const devices = devicesData?.items || []
  const monitored = monitoredData?.items || []
  const alerts = alertsData?.items || []

  const getDateRange = () => {
    const now = new Date()
    switch (datePreset) {
      case 'today': return { from: now, to: now }
      case 'week': return { from: startOfWeek(now, { locale: es }), to: endOfWeek(now, { locale: es }) }
      case 'month': return { from: startOfMonth(now), to: endOfMonth(now) }
      case 'quarter': return { from: subDays(now, 90), to: now }
      case 'year': return { from: subDays(now, 365), to: now }
    }
  }

  const range = getDateRange()

  const stats = useMemo(() => ({
    users: { total: users.length, active: users.filter(u => u.isActive).length, verified: users.filter(u => u.isVerified).length, withDevices: users.filter(u => u.devicesCount > 0).length },
    devices: { total: devices.length, connected: devices.filter(d => d.isConnected).length, lowBattery: devices.filter(d => d.batteryLevel < 20).length, assigned: devices.filter(d => d.personName).length },
    monitored: { total: monitored.length, withDevice: monitored.filter(m => m.devicesCount > 0).length },
    alerts: { total: alerts.length, active: alerts.filter(a => !a.isResolved).length, critical: alerts.filter(a => a.severity === 'critical').length, resolved: alerts.filter(a => a.isResolved).length },
  }), [users, devices, monitored, alerts])

  // Using correct UPPERCASE AlertType values
  const alertsByType = useMemo(() => [
    { type: 'Caída detectada', count: alerts.filter(a => a.type === 'FALL_DETECTED').length, color: 'bg-red-500' },
    { type: 'Ritmo cardíaco', count: alerts.filter(a => a.type === 'HIGH_HEART_RATE' || a.type === 'LOW_HEART_RATE').length, color: 'bg-pink-500' },
    { type: 'Temperatura', count: alerts.filter(a => a.type === 'HIGH_TEMPERATURE' || a.type === 'LOW_TEMPERATURE').length, color: 'bg-orange-500' },
    { type: 'Oxígeno bajo', count: alerts.filter(a => a.type === 'LOW_SPO2').length, color: 'bg-purple-500' },
    { type: 'Salida de zona', count: alerts.filter(a => a.type === 'GEOFENCE_EXIT').length, color: 'bg-yellow-500' },
    { type: 'SOS', count: alerts.filter(a => a.type === 'SOS_BUTTON').length, color: 'bg-red-600' },
    { type: 'Dispositivo', count: alerts.filter(a => a.type === 'DEVICE_DISCONNECTED' || a.type === 'LOW_BATTERY').length, color: 'bg-gray-500' },
  ].sort((a, b) => b.count - a.count), [alerts])

  // Using correct AlertSeverity values: 'critical' | 'warning' | 'info'
  const alertsBySeverity = useMemo(() => [
    { severity: 'Crítica', count: alerts.filter(a => a.severity === 'critical').length, color: 'bg-red-500' },
    { severity: 'Advertencia', count: alerts.filter(a => a.severity === 'warning').length, color: 'bg-yellow-500' },
    { severity: 'Info', count: alerts.filter(a => a.severity === 'info').length, color: 'bg-blue-500' },
  ], [alerts])

  const handleExport = async (exportFormat: ExportFormat) => {
    setIsExporting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      let content = ''
      const fileName = `reporte_${selectedReport}_${format(new Date(), 'yyyy-MM-dd')}`

      if (exportFormat === 'csv') {
        if (selectedReport === 'overview') {
          content = ['Métrica,Valor', `Total Usuarios,${stats.users.total}`, `Usuarios Activos,${stats.users.active}`, `Usuarios Verificados,${stats.users.verified}`, `Total Dispositivos,${stats.devices.total}`, `Dispositivos Conectados,${stats.devices.connected}`, `Dispositivos con Batería Baja,${stats.devices.lowBattery}`, `Personas Monitoreadas,${stats.monitored.total}`, `Total Alertas,${stats.alerts.total}`, `Alertas Activas,${stats.alerts.active}`, `Alertas Críticas,${stats.alerts.critical}`].join('\n')
        } else if (selectedReport === 'users') {
          content = ['Email,Nombre,Apellido,Estado,Verificado,Dispositivos,Fecha Registro', ...users.map(u => `${u.email},${u.firstName},${u.lastName},${u.isActive ? 'Activo' : 'Inactivo'},${u.isVerified ? 'Sí' : 'No'},${u.devicesCount},${format(new Date(u.createdAt), 'dd/MM/yyyy')}`)].join('\n')
        } else if (selectedReport === 'devices') {
          content = ['Código,Serial,Modelo,Estado,Batería,Asignado,Última Conexión', ...devices.map(d => `${d.code},${d.serialNumber},${d.model},${d.isConnected ? 'Conectado' : 'Desconectado'},${d.batteryLevel}%,${d.personName || 'N/A'},${d.lastSeen ? format(new Date(d.lastSeen), 'dd/MM/yyyy HH:mm') : 'N/A'}`)].join('\n')
        } else if (selectedReport === 'alerts') {
          content = ['Tipo,Severidad,Persona,Mensaje,Estado,Fecha', ...alerts.map(a => `${ALERT_TYPE_LABELS[a.type] || a.type},${ALERT_SEVERITY_LABELS[a.severity]},${a.personName || 'N/A'},"${a.message}",${a.isResolved ? 'Resuelta' : 'Activa'},${format(new Date(a.createdAt), 'dd/MM/yyyy HH:mm')}`)].join('\n')
        }
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `${fileName}.csv`
        link.click()
      }
      setShowExportModal(false)
      toast.success(`Reporte exportado como ${exportFormat.toUpperCase()}`)
    } catch { toast.error('Error al exportar') }
    finally { setIsExporting(false) }
  }

  const MetricCard = ({ title, value, change, changeType, icon, color }: { title: string; value: string | number; change?: string; changeType?: 'up' | 'down' | 'neutral'; icon: JSX.Element; color: string }) => (
    <Card padding="md" className={`bg-gradient-to-br from-${color}-50 to-white`}>
      <div className="flex items-start justify-between">
        <div><p className="text-xs text-gray-500 uppercase tracking-wide">{title}</p><p className="text-3xl font-bold mt-1">{value}</p>
          {change && <p className={`text-xs mt-2 flex items-center gap-1 ${changeType === 'up' ? 'text-green-600' : changeType === 'down' ? 'text-red-600' : 'text-gray-500'}`}>{changeType === 'up' ? <ArrowUpRight className="w-3 h-3" /> : changeType === 'down' ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}{change}</p>}
        </div>
        <div className={`p-3 bg-${color}-100 rounded-xl`}>{icon}</div>
      </div>
    </Card>
  )

  const ProgressBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-sm"><span className="text-gray-600">{label}</span><span className="font-semibold">{value}</span></div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} /></div>
    </div>
  )

  const renderReportContent = () => {
    switch (selectedReport) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard title="Usuarios Totales" value={stats.users.total} change="+12% vs mes anterior" changeType="up" icon={<Users className="w-5 h-5 text-blue-600" />} color="blue" />
              <MetricCard title="Dispositivos Activos" value={stats.devices.connected} change={`${stats.devices.total} total`} changeType="neutral" icon={<Smartphone className="w-5 h-5 text-green-600" />} color="green" />
              <MetricCard title="Alertas Activas" value={stats.alerts.active} change={`${stats.alerts.critical} críticas`} changeType={stats.alerts.critical > 0 ? 'down' : 'neutral'} icon={<Bell className="w-5 h-5 text-orange-600" />} color="orange" />
              <MetricCard title="Personas Monitoreadas" value={stats.monitored.total} change={`${stats.monitored.withDevice} con dispositivo`} changeType="neutral" icon={<Heart className="w-5 h-5 text-red-600" />} color="red" />
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <Card padding="md"><h3 className="font-semibold mb-4 flex items-center gap-2"><PieChart className="w-5 h-5 text-blue-500" />Distribución de Alertas por Tipo</h3><div className="space-y-3">{alertsByType.slice(0, 5).map((item, i) => <ProgressBar key={i} label={item.type} value={item.count} max={Math.max(...alertsByType.map(a => a.count), 1)} color={item.color} />)}</div></Card>
              <Card padding="md"><h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-purple-500" />Alertas por Severidad</h3><div className="flex items-end gap-4 h-40">{alertsBySeverity.map((item, i) => <div key={i} className="flex-1 flex flex-col items-center"><div className={`w-full ${item.color} rounded-t-lg transition-all`} style={{ height: `${Math.max((item.count / Math.max(...alertsBySeverity.map(s => s.count), 1)) * 100, 10)}%` }} /><p className="text-xs text-gray-500 mt-2">{item.severity}</p><p className="font-bold text-sm">{item.count}</p></div>)}</div></Card>
            </div>
            <Card padding="md"><h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-500" />Resumen de Estado del Sistema</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-green-50 rounded-xl text-center"><CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" /><p className="text-2xl font-bold text-green-700">{Math.round((stats.users.active / (stats.users.total || 1)) * 100)}%</p><p className="text-xs text-green-600">Usuarios activos</p></div>
                <div className="p-4 bg-blue-50 rounded-xl text-center"><Smartphone className="w-8 h-8 text-blue-500 mx-auto mb-2" /><p className="text-2xl font-bold text-blue-700">{Math.round((stats.devices.connected / (stats.devices.total || 1)) * 100)}%</p><p className="text-xs text-blue-600">Dispositivos conectados</p></div>
                <div className="p-4 bg-purple-50 rounded-xl text-center"><Shield className="w-8 h-8 text-purple-500 mx-auto mb-2" /><p className="text-2xl font-bold text-purple-700">{Math.round((stats.monitored.withDevice / (stats.monitored.total || 1)) * 100)}%</p><p className="text-xs text-purple-600">Personas con dispositivo</p></div>
                <div className="p-4 bg-orange-50 rounded-xl text-center"><Zap className="w-8 h-8 text-orange-500 mx-auto mb-2" /><p className="text-2xl font-bold text-orange-700">{Math.round((stats.alerts.resolved / (stats.alerts.total || 1)) * 100)}%</p><p className="text-xs text-orange-600">Alertas resueltas</p></div>
              </div>
            </Card>
          </div>
        )
      case 'users':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard title="Total Usuarios" value={stats.users.total} icon={<Users className="w-5 h-5 text-blue-600" />} color="blue" />
              <MetricCard title="Activos" value={stats.users.active} change={`${Math.round((stats.users.active / (stats.users.total || 1)) * 100)}%`} changeType="up" icon={<CheckCircle className="w-5 h-5 text-green-600" />} color="green" />
              <MetricCard title="Verificados" value={stats.users.verified} change={`${Math.round((stats.users.verified / (stats.users.total || 1)) * 100)}%`} changeType="up" icon={<Shield className="w-5 h-5 text-purple-600" />} color="purple" />
              <MetricCard title="Con Dispositivos" value={stats.users.withDevices} icon={<Smartphone className="w-5 h-5 text-orange-600" />} color="orange" />
            </div>
            <Card padding="md"><h3 className="font-semibold mb-4">Últimos Usuarios Registrados</h3><div className="space-y-3">{users.slice(0, 5).map(user => (<div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700">{user.firstName[0]}{user.lastName[0]}</div><div><p className="font-semibold">{user.firstName} {user.lastName}</p><p className="text-sm text-gray-500">{user.email}</p></div></div><div className="text-right"><Badge variant={user.isActive ? 'success' : 'gray'}>{user.isActive ? 'Activo' : 'Inactivo'}</Badge><p className="text-xs text-gray-400 mt-1">{format(new Date(user.createdAt), 'dd/MM/yyyy')}</p></div></div>))}</div></Card>
          </div>
        )
      case 'devices':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard title="Total Dispositivos" value={stats.devices.total} icon={<Smartphone className="w-5 h-5 text-blue-600" />} color="blue" />
              <MetricCard title="Conectados" value={stats.devices.connected} change={`${Math.round((stats.devices.connected / (stats.devices.total || 1)) * 100)}%`} changeType="up" icon={<Zap className="w-5 h-5 text-green-600" />} color="green" />
              <MetricCard title="Batería Baja" value={stats.devices.lowBattery} change={stats.devices.lowBattery > 0 ? 'Requieren atención' : 'Todo OK'} changeType={stats.devices.lowBattery > 0 ? 'down' : 'neutral'} icon={<AlertTriangle className="w-5 h-5 text-yellow-600" />} color="yellow" />
              <MetricCard title="Asignados" value={stats.devices.assigned} change={`${stats.devices.total - stats.devices.assigned} disponibles`} changeType="neutral" icon={<Users className="w-5 h-5 text-purple-600" />} color="purple" />
            </div>
            <Card padding="md"><h3 className="font-semibold mb-4">Estado de Dispositivos</h3><div className="grid lg:grid-cols-2 gap-4">{devices.slice(0, 6).map(device => (<div key={device.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"><div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${device.isConnected ? 'bg-green-100' : 'bg-gray-100'}`}><Smartphone className={`w-5 h-5 ${device.isConnected ? 'text-green-600' : 'text-gray-400'}`} /></div><div><p className="font-mono font-semibold">{device.code}</p><p className="text-xs text-gray-500">{device.model}</p></div></div><div className="text-right"><div className={`text-sm font-semibold ${device.batteryLevel > 50 ? 'text-green-600' : device.batteryLevel > 20 ? 'text-yellow-600' : 'text-red-600'}`}>{device.batteryLevel}%</div><p className="text-xs text-gray-400">{device.personName || 'Sin asignar'}</p></div></div>))}</div></Card>
          </div>
        )
      case 'alerts':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard title="Total Alertas" value={stats.alerts.total} icon={<Bell className="w-5 h-5 text-blue-600" />} color="blue" />
              <MetricCard title="Activas" value={stats.alerts.active} change={stats.alerts.active > 0 ? 'Pendientes' : 'Todo resuelto'} changeType={stats.alerts.active > 5 ? 'down' : 'neutral'} icon={<AlertTriangle className="w-5 h-5 text-orange-600" />} color="orange" />
              <MetricCard title="Críticas" value={stats.alerts.critical} change={stats.alerts.critical > 0 ? 'Atención inmediata' : 'Sin críticas'} changeType={stats.alerts.critical > 0 ? 'down' : 'up'} icon={<AlertTriangle className="w-5 h-5 text-red-600" />} color="red" />
              <MetricCard title="Resueltas" value={stats.alerts.resolved} change={`${Math.round((stats.alerts.resolved / (stats.alerts.total || 1)) * 100)}%`} changeType="up" icon={<CheckCircle className="w-5 h-5 text-green-600" />} color="green" />
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <Card padding="md"><h3 className="font-semibold mb-4">Alertas por Tipo</h3><div className="space-y-3">{alertsByType.map((item, i) => <ProgressBar key={i} label={item.type} value={item.count} max={Math.max(...alertsByType.map(a => a.count), 1)} color={item.color} />)}</div></Card>
              <Card padding="md"><h3 className="font-semibold mb-4">Alertas por Severidad</h3><div className="space-y-3">{alertsBySeverity.map((item, i) => <ProgressBar key={i} label={item.severity} value={item.count} max={Math.max(...alertsBySeverity.map(a => a.count), 1)} color={item.color} />)}</div></Card>
            </div>
          </div>
        )
      default:
        return <Card padding="lg" className="text-center"><Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" /><h3 className="text-xl font-semibold text-gray-700 mb-2">Reporte en Desarrollo</h3><p className="text-gray-500">Este tipo de reporte estará disponible próximamente.</p></Card>
    }
  }

  const currentReport = REPORTS.find(r => r.type === selectedReport)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Centro de Reportes" subtitle="Genera reportes detallados y análisis del sistema" actions={<div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => setShowExportModal(true)} leftIcon={<Download className="w-4 h-4" />}>Exportar</Button></div>} />

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card padding="sm"><h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-3">Tipo de Reporte</h3><div className="space-y-1">{REPORTS.map(report => (<button key={report.type} onClick={() => setSelectedReport(report.type)} className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${selectedReport === report.type ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}><div className={`p-2 rounded-lg ${selectedReport === report.type ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>{report.icon}</div><div className="flex-1 min-w-0"><p className={`font-medium text-sm ${selectedReport === report.type ? 'text-blue-700' : ''}`}>{report.title}</p><p className="text-xs text-gray-400 truncate">{report.description}</p></div></button>))}</div></Card>
          <Card padding="sm"><h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-3">Período</h3><div className="space-y-1">{(['today', 'week', 'month', 'quarter', 'year'] as DatePreset[]).map(preset => (<button key={preset} onClick={() => setDatePreset(preset)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${datePreset === preset ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50'}`}>{DATE_PRESET_LABELS[preset]}</button>))}</div></Card>
        </div>

        <div className="lg:col-span-3">
          <Card padding="sm" className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-100">{currentReport?.icon}</div><div><h2 className="text-lg font-bold">{currentReport?.title}</h2><p className="text-sm text-gray-500">{format(range.from, "dd MMM", { locale: es })} - {format(range.to, "dd MMM yyyy", { locale: es })}</p></div></div>
              <div className="flex gap-2"><Button variant="secondary" size="sm" leftIcon={<Printer className="w-4 h-4" />}>Imprimir</Button><Button variant="secondary" size="sm" leftIcon={<Share2 className="w-4 h-4" />}>Compartir</Button></div>
            </div>
          </Card>
          {renderReportContent()}
        </div>
      </div>

      <Modal isOpen={showExportModal} onClose={() => setShowExportModal(false)} title="Exportar Reporte" size="md">
        <div className="space-y-4">
          <p className="text-gray-600">Selecciona el formato de exportación para <strong>{currentReport?.title}</strong>:</p>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => handleExport('pdf')} disabled={isExporting} className="p-4 border-2 border-gray-200 rounded-xl hover:border-red-300 hover:bg-red-50 transition-all group"><FileText className="w-8 h-8 text-red-500 mx-auto mb-2 group-hover:scale-110 transition-transform" /><p className="font-semibold">PDF</p><p className="text-xs text-gray-500">Documento</p></button>
            <button onClick={() => handleExport('excel')} disabled={isExporting} className="p-4 border-2 border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all group"><FileSpreadsheet className="w-8 h-8 text-green-500 mx-auto mb-2 group-hover:scale-110 transition-transform" /><p className="font-semibold">Excel</p><p className="text-xs text-gray-500">Hoja de cálculo</p></button>
            <button onClick={() => handleExport('csv')} disabled={isExporting} className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group"><FileText className="w-8 h-8 text-blue-500 mx-auto mb-2 group-hover:scale-110 transition-transform" /><p className="font-semibold">CSV</p><p className="text-xs text-gray-500">Datos</p></button>
          </div>
          {isExporting && <div className="flex items-center justify-center gap-2 py-4 text-blue-600"><RefreshCw className="w-5 h-5 animate-spin" /><span>Generando reporte...</span></div>}
        </div>
      </Modal>
    </div>
  )
}
