import { defineTable, migrationRef } from '@/schema/helpers'

export const usuariosTable = defineTable({
  name: 'Usuarios',
  sheet: 'Usuarios',
  label: 'UserName',
  legacyBusinessKey: 'UserID',
  permissionView: 'Usuarios',
  module: 'Administración',
  icon: 'Users',
  description: 'Usuarios autorizados y su perfil.',
  defaultView: 'table',
  columns: [
    migrationRef('perfil_uuid', 'Perfil interno', 'Perfiles'),
    { name: 'UserID', type: 'Text', required: true },
    { name: 'UserName', type: 'Name', labelColumn: true },
    { name: 'UserEmail', type: 'Email', required: true },
    { name: 'UserRole', type: 'Text' },
    {
      name: 'UserActive',
      type: 'Bool',
      required: true,
      description: 'Normalizado desde TRUE/true/VERDADERO/SI/1.',
    },
  ],
})
