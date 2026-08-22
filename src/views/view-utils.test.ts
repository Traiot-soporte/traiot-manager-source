import { describe, expect, it } from 'vitest'

import { clientesTable } from '@/schema/tables/clientes'
import { getDisplayColumns, getListColumns, getRowTitle } from '@/views/view-utils'

describe('utilidades de vistas genéricas', () => {
  it('oculta columnas técnicas y virtuales en el detalle', () => {
    const names = getDisplayColumns(clientesTable).map((column) => column.name)

    expect(names).toContain('ID CLIENTE')
    expect(names).not.toContain('_updatedAt')
    expect(names).not.toContain('Related INSTALACIONESs')
  })

  it('limita las columnas y excluye imágenes en colecciones', () => {
    const columns = getListColumns(clientesTable, 3)

    expect(columns).toHaveLength(3)
    expect(columns.every((column) => column.type !== 'Image')).toBe(true)
  })

  it('usa la columna label como título del registro', () => {
    expect(getRowTitle(clientesTable, { _uuid: 'client-001', 'ID CLIENTE': 'CLI-001' })).toBe(
      'CLI-001',
    )
  })
})
