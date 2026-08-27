import { describe, expect, it } from 'vitest'

import { uniqueEnumOptions } from '@/lib/enum-options'

describe('opciones de categoria', () => {
  it('elimina duplicados sin importar mayusculas o acentos', () => {
    expect(uniqueEnumOptions([
      'GPS',
      'SENSOR',
      'ACCESORIO',
      'CCTV',
      'Sensor',
      'Accesorio',
      'Cámaras',
      'CAMARAS',
    ])).toEqual(['GPS', 'SENSOR', 'ACCESORIO', 'CCTV', 'Cámaras'])
  })
})
