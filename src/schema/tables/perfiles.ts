import { defineTable } from '@/schema/helpers'

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
    { name: 'PerfilID', type: 'Text', labelColumn: true, required: true },
    { name: 'VistasPermitidas', type: 'EnumList' },
    {
      name: 'Related _Per User Settings',
      type: 'List',
      virtual: true,
      readOnly: true,
      hidden: true,
      description: 'Relación heredada de AppSheet; no se sincroniza.',
    },
  ],
})
