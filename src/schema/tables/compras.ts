import { purchaseStatuses } from '@/schema/catalogs'
import { asNumber, refValue, roundCurrency } from '@/schema/formulas'
import { defineTable, migrationRef } from '@/schema/helpers'

export const comprasTable = defineTable({
  name: 'COMPRAS',
  sheet: 'COMPRAS',
  label: 'ID COMPRA',
  legacyBusinessKey: 'ID COMPRA',
  permissionView: 'Compras',
  module: 'Inventario',
  icon: 'Truck',
  description: 'Entradas y recepción de inventario.',
  defaultView: 'table',
  columns: [
    migrationRef('producto_uuid', 'Producto interno', 'ALMACEN'),
    { name: 'FECHA COMPRA', type: 'Date', required: true },
    { name: 'ID COMPRA', type: 'Text', labelColumn: true, required: true },
    {
      name: 'ID PRODUCTO',
      type: 'Ref',
      required: true,
      ref: { table: 'ALMACEN', keyColumn: '_uuid' },
    },
    {
      name: 'NOMBRE',
      type: 'Text',
      readOnly: true,
      formula: (row, context) => refValue(row, 'producto_uuid', 'ALMACEN', 'NOMBRE', context),
    },
    {
      name: 'PROVEEDOR',
      type: 'Text',
      readOnly: true,
      formula: (row, context) => refValue(row, 'producto_uuid', 'ALMACEN', 'PROVEEDOR', context),
    },
    {
      name: 'COSTO',
      type: 'Price',
      readOnly: true,
      formula: (row, context) => refValue(row, 'producto_uuid', 'ALMACEN', 'COSTO', context),
    },
    {
      name: 'KIT INSTALACION',
      type: 'Price',
      readOnly: true,
      formula: (row, context) =>
        refValue(row, 'producto_uuid', 'ALMACEN', 'KIT INSTALACION', context),
    },
    { name: 'CANTIDAD', type: 'Number' },
    {
      name: 'SUBTOTAL',
      type: 'Price',
      readOnly: true,
      formula: (row) =>
        roundCurrency(
          asNumber(row['COSTO']) * asNumber(row['CANTIDAD']) +
            asNumber(row['KIT INSTALACION']),
        ),
    },
    { name: 'COSTO DE ENVIO', type: 'Price' },
    {
      name: 'PRECIO DE COMPRA',
      type: 'Price',
      readOnly: true,
      formula: (row) =>
        roundCurrency(asNumber(row['SUBTOTAL']) + asNumber(row['COSTO DE ENVIO'])),
    },
    { name: 'ESTATUS COMPRA', type: 'Enum', values: purchaseStatuses },
    { name: 'COMENTARIOS', type: 'Text' },
    { name: 'VALIDADOR COMPRA', type: 'Number' },
    {
      name: 'Related ALMACENs',
      type: 'List',
      virtual: true,
      hidden: true,
      readOnly: true,
      ref: { table: 'ALMACEN', keyColumn: 'COMPRAS' },
    },
  ],
})
