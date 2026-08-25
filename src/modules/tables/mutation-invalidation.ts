const inventoryMovementTables = new Set(['COMPRAS', 'PEDIDOS'])

export function getMutationAffectedTables(tableName: string): readonly string[] {
  if (!inventoryMovementTables.has(tableName)) return [tableName]
  return [tableName, 'ALMACEN', 'KARDEX']
}
