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

  it('usa los datos de la nueva ficha profesional de seguimiento', () => {
    expect(resolveCommunicationTarget('Gestion Clientes', {
      ID: 'GC-0001',
      Nombre: 'Hector',
      Compañía: '2RP SOLUTIONS',
      Móvil: '5589266665',
      'E-mail del trabajo': 'h.ramos@2rp.mx',
    })).toEqual({
      title: '2RP SOLUTIONS',
      contactName: 'Hector',
      email: 'h.ramos@2rp.mx',
      phone: '5589266665',
    })
  })
})
