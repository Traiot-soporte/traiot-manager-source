import {
  orderCustomerTypes,
  orderStatuses,
  orderTypes,
  productCategories,
} from '@/schema/catalogs'
import { asNumber, refValue, roundCurrency } from '@/schema/formulas'
import { defineTable, migrationRef } from '@/schema/helpers'

export const pedidosTable = defineTable({
  name: 'PEDIDOS',
  displayName: 'Salidas',
  sheet: 'PEDIDOS',
  label: 'ID PEDIDO',
  legacyBusinessKey: 'ID PEDIDO',
  permissionView: 'Salidas',
  module: 'Ventas',
  icon: 'ShoppingCart',
  description: 'Pedidos, ventas y salidas de inventario.',
  defaultView: 'dashboard',
  columns: [
    migrationRef('producto_uuid', 'Producto interno', 'ALMACEN'),
    migrationRef('cliente_uuid', 'Cliente interno', 'CLIENTES'),
    { name: 'FECHA', type: 'Date', required: true },
    { name: 'TIPO DE PEDIDO', type: 'Enum', values: orderTypes },
    {
      name: 'ID PEDIDO',
      type: 'Text',
      labelColumn: true,
      required: true,
      readOnly: true,
      description: 'Consecutivo PED-AÑO-0000 asignado automáticamente por el servidor.',
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
      readOnly: true,
      formula: (row, context) => refValue(row, 'producto_uuid', 'ALMACEN', 'CATEGORIA', context),
      description: 'Se hereda automáticamente de Almacén.',
    },
    {
      name: 'PRECIO VENTA PARA ASESOR',
      type: 'Price',
      readOnly: true,
      formula: (row, context) =>
        refValue(row, 'producto_uuid', 'ALMACEN', 'PRECIO VENTA PARA ASESOR', context),
    },
    { name: 'EQUIPOS A VENDER', label: 'CANTIDAD', type: 'Number', required: true, compact: true },
    { name: 'COSTO INSTALACION', type: 'Price' },
    { name: 'ENVIO', type: 'Price' },
    {
      name: 'SUBTOTAL',
      type: 'Price',
      readOnly: true,
      formula: (row) =>
        roundCurrency(
          asNumber(row['PRECIO VENTA PARA ASESOR']) * asNumber(row['EQUIPOS A VENDER']) +
            asNumber(row['COSTO INSTALACION']) +
            asNumber(row['ENVIO']),
        ),
    },
    {
      name: 'IVA',
      type: 'Price',
      readOnly: true,
      formula: (row) => roundCurrency(asNumber(row['SUBTOTAL']) * 0.16),
    },
    {
      name: 'TOTAL',
      type: 'Price',
      readOnly: true,
      description: 'Corregido: ENVIO ya forma parte del subtotal.',
      formula: (row) => roundCurrency(asNumber(row['SUBTOTAL']) + asNumber(row['IVA'])),
    },
    { name: 'TIPO CLIENTE', type: 'Enum', values: orderCustomerTypes },
    {
      name: 'RAZON SOCIAL',
      type: 'Ref',
      ref: { table: 'CLIENTES', keyColumn: '_uuid' },
      syncTo: 'cliente_uuid',
    },
    {
      name: 'ID CLIENTE',
      type: 'Text',
      readOnly: true,
      formula: (row, context) => refValue(row, 'cliente_uuid', 'CLIENTES', 'ID CLIENTE', context),
    },
    {
      name: 'DIRECCION',
      type: 'Text',
      description: 'Snapshot histórico del pedido.',
    },
    { name: 'TELEFONO', type: 'Number', description: 'Snapshot histórico del pedido.' },
    { name: 'EMAIL', type: 'Email', description: 'Snapshot histórico del pedido.' },
    { name: 'UBICACION', type: 'Url', description: 'Snapshot histórico del pedido.' },
    { name: 'CONTACTO', type: 'Text', description: 'Snapshot histórico del pedido.' },
    { name: 'TELEFONO CONTACTO', type: 'Text', description: 'Snapshot histórico del pedido.' },
    {
      name: 'ESTATUS PEDIDO',
      type: 'Enum',
      values: orderStatuses,
      hidden: true,
      readOnly: true,
      exportable: false,
    },
    { name: 'COMENTARIOS', type: 'Text' },
    {
      name: 'VALIDADOR VENTA',
      type: 'Number',
      hidden: true,
      readOnly: true,
      exportable: false,
    },
    {
      name: 'Related ALMACENs',
      type: 'List',
      virtual: true,
      readOnly: true,
      ref: { table: 'ALMACEN', keyColumn: 'PEDIDOS' },
    },
  ],
})
