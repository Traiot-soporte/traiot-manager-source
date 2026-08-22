import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

interface PlanTableReport {
  readonly table: string
  readonly sheet: string
  readonly sheetName?: string
  readonly status: string
  readonly targetHeadersToAdd: readonly string[]
}

interface StructurePlan {
  readonly writesPerformed: boolean
  readonly operations: readonly {
    readonly type: string
    readonly table: string
    readonly sheetName: string
    readonly headers: readonly string[]
  }[]
  readonly summary: {
    readonly createSheets: number
    readonly updateSheets: number
    readonly addHeaders: number
  }
}

interface PreparationSandbox {
  readonly buildStructurePlan_: (preflight: {
    readonly summary: { readonly safeToPrepareMigration: boolean }
    readonly tables: readonly PlanTableReport[]
  }) => StructurePlan
}

function loadPreparationSandbox(): PreparationSandbox {
  const sandbox = {}
  runInNewContext(readFileSync('apps-script/40_PrepareMigration.gs', 'utf8'), sandbox)
  return sandbox as PreparationSandbox
}

describe('plan de preparación de migración', () => {
  it('crea hojas nuevas y agrega solo encabezados faltantes', () => {
    const { buildStructurePlan_ } = loadPreparationSandbox()
    const plan = buildStructurePlan_({
      summary: { safeToPrepareMigration: true },
      tables: [
        {
          table: 'ALMACEN',
          sheet: 'ALMACEN',
          sheetName: 'ALMACEN',
          status: 'ready',
          targetHeadersToAdd: ['_uuid', '_updatedAt', '_deleted'],
        },
        {
          table: 'instalacion_fotos',
          sheet: 'instalacion_fotos',
          status: 'pending-create',
          targetHeadersToAdd: ['_uuid', '_updatedAt', '_deleted', 'instalacion_uuid'],
        },
      ],
    })

    expect(plan.writesPerformed).toBe(false)
    expect(plan.summary).toEqual({ createSheets: 1, updateSheets: 1, addHeaders: 7 })
    expect(plan.operations).toEqual([
      {
        type: 'append-headers',
        table: 'ALMACEN',
        sheetName: 'ALMACEN',
        headers: ['_uuid', '_updatedAt', '_deleted'],
      },
      {
        type: 'create-sheet',
        table: 'instalacion_fotos',
        sheetName: 'instalacion_fotos',
        headers: ['_uuid', '_updatedAt', '_deleted', 'instalacion_uuid'],
      },
    ])
  })

  it('no produce operaciones cuando la estructura ya está preparada', () => {
    const { buildStructurePlan_ } = loadPreparationSandbox()
    const plan = buildStructurePlan_({
      summary: { safeToPrepareMigration: true },
      tables: [
        {
          table: 'ALMACEN',
          sheet: 'ALMACEN',
          sheetName: 'ALMACEN',
          status: 'ready',
          targetHeadersToAdd: [],
        },
      ],
    })

    expect(plan.operations).toEqual([])
    expect(plan.summary.addHeaders).toBe(0)
  })

  it('rechaza cualquier plan cuando el preflight tiene bloqueos', () => {
    const { buildStructurePlan_ } = loadPreparationSandbox()

    expect(() =>
      buildStructurePlan_({
        summary: { safeToPrepareMigration: false },
        tables: [],
      }),
    ).toThrow('El preflight contiene bloqueos')
  })
})
