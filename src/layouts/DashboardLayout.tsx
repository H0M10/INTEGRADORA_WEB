import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore, useUIStore } from '@/stores'
import { checkSessionValidity } from '@/services/api'
import { alertsService } from '@/services'
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
  Menu,
  X,
  ChevronDown,
  LogOut,
  Search
} from 'lucide-react'
import { ROLE_LABELS } from '@/types'
import type { RolePermissions } from '@/types'

// Definición de items del menú con permisos requeridos
const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', permission: 'dashboard' as keyof RolePermissions },
  { path: '/users', icon: Users, label: 'Usuarios App', permission: 'users' as keyof RolePermissions, description: 'Familiares/Cuidadores' },
  { path: '/devices', icon: Smartphone, label: 'Dispositivos', permission: 'devices' as keyof RolePermissions, description: 'IoT / Pulseras' },
  { path: '/monitored', icon: UserCheck, label: 'Monitoreados', permission: 'monitored' as keyof RolePermissions, description: 'Adultos Mayores' },
  { path: '/alerts', icon: Bell, label: 'Alertas', permission: 'alerts' as keyof RolePermissions },
  { path: '/reports', icon: FileBarChart, label: 'Reportes', permission: 'reports' as keyof RolePermissions },
  { path: '/admins', icon: Shield, label: 'Administradores', permission: 'admins' as keyof RolePermissions },
  { path: '/settings', icon: Settings, label: 'Configuración', permission: 'settings' as keyof RolePermissions },
]

export function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, hasPermission } = useAuthStore()
  const { sidebarOpen, setSidebarOpen, unreadAlerts, setUnreadAlerts } = useUIStore()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  
  // Polling de alertas pendientes cada 30 segundos
  useQuery({
    queryKey: ['pending-alerts-count'],
    queryFn: async () => {
      try {
        const pending = await alertsService.getPending()
        setUnreadAlerts(pending.length)
        return pending.length
      } catch {
        return 0
      }
    },
    refetchInterval: 30000,
  })
  
  // Cerrar sidebar al cambiar de ruta (móvil)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname, setSidebarOpen])
  
  // Verificar sesión periódicamente (cada 60 segundos)
  useEffect(() => {
    const checkSession = () => {
      if (!checkSessionValidity()) {
        sessionStorage.setItem('auth_redirect_reason', 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.')
        logout()
        navigate('/login')
      }
    }
    checkSession()
    const interval = setInterval(checkSession, 60000)
    const handleFocus = () => checkSession()
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
  const visibleMenuItems = menuItems.filter(item => hasPermission(item.permission, 'view'))
  
  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans">
      
      {/* Overlay móvil con glassmorphism */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar - Floating UI en Desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[280px] bg-white lg:bg-transparent lg:left-4 lg:my-4
        transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:shadow-none'}
      `}>
        <div className="h-full flex flex-col bg-white lg:glass-panel lg:rounded-[2rem] lg:border-white/60">
          {/* Header del sidebar */}
          <div className="h-20 flex items-center px-6 border-b border-slate-100/50">
            <NavLink to="/dashboard" className="flex items-center gap-3 relative group">
              <div className="w-10 h-10 bg-gradient-to-tr from-primary-600 to-primary-400 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:scale-105 transition-transform duration-300">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-slate-800 tracking-tight text-lg leading-tight">NovaGuardian</h1>
                <p className="text-[10px] font-bold text-primary-600 tracking-widest uppercase">Admin Portal</p>
              </div>
            </NavLink>
            <button 
              className="ml-auto lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Navegación */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-2">Menú Principal</div>
            {visibleMenuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  group relative flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-primary-500/10 text-primary-700' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary-600 rounded-r-full" />
                    )}
                    <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span className="truncate pr-2">{item.label}</span>
                      {item.path === '/alerts' && unreadAlerts > 0 && (
                        <span className="bg-danger-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          {unreadAlerts}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          
          {/* Footer del sidebar - Usuario */}
          <div className="p-4 m-4 bg-slate-50 border border-slate-100 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white border border-slate-200 rounded-[10px] flex items-center justify-center shadow-sm">
                <span className="text-primary-700 font-bold">
                  {user?.full_name?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate leading-tight">
                  {user?.full_name || 'Administrador'}
                </p>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mt-0.5">
                  {user?.role ? ROLE_LABELS[user.role] : 'Admin'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Contenido principal - Espacio responsivo */}
      <div className="flex-1 lg:pl-[300px] flex flex-col min-h-screen relative w-full lg:pr-4 lg:py-4 transition-all duration-300">
        
        {/* Header Superior Efecto Glass */}
        <header className="h-20 lg:rounded-[2rem] glass lg:mb-6 border-b lg:border border-slate-100/50 sticky top-0 lg:top-4 z-30 transition-all shadow-sm">
          <div className="h-full px-4 lg:px-6 flex items-center justify-between">
            {/* Botón menú móvil */}
            <div className="flex items-center gap-4">
              <button 
                className="lg:hidden p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors bg-white shadow-sm border border-slate-100"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              
              {/* Búsqueda global (placeholder visual) */}
              <div className="hidden md:flex items-center max-w-md">
                 <div className="relative w-64 lg:w-96 group">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                   </div>
                   <input
                     type="text"
                     className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 sm:text-sm transition-all duration-300"
                     placeholder="Buscar en el portal..."
                   />
                 </div>
              </div>
            </div>
            
            {/* Acciones header */}
            <div className="flex items-center gap-3 ml-auto">
              {/* Settings Action */}
              <button 
                onClick={() => navigate('/settings')}
                className="hidden sm:block p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors bg-white"
              >
                <Settings className="w-5 h-5 line-scale" />
              </button>

              {/* Alertas */}
              <button 
                onClick={() => navigate('/alerts')}
                className="relative p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all bg-white group border border-slate-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)]"
                title="Alertas"
              >
                <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                {unreadAlerts > 0 && (
                  <>
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full z-10" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full animate-ping opacity-75" />
                  </>
                )}
              </button>
              
              {/* Dropdown Usuario */}
              <div className="relative ml-2">
                <button 
                  className="flex items-center gap-3 hover:bg-slate-100 p-1.5 pr-3 rounded-xl transition-colors border border-transparent hover:border-slate-200"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <div className="w-8 h-8 bg-gradient-to-tr from-slate-800 to-slate-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                    <span className="text-sm font-bold">
                      {user?.full_name?.charAt(0).toUpperCase() || 'A'}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-glass border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-5 py-3 border-b border-slate-100 mb-1">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {user?.full_name}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {user?.email}
                        </p>
                      </div>
                      
                      <div className="px-2">
                        <NavLink 
                          to="/settings" 
                          className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="w-4 h-4" /> Configuración
                        </NavLink>
                        
                        <div className="my-1 border-t border-slate-100" />
                        
                        <button 
                          onClick={() => {
                            setUserMenuOpen(false)
                            handleLogout()
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-danger-600 hover:bg-danger-50 rounded-xl text-left transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> Cerrar Sesión
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area Padded & Clean */}
        <main className="flex-1 p-4 lg:p-2 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
