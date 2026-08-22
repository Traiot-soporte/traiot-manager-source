import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

interface RelationUpdate {
  readonly values: readonly unknown[]
  readonly rowsEvaluated: number
  readonly populated: number
  readonly alreadyPopulated: number
  readonly unresolved: number
  readonly blank: number
  readonly ambiguous: number
  readonly conflicts: number
  readonly invalidExisting: number
}

interface RelationSandbox {
  readonly buildRelationColumnUpdates_: (
    businessFlags: readonly boolean[],
    sourceValues: readonly unknown[],
    existingValues: readonly unknown[],
    targetLookup: Readonly<Record<string, readonly string[]>>,
  ) => RelationUpdate
}

function loadRelationSandbox(): RelationSandbox {
  const sandbox = createContext({})
  runInContext(readFileSync('apps-script/50_DataMigrationAudit.gs', 'utf8'), sandbox)
  runInContext(readFileSync('apps-script/70_MigrateRelations.gs', 'utf8'), sandbox)
  return sandbox as RelationSandbox
}

const firstUuid = '11111111-1111-4111-8111-111111111111'
const secondUuid = '22222222-2222-4222-8222-222222222222'

describe('migracion de relaciones exactas', () => {
  it('puebla coincidencias unicas y conserva pendientes y filas vacias', () => {
    const { buildRelationColumnUpdates_ } = loadRelationSandbox()
    const result = buildRelationColumnUpdates_(
      [true, true, true, false],
      [' Producto A ', 'No existe', '', 'Producto A'],
      ['', '', '', ''],
      { 'PRODUCTO A': [firstUuid] },
    )

    expect(result.values).toEqual([firstUuid, '', '', ''])
    expect(result).toMatchObject({
      rowsEvaluated: 3,
      populated: 1,
      alreadyPopulated: 0,
      unresolved: 1,
      blank: 1,
      ambiguous: 0,
      conflicts: 0,
      invalidExisting: 0,
    })
  })

  it('es idempotente y detecta un UUID previo incompatible', () => {
    const { buildRelationColumnUpdates_ } = loadRelationSandbox()
    const result = buildRelationColumnUpdates_(
      [true, true],
      ['Producto A', 'Producto A'],
      [firstUuid, secondUuid],
      { 'PRODUCTO A': [firstUuid] },
    )

    expect(result).toMatchObject({
      populated: 0,
      alreadyPopulated: 1,
      conflicts: 1,
    })
  })

  it('no elige entre coincidencias ambiguas ni acepta UUID invalidos', () => {
    const { buildRelationColumnUpdates_ } = loadRelationSandbox()
    const ambiguous = buildRelationColumnUpdates_(
      [true],
      ['Duplicado'],
      [''],
      { DUPLICADO: [firstUuid, secondUuid] },
    )
    const invalid = buildRelationColumnUpdates_(
      [true],
      ['Producto A'],
      ['uuid-invalido'],
      { 'PRODUCTO A': [firstUuid] },
    )

    expect(ambiguous).toMatchObject({ populated: 0, ambiguous: 1 })
    expect(invalid).toMatchObject({ populated: 0, invalidExisting: 1 })
  })
})
