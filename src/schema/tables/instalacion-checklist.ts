import { checklistResults } from '@/schema/catalogs'
import { defineTable, migrationRef } from '@/schema/helpers'

export const instalacionChecklistTable = defineTable({
  name: 'instalacion_checklist',
  sheet: 'instalacion_checklist',
  label: 'punto',
  permissionView: 'Servicios',
  module: 'Operación',
  icon: 'ListChecks',
  description: 'Recepción y pruebas post-instalación en formato normalizado.',
  defaultView: 'table',
  columns: [
    migrationRef('instalacion_uuid', 'Instalación', 'INSTALACIONES'),
    { name: 'punto', type: 'Text', required: true, labelColumn: true, origin: 'migration' },
    {
      name: 'resultado',
      type: 'Enum',
      required: true,
      values: checklistResults,
      origin: 'migration',
    },
    { name: 'observacion', type: 'LongText', origin: 'migration' },
  ],
})
