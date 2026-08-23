import { describe, expect, it } from 'vitest'

import { matrixDeviceBreakdown, matrixDeviceMetrics } from '@/views/dashboard-metrics'

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

  it('genera desgloses agrupados y ordenados por cantidad', () => {
    const rows = [
      { Familia: 'Cableado', Marca: 'TopFlyTech' },
      { Familia: ' cableado ', Marca: 'TOPFLYTECH' },
      { Familia: 'Solar', Marca: 'Ruptela' },
      { Familia: 'Híbrido', Marca: 'Ruptela' },
      { Familia: '', Marca: '' },
    ]

    expect(matrixDeviceBreakdown(rows, 'Familia')).toEqual([
      { label: 'Cableado', total: 2 },
      { label: 'Híbrido', total: 1 },
      { label: 'Solar', total: 1 },
    ])
    expect(matrixDeviceBreakdown(rows, 'Marca')).toEqual([
      { label: 'Ruptela', total: 2 },
      { label: 'TopFlyTech', total: 2 },
    ])
  })
})
