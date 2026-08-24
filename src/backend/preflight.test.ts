import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

import { tableDefinitions } from '@/schema'

interface GeneratedSchemaTable {
  readonly name: string
  readonly sheet: string
  readonly sourceHeaders: readonly string[]
  readonly targetHeaders: readonly string[]
  readonly newTable: boolean
}

interface SheetCandidate {
  readonly spreadsheetId: string
  readonly spreadsheetName: string
  readonly sheetId: number
  readonly sheetName: string
}

interface SheetData {
  readonly rowCount: number
  readonly headers: readonly string[]
}

interface PreflightReport {
  readonly status: string
  readonly missingSourceHeaders: readonly string[]
  readonly unrecognizedHeaders: readonly string[]
  readonly duplicateHeaders: readonly string[]
  readonly sourceOrderMatches: boolean
  readonly targetHeadersToAdd: readonly string[]
}

interface AppsScriptSandbox {
  readonly TRAIOT_SCHEMA_TABLES: readonly GeneratedSchemaTable[]
  readonly analyzeTablePreflight_: (
    table: GeneratedSchemaTable,
    candidate: SheetCandidate,
    sheet: SheetData,
  ) => PreflightReport
  buildDriveInventory_: () => unknown
  getRuntimeConfig_: () => { readonly schemaVersion: string }
  readonly buildMigrationPreflight_: () => {
    readonly writesPerformed: boolean
    readonly summary: {
      readonly originalTablesReady: number
      readonly newTablesPending: number
      readonly blockingTables: number
      readonly safeToPrepareMigration: boolean
    }
  }
}

function loadAppsScriptSandbox(): AppsScriptSandbox {
  const sandbox = {}
  const schemaSource = readFileSync('apps-script/05_Schema.gs', 'utf8')
  const preflightSource = readFileSync('apps-script/30_Preflight.gs', 'utf8')
  runInNewContext(`${schemaSource}\n${preflightSource}`, sandbox)
  return sandbox as AppsScriptSandbox
}

const candidate: SheetCandidate = {
  spreadsheetId: 'spreadsheet-id',
  spreadsheetName: 'TRAIOT MANAGER',
  sheetId: 1,
  sheetName: 'ALMACEN',
}

describe('preflight de Apps Script', () => {
  it('mantiene sincronizada la metadata generada con las 16 TableDef', () => {
    const { TRAIOT_SCHEMA_TABLES } = loadAppsScriptSandbox()

    expect(TRAIOT_SCHEMA_TABLES.map((table) => table.name)).toEqual(
      tableDefinitions.map((table) => table.name),
    )

    for (const generatedTable of TRAIOT_SCHEMA_TABLES) {
      const sourceTable = tableDefinitions.find((table) => table.name === generatedTable.name)
      const expectedSourceHeaders = sourceTable?.columns
        .filter((column) => !column.virtual && (column.origin ?? 'appsheet') === 'appsheet')
        .map((column) => column.sourceHeader ?? column.name)
      const expectedTargetHeaders = sourceTable?.columns
        .filter((column) => !column.virtual)
        .map((column) => column.sourceHeader ?? column.name)

      expect(generatedTable.sourceHeaders, generatedTable.name).toEqual(expectedSourceHeaders)
      expect(generatedTable.targetHeaders, generatedTable.name).toEqual(expectedTargetHeaders)
    }
  })

  it('acepta una hoja original intacta y calcula solo las columnas por agregar', () => {
    const { TRAIOT_SCHEMA_TABLES, analyzeTablePreflight_ } = loadAppsScriptSandbox()
    const table = TRAIOT_SCHEMA_TABLES.find((candidateTable) => candidateTable.name === 'ALMACEN')!
    const report = analyzeTablePreflight_(table, candidate, {
      rowCount: 38,
      headers: table.sourceHeaders,
    })

    expect(report.status).toBe('ready')
    expect(report.missingSourceHeaders).toEqual([])
    expect(report.unrecognizedHeaders).toEqual([])
    expect(report.targetHeadersToAdd).toEqual(
      table.targetHeaders.filter((header) => !table.sourceHeaders.includes(header)),
    )
  })

  it('considera listas las 13 hojas originales y pendientes las tablas nuevas', () => {
    const sandbox = loadAppsScriptSandbox()
    const sourceTables = sandbox.TRAIOT_SCHEMA_TABLES.filter((table) => !table.newTable)
    const sheets = sourceTables.map((table, index) => ({
      id: index + 1,
      name: table.sheet,
      rowCount: 1,
      columnCount: table.sourceHeaders.length,
      headers: table.sourceHeaders,
    }))

    sandbox.buildDriveInventory_ = () => ({
      totals: { spreadsheets: 1, sheets: sheets.length },
      spreadsheets: [
        {
          id: 'spreadsheet-id',
          name: 'TRAIOT MANAGER',
          sheets,
        },
      ],
      matches: sandbox.TRAIOT_SCHEMA_TABLES.map((table) => {
        const sheetIndex = sourceTables.findIndex((sourceTable) => sourceTable.name === table.name)
        return {
          table: table.name,
          status: table.newTable ? 'missing' : 'matched',
          candidates: table.newTable
            ? []
            : [
                {
                  spreadsheetId: 'spreadsheet-id',
                  spreadsheetName: 'TRAIOT MANAGER',
                  sheetId: sheetIndex + 1,
                  sheetName: table.sheet,
                },
              ],
        }
      }),
    })
    sandbox.getRuntimeConfig_ = () => ({ schemaVersion: '1.0.0' })

    const result = sandbox.buildMigrationPreflight_()

    expect(result.writesPerformed).toBe(false)
    expect(result.summary).toEqual({
      spreadsheets: 1,
      sheetsFound: 13,
      originalTablesExpected: 13,
      originalTablesReady: 13,
      newTablesPending: 4,
      blockingTables: 0,
      safeToPrepareMigration: true,
    })
  })

  it('bloquea encabezados faltantes, desconocidos, duplicados o desordenados', () => {
    const { TRAIOT_SCHEMA_TABLES, analyzeTablePreflight_ } = loadAppsScriptSandbox()
    const table = TRAIOT_SCHEMA_TABLES.find((candidateTable) => candidateTable.name === 'ALMACEN')!
    const headers = [...table.sourceHeaders]
    const removedHeader = headers.shift()!
    headers.reverse()
    headers.push('COLUMNA DESCONOCIDA', headers[0]!)

    const report = analyzeTablePreflight_(table, candidate, { rowCount: 38, headers })

    expect(report.status).toBe('header-mismatch')
    expect(report.missingSourceHeaders).toContain(removedHeader)
    expect(report.unrecognizedHeaders).toContain('COLUMNA DESCONOCIDA')
    expect(report.duplicateHeaders).toContain(headers[0])
    expect(report.sourceOrderMatches).toBe(false)
  })
})
