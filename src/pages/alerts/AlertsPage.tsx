import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  AlertTriangle, Search, Bell, Eye, Download, RefreshCw, MoreVertical, CheckCircle, 
  Trash2, Clock, Filter, Calendar, XCircle, AlertOctagon, Info, Heart, Thermometer,
  MapPin, Hand, Activity
} from 'lucide-react'
import { Card, PageHeader, Table, Badge, Modal, Button, ConfirmDialog } from '@/components/ui'
import { alertsService } from '@/services'
import type { Alert, AlertType, AlertSeverity } from '@/types'
import { ALERT_TYPE_LABELS, ALERT_SEVERITY_LABELS } from '@/types'
import { format, formatDistanceToNow, subDays, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

type ModalMode = 'view' | null

const SEVERITY_STYLES: Record<AlertSeverity, { bg: string; text: string; icon: React.ComponentType<{className?: string}> }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertOctagon },
  warning: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: AlertTriangle },
  info: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Info },
}

const TYPE_ICONS: Partial<Record<AlertType, React.ComponentType<{className?: string}>>> = {
  HIGH_HEART_RATE: Heart,
  LOW_HEART_RATE: Heart,
  LOW_SPO2: Activity,
  HIGH_TEMPERATURE: Thermometer,
  LOW_TEMPERATURE: Thermometer,
  FALL_DETECTED: AlertTriangle,
  SOS_BUTTON: Hand,
  GEOFENCE_EXIT: MapPin,
}

type DateRangeOption = 'today' | 'week' | 'month' | 'all'

export function AlertsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<AlertType | 'all'>('all')
  const [resolvedFilter, setResolvedFilter] = useState<'all' | 'resolved' | 'unresolved'>('all')
  const [dateRange, setDateRange] = useState<DateRangeOption>('week')
  const [isExporting, setIsExporting] = useState(false)

  const getDateRange = () => {
    const now = new Date()
    switch (dateRange) {
      case 'today': return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() }
      case 'week': return { from: subDays(now, 7).toISOString(), to: now.toISOString() }
      case 'month': return { from: subDays(now, 30).toISOString(), to: now.toISOString() }
      default: return {}
    }
  }

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['alerts', { page, search, severityFilter, typeFilter, resolvedFilter, dateRange }],
    queryFn: () => alertsService.getAll({ 
      page, 
      search,
      severity: severityFilter !== 'all' ? severityFilter : undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      resolved: resolvedFilter !== 'all' ? resolvedFilter === 'resolved' : undefined,
      ...getDateRange()
    }),
  })

  const dismissMutation = useMutation({
    mutationFn: (id: string) => alertsService.dismiss(id),
    onSuccess: () => { toast.success('Alerta resuelta'); queryClient.invalidateQueries({ queryKey: ['alerts'] }); closeModal() },
    onError: () => toast.error('Error al resolver'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => alertsService.delete(id),
    onSuccess: () => { toast.success('Alerta eliminada'); queryClient.invalidateQueries({ queryKey: ['alerts'] }); setShowDeleteDialog(false); setSelectedAlert(null) },
    onError: () => toast.error('Error al eliminar'),
  })

  const stats = useMemo(() => {
    const alerts = data?.items || []
    return {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      unresolved: alerts.filter(a => !a.isResolved).length,
    }
  }, [data?.items])

  const openViewModal = (alert: Alert) => { setSelectedAlert(alert); setModalMode('view') }
  const closeModal = () => { setModalMode(null); setSelectedAlert(null) }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const alerts = data?.items || []
      const csv = ['Fecha,Tipo,Severidad,Persona,Mensaje,Estado', ...alerts.map(a => [
        format(new Date(a.createdAt), 'yyyy-MM-dd HH:mm'),
        ALERT_TYPE_LABELS[a.type] || a.type,
        ALERT_SEVERITY_LABELS[a.severity],
        a.personName,
        `"${a.message.replace(/"/g, '""')}"`,
        a.isResolved ? 'Resuelta' : 'Activa'
      ].join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `alertas_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`
      link.click()
      toast.success('Exportado correctamente')
    } catch { toast.error('Error al exportar') }
    finally { setIsExporting(false) }
  }

  const getSeverityBadge = (severity: AlertSeverity) => {
    const style = SEVERITY_STYLES[severity]
    const Icon = style.icon
    return <Badge className={`${style.bg} ${style.text} flex items-center gap-1`}><Icon className="w-3 h-3" />{ALERT_SEVERITY_LABELS[severity]}</Badge>
  }

  const getTypeIcon = (type: AlertType) => {
    const Icon = TYPE_ICONS[type] || Bell
    return <Icon className="w-4 h-4" />
  }

  const columns = [
    {
      key: 'alert', header: 'Alerta',
      render: (alert: Alert) => {
        const style = SEVERITY_STYLES[alert.severity]
        return (
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${style.bg}`}>{getTypeIcon(alert.type)}</div>
            <div><p className="font-semibold text-gray-900 flex items-center gap-2">{ALERT_TYPE_LABELS[alert.type] || alert.type}{!alert.isResolved && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}</p><p className="text-sm text-gray-500 line-clamp-1 max-w-xs">{alert.message}</p></div>
          </div>
        )
      },
    },
    { key: 'severity', header: 'Severidad', render: (alert: Alert) => getSeverityBadge(alert.severity) },
    {
      key: 'person', header: 'Persona',
      render: (alert: Alert) => <div className="text-sm"><p className="font-medium text-gray-900">{alert.personName}</p></div>,
    },
    {
      key: 'time', header: 'Fecha/Hora',
      render: (alert: Alert) => <div className="text-sm"><p className="text-gray-900">{format(new Date(alert.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}</p><p className="text-xs text-gray-500">{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: es })}</p></div>,
    },
    {
      key: 'status', header: 'Estado',
      render: (alert: Alert) => alert.isResolved ? <Badge variant="success" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />Resuelta</Badge> : <Badge variant="danger" className="flex items-center gap-1 animate-pulse"><Bell className="w-3 h-3" />Activa</Badge>,
    },
    {
      key: 'actions', header: '', className: 'w-14',
      render: (alert: Alert) => (
        <div className="relative">
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === alert.id ? null : alert.id) }} className="p-2 hover:bg-gray-100 rounded-lg"><MoreVertical className="w-4 h-4 text-gray-500" /></button>
          {menuOpen === alert.id && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border z-50 py-2">
                <button onClick={() => { openViewModal(alert); setMenuOpen(null) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50"><Eye className="w-4 h-4 text-gray-500" />Ver detalles</button>
                {!alert.isResolved && <button onClick={() => { dismissMutation.mutate(alert.id); setMenuOpen(null) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 text-green-600"><CheckCircle className="w-4 h-4" />Marcar resuelta</button>}
                <hr className="my-2" />
                <button onClick={() => { setSelectedAlert(alert); setShowDeleteDialog(true); setMenuOpen(null) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" />Eliminar</button>
              </div>
            </>
          )}
        </div>
      ),
    },
  ]

  const allAlertTypes: AlertType[] = ['HIGH_HEART_RATE', 'LOW_HEART_RATE', 'LOW_SPO2', 'HIGH_TEMPERATURE', 'LOW_TEMPERATURE', 'FALL_DETECTED', 'SOS_BUTTON', 'GEOFENCE_EXIT']

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Centro de Alertas" subtitle="Monitorea y gestiona las alertas del sistema"
        actions={<div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => refetch()} leftIcon={<RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />}>Actualizar</Button>
          <Button variant="secondary" size="sm" onClick={handleExport} isLoading={isExporting} leftIcon={<Download className="w-4 h-4" />}>Exportar</Button>
        </div>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="sm" className="bg-gradient-to-br from-gray-50 to-white"><div className="flex items-center gap-3"><div className="p-2 bg-gray-100 rounded-lg"><Bell className="w-5 h-5 text-gray-600" /></div><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-gray-500">Total</p></div></div></Card>
        <Card padding="sm" className="bg-gradient-to-br from-red-50 to-white"><div className="flex items-center gap-3"><div className="p-2 bg-red-100 rounded-lg"><AlertOctagon className="w-5 h-5 text-red-600" /></div><div><p className="text-2xl font-bold text-red-600">{stats.critical}</p><p className="text-xs text-gray-500">Críticas</p></div></div></Card>
        <Card padding="sm" className="bg-gradient-to-br from-yellow-50 to-white"><div className="flex items-center gap-3"><div className="p-2 bg-yellow-100 rounded-lg"><AlertTriangle className="w-5 h-5 text-yellow-600" /></div><div><p className="text-2xl font-bold text-yellow-600">{stats.warning}</p><p className="text-xs text-gray-500">Advertencias</p></div></div></Card>
        <Card padding="sm" className="bg-gradient-to-br from-orange-50 to-white"><div className="flex items-center gap-3"><div className="p-2 bg-orange-100 rounded-lg"><Clock className="w-5 h-5 text-orange-600" /></div><div><p className="text-2xl font-bold text-orange-600">{stats.unresolved}</p><p className="text-xs text-gray-500">Sin resolver</p></div></div></Card>
      </div>

      <Card padding="sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Buscar alertas..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="w-full pl-10 pr-4 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500" /></div>
          <select value={severityFilter} onChange={(e) => { setSeverityFilter(e.target.value as AlertSeverity | 'all'); setPage(1) }} className="px-4 py-2.5 text-sm border rounded-xl bg-white"><option value="all">Todas las severidades</option><option value="critical">Crítica</option><option value="warning">Advertencia</option><option value="info">Info</option></select>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value as AlertType | 'all'); setPage(1) }} className="px-4 py-2.5 text-sm border rounded-xl bg-white"><option value="all">Todos los tipos</option>{allAlertTypes.map(t => <option key={t} value={t}>{ALERT_TYPE_LABELS[t]}</option>)}</select>
          <select value={resolvedFilter} onChange={(e) => { setResolvedFilter(e.target.value as typeof resolvedFilter); setPage(1) }} className="px-4 py-2.5 text-sm border rounded-xl bg-white"><option value="all">Todos los estados</option><option value="unresolved">Activas</option><option value="resolved">Resueltas</option></select>
          <select value={dateRange} onChange={(e) => { setDateRange(e.target.value as DateRangeOption); setPage(1) }} className="px-4 py-2.5 text-sm border rounded-xl bg-white flex items-center gap-2"><option value="today">Hoy</option><option value="week">Última semana</option><option value="month">Último mes</option><option value="all">Todo el tiempo</option></select>
        </div>
      </Card>

      <Card padding="none">
        <Table columns={columns} data={data?.items || []} keyExtractor={(a) => a.id} isLoading={isLoading} emptyMessage="No se encontraron alertas" onRowClick={(a) => openViewModal(a)} />
        {data && data.pages > 1 && <div className="px-6 py-4 border-t flex justify-between items-center"><span className="text-sm text-gray-500">Página {page} de {data.pages}</span><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button><Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Siguiente</Button></div></div>}
      </Card>

      <Modal isOpen={modalMode === 'view'} onClose={closeModal} title="Detalles de la Alerta" size="lg">
        {selectedAlert && (
          <div className="space-y-6">
            <div className={`p-6 rounded-2xl ${SEVERITY_STYLES[selectedAlert.severity].bg}`}>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/60 rounded-xl">{getTypeIcon(selectedAlert.type)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">{getSeverityBadge(selectedAlert.severity)}{!selectedAlert.isResolved && <Badge variant="danger" className="animate-pulse">Activa</Badge>}</div>
                  <h3 className="text-xl font-bold text-gray-900">{ALERT_TYPE_LABELS[selectedAlert.type] || selectedAlert.type}</h3>
                  <p className="text-gray-700 mt-2">{selectedAlert.message}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Clock className="w-3 h-3" />Fecha y hora</p><p className="font-semibold">{format(new Date(selectedAlert.createdAt), "dd 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}</p></div>
              <div className="p-4 bg-blue-50 rounded-xl"><p className="text-xs text-blue-600 mb-1">Persona afectada</p><p className="font-semibold text-blue-900">{selectedAlert.personName}</p></div>
            </div>
            {selectedAlert.isResolved ? (
              <div className="p-4 bg-green-50 rounded-xl border border-green-200"><div className="flex items-center gap-3"><CheckCircle className="w-6 h-6 text-green-600" /><div><p className="font-semibold text-green-800">Alerta Resuelta</p><p className="text-sm text-green-600">{selectedAlert.resolvedAt ? `Resuelta el ${format(new Date(selectedAlert.resolvedAt), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}` : 'Resuelta'}</p></div></div></div>
            ) : (
              <div className="p-4 bg-red-50 rounded-xl border border-red-200 animate-pulse"><div className="flex items-center gap-3"><Bell className="w-6 h-6 text-red-600" /><div><p className="font-semibold text-red-800">Alerta Activa</p><p className="text-sm text-red-600">Requiere atención inmediata</p></div></div></div>
            )}
            <div className="flex gap-3 pt-4 border-t">
              {!selectedAlert.isResolved && <Button variant="primary" onClick={() => dismissMutation.mutate(selectedAlert.id)} isLoading={dismissMutation.isPending} leftIcon={<CheckCircle className="w-4 h-4" />}>Marcar como resuelta</Button>}
              <Button variant="danger" onClick={() => { setShowDeleteDialog(true); closeModal() }} leftIcon={<Trash2 className="w-4 h-4" />}>Eliminar</Button>
              <Button variant="secondary" onClick={closeModal}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={showDeleteDialog} onClose={() => { setShowDeleteDialog(false); setSelectedAlert(null) }} onConfirm={() => selectedAlert && deleteMutation.mutate(selectedAlert.id)} title="Eliminar Alerta" message="¿Estás seguro de eliminar esta alerta? Esta acción no se puede deshacer." confirmText="Eliminar" variant="danger" isLoading={deleteMutation.isPending} />
    </div>
  )
}
