import { describe, expect, it } from 'vitest'

import { laboratoryDashboardMetrics } from '@/views/laboratory-dashboard'

describe('panel de laboratorio', () => {
  it('cuenta estado técnico y semaforización', () => {
    expect(laboratoryDashboardMetrics([
      { ESTATUS: '❌ DAÑADO', SEMAFORO: '🔵 CERRADO' },
      { ESTATUS: '✅ FUNCIONAL', SEMAFORO: '🔵 CERRADO' },
      { ESTATUS: '🛠️ EN REVISION', SEMAFORO: '🔴 URGENTE' },
      { ESTATUS: '🛠️ EN REVISION', SEMAFORO: '🟡 POR VENCER' },
      { ESTATUS: '📥 RECIBIDO', SEMAFORO: '🟢 EN TIEMPO' },
    ])).toEqual({
      total: 5,
      damaged: 1,
      functional: 1,
      urgent: 1,
      dueSoon: 1,
      onTime: 1,
      closed: 2,
    })
  })
})
