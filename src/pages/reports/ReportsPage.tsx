import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileText, Download, Calendar, TrendingUp, Users, Smartphone,
  Bell, Heart, Activity, BarChart3, PieChart, RefreshCw, FileSpreadsheet,
  Printer, Share2, CheckCircle, AlertTriangle, Thermometer,
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

  const currentReport = useMemo(() => REPORTS.find(r => r.type === selectedReport), [selectedReport])

  const handleExport = async (exportFormat: ExportFormat) => {
    setIsExporting(true)
    try {
      const fileName = `reporte_${selectedReport}_${format(new Date(), 'yyyy-MM-dd')}`

      // Generar datos según tipo de reporte seleccionado
      const getReportData = (): { headers: string[]; rows: string[][] } => {
        switch (selectedReport) {
          case 'overview':
            return {
              headers: ['Métrica', 'Valor'],
              rows: [
                ['Total Usuarios', String(stats.users.total)],
                ['Usuarios Activos', String(stats.users.active)],
                ['Usuarios Verificados', String(stats.users.verified)],
                ['Total Dispositivos', String(stats.devices.total)],
                ['Dispositivos Conectados', String(stats.devices.connected)],
                ['Dispositivos Batería Baja', String(stats.devices.lowBattery)],
                ['Personas Monitoreadas', String(stats.monitored.total)],
                ['Total Alertas', String(stats.alerts.total)],
                ['Alertas Activas', String(stats.alerts.active)],
                ['Alertas Críticas', String(stats.alerts.critical)],
              ],
            }
          case 'users':
            return {
              headers: ['Email', 'Nombre', 'Apellido', 'Estado', 'Verificado', 'Dispositivos', 'Fecha Registro'],
              rows: users.map(u => [u.email, u.firstName, u.lastName, u.isActive ? 'Activo' : 'Inactivo', u.isVerified ? 'Sí' : 'No', String(u.devicesCount), format(new Date(u.createdAt), 'dd/MM/yyyy')]),
            }
          case 'devices':
            return {
              headers: ['Código', 'Serial', 'Modelo', 'Estado', 'Batería', 'Asignado', 'Última Conexión'],
              rows: devices.map(d => [d.code, d.serialNumber, d.model, d.isConnected ? 'Conectado' : 'Desconectado', `${d.batteryLevel}%`, d.personName || 'N/A', d.lastSeen ? format(new Date(d.lastSeen), 'dd/MM/yyyy HH:mm') : 'N/A']),
            }
          case 'alerts':
            return {
              headers: ['Tipo', 'Severidad', 'Persona', 'Mensaje', 'Estado', 'Fecha'],
              rows: alerts.map(a => [ALERT_TYPE_LABELS[a.type] || a.type, ALERT_SEVERITY_LABELS[a.severity], a.personName || 'N/A', a.message, a.isResolved ? 'Resuelta' : 'Activa', format(new Date(a.createdAt), 'dd/MM/yyyy HH:mm')]),
            }
          default:
            return { headers: ['Dato'], rows: [['Reporte en desarrollo']] }
        }
      }

      const { headers, rows } = getReportData()

      if (exportFormat === 'pdf') {
        // Importar dinámicamente para no afectar el bundle inicial
        const { default: jsPDF } = await import('jspdf')
        const autoTable = (await import('jspdf-autotable')).default

        const doc = new jsPDF()
        
        // Header del documento
        doc.setFontSize(20)
        doc.setTextColor(37, 99, 235) // blue-600
        doc.text('NovaGuardian', 14, 20)
        doc.setFontSize(10)
        doc.setTextColor(107, 114, 128) // gray-500
        doc.text('Panel de Administración', 14, 26)
        
        // Línea separadora
        doc.setDrawColor(37, 99, 235)
        doc.setLineWidth(0.5)
        doc.line(14, 30, 196, 30)
        
        // Título del reporte
        doc.setFontSize(16)
        doc.setTextColor(17, 24, 39) // gray-900
        doc.text(currentReport?.title || 'Reporte', 14, 40)
        
        // Metadatos
        doc.setFontSize(9)
        doc.setTextColor(107, 114, 128)
        doc.text(`Período: ${format(range.from, "dd MMM yyyy", { locale: es })} - ${format(range.to, "dd MMM yyyy", { locale: es })}`, 14, 47)
        doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 52)
        
        // Tabla con autoTable
        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: 58,
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [243, 244, 246] },
          margin: { left: 14, right: 14 },
        })
        
        // Footer
        const pageCount = doc.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i)
          doc.setFontSize(8)
          doc.setTextColor(156, 163, 175)
          doc.text(`NovaGuardian Admin — Página ${i} de ${pageCount}`, 14, doc.internal.pageSize.height - 10)
        }
        
        doc.save(`${fileName}.pdf`)

      } else if (exportFormat === 'excel') {
        const XLSX = await import('xlsx')
        
        // Crear workbook
        const wb = XLSX.utils.book_new()
        
        // Crear worksheet con datos
        const wsData = [headers, ...rows]
        const ws = XLSX.utils.aoa_to_sheet(wsData)
        
        // Ajustar anchos de columnas
        const colWidths = headers.map((h, i) => {
          const maxLen = Math.max(h.length, ...rows.map(r => (r[i] || '').length))
          return { wch: Math.min(maxLen + 4, 40) }
        })
        ws['!cols'] = colWidths
        
        // Agregar hoja
        XLSX.utils.book_append_sheet(wb, ws, currentReport?.title || 'Reporte')
        
        // Agregar hoja de metadatos
        const metaData = [
          ['NovaGuardian - Panel de Administración'],
          [''],
          ['Reporte', currentReport?.title || ''],
          ['Período', `${format(range.from, "dd/MM/yyyy")} - ${format(range.to, "dd/MM/yyyy")}`],
          ['Generado', format(new Date(), "dd/MM/yyyy HH:mm")],
          ['Registros', String(rows.length)],
        ]
        const wsMeta = XLSX.utils.aoa_to_sheet(metaData)
        wsMeta['!cols'] = [{ wch: 20 }, { wch: 40 }]
        XLSX.utils.book_append_sheet(wb, wsMeta, 'Info')
        
        // Descargar
        XLSX.writeFile(wb, `${fileName}.xlsx`)

      } else if (exportFormat === 'csv') {
        const content = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))].join('\n')
        const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `${fileName}.csv`
        link.click()
      }

      setShowExportModal(false)
      toast.success(`Reporte exportado como ${exportFormat.toUpperCase()}`)
    } catch (error) {
      console.error('Error al exportar:', error)
      toast.error('Error al exportar el reporte')
    }
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
      case 'vitals': {
        // Derivar datos de signos vitales desde alertas (cada alerta refleja un evento de salud)
        const heartAlerts = alerts.filter(a => a.type === 'HIGH_HEART_RATE' || a.type === 'LOW_HEART_RATE')
        const spo2Alerts = alerts.filter(a => a.type === 'LOW_SPO2')
        const tempAlerts = alerts.filter(a => a.type === 'HIGH_TEMPERATURE' || a.type === 'LOW_TEMPERATURE')
        const fallAlerts = alerts.filter(a => a.type === 'FALL_DETECTED')
        const sosAlerts = alerts.filter(a => a.type === 'SOS_BUTTON')
        
        // Personas únicas afectadas
        const personNames = [...new Set(alerts.map(a => a.personName).filter(Boolean))]
        const personStats = personNames.map(name => {
          const personAlerts = alerts.filter(a => a.personName === name)
          return {
            name,
            total: personAlerts.length,
            critical: personAlerts.filter(a => a.severity === 'critical').length,
            resolved: personAlerts.filter(a => a.isResolved).length,
            types: [...new Set(personAlerts.map(a => ALERT_TYPE_LABELS[a.type] || a.type))],
          }
        }).sort((a, b) => b.critical - a.critical)

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard title="Alertas Cardíacas" value={heartAlerts.length} change={heartAlerts.length > 0 ? `${heartAlerts.filter(a => !a.isResolved).length} activas` : 'Sin alertas'} changeType={heartAlerts.length > 0 ? 'down' : 'up'} icon={<Heart className="w-5 h-5 text-red-600" />} color="red" />
              <MetricCard title="Alertas SpO2" value={spo2Alerts.length} change={spo2Alerts.length > 0 ? `${spo2Alerts.filter(a => !a.isResolved).length} activas` : 'Niveles normales'} changeType={spo2Alerts.length > 0 ? 'down' : 'up'} icon={<Activity className="w-5 h-5 text-blue-600" />} color="blue" />
              <MetricCard title="Alertas Temperatura" value={tempAlerts.length} change={tempAlerts.length > 0 ? `${tempAlerts.filter(a => !a.isResolved).length} activas` : 'Rango normal'} changeType={tempAlerts.length > 0 ? 'down' : 'up'} icon={<Thermometer className="w-5 h-5 text-orange-600" />} color="orange" />
              <MetricCard title="Caídas / SOS" value={fallAlerts.length + sosAlerts.length} change={`${fallAlerts.length} caídas, ${sosAlerts.length} SOS`} changeType={fallAlerts.length + sosAlerts.length > 0 ? 'down' : 'up'} icon={<AlertTriangle className="w-5 h-5 text-yellow-600" />} color="yellow" />
            </div>
            
            <div className="grid lg:grid-cols-2 gap-6">
              <Card padding="md">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Heart className="w-5 h-5 text-red-500" />Distribución de Eventos de Salud</h3>
                <div className="space-y-3">
                  <ProgressBar label="Ritmo cardíaco anormal" value={heartAlerts.length} max={Math.max(alerts.length, 1)} color="bg-red-500" />
                  <ProgressBar label="Saturación de oxígeno baja" value={spo2Alerts.length} max={Math.max(alerts.length, 1)} color="bg-blue-500" />
                  <ProgressBar label="Temperatura anormal" value={tempAlerts.length} max={Math.max(alerts.length, 1)} color="bg-orange-500" />
                  <ProgressBar label="Caídas detectadas" value={fallAlerts.length} max={Math.max(alerts.length, 1)} color="bg-purple-500" />
                  <ProgressBar label="Botón SOS presionado" value={sosAlerts.length} max={Math.max(alerts.length, 1)} color="bg-red-600" />
                </div>
              </Card>
              
              <Card padding="md">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-blue-500" />Estado de Salud por Persona</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {personStats.length > 0 ? personStats.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${p.critical > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.types.slice(0, 2).join(', ')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex gap-1">
                          {p.critical > 0 && <Badge variant="danger" size="sm">{p.critical} críticas</Badge>}
                          <Badge variant={p.resolved === p.total ? 'success' : 'warning'} size="sm">{p.total} alertas</Badge>
                        </div>
                      </div>
                    </div>
                  )) : <p className="text-gray-400 text-center py-8">No hay datos de personas monitoreadas</p>}
                </div>
              </Card>
            </div>

            <Card padding="md">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-500" />Indicadores de Salud del Sistema</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-green-50 rounded-xl text-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-700">{monitored.filter(m => m.devicesCount > 0).length}</p>
                  <p className="text-xs text-green-600">Personas con monitoreo activo</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl text-center">
                  <Smartphone className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-700">{devices.filter(d => d.isConnected).length}</p>
                  <p className="text-xs text-blue-600">Dispositivos transmitiendo</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl text-center">
                  <Shield className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-700">{personNames.length}</p>
                  <p className="text-xs text-purple-600">Personas con eventos registrados</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-xl text-center">
                  <Zap className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-orange-700">{Math.round((stats.alerts.resolved / (stats.alerts.total || 1)) * 100)}%</p>
                  <p className="text-xs text-orange-600">Tasa de resolución</p>
                </div>
              </div>
            </Card>
          </div>
        )
      }
      case 'activity': {
        // Calcular métricas de actividad del sistema
        const totalRegistros = users.length + devices.length + monitored.length + alerts.length
        const recentUsers = users.filter(u => {
          const created = new Date(u.createdAt)
          return created >= range.from && created <= range.to
        })
        const resolvedAlerts = alerts.filter(a => a.isResolved)
        const activeDevices = devices.filter(d => d.isConnected)
        
        // Simular eventos de actividad basados en datos reales
        const activityLog = [
          ...recentUsers.map(u => ({ action: 'Usuario registrado', detail: `${u.firstName} ${u.lastName} (${u.email})`, date: u.createdAt, type: 'user' as const })),
          ...resolvedAlerts.map(a => ({ action: 'Alerta resuelta', detail: `${ALERT_TYPE_LABELS[a.type] || a.type} - ${a.personName}`, date: a.resolvedAt || a.createdAt, type: 'alert' as const })),
          ...alerts.filter(a => a.severity === 'critical').map(a => ({ action: 'Alerta crítica generada', detail: `${ALERT_TYPE_LABELS[a.type] || a.type} - ${a.personName}`, date: a.createdAt, type: 'critical' as const })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15)
        
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard title="Registros Totales" value={totalRegistros} change={`${users.length} usuarios, ${devices.length} dispositivos`} changeType="neutral" icon={<BarChart3 className="w-5 h-5 text-blue-600" />} color="blue" />
              <MetricCard title="Nuevos en Período" value={recentUsers.length} change={recentUsers.length > 0 ? 'Usuarios creados' : 'Sin nuevos registros'} changeType={recentUsers.length > 0 ? 'up' : 'neutral'} icon={<Users className="w-5 h-5 text-green-600" />} color="green" />
              <MetricCard title="Alertas Atendidas" value={resolvedAlerts.length} change={`de ${alerts.length} totales`} changeType={resolvedAlerts.length > 0 ? 'up' : 'neutral'} icon={<CheckCircle className="w-5 h-5 text-purple-600" />} color="purple" />
              <MetricCard title="Dispositivos Online" value={activeDevices.length} change={`${Math.round((activeDevices.length / (devices.length || 1)) * 100)}% conectados`} changeType="up" icon={<Zap className="w-5 h-5 text-orange-600" />} color="orange" />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card padding="md">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-blue-500" />Registro de Actividad Reciente</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {activityLog.length > 0 ? activityLog.map((log, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${log.type === 'critical' ? 'bg-red-500' : log.type === 'alert' ? 'bg-green-500' : 'bg-blue-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{log.action}</p>
                        <p className="text-xs text-gray-500 truncate">{log.detail}</p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{format(new Date(log.date), 'dd/MM HH:mm')}</span>
                    </div>
                  )) : <p className="text-gray-400 text-center py-8">No hay actividad registrada en el período</p>}
                </div>
              </Card>

              <Card padding="md">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><PieChart className="w-5 h-5 text-purple-500" />Distribución de Actividad</h3>
                <div className="space-y-3">
                  <ProgressBar label="Gestión de usuarios" value={users.length} max={totalRegistros} color="bg-blue-500" />
                  <ProgressBar label="Gestión de dispositivos" value={devices.length} max={totalRegistros} color="bg-green-500" />
                  <ProgressBar label="Personas monitoreadas" value={monitored.length} max={totalRegistros} color="bg-purple-500" />
                  <ProgressBar label="Alertas procesadas" value={alerts.length} max={totalRegistros} color="bg-orange-500" />
                </div>
                <div className="mt-6 pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Estado Operativo</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <p className="text-lg font-bold text-green-700">{Math.round((users.filter(u => u.isActive).length / (users.length || 1)) * 100)}%</p>
                      <p className="text-xs text-green-600">Usuarios activos</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-lg font-bold text-blue-700">{Math.round((activeDevices.length / (devices.length || 1)) * 100)}%</p>
                      <p className="text-xs text-blue-600">Conectividad</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg text-center">
                      <p className="text-lg font-bold text-purple-700">{Math.round((monitored.filter(m => m.devicesCount > 0).length / (monitored.length || 1)) * 100)}%</p>
                      <p className="text-xs text-purple-600">Cobertura</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg text-center">
                      <p className="text-lg font-bold text-orange-700">{Math.round((resolvedAlerts.length / (alerts.length || 1)) * 100)}%</p>
                      <p className="text-xs text-orange-600">Resolución</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )
      }
      default:
        return <Card padding="lg" className="text-center"><Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" /><h3 className="text-xl font-semibold text-gray-700 mb-2">Reporte en Desarrollo</h3><p className="text-gray-500">Este tipo de reporte estará disponible próximamente.</p></Card>
    }
  }

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
