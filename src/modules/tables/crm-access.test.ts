import { describe, expect, it } from 'vitest'

import { canManageAllCrmRecords } from '@/modules/tables/crm-access'

describe('alcance del CRM por rol', () => {
  it('reserva la vista global para Administrador y Gerencia', () => {
    expect(canManageAllCrmRecords('Administrador')).toBe(true)
    expect(canManageAllCrmRecords('Gerencia')).toBe(true)
    expect(canManageAllCrmRecords('Soporte')).toBe(false)
    expect(canManageAllCrmRecords('Ventas')).toBe(false)
    expect(canManageAllCrmRecords('Técnico')).toBe(false)
  })
})
