import {
  activeCustomerStatuses,
  crmActions,
  crmCustomerTypes,
  prospectStatuses,
} from '@/schema/catalogs'
import { refValue } from '@/schema/formulas'
import { defineTable, migrationRef } from '@/schema/helpers'

export const gestionClientesTable = defineTable({
  name: 'Gestion Clientes',
  displayName: 'CRM',
  sheet: 'Gestion Clientes',
  label: 'Id_CRM',
  legacyBusinessKey: 'Id_CRM',
  permissionView: 'Gestion Clientes',
  module: 'CRM',
  icon: 'Handshake',
  description: 'Bitácora de prospección y seguimiento comercial.',
  defaultView: 'dashboard',
  columns: [
    migrationRef('cliente_uuid', 'Cliente interno', 'CLIENTES'),
    { name: 'Id_CRM', type: 'Text', labelColumn: true, required: true },
    { name: 'Fecha_contacto', type: 'Date', required: true },
    {
      name: 'Nombre_empresa',
      type: 'Ref',
      required: true,
      ref: { table: 'CLIENTES', keyColumn: '_uuid' },
      syncTo: 'cliente_uuid',
    },
    { name: 'Pagina_empresa', type: 'Url' },
    {
      name: 'Contacto',
      type: 'Text',
      readOnly: true,
      formula: (row, context) => refValue(row, 'cliente_uuid', 'CLIENTES', 'CONTACTO', context),
    },
    {
      name: 'Telefono',
      type: 'Phone',
      readOnly: true,
      formula: (row, context) =>
        refValue(row, 'cliente_uuid', 'CLIENTES', 'TELEFONO CONTACTO', context),
    },
    {
      name: 'Email',
      type: 'Email',
      readOnly: true,
      formula: (row, context) => refValue(row, 'cliente_uuid', 'CLIENTES', 'EMAIL', context),
    },
    { name: 'Tipo_cliente', type: 'Enum', values: crmCustomerTypes },
    { name: 'Accion', type: 'Enum', values: crmActions },
    { name: 'Responsable', type: 'Text' },
    {
      name: 'Estatus_prospeccion',
      type: 'Enum',
      values: prospectStatuses,
      showIf: (row) => row['Tipo_cliente'] === '🔵Prospecto',
    },
    {
      name: 'Estatus_cliente',
      type: 'Enum',
      values: activeCustomerStatuses,
      showIf: (row) => row['Tipo_cliente'] === '🟢Activo',
    },
    { name: 'Notas', type: 'Text' },
  ],
})
