import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Users, Search, Heart, Thermometer, Droplets, Eye, Download, RefreshCw, 
  MoreVertical, Plus, Edit, Trash2, Smartphone, Clock, Calendar, UserPlus, 
  Save, AlertCircle, CheckCircle2, XCircle
} from 'lucide-react'
import { Card, PageHeader, Table, Badge, Modal, Button, ConfirmDialog } from '@/components/ui'
import { monitoredService, devicesService, CreateMonitoredRequest } from '@/services'
import type { MonitoredPerson, UpdateMonitoredRequest, Device } from '@/types'
import { format, differenceInYears, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

type ModalMode = 'view' | 'create' | 'edit' | 'assign' | null

const GENDER_LABELS: Record<string, string> = { male: 'Masculino', female: 'Femenino', other: 'Otro' }
const BLOOD_TYPE_LABELS: Record<string, string> = { 'A+': 'A+', 'A-': 'A-', 'B+': 'B+', 'B-': 'B-', 'AB+': 'AB+', 'AB-': 'AB-', 'O+': 'O+', 'O-': 'O-' }

interface PersonFormData {
  firstName: string
  lastName: string
  birthDate: string
  gender: string
  bloodType: string
  notes: string
}

const initialFormData: PersonFormData = { firstName: '', lastName: '', birthDate: '', gender: '', bloodType: '', notes: '' }

export function MonitoredPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedPerson, setSelectedPerson] = useState<MonitoredPerson | null>(null)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [formData, setFormData] = useState<PersonFormData>(initialFormData)
  const [formErrors, setFormErrors] = useState<Partial<PersonFormData>>({})
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['monitored', { page, search }],
    queryFn: () => monitoredService.getAll({ page, search }),
  })

  const { data: devicesData } = useQuery({
    queryKey: ['devices-available'],
    queryFn: () => devicesService.getAll({ page: 1, limit: 100 }),
    select: (data) => data.data.filter((d: Device) => !d.personName && d.isActive),
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateMonitoredRequest) => monitoredService.create(data),
    onSuccess: () => { toast.success('Persona registrada'); queryClient.invalidateQueries({ queryKey: ['monitored'] }); closeModal() },
    onError: () => toast.error('Error al registrar'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMonitoredRequest }) => monitoredService.update(id, data),
    onSuccess: () => { toast.success('Información actualizada'); queryClient.invalidateQueries({ queryKey: ['monitored'] }); closeModal() },
    onError: () => toast.error('Error al actualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => monitoredService.delete(id),
    onSuccess: () => { toast.success('Persona eliminada'); queryClient.invalidateQueries({ queryKey: ['monitored'] }); setShowDeleteDialog(false); setSelectedPerson(null) },
    onError: () => toast.error('Error al eliminar'),
  })

  const assignDeviceMutation = useMutation({
    mutationFn: ({ personId, deviceId }: { personId: string; deviceId: string }) => monitoredService.assignDevice(personId, deviceId),
    onSuccess: () => { toast.success('Dispositivo asignado'); queryClient.invalidateQueries({ queryKey: ['monitored'] }); queryClient.invalidateQueries({ queryKey: ['devices'] }); closeModal() },
    onError: () => toast.error('Error al asignar'),
  })

  const unassignDeviceMutation = useMutation({
    mutationFn: (personId: string) => monitoredService.unassignDevice(personId),
    onSuccess: () => { toast.success('Dispositivo desvinculado'); queryClient.invalidateQueries({ queryKey: ['monitored'] }); queryClient.invalidateQueries({ queryKey: ['devices'] }) },
    onError: () => toast.error('Error al desvincular'),
  })

  const stats = useMemo(() => {
    const persons = data?.data || []
    return {
      total: persons.length,
      withDevice: persons.filter(p => p.devicesCount > 0).length,
      avgAge: persons.length ? Math.round(persons.reduce((sum, p) => sum + (p.birthDate ? differenceInYears(new Date(), new Date(p.birthDate)) : 0), 0) / persons.length) : 0,
    }
  }, [data?.data])

  const openCreateModal = () => { setFormData(initialFormData); setFormErrors({}); setModalMode('create') }
  const openEditModal = (person: MonitoredPerson) => {
    setSelectedPerson(person)
    setFormData({ firstName: person.firstName, lastName: person.lastName, birthDate: person.birthDate ? format(new Date(person.birthDate), 'yyyy-MM-dd') : '', gender: person.gender || '', bloodType: person.bloodType || '', notes: '' })
    setFormErrors({})
    setModalMode('edit')
  }
  const openViewModal = (person: MonitoredPerson) => { setSelectedPerson(person); setModalMode('view') }
  const openAssignModal = (person: MonitoredPerson) => { setSelectedPerson(person); setSelectedDeviceId(''); setModalMode('assign') }
  const closeModal = () => { setModalMode(null); setSelectedPerson(null); setFormData(initialFormData); setFormErrors({}); setSelectedDeviceId('') }

  const validateForm = (): boolean => {
    const errors: Partial<PersonFormData> = {}
    if (!formData.firstName.trim()) errors.firstName = 'Nombre requerido'
    if (!formData.lastName.trim()) errors.lastName = 'Apellido requerido'
    if (!formData.birthDate) errors.birthDate = 'Fecha de nacimiento requerida'
    if (!formData.gender) errors.gender = 'Género requerido'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = () => {
    if (!validateForm()) return
    if (modalMode === 'create') {
      createMutation.mutate({ first_name: formData.firstName.trim(), last_name: formData.lastName.trim(), birth_date: formData.birthDate, gender: formData.gender, blood_type: formData.bloodType || undefined, medical_notes: formData.notes.trim() || undefined })
    } else if (modalMode === 'edit' && selectedPerson) {
      updateMutation.mutate({ id: selectedPerson.id, data: { notes: formData.notes.trim() || undefined } })
    }
  }

  const handleAssignDevice = () => {
    if (!selectedDeviceId || !selectedPerson) return
    assignDeviceMutation.mutate({ personId: selectedPerson.id, deviceId: selectedDeviceId })
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const persons = data?.data || []
      const csv = ['Nombre,Apellido,Edad,Género,Tipo de sangre,Dispositivos', ...persons.map(p => [p.firstName, p.lastName, p.birthDate ? differenceInYears(new Date(), new Date(p.birthDate)) : 'N/A', p.gender ? GENDER_LABELS[p.gender] || p.gender : 'N/A', p.bloodType ? BLOOD_TYPE_LABELS[p.bloodType] || p.bloodType : 'N/A', p.devicesCount].join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `personas_monitoreadas_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`
      link.click()
      toast.success('Exportado correctamente')
    } catch { toast.error('Error al exportar') }
    finally { setIsExporting(false) }
  }

  const columns = [
    {
      key: 'person', header: 'Persona',
      render: (person: MonitoredPerson) => {
        const age = person.birthDate ? differenceInYears(new Date(), new Date(person.birthDate)) : null
        return (
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${person.gender === 'male' ? 'bg-blue-100 text-blue-700' : person.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-700'}`}>
              {person.firstName[0]}{person.lastName[0]}
            </div>
            <div><p className="font-semibold text-gray-900">{person.firstName} {person.lastName}</p><p className="text-sm text-gray-500">{age !== null ? `${age} años` : ''} {person.gender ? `• ${GENDER_LABELS[person.gender] || person.gender}` : ''}</p></div>
          </div>
        )
      },
    },
    {
      key: 'bloodType', header: 'Sangre',
      render: (person: MonitoredPerson) => person.bloodType ? <Badge variant="danger" className="font-bold">{BLOOD_TYPE_LABELS[person.bloodType] || person.bloodType}</Badge> : <span className="text-gray-400 text-sm">No registrado</span>,
    },
    {
      key: 'device', header: 'Dispositivo',
      render: (person: MonitoredPerson) => person.devicesCount > 0 ? <div className="flex items-center gap-2"><div className="p-1.5 bg-green-100 rounded-lg"><Smartphone className="w-4 h-4 text-green-600" /></div><span className="text-sm">{person.devicesCount} asignado(s)</span></div> : <span className="text-gray-400 italic flex items-center gap-1 text-sm"><XCircle className="w-3 h-3" />Sin dispositivo</span>,
    },
    {
      key: 'caregiver', header: 'Cuidador',
      render: (person: MonitoredPerson) => <div className="text-sm"><p className="text-gray-900">{person.caregiverName}</p><p className="text-xs text-gray-500">{person.caregiverEmail}</p></div>,
    },
    {
      key: 'created', header: 'Registrado',
      render: (person: MonitoredPerson) => <div className="text-sm"><p className="text-gray-600">{formatDistanceToNow(new Date(person.createdAt), { addSuffix: true, locale: es })}</p></div>,
    },
    {
      key: 'actions', header: '', className: 'w-14',
      render: (person: MonitoredPerson) => (
        <div className="relative">
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === person.id ? null : person.id) }} className="p-2 hover:bg-gray-100 rounded-lg"><MoreVertical className="w-4 h-4 text-gray-500" /></button>
          {menuOpen === person.id && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
              <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border z-50 py-2">
                <button onClick={() => { openViewModal(person); setMenuOpen(null) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50"><Eye className="w-4 h-4 text-gray-500" />Ver perfil</button>
                <button onClick={() => { openEditModal(person); setMenuOpen(null) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50"><Edit className="w-4 h-4 text-blue-500" />Editar</button>
                <hr className="my-2" />
                {person.devicesCount > 0 ? (
                  <button onClick={() => { unassignDeviceMutation.mutate(person.id); setMenuOpen(null) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 text-orange-600"><XCircle className="w-4 h-4" />Desvincular dispositivo</button>
                ) : (
                  <button onClick={() => { openAssignModal(person); setMenuOpen(null) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 text-green-600"><Smartphone className="w-4 h-4" />Asignar dispositivo</button>
                )}
                <hr className="my-2" />
                <button onClick={() => { setSelectedPerson(person); setShowDeleteDialog(true); setMenuOpen(null) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" />Eliminar</button>
              </div>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Personas Monitoreadas" subtitle="Gestiona los adultos mayores y sus dispositivos"
        actions={<div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => refetch()} leftIcon={<RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />}>Actualizar</Button>
          <Button variant="secondary" size="sm" onClick={handleExport} isLoading={isExporting} leftIcon={<Download className="w-4 h-4" />}>Exportar</Button>
          <Button variant="primary" size="sm" onClick={openCreateModal} leftIcon={<UserPlus className="w-4 h-4" />}>Nueva Persona</Button>
        </div>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card padding="sm" className="bg-gradient-to-br from-blue-50 to-white"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-gray-500">Total</p></div></div></Card>
        <Card padding="sm" className="bg-gradient-to-br from-green-50 to-white"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><Smartphone className="w-5 h-5 text-green-600" /></div><div><p className="text-2xl font-bold">{stats.withDevice}</p><p className="text-xs text-gray-500">Con dispositivo</p></div></div></Card>
        <Card padding="sm" className="bg-gradient-to-br from-purple-50 to-white"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><Calendar className="w-5 h-5 text-purple-600" /></div><div><p className="text-2xl font-bold">{stats.avgAge}</p><p className="text-xs text-gray-500">Edad promedio</p></div></div></Card>
      </div>

      <Card padding="sm">
        <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Buscar por nombre..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="w-full pl-10 pr-4 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500" /></div>
      </Card>

      <Card padding="none">
        <Table columns={columns} data={data?.data || []} keyExtractor={(p) => p.id} isLoading={isLoading} emptyMessage="No se encontraron personas registradas" onRowClick={(p) => openViewModal(p)} />
        {data && data.total_pages > 1 && <div className="px-6 py-4 border-t flex justify-between items-center"><span className="text-sm text-gray-500">Página {page} de {data.total_pages}</span><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button><Button variant="secondary" size="sm" disabled={page >= data.total_pages} onClick={() => setPage(page + 1)}>Siguiente</Button></div></div>}
      </Card>

      <Modal isOpen={modalMode === 'view'} onClose={closeModal} title="Perfil del Paciente" size="lg">
        {selectedPerson && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 pb-4 border-b">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold ${selectedPerson.gender === 'male' ? 'bg-gradient-to-br from-blue-100 to-blue-50 text-blue-700' : selectedPerson.gender === 'female' ? 'bg-gradient-to-br from-pink-100 to-pink-50 text-pink-700' : 'bg-gradient-to-br from-gray-100 to-gray-50 text-gray-700'}`}>
                {selectedPerson.firstName[0]}{selectedPerson.lastName[0]}
              </div>
              <div className="flex-1"><h3 className="text-2xl font-bold">{selectedPerson.firstName} {selectedPerson.lastName}</h3><p className="text-gray-500">{selectedPerson.birthDate ? `${differenceInYears(new Date(), new Date(selectedPerson.birthDate))} años` : ''} {selectedPerson.gender ? `• ${GENDER_LABELS[selectedPerson.gender] || selectedPerson.gender}` : ''}</p><div className="flex gap-2 mt-2">{selectedPerson.bloodType && <Badge variant="danger" className="font-bold">{BLOOD_TYPE_LABELS[selectedPerson.bloodType] || selectedPerson.bloodType}</Badge>}{selectedPerson.devicesCount > 0 ? <Badge variant="success"><Smartphone className="w-3 h-3 mr-1" />{selectedPerson.devicesCount} dispositivo(s)</Badge> : <Badge variant="gray">Sin dispositivo</Badge>}</div></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" />Fecha de nacimiento</p><p className="font-semibold">{selectedPerson.birthDate ? format(new Date(selectedPerson.birthDate), "dd 'de' MMMM, yyyy", { locale: es }) : 'No registrada'}</p></div>
              <div className="p-4 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" />Registrado</p><p className="font-semibold">{format(new Date(selectedPerson.createdAt), "dd/MM/yyyy", { locale: es })}</p></div>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl"><p className="text-xs text-blue-600 mb-2">Cuidador responsable</p><p className="font-semibold">{selectedPerson.caregiverName}</p><p className="text-sm text-blue-600">{selectedPerson.caregiverEmail}</p></div>
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="secondary" onClick={() => openEditModal(selectedPerson)} leftIcon={<Edit className="w-4 h-4" />}>Editar</Button>
              {selectedPerson.devicesCount === 0 && <Button variant="primary" onClick={() => openAssignModal(selectedPerson)} leftIcon={<Smartphone className="w-4 h-4" />}>Asignar dispositivo</Button>}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={modalMode === 'create' || modalMode === 'edit'} onClose={closeModal} title={modalMode === 'create' ? 'Registrar Persona' : 'Editar Información'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label><input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.firstName ? 'border-red-500' : 'border-gray-200'}`} placeholder="Juan" disabled={modalMode === 'edit'} />{formErrors.firstName && <p className="text-xs text-red-500 mt-1">{formErrors.firstName}</p>}</div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label><input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.lastName ? 'border-red-500' : 'border-gray-200'}`} placeholder="Pérez" disabled={modalMode === 'edit'} />{formErrors.lastName && <p className="text-xs text-red-500 mt-1">{formErrors.lastName}</p>}</div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento *</label><input type="date" value={formData.birthDate} onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })} className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.birthDate ? 'border-red-500' : 'border-gray-200'}`} disabled={modalMode === 'edit'} />{formErrors.birthDate && <p className="text-xs text-red-500 mt-1">{formErrors.birthDate}</p>}</div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Género *</label><select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className={`w-full px-4 py-2.5 border rounded-xl bg-white ${formErrors.gender ? 'border-red-500' : 'border-gray-200'}`} disabled={modalMode === 'edit'}><option value="">Seleccionar...</option><option value="male">Masculino</option><option value="female">Femenino</option><option value="other">Otro</option></select>{formErrors.gender && <p className="text-xs text-red-500 mt-1">{formErrors.gender}</p>}</div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo de sangre</label><select value={formData.bloodType} onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white" disabled={modalMode === 'edit'}><option value="">Seleccionar...</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option></select></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Notas</label><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" rows={3} placeholder="Alergias, medicamentos, condiciones..." /></div>
          <div className="flex justify-end gap-3 pt-4 border-t"><Button variant="secondary" onClick={closeModal}>Cancelar</Button><Button variant="primary" onClick={handleSubmit} isLoading={createMutation.isPending || updateMutation.isPending} leftIcon={<Save className="w-4 h-4" />}>{modalMode === 'create' ? 'Registrar' : 'Guardar'}</Button></div>
        </div>
      </Modal>

      <Modal isOpen={modalMode === 'assign'} onClose={closeModal} title="Asignar Dispositivo" size="md">
        {selectedPerson && (
          <div className="space-y-4">
            <p className="text-gray-600">Selecciona un dispositivo para <strong>{selectedPerson.firstName} {selectedPerson.lastName}</strong>:</p>
            {devicesData && devicesData.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">{devicesData.map((device: Device) => (
                <label key={device.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedDeviceId === device.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="device" value={device.id} checked={selectedDeviceId === device.id} onChange={(e) => setSelectedDeviceId(e.target.value)} className="text-blue-600" />
                  <Smartphone className="w-5 h-5 text-gray-500" />
                  <div className="flex-1"><p className="font-semibold font-mono">{device.code}</p><p className="text-xs text-gray-500">{device.model} • SN: {device.serialNumber}</p></div>
                </label>
              ))}</div>
            ) : <div className="text-center py-8 text-gray-500"><Smartphone className="w-12 h-12 mx-auto mb-2 text-gray-300" /><p>No hay dispositivos disponibles</p></div>}
            <div className="flex justify-end gap-3 pt-4 border-t"><Button variant="secondary" onClick={closeModal}>Cancelar</Button><Button variant="primary" onClick={handleAssignDevice} isLoading={assignDeviceMutation.isPending} disabled={!selectedDeviceId} leftIcon={<Save className="w-4 h-4" />}>Asignar</Button></div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={showDeleteDialog} onClose={() => { setShowDeleteDialog(false); setSelectedPerson(null) }} onConfirm={() => selectedPerson && deleteMutation.mutate(selectedPerson.id)} title="Eliminar Persona" message={`¿Eliminar a "${selectedPerson?.firstName} ${selectedPerson?.lastName}"? Se perderán todos sus registros.`} confirmText="Eliminar" variant="danger" isLoading={deleteMutation.isPending} />
    </div>
  )
}
