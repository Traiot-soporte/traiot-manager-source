import { productCategories } from '@/schema/catalogs'
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
  defaultView: 'dashboard',
  columns: [
    migrationRef('producto_uuid', 'Producto interno', 'ALMACEN'),
    { name: 'FECHA COMPRA', type: 'Date', required: true },
    {
      name: 'ID COMPRA',
      type: 'Text',
      labelColumn: true,
      required: true,
      readOnly: true,
      description: 'Consecutivo asignado automáticamente por el servidor.',
    },
    {
      name: 'ID PRODUCTO',
      type: 'Ref',
      required: true,
      ref: { table: 'ALMACEN', keyColumn: '_uuid' },
      syncTo: 'producto_uuid',
    },
    {
      name: 'NOMBRE',
      type: 'Text',
      readOnly: true,
      formula: (row, context) => refValue(row, 'producto_uuid', 'ALMACEN', 'NOMBRE', context),
    },
    {
      name: 'CATEGORIA',
      type: 'Enum',
      values: productCategories,
      allowOther: true,
      required: true,
      description: 'Categoria tomada del producto seleccionado.',
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
      hidden: true,
      readOnly: true,
      exportable: false,
      formula: (row, context) => refValue(row, 'producto_uuid', 'ALMACEN', 'COSTO', context),
    },
    {
      name: 'KIT INSTALACION',
      type: 'Price',
      hidden: true,
      readOnly: true,
      exportable: false,
      formula: (row, context) =>
        refValue(row, 'producto_uuid', 'ALMACEN', 'KIT INSTALACION', context),
    },
    { name: 'CANTIDAD', type: 'Number', required: true, compact: true },
    {
      name: 'SUBTOTAL',
      type: 'Price',
      hidden: true,
      readOnly: true,
      exportable: false,
      formula: (row) =>
        roundCurrency(
          asNumber(row['COSTO']) * asNumber(row['CANTIDAD']) +
            asNumber(row['KIT INSTALACION']),
        ),
    },
    { name: 'COSTO DE ENVIO', type: 'Price', hidden: true, exportable: false },
    {
      name: 'PRECIO DE COMPRA',
      type: 'Price',
      hidden: true,
      readOnly: true,
      exportable: false,
      formula: (row) => roundCurrency(asNumber(row['SUBTOTAL'])),
    },
    {
      name: 'ESTATUS COMPRA',
      type: 'Text',
      hidden: true,
      readOnly: true,
      exportable: false,
    },
    { name: 'COMENTARIOS', type: 'Text' },
    {
      name: 'VALIDADOR COMPRA',
      type: 'Number',
      hidden: true,
      readOnly: true,
      exportable: false,
    },
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
