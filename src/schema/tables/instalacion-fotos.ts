import { installationPhotoCategories } from '@/schema/catalogs'
import { defineTable, migrationRef } from '@/schema/helpers'

export const instalacionFotosTable = defineTable({
  name: 'instalacion_fotos',
  sheet: 'instalacion_fotos',
  label: 'orden',
  permissionView: 'Servicios',
  module: 'Operación',
  icon: 'Images',
  description: 'Evidencias fotográficas normalizadas de una instalación.',
  defaultView: 'deck',
  columns: [
    migrationRef('instalacion_uuid', 'Instalación', 'INSTALACIONES'),
    {
      name: 'categoria',
      type: 'Enum',
      required: true,
      values: installationPhotoCategories,
      origin: 'migration',
    },
    { name: 'orden', type: 'Number', required: true, labelColumn: true, origin: 'migration' },
    { name: 'driveFileId', type: 'Text', readOnly: true, hidden: true, origin: 'migration' },
    { name: 'nota', type: 'LongText', origin: 'migration' },
  ],
})
