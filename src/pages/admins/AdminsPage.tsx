import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, Plus, Search, MoreVertical, Trash2, Key, CheckCircle, XCircle } from 'lucide-react'
import { Card, PageHeader, Button, Table, Badge, Modal, ConfirmDialog, Input, Select } from '@/components/ui'
import { adminsService } from '@/services'
import { useAuthStore } from '@/stores'
import type { AdminUser, CreateAdminRequest, AdminRole } from '@/types'
import { ROLE_LABELS } from '@/types'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const createAdminSchema = z.object({
  email: z.string().min(1, 'Email requerido').email('Email inválido'),
  full_name: z.string().min(2, 'Nombre requerido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  role: z.enum(['super_admin', 'admin', 'operador']),
  phone: z.string().optional(),
})

type CreateAdminFormData = z.infer<typeof createAdminSchema>

// Helper para color de badge según rol
function getRoleBadgeColor(role?: AdminRole): 'danger' | 'primary' | 'gray' {
  if (role === 'super_admin') return 'danger'
  if (role === 'admin') return 'primary'
  return 'gray'
}

export function AdminsPage() {
  const queryClient = useQueryClient()
  const { user: currentUser, hasPermission } = useAuthStore()
  
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  
  const { data, isLoading } = useQuery({
    queryKey: ['admins', { page, search }],
    queryFn: () => adminsService.getAll({ page, search }),
  })
  
  const createMutation = useMutation({
    mutationFn: (formData: CreateAdminFormData) => adminsService.create(formData as unknown as CreateAdminRequest),
    onSuccess: () => {
      toast.success('Administrador creado')
      queryClient.invalidateQueries({ queryKey: ['admins'] })
      setShowCreateModal(false)
      reset()
    },
    onError: () => toast.error('Error al crear administrador'),
  })
  
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminsService.delete(id as unknown as number),
    onSuccess: () => {
      toast.success('Administrador eliminado')
      queryClient.invalidateQueries({ queryKey: ['admins'] })
      setShowDeleteConfirm(false)
      setSelectedAdmin(null)
    },
    onError: () => toast.error('Error al eliminar'),
  })
  
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      adminsService.update(id as unknown as number, { is_active: isActive }),
    onSuccess: () => {
      toast.success('Estado actualizado')
      queryClient.invalidateQueries({ queryKey: ['admins'] })
    },
    onError: () => toast.error('Error al actualizar'),
  })
  
  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) => adminsService.resetPassword(id as unknown as number),
    onSuccess: () => toast.success('Contraseña reseteada. Se envió un email.'),
    onError: () => toast.error('Error al resetear contraseña'),
  })
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateAdminFormData>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: { role: 'operador' },
  })
  
  const admins = data?.data || []
  
  // Solo super_admin puede ver esta página
  if (!hasPermission('admins', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Shield className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Acceso Restringido</h2>
        <p className="text-gray-500 mt-2">No tienes permisos para ver esta sección.</p>
      </div>
    )
  }
  
  const columns = [
    {
      key: 'user',
      header: 'Administrador',
      render: (admin: AdminUser) => (
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            admin.role === 'super_admin' ? 'bg-red-100' : 
            admin.role === 'admin' ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            <Shield className={`w-5 h-5 ${
              admin.role === 'super_admin' ? 'text-red-600' : 
              admin.role === 'admin' ? 'text-blue-600' : 'text-gray-600'
            }`} />
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {admin.full_name || `${admin.first_name} ${admin.last_name}`}
            </p>
            <p className="text-sm text-gray-500">{admin.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rol',
      render: (admin: AdminUser) => (
        <Badge variant={getRoleBadgeColor(admin.role)}>
          {admin.role ? ROLE_LABELS[admin.role] : 'Sin rol'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (admin: AdminUser) => (
        <Badge variant={admin.is_active !== false ? 'success' : 'danger'}>
          {admin.is_active !== false ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (admin: AdminUser) => (
        <div className="relative flex justify-end">
          {admin.id !== currentUser?.id && (
            <>
              <button 
                onClick={(e) => { 
                  e.stopPropagation()
                  setMenuOpen(menuOpen === admin.id ? null : admin.id) 
                }} 
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>
              {menuOpen === admin.id && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border z-50">
                    <button 
                      onClick={() => { 
                        toggleActiveMutation.mutate({ id: admin.id, isActive: admin.is_active === false })
                        setMenuOpen(null) 
                      }} 
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {admin.is_active !== false ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      {admin.is_active !== false ? 'Desactivar' : 'Activar'}
                    </button>
                    <button 
                      onClick={() => { 
                        resetPasswordMutation.mutate(admin.id)
                        setMenuOpen(null) 
                      }} 
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Key className="w-4 h-4" /> Resetear contraseña
                    </button>
                    {currentUser?.role === 'super_admin' && (
                      <button 
                        onClick={() => { 
                          setSelectedAdmin(admin)
                          setShowDeleteConfirm(true)
                          setMenuOpen(null) 
                        }} 
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" /> Eliminar
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      ),
    },
  ]
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Administradores"
        subtitle="Gestión de usuarios del panel de administración"
        actions={
          hasPermission('admins', 'create') && (
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreateModal(true)}>
              Nuevo Admin
            </Button>
          )
        }
      />
      
      {/* Filtros */}
      <Card padding="sm">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o email..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
        </div>
      </Card>
      
      {/* Tabla */}
      <Card padding="none">
        <Table 
          columns={columns} 
          data={admins} 
          keyExtractor={(a) => a.id} 
          isLoading={isLoading} 
          emptyMessage="No hay administradores registrados" 
        />
      </Card>
      
      {/* Modal Crear */}
      <Modal 
        isOpen={showCreateModal} 
        onClose={() => { setShowCreateModal(false); reset() }} 
        title="Nuevo Administrador"
        size="md"
      >
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <Input 
            label="Nombre completo" 
            error={errors.full_name?.message} 
            {...register('full_name')} 
          />
          <Input 
            label="Email" 
            type="email" 
            error={errors.email?.message} 
            {...register('email')} 
          />
          <Input 
            label="Contraseña" 
            type="password" 
            error={errors.password?.message} 
            {...register('password')} 
          />
          <Select 
            label="Rol" 
            error={errors.role?.message} 
            options={[
              { value: 'operador', label: 'Operador' },
              { value: 'admin', label: 'Administrador' },
              { value: 'super_admin', label: 'Super Administrador' },
            ]}
            {...register('role')}
          />
          <Input 
            label="Teléfono (opcional)" 
            {...register('phone')} 
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Crear
            </Button>
          </div>
        </form>
      </Modal>
      
      {/* Confirmar eliminar */}
      <ConfirmDialog 
        isOpen={showDeleteConfirm} 
        onClose={() => { setShowDeleteConfirm(false); setSelectedAdmin(null) }} 
        onConfirm={() => selectedAdmin && deleteMutation.mutate(selectedAdmin.id)} 
        title="Eliminar administrador"
        message={`¿Estás seguro de eliminar a ${selectedAdmin?.full_name || selectedAdmin?.first_name}? Esta acción no se puede deshacer.`}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
