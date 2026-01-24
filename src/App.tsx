import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/stores'
import { AuthLayout, DashboardLayout } from '@/layouts'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { UsersPage } from '@/pages/users/UsersPage'
import { DevicesPage } from '@/pages/devices/DevicesPage'
import { AlertsPage } from '@/pages/alerts/AlertsPage'
import { MonitoredPage } from '@/pages/monitored/MonitoredPage'
import { AdminsPage } from '@/pages/admins/AdminsPage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import type { RolePermissions } from '@/types'

// Configuración de React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
})

// Componente para rutas protegidas
function ProtectedRoute({ 
  children, 
  requiredPermission 
}: { 
  children: React.ReactNode
  requiredPermission?: { module: keyof RolePermissions; action: string }
}) {
  const { isAuthenticated, hasPermission } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  if (requiredPermission && !hasPermission(requiredPermission.module, requiredPermission.action as 'view' | 'create' | 'edit' | 'delete' | 'resolve' | 'export')) {
    return <Navigate to="/dashboard" replace />
  }
  
  return <>{children}</>
}

// Componente para rutas públicas (solo no autenticados)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={
            <PublicRoute>
              <AuthLayout>
                <LoginPage />
              </AuthLayout>
            </PublicRoute>
          } />
          
          {/* Rutas protegidas */}
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            {/* Redirección por defecto */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            {/* Dashboard */}
            <Route path="dashboard" element={
              <ProtectedRoute requiredPermission={{ module: 'dashboard', action: 'view' }}>
                <DashboardPage />
              </ProtectedRoute>
            } />
            
            {/* Usuarios de la App */}
            <Route path="users" element={
              <ProtectedRoute requiredPermission={{ module: 'users', action: 'view' }}>
                <UsersPage />
              </ProtectedRoute>
            } />
            
            {/* Dispositivos */}
            <Route path="devices" element={
              <ProtectedRoute requiredPermission={{ module: 'devices', action: 'view' }}>
                <DevicesPage />
              </ProtectedRoute>
            } />
            
            {/* Alertas */}
            <Route path="alerts" element={
              <ProtectedRoute requiredPermission={{ module: 'alerts', action: 'view' }}>
                <AlertsPage />
              </ProtectedRoute>
            } />
            
            {/* Personas Monitoreadas */}
            <Route path="monitored" element={
              <ProtectedRoute requiredPermission={{ module: 'monitored', action: 'view' }}>
                <MonitoredPage />
              </ProtectedRoute>
            } />
            
            {/* Administradores (solo super_admin) */}
            <Route path="admins" element={
              <ProtectedRoute requiredPermission={{ module: 'admins', action: 'view' }}>
                <AdminsPage />
              </ProtectedRoute>
            } />
            
            {/* Reportes */}
            <Route path="reports" element={
              <ProtectedRoute requiredPermission={{ module: 'reports', action: 'view' }}>
                <ReportsPage />
              </ProtectedRoute>
            } />
            
            {/* Configuración (solo super_admin) */}
            <Route path="settings" element={
              <ProtectedRoute requiredPermission={{ module: 'settings', action: 'view' }}>
                <SettingsPage />
              </ProtectedRoute>
            } />
          </Route>
          
          {/* 404 - Redirige al dashboard o login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      
      {/* Notificaciones Toast */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#1f2937',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            borderRadius: '0.5rem',
            padding: '1rem',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </QueryClientProvider>
  )
}

export default App
