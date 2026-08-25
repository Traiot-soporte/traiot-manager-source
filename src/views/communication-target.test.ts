import { describe, expect, it } from 'vitest'

import { resolveCommunicationTarget } from '@/views/communication-target'

describe('destinatario de comunicaciones', () => {
  it('trata guiones de datos heredados como campos vacíos', () => {
    expect(resolveCommunicationTarget('CLIENTES', {
      _uuid: 'client-001',
      'RAZON SOCIAL': 'Cliente Demo',
      EMAIL: 'ventas@cliente.mx',
      'TELEFONO CONTACTO': '--',
      TELEFONO: '—',
    })).toMatchObject({
      email: 'ventas@cliente.mx',
      phone: '',
    })
  })
})
