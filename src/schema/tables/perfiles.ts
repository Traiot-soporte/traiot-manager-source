import { defineTable } from '@/schema/helpers'
import { permissionSections, userRoles } from '@/schema/catalogs'

export const perfilesTable = defineTable({
  name: 'Perfiles',
  sheet: 'Perfiles',
  label: 'PerfilID',
  legacyBusinessKey: 'PerfilID',
  permissionView: 'Perfiles',
  module: 'Administración',
  icon: 'IdCard',
  description: 'Perfiles y permisos efectivos de acceso.',
  defaultView: 'table',
  columns: [
    {
      name: 'PerfilID',
      type: 'Enum',
      values: userRoles,
      labelColumn: true,
      required: true,
    },
    {
      name: 'VistasPermitidas',
      type: 'EnumList',
      values: permissionSections,
      readOnly: true,
      description: 'Se calcula automáticamente a partir del rol.',
    },
    {
      name: 'Related _Per User Settings',
      type: 'List',
      virtual: true,
      readOnly: true,
      hidden: true,
      description: 'Relación interna de configuración; no se modifica.',
    },
  ],
})
