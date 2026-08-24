import {
  deviceBrands,
  laboratoryProblems,
  laboratoryReviewers,
  laboratoryStatuses,
  laboratoryTests,
} from '@/schema/catalogs'
import { laboratoryDays, laboratorySemaphore } from '@/schema/formulas'
import { defineTable, migrationRef } from '@/schema/helpers'

const laboratoryEvidenceColumns = Array.from({ length: 5 }, (_, index) => [
  { name: `IMAGEN ${String(index + 1)}`, type: 'Image' as const },
  { name: `NOTAS IMAGEN ${String(index + 1)}`, type: 'LongText' as const },
]).flat()

export const laboratorioTable = defineTable({
  name: 'Laboratorio',
  sheet: 'Laboratorio',
  label: 'FOLIO',
  legacyBusinessKey: 'FOLIO',
  permissionView: 'Laboratorio',
  module: 'Laboratorio',
  icon: 'FlaskConical',
  description: 'Recepción, diagnóstico y salida de equipos RMA.',
  defaultView: 'dashboard',
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
    {
      name: 'CLIENTE',
      type: 'Ref',
      ref: { table: 'CLIENTES', keyColumn: '_uuid' },
      syncTo: 'cliente_uuid',
    },
    { name: 'REVISADO POR', type: 'Enum', values: laboratoryReviewers },
    { name: 'PRUEBAS REALIZADAS', type: 'EnumList', values: laboratoryTests },
    { name: 'FECHA SALIDA', type: 'Date' },
    { name: 'NOTAS DE REVISION', type: 'LongText' },
    ...laboratoryEvidenceColumns,
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
