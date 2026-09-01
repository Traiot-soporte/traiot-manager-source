import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

interface ApiColumn {
  readonly name: string
  readonly sourceHeader: string
  readonly type: string
  readonly values?: readonly string[]
  readonly virtual?: boolean
  readonly sensitive?: boolean
}

interface ApiTable {
  readonly name: string
  readonly sourceHeaders: readonly string[]
  readonly columns: readonly ApiColumn[]
}

interface ReadApiSandbox {
  readonly mapApiRowsFromValues_: (
    table: ApiTable,
    values: readonly (readonly unknown[])[],
  ) => readonly Readonly<Record<string, unknown>>[]
  readonly isCrmCalendarRowVisible_: (
    row: Readonly<Record<string, unknown>>,
    user: Readonly<Record<string, unknown>>,
  ) => boolean
  readonly isApiCrmRowAssignedToUser_: (
    row: Readonly<Record<string, unknown>>,
    user: Readonly<Record<string, unknown>>,
  ) => boolean
  readonly filterApiCrmClientRowsByContacts_: (
    clients: readonly Readonly<Record<string, unknown>>[],
    contacts: readonly Readonly<Record<string, unknown>>[],
    user: Readonly<Record<string, unknown>>,
  ) => readonly Readonly<Record<string, unknown>>[]
  readonly apiSectionsForRole_: (role: string) => readonly string[]
  readonly canApiViewTable_: (
    user: Readonly<Record<string, unknown>>,
    table: Readonly<Record<string, unknown>>,
  ) => boolean
}

function loadReadApiSandbox(): ReadApiSandbox {
  const sandbox = createContext({})
  runInContext(readFileSync('apps-script/50_DataMigrationAudit.gs', 'utf8'), sandbox)
  runInContext(readFileSync('apps-script/80_ReadApi.gs', 'utf8'), sandbox)
  runInContext(readFileSync('apps-script/89_CrmLifecycle.gs', 'utf8'), sandbox)
  return sandbox as ReadApiSandbox
}

const table: ApiTable = {
  name: 'CATALOGO',
  sourceHeaders: ['ID', 'ACTIVO', 'ETIQUETAS', 'PasswordHash'],
  columns: [
    { name: '_uuid', sourceHeader: '_uuid', type: 'Text' },
    { name: '_deleted', sourceHeader: '_deleted', type: 'Bool' },
    { name: 'ID', sourceHeader: 'ID FISICO', type: 'Text' },
    { name: 'ACTIVO', sourceHeader: 'ACTIVO', type: 'Bool' },
    { name: 'ETIQUETAS', sourceHeader: 'ETIQUETAS', type: 'EnumList' },
    { name: 'PasswordHash', sourceHeader: 'PasswordHash', type: 'Text', sensitive: true },
  ],
}

describe('API privada de lectura', () => {
  it('mapea encabezados fisicos, booleanos y listas', () => {
    const { mapApiRowsFromValues_ } = loadReadApiSandbox()
    const rows = mapApiRowsFromValues_(table, [
      ['ID FISICO', 'ACTIVO', 'ETIQUETAS', 'PasswordHash', '_uuid', '_deleted'],
      [
        'A-1',
        'TRUE',
        'Uno, Dos',
        '$2b$11$hash-que-nunca-debe-llegar-al-cliente',
        '11111111-1111-4111-8111-111111111111',
        false,
      ],
    ])

    expect(rows).toEqual([
      {
        _uuid: '11111111-1111-4111-8111-111111111111',
        _deleted: false,
        ID: 'A-1',
        ACTIVO: true,
        ETIQUETAS: ['Uno', 'Dos'],
      },
    ])
  })

  it('omite filas vacias y registros con borrado logico', () => {
    const { mapApiRowsFromValues_ } = loadReadApiSandbox()
    const rows = mapApiRowsFromValues_(table, [
      ['ID FISICO', 'ACTIVO', 'ETIQUETAS', '_uuid', '_deleted'],
      ['', '', '', '', ''],
      ['A-2', false, '', '22222222-2222-4222-8222-222222222222', true],
    ])

    expect(rows).toEqual([])
  })

  it('solo entrega eventos personales a su propietario', () => {
    const { isCrmCalendarRowVisible_ } = loadReadApiSandbox()
    const owner = { userUuid: '11111111-1111-4111-8111-111111111111' }
    const anotherUser = { userUuid: '22222222-2222-4222-8222-222222222222' }
    const personal = {
      Calendario: 'Personal',
      _calendarOwnerUuid: owner.userUuid,
    }

    expect(isCrmCalendarRowVisible_(personal, owner)).toBe(true)
    expect(isCrmCalendarRowVisible_(personal, anotherUser)).toBe(false)
    expect(isCrmCalendarRowVisible_({ Calendario: 'Empresarial' }, anotherUser)).toBe(true)
    expect(isCrmCalendarRowVisible_({ Calendario: '' }, anotherUser)).toBe(true)
    expect(isCrmCalendarRowVisible_(personal, { ...anotherUser, role: 'Gerencia' })).toBe(true)
  })

  it('limita seguimientos por responsable salvo para gerencia y administracion', () => {
    const { isApiCrmRowAssignedToUser_ } = loadReadApiSandbox()
    const row = { Responsable: ['Luis Baca', 'Oscar Malagón'] }

    expect(isApiCrmRowAssignedToUser_(row, { name: 'Oscar Malagon', role: 'Ventas' })).toBe(true)
    expect(isApiCrmRowAssignedToUser_(row, { name: 'Manuel Soto', role: 'Soporte' })).toBe(false)
    expect(isApiCrmRowAssignedToUser_(row, { name: 'Manuel Soto', role: 'Gerencia' })).toBe(true)
    expect(isApiCrmRowAssignedToUser_(row, { name: 'Manuel Soto', role: 'Administrador' })).toBe(true)
  })

  it('entrega solo empresas vinculadas a seguimientos del responsable', () => {
    const { filterApiCrmClientRowsByContacts_ } = loadReadApiSandbox()
    const clients = [
      { _uuid: 'client-1', 'RAZON SOCIAL': 'Empresa Uno' },
      { _uuid: 'client-2', 'RAZON SOCIAL': 'Empresa Dos' },
      { _uuid: 'client-3', 'RAZON SOCIAL': 'Empresa Tres' },
    ]
    const contacts = [
      { cliente_uuid: 'client-1', NOMBRE_EMPRESA: 'Empresa Uno', Responsable: ['Luis Baca'] },
      { NOMBRE_EMPRESA: 'Empresa Dos', Responsable: ['Manuel Soto'] },
    ]

    expect(filterApiCrmClientRowsByContacts_(clients, contacts, {
      name: 'Luis Baca', role: 'Ventas',
    })).toEqual([clients[0]])
    expect(filterApiCrmClientRowsByContacts_(clients, contacts, {
      name: 'Manuel Soto', role: 'Soporte',
    })).toEqual([clients[1]])
    expect(filterApiCrmClientRowsByContacts_(clients, contacts, {
      name: 'Gerente', role: 'Gerencia',
    })).toEqual(clients)
  })

  it('normaliza responsables historicos combinados al catalogo vigente', () => {
    const { mapApiRowsFromValues_ } = loadReadApiSandbox()
    const crmTable: ApiTable = {
      name: 'Gestion Clientes',
      sourceHeaders: ['Id_CRM', 'Responsable'],
      columns: [
        { name: '_uuid', sourceHeader: '_uuid', type: 'Text' },
        { name: '_deleted', sourceHeader: '_deleted', type: 'Bool' },
        { name: 'Id_CRM', sourceHeader: 'Id_CRM', type: 'Text' },
        {
          name: 'Responsable',
          sourceHeader: 'Responsable',
          type: 'EnumList',
          values: ['Luis Baca', 'Jesús Ortiz', 'Oscar Malagón', 'Rembrand Castaneda', 'Manuel Soto'],
        },
      ],
    }

    const rows = mapApiRowsFromValues_(crmTable, [
      ['Id_CRM', 'Responsable', '_uuid', '_deleted'],
      ['291', 'LUIS BACA/Manuel Soto', '11111111-1111-4111-8111-111111111111', false],
    ])

    expect(rows[0]?.Responsable).toEqual(['Luis Baca', 'Manuel Soto'])
  })

  it('conserva opciones EnumList que contienen comas internas', () => {
    const { mapApiRowsFromValues_ } = loadReadApiSandbox()
    const option = 'Revisión visual para detectar humedad, corrosión o componentes quemados.'
    const laboratoryTable: ApiTable = {
      name: 'Laboratorio',
      sourceHeaders: ['FOLIO', 'PRUEBAS REALIZADAS'],
      columns: [
        { name: '_uuid', sourceHeader: '_uuid', type: 'Text' },
        { name: '_deleted', sourceHeader: '_deleted', type: 'Bool' },
        { name: 'FOLIO', sourceHeader: 'FOLIO', type: 'Text' },
        {
          name: 'PRUEBAS REALIZADAS',
          sourceHeader: 'PRUEBAS REALIZADAS',
          type: 'EnumList',
          values: [option, 'Prueba de alimentación.'],
        },
      ],
    }
    const rows = mapApiRowsFromValues_(laboratoryTable, [
      ['FOLIO', 'PRUEBAS REALIZADAS', '_uuid', '_deleted'],
      ['LAB-1', `${option}, Prueba de alimentación.`, '11111111-1111-4111-8111-111111111111', false],
    ])

    expect(rows[0]?.['PRUEBAS REALIZADAS']).toEqual([option, 'Prueba de alimentación.'])
  })

  it('aplica la matriz de secciones a los cinco roles', () => {
    const { apiSectionsForRole_ } = loadReadApiSandbox()

    expect(apiSectionsForRole_('Administrador')).toEqual([
      'administracion-comercial', 'crm', 'ingenieria', 'tecnico', 'seguridad',
    ])
    expect(apiSectionsForRole_('Gerencia')).toEqual([
      'administracion-comercial', 'crm', 'ingenieria', 'tecnico',
    ])
    expect(apiSectionsForRole_('Soporte')).toEqual(['crm', 'ingenieria', 'tecnico'])
    expect(apiSectionsForRole_('Ventas')).toEqual(['crm'])
    expect(apiSectionsForRole_('Técnico')).toEqual(['tecnico'])
  })

  it('protege tablas por rol aunque la sesion declare permisos heredados', () => {
    const { canApiViewTable_ } = loadReadApiSandbox()
    const sales = { role: 'Ventas', permissions: ['*'] }
    const support = { role: 'Soporte', permissions: ['Usuarios'] }

    expect(canApiViewTable_(sales, { name: 'CLIENTES' })).toBe(true)
    expect(canApiViewTable_(sales, { name: 'ALMACEN' })).toBe(false)
    expect(canApiViewTable_(support, { name: 'Ticket Soporte' })).toBe(true)
    expect(canApiViewTable_(support, { name: 'MATRIZ DISPOSITIVOS' })).toBe(true)
    expect(canApiViewTable_(sales, { name: 'MATRIZ DISPOSITIVOS' })).toBe(true)
    expect(canApiViewTable_({ role: 'Tecnico' }, { name: 'MATRIZ DISPOSITIVOS' })).toBe(false)
    expect(canApiViewTable_(support, { name: 'Usuarios' })).toBe(false)
  })
})
