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
    sourceHeaders,
    targetHeaders: persistedColumns.map((column) => column.sourceHeader ?? column.name),
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
