import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, LogIn, AlertCircle, Clock } from 'lucide-react'
import { useAuthStore } from '@/stores'
import { Button, Input } from '@/components/ui'
import toast from 'react-hot-toast'

// Schema de validación
const loginSchema = z.object({
  email: z.string()
    .min(1, 'El email es requerido')
    .email('Ingresa un email válido'),
  password: z.string()
    .min(1, 'La contraseña es requerida')
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading, error, clearError } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [sessionMessage, setSessionMessage] = useState<string | null>(null)
  
  // Verificar si hay mensaje de sesión expirada
  useEffect(() => {
    const redirectReason = sessionStorage.getItem('auth_redirect_reason')
    if (redirectReason) {
      setSessionMessage(redirectReason)
      sessionStorage.removeItem('auth_redirect_reason')
      // Mostrar toast también
      toast.error(redirectReason, { duration: 5000 })
    }
  }, [])
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })
  
  const onSubmit = async (data: LoginFormData) => {
    try {
      clearError()
      await login(data)
      toast.success('¡Bienvenido al panel de administración!')
      navigate('/dashboard')
    } catch (err) {
      // El error ya se maneja en el store
      console.error('Login error:', err)
    }
  }
  
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Iniciar Sesión</h2>
        <p className="text-gray-500 mt-2">
          Acceso exclusivo para administradores del sistema
        </p>
      </div>
      
      {/* Mensaje de sesión expirada */}
      {sessionMessage && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Sesión finalizada</p>
            <p className="text-sm text-amber-600 mt-1">{sessionMessage}</p>
          </div>
        </div>
      )}
      
      {/* Mensaje de error global */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Error de autenticación</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Correo electrónico
          </label>
          <input
            type="email"
            placeholder="admin@novaguardian.com"
            disabled={isLoading}
            className={`
              w-full px-4 py-3 border rounded-lg text-sm
              placeholder-gray-400 text-gray-900
              focus:outline-none focus:ring-2 focus:border-transparent transition-all
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${errors.email 
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
              }
            `}
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.email.message}
            </p>
          )}
        </div>
        
        {/* Contraseña */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Contraseña
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              disabled={isLoading}
              className={`
                w-full px-4 py-3 pr-12 border rounded-lg text-sm
                placeholder-gray-400 text-gray-900
                focus:outline-none focus:ring-2 focus:border-transparent transition-all
                disabled:bg-gray-100 disabled:cursor-not-allowed
                ${errors.password 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
                }
              `}
              {...register('password')}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.password.message}
            </p>
          )}
        </div>
        
        {/* Recordarme y olvidé contraseña */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Recordarme</span>
          </label>
          <a 
            href="#" 
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            ¿Olvidaste tu contraseña?
          </a>
        </div>
        
        {/* Botón de submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Iniciando sesión...
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              Iniciar Sesión
            </>
          )}
        </button>
      </form>
      
      {/* Información de acceso */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-xs text-blue-700 text-center">
          🔒 Este es un panel de acceso restringido. Solo personal autorizado puede ingresar.
          <br />
          Si no tienes credenciales, contacta al Super Administrador.
        </p>
      </div>
    </div>
  )
}
