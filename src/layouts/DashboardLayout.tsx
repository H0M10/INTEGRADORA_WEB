import { useState, useEffect, useCallback } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore, useUIStore } from '@/stores'
import { checkSessionValidity } from '@/services/api'
import { 
  Activity, 
  LayoutDashboard, 
  Users, 
  Smartphone, 
  Bell, 
  UserCheck,
  Shield,
  FileBarChart,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Search
} from 'lucide-react'
import { ROLE_LABELS } from '@/types'
import type { RolePermissions } from '@/types'

// Definición de items del menú con permisos requeridos
const menuItems = [
  { 
    path: '/dashboard', 
    icon: LayoutDashboard, 
    label: 'Dashboard',
    permission: 'dashboard' as keyof RolePermissions,
  },
  { 
    path: '/users', 
    icon: Users, 
    label: 'Usuarios App',
    permission: 'users' as keyof RolePermissions,
    description: 'Familiares/Cuidadores'
  },
  { 
    path: '/devices', 
    icon: Smartphone, 
    label: 'Dispositivos',
    permission: 'devices' as keyof RolePermissions,
    description: 'IoT / Pulseras'
  },
  { 
    path: '/alerts', 
    icon: Bell, 
    label: 'Alertas',
    permission: 'alerts' as keyof RolePermissions,
  },
  { 
    path: '/monitored', 
    icon: UserCheck, 
    label: 'Monitoreados',
    permission: 'monitored' as keyof RolePermissions,
    description: 'Adultos Mayores'
  },
  { 
    path: '/admins', 
    icon: Shield, 
    label: 'Administradores',
    permission: 'admins' as keyof RolePermissions,
  },
  { 
    path: '/reports', 
    icon: FileBarChart, 
    label: 'Reportes',
    permission: 'reports' as keyof RolePermissions,
  },
  { 
    path: '/settings', 
    icon: Settings, 
    label: 'Configuración',
    permission: 'settings' as keyof RolePermissions,
  },
]

export function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, hasPermission } = useAuthStore()
  const { sidebarOpen, setSidebarOpen, unreadAlerts } = useUIStore()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  
  // Cerrar sidebar al cambiar de ruta (móvil)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname, setSidebarOpen])
  
  // Verificar sesión periódicamente (cada 60 segundos)
  useEffect(() => {
    const checkSession = () => {
      if (!checkSessionValidity()) {
        console.log('[Auth] Sesión inválida detectada en verificación periódica')
        sessionStorage.setItem('auth_redirect_reason', 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.')
        logout()
        navigate('/login')
      }
    }
    
    // Verificar inmediatamente al montar
    checkSession()
    
    // Verificar cada 60 segundos
    const interval = setInterval(checkSession, 60000)
    
    // Verificar cuando la ventana vuelve a tener foco (usuario vuelve a la pestaña)
    const handleFocus = () => {
      console.log('[Auth] Ventana recuperó foco, verificando sesión...')
      checkSession()
    }
    window.addEventListener('focus', handleFocus)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [logout, navigate])
  
  const handleLogout = () => {
    logout()
    navigate('/login')
  }
  
  // Filtrar items del menú según permisos
  const visibleMenuItems = menuItems.filter(item => 
    hasPermission(item.permission, 'view')
  )
  
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header del sidebar */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          <NavLink to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">NovaGuardian</h1>
              <p className="text-xs text-gray-500">Panel Admin</p>
            </div>
          </NavLink>
          <button 
            className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Navegación */}
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
          {visibleMenuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200
                ${isActive 
                  ? 'bg-primary-50 text-primary-700' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span>{item.label}</span>
                  {item.path === '/alerts' && unreadAlerts > 0 && (
                    <span className="bg-danger-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {unreadAlerts}
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="text-xs text-gray-400 truncate">{item.description}</p>
                )}
              </div>
            </NavLink>
          ))}
        </nav>
        
        {/* Footer del sidebar - Usuario */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-700 font-semibold text-sm">
                {user?.full_name?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.full_name || 'Administrador'}
              </p>
              <p className="text-xs text-gray-500">
                {user?.role ? ROLE_LABELS[user.role] : 'Admin'}
              </p>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Contenido principal */}
      <div className="lg:pl-72">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="h-full px-4 flex items-center justify-between">
            {/* Botón menú móvil */}
            <button 
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Búsqueda global */}
            <div className="hidden md:flex flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar usuarios, dispositivos, alertas..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            
            {/* Acciones derecha */}
            <div className="flex items-center gap-2">
              {/* Notificaciones */}
              <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <Bell className="w-5 h-5" />
                {unreadAlerts > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full" />
                )}
              </button>
              
              {/* Menú usuario */}
              <div className="relative">
                <button 
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-700 font-semibold text-sm">
                      {user?.full_name?.charAt(0).toUpperCase() || 'A'}
                    </span>
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700">
                    {user?.full_name?.split(' ')[0] || 'Admin'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
                
                {/* Dropdown */}
                {userMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 animate-fade-in">
                      <div className="p-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
                          {user?.role ? ROLE_LABELS[user.role] : 'Admin'}
                        </span>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 rounded-lg"
                        >
                          <LogOut className="w-4 h-4" />
                          Cerrar Sesión
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>
        
        {/* Contenido de la página */}
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
