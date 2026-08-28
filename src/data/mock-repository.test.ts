import { describe, expect, it } from 'vitest'

import { MockRepository } from '@/data/mock-repository'

const fixedNow = () => new Date('2026-08-22T00:00:00.000Z')

describe('MockRepository', () => {
  it('lista datos de ejemplo sin exponer filas eliminadas', async () => {
    const repository = new MockRepository({}, fixedNow, () => 'new-id')
    await repository.create({
      table: 'CLIENTES',
      values: { _uuid: 'client-test', 'ID CLIENTE': 'CLI-TEST' },
    })
    await repository.delete({ table: 'CLIENTES', rowUuid: 'client-test' })

    await expect(repository.list('CLIENTES')).resolves.toEqual([])
  })

  it('recalcula el total corregido al crear un pedido', async () => {
    const repository = new MockRepository({}, fixedNow, () => 'order-test')
    const order = await repository.create({
      table: 'PEDIDOS',
      values: {
        'ID PEDIDO': 'PED-TEST',
        'PRECIO VENTA PARA ASESOR': 1000,
        'EQUIPOS A VENDER': 2,
        'COSTO INSTALACION': 500,
        ENVIO: 200,
      },
    })

    expect(order.SUBTOTAL).toBe(2700)
    expect(order.IVA).toBe(432)
    expect(order.TOTAL).toBe(3132)
  })

  it('rechaza tablas que no forman parte del esquema', async () => {
    const repository = new MockRepository({}, fixedNow, () => 'new-id')
    await expect(repository.list('DESCONOCIDA')).rejects.toThrow('Tabla no registrada')
  })

  it('asigna automaticamente el consecutivo de nuevos productos', async () => {
    const repository = new MockRepository({
      ALMACEN: [
        { _uuid: 'product-38', _deleted: true, 'No. Item': 38, 'ID PRODUCTO': 'ANTERIOR' },
      ],
    }, fixedNow, () => 'product-39')

    const product = await repository.create({
      table: 'ALMACEN',
      values: { 'ID PRODUCTO': 'ARNES OBD2' },
    })

    expect(product['No. Item']).toBe(39)
  })

  it('conserva y audita el historial de comentarios del CRM', async () => {
    const repository = new MockRepository({
      'Gestion Clientes': [{
        _uuid: 'crm-contact',
        ID_CRM: 'GC-0001',
        Comentarios: 'Comentario importado',
      }],
    }, fixedNow, () => 'crm-contact-2')

    const contact = await repository.update({
      table: 'Gestion Clientes',
      rowUuid: 'crm-contact',
      changes: { Comentarios: 'Nueva nota' },
    })

    expect(contact.Comentarios).toBe(
      'Comentario importado\n\n[21/08/2026 18:00 · manuel@traiot.mx]\nNueva nota',
    )
  })

  it('prepara un solo correo grupal y WhatsApp solo para colaboradores seleccionados', async () => {
    let sequence = 0
    const repository = new MockRepository(undefined, fixedNow, () => `generated-${++sequence}`)
    const participants = await repository.listMeetingParticipants()
    const result = await repository.createCompanyMeeting({
      title: 'Revision operativa',
      description: 'Pendientes',
      startAt: '2026-08-25T16:00:00.000Z',
      endAt: '2026-08-25T17:00:00.000Z',
      meetUrl: 'https://meet.google.com/abc-defg-hij',
      participantUuids: participants.map((participant) => participant.userUuid),
      whatsappParticipantUuids: [participants[0]!.userUuid],
    })
    const communications = await repository.listCommunications()
    const email = communications.filter((communication) => communication.channel === 'EMAIL')
    const whatsapp = communications.filter((communication) => communication.channel === 'WHATSAPP')

    expect(result).toMatchObject({ emailInvitations: 1, emailRecipients: 2, whatsappInvitations: 1 })
    expect(email).toHaveLength(1)
    expect(email[0]!.recipient).toContain('manuel@traiot.mx')
    expect(email[0]!.recipient).toContain('ian@traiot.mx')
    expect(whatsapp).toHaveLength(1)
    expect(whatsapp[0]!.recipientName).toBe(participants[0]!.name)
  })
})
