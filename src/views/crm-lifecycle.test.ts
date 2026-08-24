import { describe, expect, it } from 'vitest'

import { getCurrentCrmAccounts } from '@/views/crm-lifecycle'

describe('ciclo comercial del CRM', () => {
  it('agrupa los seguimientos por empresa y conserva solo su estado actual', () => {
    const accounts = getCurrentCrmAccounts([
      {
        _uuid: 'activity-1',
        cliente_uuid: 'client-1',
        Id_CRM: '10',
        Fecha_contacto: '2026-08-20',
        Tipo_cliente: '🔵Prospecto',
        Estatus_prospeccion: '🤝En negociación',
        Etapa_actual: 'Cliente',
      },
      {
        _uuid: 'activity-2',
        cliente_uuid: 'client-1',
        Id_CRM: '11',
        Fecha_contacto: '2026-08-22',
        Tipo_cliente: '🟢Activo',
        Estatus_cliente: '🟢Activo',
        Etapa_actual: 'Cliente',
      },
      {
        _uuid: 'activity-3',
        cliente_uuid: 'client-2',
        Id_CRM: '12',
        Fecha_contacto: '2026-08-22',
        Tipo_cliente: '🔵Prospecto',
        Etapa_actual: 'Prospecto',
      },
    ])

    expect(accounts).toHaveLength(2)
    expect(accounts.map((account) => account.stage)).toEqual(['Cliente', 'Prospecto'])
    expect(accounts[0]?.latestRow._uuid).toBe('activity-2')
  })

  it('reconoce una conversión histórica aunque aún no exista estado maestro', () => {
    const [account] = getCurrentCrmAccounts([
      {
        _uuid: 'activity-1',
        cliente_uuid: 'client-1',
        Id_CRM: '20',
        Fecha_contacto: '2026-08-21',
        Tipo_cliente: '🔵Prospecto',
        Estatus_prospeccion: '✅Cliente',
      },
    ])

    expect(account?.stage).toBe('Cliente')
  })

  it('mantiene separados a los prospectos descartados', () => {
    const [account] = getCurrentCrmAccounts([
      {
        _uuid: 'activity-1',
        cliente_uuid: 'client-1',
        Fecha_contacto: '2026-08-21',
        Tipo_cliente: '🔵Prospecto',
        Estatus_prospeccion: '❌No interesado',
      },
    ])

    expect(account?.stage).toBe('Descartado')
  })
})
