import { writeFile } from 'node:fs/promises'

import { tableDefinitions } from '@/schema'

const schema = tableDefinitions.map((table) => {
  const persistedColumns = table.columns.filter((column) => !column.virtual)
  const sourceHeaders = persistedColumns
    .filter((column) => (column.origin ?? 'appsheet') === 'appsheet')
    .map((column) => column.sourceHeader ?? column.name)

  return {
    name: table.name,
    sheet: table.sheet,
    legacyBusinessKey: table.legacyBusinessKey ?? '',
    labelColumn: table.label,
    sourceHeaders,
    targetHeaders: persistedColumns.map((column) => column.sourceHeader ?? column.name),
    columns: persistedColumns.map((column) => ({
      name: column.name,
      sourceHeader: column.sourceHeader ?? column.name,
      origin: column.origin ?? 'appsheet',
      type: column.type,
      required: Boolean(column.required),
      syncTo: column.syncTo ?? '',
      refTable: column.ref?.table ?? '',
    })),
    newTable: sourceHeaders.length === 0,
  }
})

const output = `/**
 * ARCHIVO GENERADO. No editar manualmente.
 * Fuente: src/schema mediante npm run gas:generate-schema.
 */
var TRAIOT_SCHEMA_TABLES = Object.freeze(${JSON.stringify(schema, null, 2)});
`

await writeFile(new URL('../apps-script/05_Schema.gs', import.meta.url), output, 'utf8')
