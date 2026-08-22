import {
  deviceBrands,
  laboratoryProblems,
  laboratoryReviewers,
  laboratoryStatuses,
  laboratoryTests,
} from '@/schema/catalogs'
import { laboratoryDays, laboratorySemaphore } from '@/schema/formulas'
import { defineTable, migrationRef, repeatedColumns } from '@/schema/helpers'

export const laboratorioTable = defineTable({
  name: 'Laboratorio',
  sheet: 'Laboratorio',
  label: 'FOLIO',
  legacyBusinessKey: 'FOLIO',
  permissionView: 'Laboratorio',
  module: 'Laboratorio',
  icon: 'FlaskConical',
  description: 'Recepción, diagnóstico y salida de equipos RMA.',
  defaultView: 'table',
  columns: [
    migrationRef('cliente_uuid', 'Cliente interno', 'CLIENTES'),
    { name: 'FOLIO', type: 'Text', labelColumn: true, required: true },
    { name: 'FECHA ENTRADA', type: 'Date' },
    { name: 'PROBLEMA DETECTADO', type: 'Enum', values: laboratoryProblems },
    { name: 'ESTATUS', type: 'Enum', values: laboratoryStatuses },
    { name: 'MARCA', type: 'Enum', values: deviceBrands },
    { name: 'MODELO', type: 'Text' },
    { name: 'IMEI', type: 'Text' },
    { name: 'TEL SIM', type: 'Text' },
    { name: 'CLIENTE', type: 'Ref', ref: { table: 'CLIENTES', keyColumn: '_uuid' } },
    { name: 'REVISADO POR', type: 'Enum', values: laboratoryReviewers },
    { name: 'PRUEBAS REALIZADAS', type: 'EnumList', values: laboratoryTests },
    { name: 'FECHA SALIDA', type: 'Date' },
    { name: 'NOTAS DE REVISION', type: 'LongText' },
    ...repeatedColumns('IMAGEN', 5, 'Image'),
    ...repeatedColumns('NOTAS IMAGEN', 5, 'LongText'),
    {
      name: 'DIAS LABORATORIO',
      type: 'Number',
      readOnly: true,
      formula: (row, context) => laboratoryDays(row['FECHA ENTRADA'], context.now),
    },
    {
      name: 'SEMAFORO',
      type: 'Text',
      readOnly: true,
      formula: (row, context) =>
        laboratorySemaphore(
          row['ESTATUS'],
          laboratoryDays(row['FECHA ENTRADA'], context.now),
        ),
    },
  ],
})
