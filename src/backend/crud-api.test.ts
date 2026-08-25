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
  readonly readOnly?: boolean
}

interface CrudSandbox {
  readonly assertApiTableWriteAccess_: (
    user: { role: string; permissions: readonly string[] },
    table: { name: string; permissionView?: string; readOnly?: boolean },
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
  readonly buildNextApiWarehouseItem_: (values: readonly unknown[]) => number
  readonly buildNextApiCrmId_: (ids: readonly unknown[]) => string
  readonly buildNextApiPurchaseId_: (
    ids: readonly unknown[],
    reservedSequence: number,
  ) => string
  readonly formatApiPurchaseId_: (sequence: number) => string
  readonly buildNextApiOrderId_: (
    ids: readonly unknown[],
    year: string,
    reservedSequence: number,
  ) => string
  readonly formatApiOrderId_: (year: string, sequence: number) => string
  readonly canonicalApiProductCategory_: (value: unknown) => string
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
  readonly applyApiRoleRules_: (
    table: Readonly<Record<string, unknown>>,
    record: Record<string, unknown>,
  ) => void
  readonly inferCrmLifecycleFromHistory_: (
    rows: readonly Readonly<Record<string, unknown>>[],
  ) => { readonly stage: string; readonly convertedAt: string; readonly convertedBy: string }
  readonly applyCrmActivityLifecycle_: (
    record: Record<string, unknown>,
    clientStage: string,
    isCreate: boolean,
  ) => boolean
  readonly inventoryContributionForRecord_: (
    tableName: string,
    record: Readonly<Record<string, unknown>>,
  ) => { readonly productUuid: string; readonly quantity: number } | null
  readonly buildInventoryDeltas_: (
    tableName: string,
    beforeRecord: Readonly<Record<string, unknown>> | null,
    afterRecord: Readonly<Record<string, unknown>> | null,
  ) => readonly {
    readonly productUuid: string
    readonly delta: number
    readonly operationDelta: number
    readonly type: string
  }[]
  readonly calculateInventoryPurchaseNotice_: (
    stock: unknown,
    minimum: unknown,
    maximum: unknown,
  ) => string
  readonly calculateInventoryStatus_: (
    stock: unknown,
    minimum: unknown,
    maximum: unknown,
  ) => string
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
  runInContext(readFileSync('apps-script/87_RolePermissions.gs', 'utf8'), sandbox)
  runInContext(readFileSync('apps-script/88_InventoryLedger.gs', 'utf8'), sandbox)
  runInContext(readFileSync('apps-script/89_CrmLifecycle.gs', 'utf8'), sandbox)
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
    expect(() => assertApiTableWriteAccess_(admin, {
      name: 'KARDEX',
      permissionView: 'Kardex',
      readOnly: true,
    })).toThrow('solo lectura')
  })

  it('calcula entradas, salidas, reversiones y alertas de inventario', () => {
    const {
      buildInventoryDeltas_,
      calculateInventoryPurchaseNotice_,
      calculateInventoryStatus_,
      inventoryContributionForRecord_,
    } = loadCrudSandbox()
    const received = {
      producto_uuid: 'product-1',
      CANTIDAD: 5,
      'ESTATUS COMPRA': 'RECIBIDA',
      'ID COMPRA': 'C-1',
    }
    const approved = {
      producto_uuid: 'product-1',
      'EQUIPOS A VENDER': 2,
      'ESTATUS PEDIDO': 'APROBADO',
      'ID PEDIDO': 'P-1',
    }

    expect(inventoryContributionForRecord_('COMPRAS', received)?.quantity).toBe(5)
    expect(inventoryContributionForRecord_('PEDIDOS', approved)?.quantity).toBe(-2)
    expect(buildInventoryDeltas_('COMPRAS', null, received)).toMatchObject([
      { productUuid: 'product-1', delta: 5, operationDelta: 1, type: 'ENTRADA' },
    ])
    expect(buildInventoryDeltas_('COMPRAS', received, {
      ...received,
      _deleted: true,
    })).toMatchObject([{ delta: -5, operationDelta: -1, type: 'REVERSO' }])
    expect(buildInventoryDeltas_('COMPRAS', received, {
      ...received,
      CANTIDAD: 20,
    })).toMatchObject([{ delta: 15, operationDelta: 0, type: 'AJUSTE' }])
    expect(calculateInventoryPurchaseNotice_(2, 3, 10)).toBe('REABASTECER')
    expect(calculateInventoryPurchaseNotice_(11, 3, 10)).toBe('SOBRESTOCK')
    expect(calculateInventoryPurchaseNotice_(6, 3, 10)).toBe('NIVEL ADECUADO')
    expect(calculateInventoryStatus_(0, 3, 10)).toBe('STOCK AGOTADO')
    expect(calculateInventoryStatus_(3, 3, 10)).toBe('STOCK BAJO')
    expect(calculateInventoryStatus_(10, 3, 10)).toBe('STOCK SUFICIENTE')
    expect(calculateInventoryStatus_(11, 3, 10)).toBe('SOBRESTOCK')
  })

  it('normaliza numeros, booleanos y listas antes de escribir', () => {
    const { coerceApiInput_ } = loadCrudSandbox()

    expect(coerceApiInput_('12.5', column({ type: 'Price' }))).toBe(12.5)
    expect(coerceApiInput_('VERDADERO', column({ type: 'Bool' }))).toBe(true)
    expect(coerceApiInput_('Uno, Dos', column({ type: 'EnumList' }))).toEqual(['Uno', 'Dos'])
  })

  it('normaliza las categorías autoritativas de producto', () => {
    const { canonicalApiProductCategory_ } = loadCrudSandbox()

    expect(canonicalApiProductCategory_('Gps')).toBe('GPS')
    expect(canonicalApiProductCategory_('Sensor')).toBe('SENSOR')
    expect(canonicalApiProductCategory_('Accesorio')).toBe('ACCESORIO')
    expect(canonicalApiProductCategory_('sin clasificar')).toBe('')
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

  it('genera el siguiente numero de producto sin reutilizar eliminados', () => {
    const { buildNextApiWarehouseItem_ } = loadCrudSandbox()

    expect(buildNextApiWarehouseItem_([1, '38', '', 'invalido', '37.8'])).toBe(39)
    expect(buildNextApiWarehouseItem_([])).toBe(1)
  })

  it('genera un consecutivo global entero para nuevos registros del CRM', () => {
    const { buildNextApiCrmId_ } = loadCrudSandbox()

    expect(buildNextApiCrmId_([275, '278.6666667', '291.2380952', '', 'invalido']))
      .toBe('292')
    expect(buildNextApiCrmId_([])).toBe('1')
  })

  it('genera compras consecutivas sin reutilizar números reservados o eliminados', () => {
    const { buildNextApiPurchaseId_ } = loadCrudSandbox()

    expect(buildNextApiPurchaseId_(['TRT-001', 'TRT-002', 'TRT-038'], 0)).toBe('TRT-039')
    expect(buildNextApiPurchaseId_(['40', 'TRT-041'], 0)).toBe('TRT-042')
    expect(buildNextApiPurchaseId_(['COMPRA-004', 'COMPRA-010'], 42)).toBe('TRT-043')
  })

  it('mantiene la nomenclatura TRT con tres dígitos', () => {
    const { formatApiPurchaseId_ } = loadCrudSandbox()

    expect(formatApiPurchaseId_(1)).toBe('TRT-001')
    expect(formatApiPurchaseId_(40)).toBe('TRT-040')
    expect(formatApiPurchaseId_(1000)).toBe('TRT-1000')
  })

  it('genera salidas consecutivas anuales sin reutilizar folios reservados o eliminados', () => {
    const { buildNextApiOrderId_ } = loadCrudSandbox()

    expect(buildNextApiOrderId_(['PED-2026-0001', 'PED-2026-0084'], '2026', 0))
      .toBe('PED-2026-0085')
    expect(buildNextApiOrderId_(['8', 'PED-2026-0009', 'PED-2025-0999'], '2026', 10))
      .toBe('PED-2026-0011')
  })

  it('mantiene la nomenclatura anual de salidas con cuatro dígitos', () => {
    const { formatApiOrderId_ } = loadCrudSandbox()

    expect(formatApiOrderId_('2026', 1)).toBe('PED-2026-0001')
    expect(formatApiOrderId_('2026', 84)).toBe('PED-2026-0084')
    expect(formatApiOrderId_('2026', 10000)).toBe('PED-2026-10000')
  })

  it('deduce una sola etapa comercial a partir del historial del CRM', () => {
    const { inferCrmLifecycleFromHistory_ } = loadCrudSandbox()

    expect(inferCrmLifecycleFromHistory_([]).stage).toBe('Cliente')
    expect(inferCrmLifecycleFromHistory_([{
      Id_CRM: '10',
      Fecha_contacto: '2026-08-20',
      Tipo_cliente: '🔵Prospecto',
      Estatus_prospeccion: '🤝En negociación',
    }]).stage).toBe('Prospecto')
    expect(inferCrmLifecycleFromHistory_([{
      Id_CRM: '11',
      Fecha_contacto: '2026-08-22',
      Tipo_cliente: '🔵Prospecto',
      Estatus_prospeccion: '✅Cliente',
      Responsable: ['Manuel Soto'],
    }])).toEqual({
      stage: 'Cliente',
      convertedAt: '2026-08-22',
      convertedBy: 'Manuel Soto',
    })
  })

  it('convierte el seguimiento y normaliza actividades nuevas según la etapa maestra', () => {
    const { applyCrmActivityLifecycle_ } = loadCrudSandbox()
    const conversion: Record<string, unknown> = {
      Tipo_cliente: '🔵Prospecto',
      Estatus_prospeccion: '✅Cliente',
    }

    expect(applyCrmActivityLifecycle_(conversion, 'Prospecto', true)).toBe(true)
    expect(conversion).toMatchObject({
      Tipo_cliente: '🟢Activo',
      Estatus_cliente: '🟢Activo',
    })

    const activeActivity: Record<string, unknown> = { Tipo_cliente: '🔵Prospecto' }
    expect(applyCrmActivityLifecycle_(activeActivity, 'Cliente', true)).toBe(false)
    expect(activeActivity).toMatchObject({
      Tipo_cliente: '🟢Activo',
      Estatus_cliente: '🟢Activo',
    })
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

  it('normaliza roles y calcula las secciones de perfiles sin aceptar otros valores', () => {
    const { applyApiRoleRules_ } = loadCrudSandbox()
    const user: Record<string, unknown> = { UserRole: 'Técnico' }
    const profile: Record<string, unknown> = { PerfilID: 'Ventas' }

    applyApiRoleRules_({ name: 'Usuarios' }, user)
    applyApiRoleRules_({ name: 'Perfiles' }, profile)

    expect(user.UserRole).toBe('Tecnico')
    expect(profile).toEqual({ PerfilID: 'Ventas', VistasPermitidas: ['CRM'] })
    expect(() => applyApiRoleRules_(
      { name: 'Usuarios' },
      { UserRole: 'Invitado' },
    )).toThrow('UserRole')
  })
})
