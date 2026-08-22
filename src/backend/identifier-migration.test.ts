import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

interface MigrationResult {
  readonly uuidValues: readonly unknown[]
  readonly updatedAtValues: readonly unknown[]
  readonly deletedValues: readonly unknown[]
  readonly rowsProcessed: number
  readonly uuidsAssigned: number
  readonly updatedAtInitialized: number
  readonly deletedInitialized: number
  readonly rowsChanged: number
}

interface MigrationSandbox {
  readonly buildIdentifierColumnUpdates_: (
    businessFlags: readonly boolean[],
    uuidValues: readonly unknown[],
    updatedAtValues: readonly unknown[],
    deletedValues: readonly unknown[],
    timestamp: string,
    uuidFactory: () => string,
  ) => MigrationResult
}

function loadMigrationSandbox(): MigrationSandbox {
  const sandbox = createContext({})
  runInContext(readFileSync('apps-script/50_DataMigrationAudit.gs', 'utf8'), sandbox)
  runInContext(readFileSync('apps-script/60_MigrateIdentifiers.gs', 'utf8'), sandbox)
  return sandbox as MigrationSandbox
}

const firstUuid = '11111111-1111-4111-8111-111111111111'
const secondUuid = '22222222-2222-4222-8222-222222222222'
const timestamp = '2026-08-22T19:00:00.000Z'

describe('migracion de identificadores tecnicos', () => {
  it('completa filas de negocio y conserva filas vacias y UUID existentes', () => {
    const { buildIdentifierColumnUpdates_ } = loadMigrationSandbox()
    let generated = 0
    const result = buildIdentifierColumnUpdates_(
      [true, false, true],
      ['', '', secondUuid],
      ['', '', '2026-01-01T00:00:00.000Z'],
      ['', '', true],
      timestamp,
      () => {
        generated += 1
        return firstUuid
      },
    )

    expect(generated).toBe(1)
    expect(result.uuidValues).toEqual([firstUuid, '', secondUuid])
    expect(result.updatedAtValues).toEqual([
      timestamp,
      '',
      '2026-01-01T00:00:00.000Z',
    ])
    expect(result.deletedValues).toEqual([false, '', true])
    expect(result).toMatchObject({
      rowsProcessed: 2,
      uuidsAssigned: 1,
      updatedAtInitialized: 1,
      deletedInitialized: 1,
      rowsChanged: 1,
    })
  })

  it('no cambia nada al ejecutarse nuevamente', () => {
    const { buildIdentifierColumnUpdates_ } = loadMigrationSandbox()
    const result = buildIdentifierColumnUpdates_(
      [true],
      [firstUuid],
      [timestamp],
      [false],
      timestamp,
      () => secondUuid,
    )

    expect(result).toMatchObject({
      rowsProcessed: 1,
      uuidsAssigned: 0,
      updatedAtInitialized: 0,
      deletedInitialized: 0,
      rowsChanged: 0,
    })
  })

  it('rechaza un UUID existente invalido antes de generar otro', () => {
    const { buildIdentifierColumnUpdates_ } = loadMigrationSandbox()

    expect(() => buildIdentifierColumnUpdates_(
      [true],
      ['uuid-invalido'],
      [''],
      [''],
      timestamp,
      () => firstUuid,
    )).toThrow('UUID invalido')
  })
})
