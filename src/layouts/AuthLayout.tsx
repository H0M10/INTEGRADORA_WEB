import { ReactNode } from 'react'
import { Activity, Shield, Heart, Clock } from 'lucide-react'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Panel izquierdo - Branding */}
      <div className="lg:w-1/2 xl:w-3/5 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        {/* Elementos decorativos */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">NovaGuardian</h1>
              <p className="text-blue-200 text-sm">Panel de Administración</p>
            </div>
          </div>
        </div>
        
        {/* Contenido central */}
        <div className="relative z-10 space-y-8 my-12 lg:my-0">
          <div>
            <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight">
              Sistema de Monitoreo
              <br />
              <span className="text-blue-200">Geriátrico IoT</span>
            </h2>
            <p className="text-blue-100 text-lg mt-4 max-w-lg">
              Gestiona usuarios, dispositivos, alertas y monitorea el bienestar de los adultos mayores en tiempo real.
            </p>
          </div>
          
          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-white">24/7</p>
              <p className="text-blue-200 text-sm">Monitoreo Continuo</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-white">&lt;5s</p>
              <p className="text-blue-200 text-sm">Alertas en Tiempo Real</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-white">99.5%</p>
              <p className="text-blue-200 text-sm">Disponibilidad</p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="relative z-10 text-blue-300 text-sm">
          © 2026 NovaGuardian. Todos los derechos reservados.
        </div>
      </div>
      
      {/* Panel derecho - Formulario */}
      <div className="lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 lg:p-12 bg-gray-50 min-h-screen lg:min-h-0">
        <div className="w-full max-w-md">
          {/* Logo móvil */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">NovaGuardian</h1>
              <p className="text-gray-500 text-sm">Panel de Administración</p>
            </div>
          </div>
          
          {children}
        </div>
      </div>
    </div>
  )
}
