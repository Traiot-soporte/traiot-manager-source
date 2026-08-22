import { defineTable } from '@/schema/helpers'

export const menuTable = defineTable({
  name: 'Menu',
  sheet: 'Menu',
  label: 'NombreMenu',
  legacyBusinessKey: 'IdMenu',
  permissionView: 'Menu',
  module: 'Administración',
  icon: 'LayoutGrid',
  description: 'Lanzador configurable de módulos.',
  defaultView: 'card',
  columns: [
    { name: 'IdMenu', type: 'Number', required: true },
    { name: 'NombreMenu', type: 'Text', labelColumn: true },
    { name: 'VistaMenu', type: 'Text' },
    { name: 'ImagenMenu', type: 'Image', labelColumn: true },
  ],
})
