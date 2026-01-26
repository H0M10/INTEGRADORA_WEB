import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Smartphone, Search, Wifi, WifiOff, Battery, BatteryLow, BatteryWarning,
  Eye, Download, RefreshCw, MoreVertical, Plus, Edit, Trash2, User, Clock, Save, CheckCircle, XCircle, Link2Off
} from 'lucide-react'
import { Card, PageHeader, Table, Badge, Modal, Button, ConfirmDialog } from '@/components/ui'
import { devicesService } from '@/services'
import type { Device, DeviceStatus, CreateDeviceRequest, UpdateDeviceRequest } from '@/types'
import { DEVICE_STATUS_LABELS } from '@/types'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

type ModalMode = 'view' | 'create' | 'edit' | null

interface DeviceFormData {
  serialNumber: string
  code: string
  name: string
  model: string
}

const initialFormData: DeviceFormData = { serialNumber: '', code: '', name: '', model: 'NovaBand Pro' }

export function DevicesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | ''>('')
  const [page, setPage] = useState(1)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [formData, setFormData] = useState<DeviceFormData>(initialFormData)
  const [formErrors, setFormErrors] = useState<Partial<DeviceFormData>>({})
  const [isExporting, setIsExporting] = useState(false)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['devices', { page, search, status: statusFilter }],
    queryFn: () => devicesService.getAll({ page, search, status: statusFilter || undefined }),
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateDeviceRequest) => devicesService.create(data),
    onSuccess: () => { toast.success('Dispositivo registrado'); queryClient.invalidateQueries({ queryKey: ['devices'] }); closeModal() },
    onError: () => toast.error('Error al registrar'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDeviceRequest }) => devicesService.update(id, data),
    onSuccess: () => { toast.success('Dispositivo actualizado'); queryClient.invalidateQueries({ queryKey: ['devices'] }); closeModal() },
    onError: () => toast.error('Error al actualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => devicesService.delete(id),
    onSuccess: () => { toast.success('Dispositivo eliminado'); queryClient.invalidateQueries({ queryKey: ['devices'] }); setShowDeleteDialog(false); setSelectedDevice(null) },
    onError: () => toast.error('Error al eliminar'),
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => devicesService.update(id, { isActive }),
    onSuccess: () => { toast.success('Estado actualizado'); queryClient.invalidateQueries({ queryKey: ['devices'] }); setShowStatusDialog(false); setSelectedDevice(null) },
    onError: () => toast.error('Error al cambiar estado'),
  })

  const stats = useMemo(() => {
    const devices = data?.items || []
    return {
      total: devices.length,
      connected: devices.filter(d => d.isConnected).length,
      lowBattery: devices.filter(d => d.batteryLevel < 20).length,
      unassigned: devices.filter(d => !d.personName).length,
    }
  }, [data?.items])

  const getBatteryInfo = (level: number) => {
    if (level > 60) return { icon: <Battery className="w-4 h-4 text-green-500" />, color: 'text-green-600', bg: 'bg-green-50' }
    if (level > 20) return { icon: <BatteryWarning className="w-4 h-4 text-yellow-500" />, color: 'text-yellow-600', bg: 'bg-yellow-50' }
    return { icon: <BatteryLow className="w-4 h-4 text-red-500" />, color: 'text-red-600', bg: 'bg-red-50' }
  }

  const openCreateModal = () => { setFormData(initialFormData); setFormErrors({}); setModalMode('create') }
  const openEditModal = (device: Device) => { setSelectedDevice(device); setFormData({ serialNumber: device.serialNumber, code: device.code, name: device.name || '', model: device.model }); setFormErrors({}); setModalMode('edit') }
  const openViewModal = (device: Device) => { setSelectedDevice(device); setModalMode('view') }
  const closeModal = () => { setModalMode(null); setSelectedDevice(null); setFormData(initialFormData); setFormErrors({}) }

  const validateForm = (): boolean => {
    const errors: Partial<DeviceFormData> = {}
    
    // Validar número de serie (mínimo 5 caracteres)
    if (!formData.serialNumber) {
      errors.serialNumber = 'Número de serie requerido'
    } else if (formData.serialNumber.trim().length < 5) {
      errors.serialNumber = 'Mínimo 5 caracteres'
    } else if (formData.serialNumber.trim().length > 50) {
      errors.serialNumber = 'Máximo 50 caracteres'
    }
    
    // Validar código del dispositivo (6-20 caracteres, consistente con móvil)
    const cleanCode = formData.code.replace(/[-\s]/g, '').toUpperCase()
    if (!formData.code) {
      errors.code = 'Código requerido'
    } else if (cleanCode.length < 6) {
      errors.code = 'El código debe tener mínimo 6 caracteres'
    } else if (cleanCode.length > 20) {
      errors.code = 'El código debe tener máximo 20 caracteres'
    } else if (!/^[A-Z0-9]+$/.test(cleanCode)) {
      errors.code = 'Solo letras y números (sin caracteres especiales)'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = () => {
    if (!validateForm()) return
    if (modalMode === 'create') {
      // Limpiar y normalizar el código antes de enviar
      const cleanCode = formData.code.replace(/[-\s]/g, '').toUpperCase()
      createMutation.mutate({ serial_number: formData.serialNumber.trim(), code: cleanCode, name: formData.name?.trim() || undefined, model: formData.model })
    } else if (modalMode === 'edit' && selectedDevice) {
      updateMutation.mutate({ id: selectedDevice.id, data: { name: formData.name?.trim() || undefined } })
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const devices = data?.items || []
      const csv = ['Código,Serial,Modelo,Estado,Batería,Asignado a,Última conexión', ...devices.map(d => [d.code, d.serialNumber, d.model, DEVICE_STATUS_LABELS[d.status], `${d.batteryLevel}%`, d.personName || 'Sin asignar', d.lastSeen ? format(new Date(d.lastSeen), 'dd/MM/yyyy HH:mm') : 'N/A'].join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `dispositivos_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`
      link.click()
      toast.success('Exportado correctamente')
    } catch { toast.error('Error al exportar') }
    finally { setIsExporting(false) }
  }

  const columns = [
    {
      key: 'device', header: 'Dispositivo',
      render: (device: Device) => (
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${device.isConnected ? 'bg-gradient-to-br from-green-100 to-green-50' : 'bg-gray-100'}`}>
            <Smartphone className={`w-5 h-5 ${device.isConnected ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <div><p className="font-mono font-semibold text-gray-900">{device.code}</p><p className="text-xs text-gray-500">{device.model}</p></div>
        </div>
      ),
    },
    { key: 'serial', header: 'Serial', render: (device: Device) => <span className="font-mono text-sm text-gray-600">{device.serialNumber}</span> },
    {
      key: 'status', header: 'Estado',
      render: (device: Device) => <Badge variant={device.isConnected ? 'success' : device.status === 'error' ? 'danger' : 'gray'}>{device.isConnected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}{DEVICE_STATUS_LABELS[device.status]}</Badge>,
    },
    {
      key: 'battery', header: 'Batería',
      render: (device: Device) => { const info = getBatteryInfo(device.batteryLevel); return <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg ${info.bg}`}>{info.icon}<span className={`font-semibold text-sm ${info.color}`}>{device.batteryLevel}%</span></div> },
    },
    {
      key: 'person', header: 'Asignado a',
      render: (device: Device) => device.personName ? <div className="flex items-center gap-2"><div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center"><User className="w-4 h-4 text-green-600" /></div><span className="text-gray-900">{device.personName}</span></div> : <span className="text-gray-400 italic flex items-center gap-1"><Link2Off className="w-3 h-3" />Sin asignar</span>,
    },
    {
      key: 'lastSeen', header: 'Última conexión',
      render: (device: Device) => <div className="text-sm">{device.lastSeen ? (<><p className="text-gray-600">{formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true, locale: es })}</p><p className="text-xs text-gray-400">{format(new Date(device.lastSeen), 'dd/MM HH:mm')}</p></>) : <span className="text-gray-400">-</span>}</div>,
    },
    {
      key: 'actions', header: '', className: 'w-14',
      render: (device: Device) => (
        <div className="relative">
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === device.id ? null : device.id) }} className="p-2 hover:bg-gray-100 rounded-lg"><MoreVertical className="w-4 h-4 text-gray-500" /></button>
          {menuOpen === device.id && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border z-50 py-2">
                <button onClick={() => { openViewModal(device); setMenuOpen(null) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50"><Eye className="w-4 h-4 text-gray-500" />Ver detalles</button>
                <button onClick={() => { openEditModal(device); setMenuOpen(null) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50"><Edit className="w-4 h-4 text-blue-500" />Editar</button>
                <hr className="my-2" />
                <button onClick={() => { setSelectedDevice(device); setShowStatusDialog(true); setMenuOpen(null) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50">{device.isActive ? <XCircle className="w-4 h-4 text-yellow-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}{device.isActive ? 'Desactivar' : 'Activar'}</button>
                <button onClick={() => { setSelectedDevice(device); setShowDeleteDialog(true); setMenuOpen(null) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" />Eliminar</button>
              </div>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Gestión de Dispositivos" subtitle="Administra las pulseras NovaBand del sistema"
        actions={<div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => refetch()} leftIcon={<RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />}>Actualizar</Button>
          <Button variant="secondary" size="sm" onClick={handleExport} isLoading={isExporting} leftIcon={<Download className="w-4 h-4" />}>Exportar</Button>
          <Button variant="primary" size="sm" onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>Nuevo Dispositivo</Button>
        </div>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="sm" className="bg-gradient-to-br from-blue-50 to-white"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Smartphone className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-gray-500">Total</p></div></div></Card>
        <Card padding="sm" className="bg-gradient-to-br from-green-50 to-white"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><Wifi className="w-5 h-5 text-green-600" /></div><div><p className="text-2xl font-bold">{stats.connected}</p><p className="text-xs text-gray-500">Conectados</p></div></div></Card>
        <Card padding="sm" className="bg-gradient-to-br from-red-50 to-white"><div className="flex items-center gap-3"><div className="p-2 bg-red-100 rounded-lg"><BatteryLow className="w-5 h-5 text-red-600" /></div><div><p className="text-2xl font-bold">{stats.lowBattery}</p><p className="text-xs text-gray-500">Batería baja</p></div></div></Card>
        <Card padding="sm" className="bg-gradient-to-br from-gray-50 to-white"><div className="flex items-center gap-3"><div className="p-2 bg-gray-100 rounded-lg"><Link2Off className="w-5 h-5 text-gray-600" /></div><div><p className="text-2xl font-bold">{stats.unassigned}</p><p className="text-xs text-gray-500">Sin asignar</p></div></div></Card>
      </div>

      <Card padding="sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Buscar por código o serial..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="w-full pl-10 pr-4 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500" /></div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as DeviceStatus | '')} className="px-3 py-2.5 text-sm border rounded-xl bg-white"><option value="">Todos los estados</option><option value="connected">Conectados</option><option value="disconnected">Desconectados</option><option value="low_battery">Batería baja</option><option value="error">Con error</option></select>
        </div>
      </Card>

      <Card padding="none">
        <Table columns={columns} data={data?.items || []} keyExtractor={(d) => d.id} isLoading={isLoading} emptyMessage="No se encontraron dispositivos" onRowClick={(d) => openViewModal(d)} />
        {data && data.pages > 1 && <div className="px-6 py-4 border-t flex justify-between items-center"><span className="text-sm text-gray-500">Página {page} de {data.pages}</span><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button><Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Siguiente</Button></div></div>}
      </Card>

      <Modal isOpen={modalMode !== null} onClose={closeModal} title={modalMode === 'create' ? 'Registrar Dispositivo' : modalMode === 'edit' ? 'Editar Dispositivo' : 'Detalles del Dispositivo'} size="lg">
        {modalMode === 'view' && selectedDevice ? (
          <div className="space-y-6">
            <div className="flex items-start gap-4 pb-4 border-b">
              <div className={`p-4 rounded-2xl ${selectedDevice.isConnected ? 'bg-gradient-to-br from-green-100 to-green-50' : 'bg-gray-100'}`}><Smartphone className={`w-10 h-10 ${selectedDevice.isConnected ? 'text-green-600' : 'text-gray-400'}`} /></div>
              <div className="flex-1"><h3 className="text-xl font-bold font-mono">{selectedDevice.code}</h3><p className="text-gray-500">{selectedDevice.model} • v{selectedDevice.firmwareVersion}</p><div className="flex gap-2 mt-2"><Badge variant={selectedDevice.isConnected ? 'success' : 'gray'}>{selectedDevice.isConnected ? 'Conectado' : 'Desconectado'}</Badge>{selectedDevice.isActive && <Badge variant="primary">Activo</Badge>}</div></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500">Serial</p><p className="font-mono font-semibold">{selectedDevice.serialNumber}</p></div>
              <div className={`p-4 rounded-xl ${getBatteryInfo(selectedDevice.batteryLevel).bg}`}><p className="text-xs text-gray-500">Batería</p><p className={`text-2xl font-bold ${getBatteryInfo(selectedDevice.batteryLevel).color}`}>{selectedDevice.batteryLevel}%</p></div>
            </div>
            {selectedDevice.personName ? (
              <div className="p-4 bg-green-50 rounded-xl border border-green-100"><p className="text-xs text-green-600 mb-2">Vinculado a</p><div className="flex items-center gap-3"><div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center"><User className="w-6 h-6 text-green-700" /></div><div><p className="font-semibold text-green-900">{selectedDevice.personName}</p><p className="text-sm text-green-600">{selectedDevice.ownerEmail}</p></div></div></div>
            ) : <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center"><Link2Off className="w-8 h-8 text-gray-400 mx-auto mb-2" /><p className="text-gray-500">Dispositivo sin asignar</p></div>}
            <div className="p-4 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Clock className="w-3 h-3" />Última conexión</p><p className="font-semibold">{selectedDevice.lastSeen ? format(new Date(selectedDevice.lastSeen), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es }) : 'Sin registro'}</p></div>
            <div className="flex gap-2 pt-4 border-t"><Button variant="secondary" onClick={() => openEditModal(selectedDevice)} leftIcon={<Edit className="w-4 h-4" />}>Editar</Button></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Número de Serie *</label><input type="text" value={formData.serialNumber} onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value.toUpperCase() })} maxLength={50} className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${formErrors.serialNumber ? 'border-red-500' : 'border-gray-200'}`} placeholder="SN-2024-001" disabled={modalMode === 'edit'} />{formErrors.serialNumber && <p className="text-xs text-red-500 mt-1">{formErrors.serialNumber}</p>}<p className="text-xs text-gray-400 mt-1">Mín. 5, máx. 50 caracteres</p></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Código de Vinculación *</label><input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} maxLength={20} className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-wider ${formErrors.code ? 'border-red-500' : 'border-gray-200'}`} placeholder="NOVA001" disabled={modalMode === 'edit'} />{formErrors.code && <p className="text-xs text-red-500 mt-1">{formErrors.code}</p>}<p className="text-xs text-gray-400 mt-1">6-20 caracteres (letras y números)</p></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre (Alias)</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} maxLength={100} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Pulsera de Juan" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Modelo *</label><select value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white" disabled={modalMode === 'edit'}><option value="NovaBand Pro">NovaBand Pro</option><option value="NovaBand Lite">NovaBand Lite</option><option value="NovaBand Plus">NovaBand Plus</option></select></div>
            <div className="flex justify-end gap-3 pt-4 border-t"><Button variant="secondary" onClick={closeModal}>Cancelar</Button><Button variant="primary" onClick={handleSubmit} isLoading={createMutation.isPending || updateMutation.isPending} leftIcon={<Save className="w-4 h-4" />}>{modalMode === 'create' ? 'Registrar' : 'Guardar'}</Button></div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={showDeleteDialog} onClose={() => { setShowDeleteDialog(false); setSelectedDevice(null) }} onConfirm={() => selectedDevice && deleteMutation.mutate(selectedDevice.id)} title="Eliminar Dispositivo" message={`¿Eliminar el dispositivo "${selectedDevice?.code}"? Esta acción no se puede deshacer.`} confirmText="Eliminar" variant="danger" isLoading={deleteMutation.isPending} />
      <ConfirmDialog isOpen={showStatusDialog} onClose={() => { setShowStatusDialog(false); setSelectedDevice(null) }} onConfirm={() => selectedDevice && toggleStatusMutation.mutate({ id: selectedDevice.id, isActive: !selectedDevice.isActive })} title={selectedDevice?.isActive ? 'Desactivar Dispositivo' : 'Activar Dispositivo'} message={selectedDevice?.isActive ? `¿Desactivar "${selectedDevice?.code}"?` : `¿Activar "${selectedDevice?.code}"?`} confirmText={selectedDevice?.isActive ? 'Desactivar' : 'Activar'} variant={selectedDevice?.isActive ? 'warning' : 'primary'} isLoading={toggleStatusMutation.isPending} />
    </div>
  )
}
