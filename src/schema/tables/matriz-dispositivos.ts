import { defineTable, namedColumns } from '@/schema/helpers'

export const matrizDispositivosTable = defineTable({
  name: 'MATRIZ DISPOSITIVOS',
  sheet: 'MATRIZ DISPOSITIVOS',
  label: 'Modelo',
  legacyBusinessKey: 'Modelo',
  permissionView: 'Matriz Dispositivos',
  module: 'CRM',
  icon: 'Cpu',
  description: 'Fichas técnicas y comparador de dispositivos GPS.',
  defaultView: 'card',
  disabledViews: ['calendar'],
  columns: [
    { name: 'Modelo', type: 'Text', labelColumn: true, required: true },
    { name: 'Marca', type: 'Text' },
    { name: 'Imagen', type: 'Image' },
    ...namedColumns([
      'Familia',
      'Tipo',
      'Dimensiones',
    ]),
    { name: 'Peso_g', type: 'Number' },
    { name: 'Bateria(miliamperios)', type: 'Number' },
    ...namedColumns([
      'Uso_recomendado',
      'Comentario',
    ]),
    { name: 'Ficha_Tecnica', label: 'Ficha técnica', type: 'Url' },
  ],
})
