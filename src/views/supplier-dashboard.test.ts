import { describe, expect, it } from 'vitest'

import { supplierDashboardMetrics } from '@/views/supplier-dashboard'

describe('panel de Proveedores', () => {
  it('resume cobertura y disponibilidad de correo', () => {
    const rows = [
      { PAIS: 'México', CIUDAD: 'Monterrey', CORREO_E: 'ventas@uno.mx' },
      { PAIS: 'México', CIUDAD: 'Guadalajara', CORREO_E: '' },
      { PAIS: 'China', CIUDAD: 'Shenzhen', CORREO_E: 'sales@dos.cn' },
    ]

    expect(supplierDashboardMetrics(rows)).toEqual({
      suppliers: 3,
      countries: 2,
      cities: 3,
      withEmail: 2,
    })
  })
})
