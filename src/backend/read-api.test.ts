import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

interface ApiColumn {
  readonly name: string
  readonly sourceHeader: string
  readonly type: string
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
}

function loadReadApiSandbox(): ReadApiSandbox {
  const sandbox = createContext({})
  runInContext(readFileSync('apps-script/50_DataMigrationAudit.gs', 'utf8'), sandbox)
  runInContext(readFileSync('apps-script/80_ReadApi.gs', 'utf8'), sandbox)
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
})
