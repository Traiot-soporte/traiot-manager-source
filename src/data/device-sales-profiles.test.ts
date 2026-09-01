import { describe, expect, it } from 'vitest'

import { deviceSalesProfiles, findDeviceSalesProfile } from '@/data/device-sales-profiles'

describe('matriz comercial de dispositivos', () => {
  it('incluye los 28 perfiles proporcionados', () => {
    expect(deviceSalesProfiles).toHaveLength(28)
  })

  it('relaciona modelos aunque cambien espacios, guiones o mayusculas', () => {
    expect(findDeviceSalesProfile('pioneerx100')).toMatchObject({
      model: 'PioneerX 100',
      competitor1: 'Teltonika FMC920',
    })
    expect(findDeviceSalesProfile('SOLAR-GUARD X 200')).toMatchObject({
      model: 'SolarGuardX 200',
    })
  })

  it('conserva el argumento y la fuente comercial', () => {
    expect(findDeviceSalesProfile('PioneerX 100')).toMatchObject({
      mainStrength: 'Muy competitivo en costo/funcionalidad',
      sourceUrl: 'https://www.topflytech.com/es/pioneerx-100-4g-cat-1/',
    })
  })
})
