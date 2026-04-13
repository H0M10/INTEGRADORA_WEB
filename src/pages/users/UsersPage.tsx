import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Users, Search, MoreVertical, Eye, CheckCircle, XCircle, Plus, Edit, Trash2,
  Smartphone, UserCheck, Download, RefreshCw, Mail, Phone, Calendar, Shield, 
  Activity, Key, UserPlus, X, Save, AlertTriangle, Loader2
} from 'lucide-react'
import { Card, PageHeader, Table, Badge, Modal, Button, ConfirmDialog } from '@/components/ui'
import { appUsersService } from '@/services'
import type { AppUser, CreateAppUserRequest, UpdateAppUserRequest } from '@/types'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

type FilterStatus = 'all' | 'active' | 'inactive' | 'verified' | 'unverified'
type ModalMode = 'view' | 'create' | 'edit' | null

// Códigos de país disponibles
const COUNTRY_CODES = [
  { code: '+52', country: 'México', flag: '🇲🇽' },
  { code: '+1', country: 'EE.UU./Canadá', flag: '🇺🇸' },
  { code: '+34', country: 'España', flag: '🇪🇸' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+51', country: 'Perú', flag: '🇵🇪' },
  { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
  { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
  { code: '+502', country: 'Guatemala', flag: '🇬🇹' },
]

interface UserFormData {
  email: string
  firstName: string
  lastName: string
  countryCode: string
  phoneNumber: string
  password: string
}

const initialFormData: UserFormData = { email: '', firstName: '', lastName: '', countryCode: '+52', phoneNumber: '', password: '' }

export function UsersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [formData, setFormData] = useState<UserFormData>(initialFormData)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof UserFormData, string>>>({})
  const [isExporting, setIsExporting] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [isCheckingPhone, setIsCheckingPhone] = useState(false)
  const [emailExists, setEmailExists] = useState(false)
  const [phoneExists, setPhoneExists] = useState(false)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['app-users', { page, search }],
    queryFn: () => appUsersService.getAll({ page, search }),
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateAppUserRequest) => appUsersService.create(data),
    onSuccess: () => {
      toast.success('Usuario creado exitosamente')
      queryClient.invalidateQueries({ queryKey: ['app-users'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      closeModal()
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.detail || 'Error al crear usuario'
      if (msg.includes('correo')) setFormErrors(prev => ({ ...prev, email: msg }))
      else if (msg.includes('teléfono')) setFormErrors(prev => ({ ...prev, phoneNumber: msg }))
      else toast.error(msg)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAppUserRequest }) => appUsersService.update(id, data),
    onSuccess: () => {
      toast.success('Usuario actualizado exitosamente')
      queryClient.invalidateQueries({ queryKey: ['app-users'] })
      closeModal()
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.detail || 'Error al actualizar'
      if (msg.includes('correo')) setFormErrors(prev => ({ ...prev, email: msg }))
      else if (msg.includes('teléfono')) setFormErrors(prev => ({ ...prev, phoneNumber: msg }))
      else toast.error(msg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => appUsersService.delete(id),
    onSuccess: () => {
      toast.success('Usuario eliminado exitosamente')
      queryClient.invalidateQueries({ queryKey: ['app-users'] })
      setShowDeleteDialog(false)
      setSelectedUser(null)
    },
    onError: () => toast.error('Error al eliminar usuario'),
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => appUsersService.toggleActive(id, isActive),
    onSuccess: () => {
      toast.success('Estado actualizado')
      queryClient.invalidateQueries({ queryKey: ['app-users'] })
      setShowStatusDialog(false)
      setSelectedUser(null)
    },
    onError: () => toast.error('Error al cambiar estado'),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) => appUsersService.resetPassword(id),
    onSuccess: (data) => {
      toast.success(`Nueva contraseña: ${data.temporary_password}`, { duration: 10000 })
      setShowResetPasswordDialog(false)
      setSelectedUser(null)
    },
    onError: () => toast.error('Error al resetear contraseña'),
  })

  const filteredUsers = useMemo(() => {
    const users = data?.items || []
    switch (statusFilter) {
      case 'active': return users.filter(u => u.isActive)
      case 'inactive': return users.filter(u => !u.isActive)
      case 'verified': return users.filter(u => u.isVerified)
      case 'unverified': return users.filter(u => !u.isVerified)
      default: return users
    }
  }, [data?.items, statusFilter])

  const stats = useMemo(() => {
    const users = data?.items || []
    return {
      total: users.length,
      active: users.filter(u => u.isActive).length,
      verified: users.filter(u => u.isVerified).length,
      withDevices: users.filter(u => (u.devicesCount || 0) > 0).length,
    }
  }, [data?.items])

  // Verificar email duplicado
  const checkEmailDebounced = useCallback(async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    setIsCheckingEmail(true)
    try {
      const exists = await appUsersService.checkEmailExists(email)
      setEmailExists(exists)
      if (exists) setFormErrors(prev => ({ ...prev, email: 'Este correo ya está registrado' }))
      else setFormErrors(prev => { const { email, ...rest } = prev; return rest })
    } catch { }
    finally { setIsCheckingEmail(false) }
  }, [])

  // Verificar teléfono duplicado
  const checkPhoneDebounced = useCallback(async (phone: string) => {
    if (!phone || phone.length < 10) return
    setIsCheckingPhone(true)
    try {
      const exists = await appUsersService.checkPhoneExists(phone)
      setPhoneExists(exists)
      if (exists) setFormErrors(prev => ({ ...prev, phoneNumber: 'Este número ya está registrado' }))
      else setFormErrors(prev => { const { phoneNumber, ...rest } = prev; return rest })
    } catch { }
    finally { setIsCheckingPhone(false) }
  }, [])

  // Parsear teléfono existente para separar código de país
  const parseExistingPhone = (phone: string | null | undefined): { code: string; number: string } => {
    if (!phone) return { code: '+52', number: '' }
    for (const c of COUNTRY_CODES) {
      if (phone.startsWith(c.code)) {
        return { code: c.code, number: phone.slice(c.code.length).replace(/\D/g, '') }
      }
    }
    return { code: '+52', number: phone.replace(/\D/g, '') }
  }

  const openCreateModal = () => { 
    setFormData(initialFormData); setFormErrors({}); setEmailExists(false); setPhoneExists(false); setModalMode('create') 
  }
  const openEditModal = (user: AppUser) => {
    setSelectedUser(user)
    const parsed = parseExistingPhone(user.phone)
    setFormData({ 
      email: user.email, firstName: user.firstName, lastName: user.lastName, 
      countryCode: parsed.code, phoneNumber: parsed.number, password: '' 
    })
    setFormErrors({}); setEmailExists(false); setPhoneExists(false)
    setModalMode('edit')
  }
  const openViewModal = (user: AppUser) => { setSelectedUser(user); setModalMode('view') }
  const closeModal = () => { 
    setModalMode(null); setSelectedUser(null); setFormData(initialFormData); setFormErrors({})
    setEmailExists(false); setPhoneExists(false)
  }

  // Handler para input de teléfono - solo números, máx 10
  const handlePhoneInput = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 10)
    setFormData({ ...formData, phoneNumber: cleaned })
    if (cleaned.length === 10) {
      checkPhoneDebounced(formData.countryCode + cleaned)
    }
  }

  const handleEmailBlur = () => {
    if (modalMode === 'create' && formData.email) {
      checkEmailDebounced(formData.email)
    }
  }

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof UserFormData, string>> = {}
    
    if (!formData.email) errors.email = 'Email requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Email inválido'
    else if (emailExists && modalMode === 'create') errors.email = 'Este correo ya está registrado'
    
    if (!formData.firstName.trim()) errors.firstName = 'Nombre requerido'
    if (!formData.lastName.trim()) errors.lastName = 'Apellido requerido'
    
    if (formData.phoneNumber) {
      if (formData.phoneNumber.length !== 10) errors.phoneNumber = 'El teléfono debe tener exactamente 10 dígitos'
      else if (phoneExists) errors.phoneNumber = 'Este número ya está registrado'
    }
    
    if (modalMode === 'create') {
      if (!formData.password) errors.password = 'Contraseña requerida'
      else if (formData.password.length < 8) errors.password = 'Mínimo 8 caracteres'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    
    const fullPhone = formData.phoneNumber ? formData.countryCode + formData.phoneNumber : undefined
    
    if (modalMode === 'create') {
      createMutation.mutate({ 
        email: formData.email.toLowerCase().trim(), 
        password: formData.password, 
        firstName: formData.firstName.trim(), 
        lastName: formData.lastName.trim(), 
        phone: fullPhone 
      })
    } else if (modalMode === 'edit' && selectedUser) {
      updateMutation.mutate({ 
        id: selectedUser.id, 
        data: { 
          firstName: formData.firstName.trim(), 
          lastName: formData.lastName.trim(), 
          phone: fullPhone 
        } 
      })
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const users = data?.items || []
      const csvContent = [
        ['ID', 'Nombre', 'Email', 'Teléfono', 'Estado', 'Verificado', 'Dispositivos', 'Monitoreados', 'Registro'].join(','),
        ...users.map(u => [u.id, `"${u.fullName}"`, u.email, u.phone || '', u.isActive ? 'Activo' : 'Inactivo', u.isVerified ? 'Sí' : 'No', u.devicesCount || 0, u.monitoredCount || 0, format(new Date(u.createdAt), 'dd/MM/yyyy HH:mm')].join(','))
      ].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `usuarios_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`
      link.click()
      toast.success('Exportado correctamente')
    } catch { toast.error('Error al exportar') }
    finally { setIsExporting(false) }
  }

  const columns = [
    {
      key: 'user', header: 'Usuario',
      render: (user: AppUser) => (
        <div className="flex items-center gap-3">
          <div className="relative">
            {user.photoUrl ? <img src={user.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover" /> : (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white font-semibold text-sm">{user.fullName?.charAt(0)?.toUpperCase()}</span>
              </div>
            )}
            {user.isActive && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />}
          </div>
          <div><p className="font-medium text-gray-900">{user.fullName}</p><p className="text-sm text-gray-500">{user.email}</p></div>
        </div>
      ),
    },
    { key: 'phone', header: 'Teléfono', render: (user: AppUser) => <span className="text-sm text-gray-600">{user.phone || '-'}</span> },
    {
      key: 'status', header: 'Estado',
      render: (user: AppUser) => (
        <div className="flex flex-col gap-1">
          <Badge variant={user.isActive ? 'success' : 'gray'} size="sm">{user.isActive ? 'Activo' : 'Inactivo'}</Badge>
          {user.isVerified && <Badge variant="primary" size="sm"><CheckCircle className="w-3 h-3 mr-1" />Verificado</Badge>}
        </div>
      ),
    },
    {
      key: 'resources', header: 'Recursos',
      render: (user: AppUser) => (
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium"><Smartphone className="w-3 h-3" />{user.devicesCount || 0}</span>
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium"><Users className="w-3 h-3" />{user.monitoredCount || 0}</span>
        </div>
      ),
    },
    {
      key: 'lastLogin', header: 'Último acceso',
      render: (user: AppUser) => (
        <div className="text-sm">
          {user.lastLogin ? (<><p className="text-gray-600">{formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true, locale: es })}</p><p className="text-xs text-gray-400">{format(new Date(user.lastLogin), 'dd/MM HH:mm')}</p></>) : <span className="text-gray-400">Nunca</span>}
        </div>
      ),
    },
    {
      key: 'actions', header: '', className: 'w-14',
      render: (user: AppUser) => (
        <div className="relative">
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === user.id ? null : user.id) }} className="p-2 hover:bg-gray-100 rounded-lg"><MoreVertical className="w-4 h-4 text-gray-500" /></button>
          {menuOpen === user.id && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
              <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border z-50 py-2">
                <button onClick={() => { openViewModal(user); setMenuOpen(null) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50"><Eye className="w-4 h-4 text-gray-500" />Ver detalles</button>
                <button onClick={() => { openEditModal(user); setMenuOpen(null) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50"><Edit className="w-4 h-4 text-blue-500" />Editar</button>
                <button onClick={() => { setSelectedUser(user); setShowResetPasswordDialog(true); setMenuOpen(null) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50"><Key className="w-4 h-4 text-orange-500" />Resetear contraseña</button>
                <hr className="my-2" />
                <button onClick={() => { setSelectedUser(user); setShowStatusDialog(true); setMenuOpen(null) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50">
                  {user.isActive ? <XCircle className="w-4 h-4 text-yellow-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}{user.isActive ? 'Desactivar' : 'Activar'}
                </button>
                <button onClick={() => { setSelectedUser(user); setShowDeleteDialog(true); setMenuOpen(null) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" />Eliminar</button>
              </div>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Gestión de Usuarios" subtitle="Administra los usuarios de la aplicación móvil"
        actions={<div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => refetch()} leftIcon={<RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />}>Actualizar</Button>
          <Button variant="secondary" size="sm" onClick={handleExport} isLoading={isExporting} leftIcon={<Download className="w-4 h-4" />}>Exportar</Button>
          <Button variant="primary" size="sm" onClick={openCreateModal} leftIcon={<UserPlus className="w-4 h-4" />}>Nuevo Usuario</Button>
        </div>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="sm" className="bg-gradient-to-br from-blue-50 to-white border-blue-100"><div className="flex items-center gap-3"><div className="p-2.5 bg-blue-100 rounded-xl"><Users className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-gray-500">Total usuarios</p></div></div></Card>
        <Card padding="sm" className="bg-gradient-to-br from-green-50 to-white border-green-100"><div className="flex items-center gap-3"><div className="p-2.5 bg-green-100 rounded-xl"><Activity className="w-5 h-5 text-green-600" /></div><div><p className="text-2xl font-bold">{stats.active}</p><p className="text-xs text-gray-500">Activos</p></div></div></Card>
        <Card padding="sm" className="bg-gradient-to-br from-purple-50 to-white border-purple-100"><div className="flex items-center gap-3"><div className="p-2.5 bg-purple-100 rounded-xl"><Shield className="w-5 h-5 text-purple-600" /></div><div><p className="text-2xl font-bold">{stats.verified}</p><p className="text-xs text-gray-500">Verificados</p></div></div></Card>
        <Card padding="sm" className="bg-gradient-to-br from-orange-50 to-white border-orange-100"><div className="flex items-center gap-3"><div className="p-2.5 bg-orange-100 rounded-xl"><Smartphone className="w-5 h-5 text-orange-600" /></div><div><p className="text-2xl font-bold">{stats.withDevices}</p><p className="text-xs text-gray-500">Con dispositivos</p></div></div></Card>
      </div>

      <Card padding="sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Buscar por nombre o email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as FilterStatus)} className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="verified">Verificados</option>
            <option value="unverified">Sin verificar</option>
          </select>
        </div>
      </Card>

      <Card padding="none">
        <Table columns={columns} data={filteredUsers} keyExtractor={(u) => u.id} isLoading={isLoading} emptyMessage="No se encontraron usuarios" onRowClick={(u) => openViewModal(u)} />
        {data && data.pages > 1 && (
          <div className="px-6 py-4 border-t flex justify-between items-center">
            <span className="text-sm text-gray-500">Página {page} de {data.pages} • {data.total} registros</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
            </div>
          </div>
        )}
      </Card>

      <Modal isOpen={modalMode !== null} onClose={closeModal} title={modalMode === 'create' ? 'Nuevo Usuario' : modalMode === 'edit' ? 'Editar Usuario' : 'Detalles del Usuario'} size={modalMode === 'view' ? 'lg' : 'md'}>
        {modalMode === 'view' && selectedUser ? (
          <div className="space-y-6">
            <div className="flex items-start gap-4 pb-4 border-b">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg"><span className="text-white text-2xl font-bold">{selectedUser.fullName?.charAt(0)}</span></div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{selectedUser.fullName}</h3>
                <p className="text-gray-500">{selectedUser.email}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant={selectedUser.isActive ? 'success' : 'gray'}>{selectedUser.isActive ? 'Activo' : 'Inactivo'}</Badge>
                  {selectedUser.isVerified && <Badge variant="primary">Verificado</Badge>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Phone className="w-3 h-3" />Teléfono</p><p className="font-semibold">{selectedUser.phone || 'No registrado'}</p></div>
              <div className="p-4 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Calendar className="w-3 h-3" />Registro</p><p className="font-semibold">{format(new Date(selectedUser.createdAt), "dd/MM/yyyy HH:mm")}</p></div>
              <div className="p-4 bg-blue-50 rounded-xl"><p className="text-xs text-blue-600 flex items-center gap-1 mb-1"><Smartphone className="w-3 h-3" />Dispositivos</p><p className="text-2xl font-bold text-blue-700">{selectedUser.devicesCount || 0}</p></div>
              <div className="p-4 bg-purple-50 rounded-xl"><p className="text-xs text-purple-600 flex items-center gap-1 mb-1"><Users className="w-3 h-3" />Monitoreados</p><p className="text-2xl font-bold text-purple-700">{selectedUser.monitoredCount || 0}</p></div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Activity className="w-3 h-3" />Último acceso</p><p className="font-semibold">{selectedUser.lastLogin ? format(new Date(selectedUser.lastLogin), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es }) : 'Nunca ha iniciado sesión'}</p></div>
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="secondary" onClick={() => openEditModal(selectedUser)} leftIcon={<Edit className="w-4 h-4" />}>Editar</Button>
              <Button variant="secondary" onClick={() => { setShowResetPasswordDialog(true); closeModal() }} leftIcon={<Key className="w-4 h-4" />}>Resetear contraseña</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Nombre y Apellido */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.firstName ? 'border-red-500' : 'border-gray-200'}`} placeholder="Juan" />
                {formErrors.firstName && <p className="text-xs text-red-500 mt-1">{formErrors.firstName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.lastName ? 'border-red-500' : 'border-gray-200'}`} placeholder="Pérez" />
                {formErrors.lastName && <p className="text-xs text-red-500 mt-1">{formErrors.lastName}</p>}
              </div>
            </div>

            {/* Email con validación de duplicado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setEmailExists(false) }}
                  onBlur={handleEmailBlur}
                  className={`w-full pl-10 pr-10 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.email ? 'border-red-500' : emailExists ? 'border-yellow-500' : 'border-gray-200'}`} 
                  placeholder="juan@ejemplo.com" 
                  disabled={modalMode === 'edit'} 
                />
                {isCheckingEmail && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />}
                {!isCheckingEmail && emailExists && <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-500" />}
              </div>
              {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
            </div>

            {/* Teléfono con código de país y validación 10 dígitos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono <span className="text-gray-400 font-normal">(10 dígitos)</span>
              </label>
              <div className="flex gap-2">
                <select 
                  value={formData.countryCode} 
                  onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                  className="w-28 px-2 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <div className="flex-1 relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={formData.phoneNumber} 
                    onChange={(e) => handlePhoneInput(e.target.value)}
                    className={`w-full pl-10 pr-16 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.phoneNumber ? 'border-red-500' : phoneExists ? 'border-yellow-500' : 'border-gray-200'}`} 
                    placeholder="1234567890"
                    maxLength={10}
                  />
                  {isCheckingPhone && <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />}
                  {!isCheckingPhone && phoneExists && <AlertTriangle className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-500" />}
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    {formData.phoneNumber.length}/10
                  </span>
                </div>
              </div>
              {formErrors.phoneNumber && <p className="text-xs text-red-500 mt-1">{formErrors.phoneNumber}</p>}
              {formData.phoneNumber && formData.phoneNumber.length === 10 && !phoneExists && !formErrors.phoneNumber && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Número completo: {formData.countryCode} {formData.phoneNumber}
                </p>
              )}
            </div>

            {/* Contraseña (solo en crear) */}
            {modalMode === 'create' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.password ? 'border-red-500' : 'border-gray-200'}`} placeholder="Mínimo 8 caracteres" />
                {formErrors.password && <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>}
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
              <Button 
                variant="primary" 
                onClick={handleSubmit} 
                isLoading={createMutation.isPending || updateMutation.isPending} 
                disabled={emailExists || phoneExists || isCheckingEmail || isCheckingPhone}
                leftIcon={<Save className="w-4 h-4" />}
              >
                {modalMode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={showDeleteDialog} onClose={() => { setShowDeleteDialog(false); setSelectedUser(null) }} onConfirm={() => selectedUser && deleteMutation.mutate(selectedUser.id)} title="Eliminar Usuario" message={`¿Estás seguro de eliminar a "${selectedUser?.fullName}"? Esta acción no se puede deshacer.`} confirmText="Eliminar" variant="danger" isLoading={deleteMutation.isPending} />
      <ConfirmDialog isOpen={showStatusDialog} onClose={() => { setShowStatusDialog(false); setSelectedUser(null) }} onConfirm={() => selectedUser && toggleStatusMutation.mutate({ id: selectedUser.id, isActive: !selectedUser.isActive })} title={selectedUser?.isActive ? 'Desactivar Usuario' : 'Activar Usuario'} message={selectedUser?.isActive ? `¿Desactivar a "${selectedUser?.fullName}"? No podrá iniciar sesión.` : `¿Activar a "${selectedUser?.fullName}"? Podrá usar la aplicación.`} confirmText={selectedUser?.isActive ? 'Desactivar' : 'Activar'} variant={selectedUser?.isActive ? 'warning' : 'primary'} isLoading={toggleStatusMutation.isPending} />
      <ConfirmDialog isOpen={showResetPasswordDialog} onClose={() => { setShowResetPasswordDialog(false); setSelectedUser(null) }} onConfirm={() => selectedUser && resetPasswordMutation.mutate(selectedUser.id)} title="Resetear Contraseña" message={`¿Generar nueva contraseña para "${selectedUser?.fullName}"?`} confirmText="Resetear" variant="warning" isLoading={resetPasswordMutation.isPending} />
    </div>
  )
}
