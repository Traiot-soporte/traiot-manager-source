import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

interface SchemaColumn {
  readonly name: string
  readonly sourceHeader: string
  readonly origin: string
  readonly required: boolean
  readonly syncTo: string
  readonly refTable: string
}

interface SchemaTable {
  readonly name: string
  readonly legacyBusinessKey: string
  readonly labelColumn: string
  readonly columns: readonly SchemaColumn[]
}

interface Dataset {
  readonly schema: SchemaTable
  readonly headers: readonly string[]
  readonly rows: readonly (readonly string[])[]
}

interface AuditSandbox {
  readonly auditTableRows_: (dataset: Dataset) => {
    readonly rowCount: number
    readonly uuidsToAssign: number
    readonly invalidUuids: number
    readonly duplicateUuids: number
    readonly blankBusinessKeys: number
    readonly duplicateBusinessKeys: number
    readonly requiredValuesMissing: number
  }
  readonly auditRelations_: (datasets: readonly Dataset[]) => readonly {
    readonly blank: number
    readonly resolved: number
    readonly unresolved: number
    readonly ambiguous: number
  }[]
}

function loadAuditSandbox(): AuditSandbox {
  const sandbox = {}
  runInNewContext(readFileSync('apps-script/50_DataMigrationAudit.gs', 'utf8'), sandbox)
  return sandbox as AuditSandbox
}

const baseColumns: readonly SchemaColumn[] = [
  {
    name: '_uuid',
    sourceHeader: '_uuid',
    origin: 'system',
    required: true,
    syncTo: '',
    refTable: '',
  },
  {
    name: 'ID',
    sourceHeader: 'ID',
    origin: 'appsheet',
    required: true,
    syncTo: '',
    refTable: '',
  },
  {
    name: 'NOMBRE',
    sourceHeader: 'NOMBRE',
    origin: 'appsheet',
    required: true,
    syncTo: '',
    refTable: '',
  },
]

describe('auditoría de migración de datos', () => {
  it('cuenta UUID pendientes, claves duplicadas y requeridos vacíos', () => {
    const { auditTableRows_ } = loadAuditSandbox()
    const report = auditTableRows_({
      schema: {
        name: 'CATALOGO',
        legacyBusinessKey: 'ID',
        labelColumn: 'NOMBRE',
        columns: baseColumns,
      },
      headers: ['ID', 'NOMBRE', '_uuid'],
      rows: [
        ['A', 'Uno', ''],
        ['A', '', ''],
        ['', 'Tres', 'uuid-invalido'],
      ],
    })

    expect(report).toMatchObject({
      rowCount: 3,
      uuidsToAssign: 2,
      invalidUuids: 1,
      duplicateUuids: 0,
      blankBusinessKeys: 1,
      duplicateBusinessKeys: 1,
      requiredValuesMissing: 2,
    })
  })

  it('distingue referencias resueltas, no resueltas, ambiguas y vacías', () => {
    const { auditRelations_ } = loadAuditSandbox()
    const target: Dataset = {
      schema: {
        name: 'DESTINO',
        legacyBusinessKey: 'ID',
        labelColumn: 'NOMBRE',
        columns: baseColumns,
      },
      headers: ['ID', 'NOMBRE', '_uuid'],
      rows: [
        ['A', 'Duplicado', ''],
        ['B', 'Duplicado', ''],
        ['C', 'Unico', ''],
      ],
    }
    const source: Dataset = {
      schema: {
        name: 'ORIGEN',
        legacyBusinessKey: 'ID',
        labelColumn: 'ID',
        columns: [
          ...baseColumns,
          {
            name: 'REFERENCIA',
            sourceHeader: 'REFERENCIA',
            origin: 'appsheet',
            required: false,
            syncTo: 'destino_uuid',
            refTable: 'DESTINO',
          },
        ],
      },
      headers: ['ID', 'NOMBRE', 'REFERENCIA', '_uuid'],
      rows: [
        ['1', 'Uno', 'C', ''],
        ['2', 'Dos', 'No existe', ''],
        ['3', 'Tres', 'Duplicado', ''],
        ['4', 'Cuatro', '', ''],
      ],
    }

    expect(auditRelations_([source, target])[0]).toMatchObject({
      blank: 1,
      resolved: 1,
      unresolved: 1,
      ambiguous: 1,
    })
  })
})
