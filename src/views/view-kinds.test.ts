import { describe, expect, it } from 'vitest'

import { getTableDefinition } from '@/schema'
import { getAvailableCollectionViews, resolveCollectionView } from '@/views/view-kinds'

describe('vistas disponibles por tabla', () => {
  it('oculta y bloquea la vista de calendario en Matriz Dispositivos', () => {
    const table = getTableDefinition('MATRIZ DISPOSITIVOS')!

    expect(getAvailableCollectionViews(table)).not.toContain('calendar')
    expect(resolveCollectionView(table, 'calendar')).toBe('card')
  })

  it('mantiene el calendario disponible en Laboratorio', () => {
    const table = getTableDefinition('Laboratorio')!

    expect(getAvailableCollectionViews(table)).toContain('calendar')
    expect(resolveCollectionView(table, 'calendar')).toBe('calendar')
  })
})
