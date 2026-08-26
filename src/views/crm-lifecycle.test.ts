import { describe, expect, it } from 'vitest'

import { getCurrentCrmAccounts } from '@/views/crm-lifecycle'

describe('ciclo comercial del CRM', () => {
  it('agrupa los contactos por empresa y conserva solo su estado actual', () => {
    const accounts = getCurrentCrmAccounts([
      {
        _uuid: 'activity-1',
        cliente_uuid: 'client-1',
        ID_CRM: 'GC-0010',
        Modificado: '2026-08-20',
        'Tipo de Contacto': 'Prospecto',
        Etapa_actual: 'Cliente',
      },
      {
        _uuid: 'activity-2',
        cliente_uuid: 'client-1',
        ID_CRM: 'GC-0011',
        Modificado: '2026-08-22',
        'Tipo de Contacto': 'Cliente',
        Etapa_actual: 'Cliente',
      },
      {
        _uuid: 'activity-3',
        cliente_uuid: 'client-2',
        ID_CRM: 'GC-0012',
        Modificado: '2026-08-22',
        'Tipo de Contacto': 'Prospecto',
        Etapa_actual: 'Prospecto',
      },
    ])

    expect(accounts).toHaveLength(2)
    expect(accounts.map((account) => account.stage)).toEqual(['Cliente', 'Prospecto'])
    expect(accounts[0]?.latestRow._uuid).toBe('activity-2')
  })

  it('reconoce un contacto cliente aunque aún no exista estado maestro', () => {
    const [account] = getCurrentCrmAccounts([
      {
        _uuid: 'activity-1',
        cliente_uuid: 'client-1',
        ID_CRM: 'GC-0020',
        Modificado: '2026-08-21',
        'Tipo de Contacto': 'Cliente',
      },
    ])

    expect(account?.stage).toBe('Cliente')
  })

  it('agrupa por NOMBRE_EMPRESA cuando no existe cliente vinculado', () => {
    const accounts = getCurrentCrmAccounts([
      { _uuid: 'activity-1', ID_CRM: 'GC-0021', NOMBRE_EMPRESA: 'TRAIOT', 'Tipo de Contacto': 'Prospecto' },
      { _uuid: 'activity-2', ID_CRM: 'GC-0022', NOMBRE_EMPRESA: 'TRAIOT', 'Tipo de Contacto': 'Prospecto' },
    ])

    expect(accounts).toHaveLength(1)
    expect(accounts[0]?.stage).toBe('Prospecto')
  })
})
