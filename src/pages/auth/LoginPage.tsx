import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, LogIn, AlertCircle, Clock, ShieldAlert, Lock } from 'lucide-react'
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

// Constantes de rate limiting
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 5 * 60 * 1000 // 5 minutos
const STORAGE_KEY = 'ng_login_attempts'

interface LoginAttemptData {
  count: number
  lockedUntil: number | null // timestamp
  lastAttempt: number // timestamp
}

const getAttemptData = (): LoginAttemptData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return { count: 0, lockedUntil: null, lastAttempt: 0 }
}

const saveAttemptData = (data: LoginAttemptData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

const clearAttemptData = () => {
  localStorage.removeItem(STORAGE_KEY)
}

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading, error, clearError } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [sessionMessage, setSessionMessage] = useState<string | null>(null)
  const [attemptData, setAttemptData] = useState<LoginAttemptData>(getAttemptData)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  
  const isLocked = attemptData.lockedUntil !== null && Date.now() < attemptData.lockedUntil

  // Calcular tiempo restante de bloqueo
  const updateRemainingTime = useCallback(() => {
    if (attemptData.lockedUntil && Date.now() < attemptData.lockedUntil) {
      setRemainingSeconds(Math.ceil((attemptData.lockedUntil - Date.now()) / 1000))
    } else if (attemptData.lockedUntil && Date.now() >= attemptData.lockedUntil) {
      // El bloqueo expiró, resetear
      const newData = { count: 0, lockedUntil: null, lastAttempt: 0 }
      setAttemptData(newData)
      saveAttemptData(newData)
      setRemainingSeconds(0)
    }
  }, [attemptData.lockedUntil])

  // Timer countdown
  useEffect(() => {
    if (!isLocked) return
    updateRemainingTime()
    const interval = setInterval(updateRemainingTime, 1000)
    return () => clearInterval(interval)
  }, [isLocked, updateRemainingTime])

  // Verificar si hay mensaje de sesión expirada
  useEffect(() => {
    const redirectReason = sessionStorage.getItem('auth_redirect_reason')
    if (redirectReason) {
      setSessionMessage(redirectReason)
      sessionStorage.removeItem('auth_redirect_reason')
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

  const registerFailedAttempt = () => {
    const current = getAttemptData()
    const newCount = current.count + 1
    const newData: LoginAttemptData = {
      count: newCount,
      lockedUntil: newCount >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_DURATION_MS : null,
      lastAttempt: Date.now(),
    }
    saveAttemptData(newData)
    setAttemptData(newData)

    if (newCount >= MAX_ATTEMPTS) {
      toast.error(`Cuenta bloqueada temporalmente por ${LOCKOUT_DURATION_MS / 60000} minutos`, { duration: 6000 })
    } else {
      const remaining = MAX_ATTEMPTS - newCount
      toast.error(`Credenciales incorrectas. ${remaining} intento${remaining === 1 ? '' : 's'} restante${remaining === 1 ? '' : 's'}`, { duration: 4000 })
    }
  }
  
  const onSubmit = async (data: LoginFormData) => {
    // Verificar si está bloqueado
    if (isLocked) {
      toast.error('Cuenta bloqueada. Espera a que termine el tiempo de espera.')
      return
    }

    try {
      clearError()
      await login(data)
      // Login exitoso: limpiar intentos
      clearAttemptData()
      setAttemptData({ count: 0, lockedUntil: null, lastAttempt: 0 })
      toast.success('¡Bienvenido al panel de administración!')
      navigate('/dashboard')
    } catch (err) {
      registerFailedAttempt()
      console.error('Login error:', err)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const attemptsRemaining = MAX_ATTEMPTS - attemptData.count
  
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Iniciar Sesión</h2>
        <p className="text-gray-500 mt-2">
          Acceso exclusivo para administradores del sistema
        </p>
      </div>

      {/* Bloqueo por intentos fallidos */}
      {isLocked && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">Acceso bloqueado temporalmente</p>
              <p className="text-sm text-red-600 mt-1">
                Se han excedido los {MAX_ATTEMPTS} intentos permitidos. 
                Por seguridad, el acceso ha sido bloqueado.
              </p>
              <div className="mt-3 flex items-center gap-2 bg-red-100 rounded-lg px-3 py-2">
                <Lock className="w-4 h-4 text-red-600" />
                <span className="text-red-700 font-mono font-bold text-lg">{formatTime(remainingSeconds)}</span>
                <span className="text-red-600 text-xs">restantes</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Mensaje de sesión expirada */}
      {sessionMessage && !isLocked && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Sesión finalizada</p>
            <p className="text-sm text-amber-600 mt-1">{sessionMessage}</p>
          </div>
        </div>
      )}
      
      {/* Mensaje de error global */}
      {error && !isLocked && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Error de autenticación</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Advertencia de intentos restantes */}
      {attemptData.count > 0 && attemptData.count < MAX_ATTEMPTS && !isLocked && (
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
          <p className="text-sm text-yellow-700">
            <strong>{attemptsRemaining}</strong> intento{attemptsRemaining === 1 ? '' : 's'} restante{attemptsRemaining === 1 ? '' : 's'} antes del bloqueo temporal
          </p>
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
            disabled={isLoading || isLocked}
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
              disabled={isLoading || isLocked}
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
          disabled={isLoading || isLocked}
          className={`w-full flex items-center justify-center gap-2 font-medium py-3 px-4 rounded-lg transition-all disabled:cursor-not-allowed ${
            isLocked 
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Iniciando sesión...
            </>
          ) : isLocked ? (
            <>
              <Lock className="w-5 h-5" />
              Acceso Bloqueado
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

