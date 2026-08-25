import { describe, expect, it } from 'vitest'

import { upsertMutationResult } from '@/modules/tables/mutation-cache'

describe('cache posterior al guardado', () => {
  it('inserta inmediatamente un registro nuevo antes de navegar al detalle', () => {
    const saved = { _uuid: 'new-row', NOMBRE: 'Producto nuevo' }
    expect(upsertMutationResult([{ _uuid: 'old-row' }], saved)).toEqual([
      { _uuid: 'old-row' },
      saved,
    ])
  })

  it('reemplaza un registro editado sin duplicarlo', () => {
    const saved = { _uuid: 'row-1', NOMBRE: 'Actualizado' }
    expect(upsertMutationResult([{ _uuid: 'row-1', NOMBRE: 'Anterior' }], saved)).toEqual([saved])
  })
})
