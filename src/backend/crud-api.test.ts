import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

interface CrudColumn {
  readonly name: string
  readonly sourceHeader: string
  readonly origin: string
  readonly type: string
  readonly required: boolean
  readonly hidden: boolean
  readonly readOnly: boolean
  readonly hasFormula: boolean
  readonly values: readonly string[]
  readonly syncTo?: string
}

interface CrudTable {
  readonly name: string
  readonly columns: readonly CrudColumn[]
}

interface CrudSandbox {
  readonly assertApiTableWriteAccess_: (
    user: { role: string; permissions: readonly string[] },
    table: { name: string; permissionView?: string },
  ) => void
  readonly coerceApiInput_: (value: unknown, column: CrudColumn) => unknown
  readonly validateApiRecord_: (table: CrudTable, record: Readonly<Record<string, unknown>>) => void
  readonly applyApiBusinessFormulas_: (
    spreadsheet: unknown,
    table: CrudTable,
    record: Record<string, unknown>,
    now: string,
  ) => void
  readonly calculateApiLaboratorySemaphore_: (status: unknown, days: number | null) => string
  readonly buildNextApiTicketFolio_: (folios: readonly string[], year: string) => string
  readonly buildApiMediaFileName_: (
    rowUuid: string,
    columnName: string,
    mutationId: string,
    extension: string,
  ) => string
  readonly isApiEditableColumn_: (column: CrudColumn) => boolean
  readonly applyCrmCalendarOwnership_: (
    user: Readonly<Record<string, unknown>>,
    table: CrudTable,
    record: Record<string, unknown>,
    isCreate: boolean,
  ) => void
  readonly assertCrmCalendarMutationAccess_: (
    user: Readonly<Record<string, unknown>>,
    table: CrudTable,
    record: Readonly<Record<string, unknown>>,
  ) => void
}

function loadCrudSandbox(): CrudSandbox {
  const sandbox = createContext({
    assertAuthAdministrator_: (user: { role: string; permissions: readonly string[] }) => {
      if (user.role !== 'ADMIN' && user.role !== 'ADMINISTRADOR') {
        throw new Error('Se requieren permisos de administrador.')
      }
    },
  })
  runInContext(readFileSync('apps-script/50_DataMigrationAudit.gs', 'utf8'), sandbox)
  runInContext(readFileSync('apps-script/80_ReadApi.gs', 'utf8'), sandbox)
  runInContext(readFileSync('apps-script/90_CrudApi.gs', 'utf8'), sandbox)
  runInContext(readFileSync('apps-script/95_MediaApi.gs', 'utf8'), sandbox)
  return sandbox as CrudSandbox
}

function column(overrides: Partial<CrudColumn> = {}): CrudColumn {
  return {
    name: 'ESTATUS',
    sourceHeader: 'ESTATUS',
    origin: 'appsheet',
    type: 'Enum',
    required: true,
    hidden: false,
    readOnly: false,
    hasFormula: false,
    values: ['Activo', 'Inactivo'],
    ...overrides,
  }
}

describe('CRUD de Apps Script', () => {
  it('reserva la administracion de usuarios y perfiles para administradores', () => {
    const { assertApiTableWriteAccess_ } = loadCrudSandbox()
    const support = { role: 'SOPORTE', permissions: ['Usuarios', 'Perfiles'] }
    const wildcardSupport = { role: 'SOPORTE', permissions: ['*'] }
    const admin = { role: 'ADMIN', permissions: ['*'] }

    expect(() => assertApiTableWriteAccess_(support, {
      name: 'Usuarios',
      permissionView: 'Usuarios',
    })).toThrow('administrador')
    expect(() => assertApiTableWriteAccess_(wildcardSupport, {
      name: 'Usuarios',
      permissionView: 'Usuarios',
    })).toThrow('administrador')
    expect(() => assertApiTableWriteAccess_(admin, {
      name: 'Usuarios',
      permissionView: 'Usuarios',
    })).not.toThrow()
  })

  it('normaliza numeros, booleanos y listas antes de escribir', () => {
    const { coerceApiInput_ } = loadCrudSandbox()

    expect(coerceApiInput_('12.5', column({ type: 'Price' }))).toBe(12.5)
    expect(coerceApiInput_('VERDADERO', column({ type: 'Bool' }))).toBe(true)
    expect(coerceApiInput_('Uno, Dos', column({ type: 'EnumList' }))).toEqual(['Uno', 'Dos'])
  })

  it('rechaza obligatorios vacios y opciones fuera del catalogo', () => {
    const { validateApiRecord_ } = loadCrudSandbox()
    const table = { name: 'CLIENTES', columns: [column()] }

    expect(() => validateApiRecord_(table, { ESTATUS: '' })).toThrow('es obligatorio')
    expect(() => validateApiRecord_(table, { ESTATUS: 'Desconocido' })).toThrow(
      'opcion no permitida',
    )
  })

  it('calcula el precio de almacen y corrige el semaforo de laboratorio', () => {
    const { applyApiBusinessFormulas_, calculateApiLaboratorySemaphore_ } = loadCrudSandbox()
    const record: Record<string, unknown> = { COSTO: 100 }

    applyApiBusinessFormulas_(null, { name: 'ALMACEN', columns: [] }, record, '')

    expect(record['PRECIO VENTA PARA ASESOR']).toBe(116)
    expect(calculateApiLaboratorySemaphore_('📦 ENTREGADO', 20)).toBe('🔵 CERRADO')
  })

  it('genera el siguiente folio anual sin reutilizar consecutivos', () => {
    const { buildNextApiTicketFolio_ } = loadCrudSandbox()

    expect(buildNextApiTicketFolio_(['TS-2026-0001', 'TS-2025-0099', 'TS-2026-0012'], '2026'))
      .toBe('TS-2026-0013')
  })

  it('permite campos visibles de tablas normalizadas y protege campos ocultos', () => {
    const { isApiEditableColumn_ } = loadCrudSandbox()

    expect(isApiEditableColumn_(column({ origin: 'migration', name: 'nota' }))).toBe(true)
    expect(
      isApiEditableColumn_(column({ origin: 'migration', name: 'instalacion_uuid', hidden: true })),
    ).toBe(false)
  })

  it('genera nombres de archivo deterministas para evitar duplicados al reintentar', () => {
    const { buildApiMediaFileName_ } = loadCrudSandbox()

    expect(buildApiMediaFileName_(
      '11111111-1111-4111-8111-111111111111',
      'IMAGEN CHECK 1',
      '22222222-2222-4222-8222-222222222222',
      'jpg',
    )).toBe(
      '11111111-1111-4111-8111-111111111111.imagen-check-1.' +
      '22222222-2222-4222-8222-222222222222.jpg',
    )
  })

  it('asigna y protege el propietario de calendarios personales del CRM', () => {
    const { applyCrmCalendarOwnership_, assertCrmCalendarMutationAccess_ } = loadCrudSandbox()
    const table = { name: 'Gestion Clientes', columns: [] }
    const owner = { userUuid: '11111111-1111-4111-8111-111111111111' }
    const anotherUser = { userUuid: '22222222-2222-4222-8222-222222222222' }
    const personal: Record<string, unknown> = { Calendario: 'Personal' }

    applyCrmCalendarOwnership_(owner, table, personal, true)
    expect(personal).toEqual({
      Calendario: 'Personal',
      _calendarOwnerUuid: owner.userUuid,
    })
    expect(() => assertCrmCalendarMutationAccess_(owner, table, personal)).not.toThrow()
    expect(() => assertCrmCalendarMutationAccess_(anotherUser, table, personal)).toThrow(
      'otro usuario',
    )

    const company: Record<string, unknown> = { Calendario: 'Empresarial' }
    applyCrmCalendarOwnership_(owner, table, company, true)
    expect(company._calendarOwnerUuid).toBe('')
  })
})
