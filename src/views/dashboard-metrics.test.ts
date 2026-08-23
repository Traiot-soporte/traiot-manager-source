import { describe, expect, it } from 'vitest'

import { matrixDeviceMetrics } from '@/views/dashboard-metrics'

describe('indicadores de Matriz Dispositivos', () => {
  it('cuenta registros, familias, marcas y fichas técnicas válidas', () => {
    const metrics = matrixDeviceMetrics([
      { Familia: 'Cableado', Marca: 'TopFlyTech', Ficha_Tecnica: 'https://example.com/a' },
      { Familia: ' cableado ', Marca: 'TOPFLYTECH', Ficha_Tecnica: 'https://example.com/b' },
      { Familia: 'Solar', Marca: 'Ruptela', Ficha_Tecnica: 'sin-url' },
      { Familia: '', Marca: '', Ficha_Tecnica: '' },
    ])

    expect(metrics).toEqual([
      { label: 'Registros', value: 4 },
      { label: 'Familias', value: 2 },
      { label: 'Marcas', value: 2 },
      { label: 'Fichas técnicas', value: 2 },
    ])
  })
})
