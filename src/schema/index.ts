import { almacenTable } from '@/schema/tables/almacen'
import { clientesTable } from '@/schema/tables/clientes'
import { comprasTable } from '@/schema/tables/compras'
import { gestionClientesTable } from '@/schema/tables/gestion-clientes'
import { instalacionChecklistTable } from '@/schema/tables/instalacion-checklist'
import { instalacionFotosTable } from '@/schema/tables/instalacion-fotos'
import { instalacionTanquesTable } from '@/schema/tables/instalacion-tanques'
import { instalacionesTable } from '@/schema/tables/instalaciones'
import { laboratorioTable } from '@/schema/tables/laboratorio'
import { matrizDispositivosTable } from '@/schema/tables/matriz-dispositivos'
import { menuTable } from '@/schema/tables/menu'
import { pedidosTable } from '@/schema/tables/pedidos'
import { perfilesTable } from '@/schema/tables/perfiles'
import { proveedoresTable } from '@/schema/tables/proveedores'
import { ticketSoporteTable } from '@/schema/tables/ticket-soporte'
import { usuariosTable } from '@/schema/tables/usuarios'
import type { TableDef } from '@/schema/types'

export const tableDefinitions = [
  almacenTable,
  comprasTable,
  pedidosTable,
  proveedoresTable,
  clientesTable,
  gestionClientesTable,
  ticketSoporteTable,
  instalacionesTable,
  instalacionFotosTable,
  instalacionTanquesTable,
  instalacionChecklistTable,
  laboratorioTable,
  matrizDispositivosTable,
  usuariosTable,
  perfilesTable,
  menuTable,
] as const satisfies readonly TableDef[]

export type TableName = (typeof tableDefinitions)[number]['name']

export const tableDefinitionMap = new Map<string, TableDef>(
  tableDefinitions.map((table) => [table.name, table]),
)

export function getTableDefinition(name: string): TableDef | undefined {
  return tableDefinitionMap.get(name)
}

export function isTableName(name: string): name is TableName {
  return tableDefinitionMap.has(name)
}

export type {
  CellValue,
  ColumnDef,
  ColumnType,
  FormulaContext,
  RowData,
  TableDef,
  UserContext,
} from '@/schema/types'
