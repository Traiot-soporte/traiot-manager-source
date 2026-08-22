import { defineTable, migrationRef } from '@/schema/helpers'

export const instalacionTanquesTable = defineTable({
  name: 'instalacion_tanques',
  sheet: 'instalacion_tanques',
  label: 'orden',
  permissionView: 'Servicios',
  module: 'Operación',
  icon: 'Fuel',
  description: 'Tanques y sensores de combustible asociados a una instalación.',
  defaultView: 'table',
  columns: [
    migrationRef('instalacion_uuid', 'Instalación', 'INSTALACIONES'),
    { name: 'orden', type: 'Number', required: true, labelColumn: true, origin: 'migration' },
    { name: 'marca', type: 'Text', origin: 'migration' },
    { name: 'serie', type: 'Text', origin: 'migration' },
  ],
})
