import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Save, AlertTriangle, Heart, Thermometer, Wind, Activity, Info } from 'lucide-react'
import { Card, PageHeader, Button, Spinner } from '@/components/ui'
import { settingsService } from '@/services'
import { useAuthStore } from '@/stores'
import type { VitalThresholds } from '@/types'
import toast from 'react-hot-toast'
import { config } from '@/config'

export function SettingsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  
  const [thresholds, setThresholds] = useState<VitalThresholds>({
    heartRateMin: 50,
    heartRateMax: 120,
    spo2Min: 90,
    temperatureMin: 35.5,
    temperatureMax: 38.0,
    systolicBpMin: 90,
    systolicBpMax: 140,
    diastolicBpMin: 60,
    diastolicBpMax: 90,
  })
  
  const { isLoading } = useQuery({
    queryKey: ['settings-thresholds'],
    queryFn: async () => {
      const data = await settingsService.getAlertThresholds()
      setThresholds(data)
      return data
    },
  })
  
  const saveMutation = useMutation({
    mutationFn: (data: VitalThresholds) => settingsService.updateAlertThresholds(data),
    onSuccess: () => {
      toast.success('Configuración guardada')
      queryClient.invalidateQueries({ queryKey: ['settings-thresholds'] })
    },
    onError: () => toast.error('Error al guardar'),
  })
  
  // Solo super_admin puede ver esta página
  if (user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Acceso Restringido</h2>
          <p className="text-gray-500 mt-2">Solo los Super Administradores pueden acceder a la configuración.</p>
        </div>
      </div>
    )
  }
  
  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Configuración del Sistema"
        subtitle="Ajusta los parámetros y umbrales del sistema"
      />
      
      {/* Umbrales de alertas */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-warning-100 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-warning-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Umbrales de Alertas</h3>
            <p className="text-sm text-gray-500">Define los valores límite para generar alertas automáticas</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Ritmo cardíaco */}
          <div className="p-4 bg-danger-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-5 h-5 text-danger-600" />
              <span className="font-medium text-danger-800">Ritmo Cardíaco (BPM)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-danger-600">Mínimo</label>
                <input
                  type="number"
                  value={thresholds.heartRateMin}
                  onChange={(e) => setThresholds({ ...thresholds, heartRateMin: Number(e.target.value) })}
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-danger-600">Máximo</label>
                <input
                  type="number"
                  value={thresholds.heartRateMax}
                  onChange={(e) => setThresholds({ ...thresholds, heartRateMax: Number(e.target.value) })}
                  className="input mt-1"
                />
              </div>
            </div>
          </div>
          
          {/* Oxígeno */}
          <div className="p-4 bg-primary-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Wind className="w-5 h-5 text-primary-600" />
              <span className="font-medium text-primary-800">Saturación de Oxígeno (%)</span>
            </div>
            <div>
              <label className="text-xs text-primary-600">Mínimo permitido</label>
              <input
                type="number"
                value={thresholds.spo2Min}
                onChange={(e) => setThresholds({ ...thresholds, spo2Min: Number(e.target.value) })}
                className="input mt-1"
              />
            </div>
          </div>
          
          {/* Temperatura */}
          <div className="p-4 bg-warning-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Thermometer className="w-5 h-5 text-warning-600" />
              <span className="font-medium text-warning-800">Temperatura (°C)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-warning-600">Mínimo</label>
                <input
                  type="number"
                  step="0.1"
                  value={thresholds.temperatureMin}
                  onChange={(e) => setThresholds({ ...thresholds, temperatureMin: Number(e.target.value) })}
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-warning-600">Máximo</label>
                <input
                  type="number"
                  step="0.1"
                  value={thresholds.temperatureMax}
                  onChange={(e) => setThresholds({ ...thresholds, temperatureMax: Number(e.target.value) })}
                  className="input mt-1"
                />
              </div>
            </div>
          </div>
          
          {/* Presión arterial */}
          <div className="p-4 bg-success-50 rounded-lg lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-success-600" />
              <span className="font-medium text-success-800">Presión Arterial (mmHg)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-success-600">Sistólica máxima</label>
                <input
                  type="number"
                  value={thresholds.systolicBpMax}
                  onChange={(e) => setThresholds({ ...thresholds, systolicBpMax: Number(e.target.value) })}
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-success-600">Diastólica máxima</label>
                <input
                  type="number"
                  value={thresholds.diastolicBpMax}
                  onChange={(e) => setThresholds({ ...thresholds, diastolicBpMax: Number(e.target.value) })}
                  className="input mt-1"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button
            leftIcon={<Save className="w-4 h-4" />}
            onClick={() => saveMutation.mutate(thresholds)}
            isLoading={saveMutation.isPending}
          >
            Guardar Cambios
          </Button>
        </div>
      </Card>
      
      {/* Información del sistema */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-primary-100 rounded-lg">
            <Info className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Información del Sistema</h3>
            <p className="text-sm text-gray-500">Datos técnicos y versión del sistema</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Versión del Panel</p>
            <p className="font-mono font-medium">{config.appVersion}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Ambiente</p>
            <p className="font-mono font-medium capitalize">production</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">API Backend</p>
            <p className="font-mono font-medium text-xs truncate">{config.apiUrl}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Sesión Timeout</p>
            <p className="font-mono font-medium">30 minutos</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
