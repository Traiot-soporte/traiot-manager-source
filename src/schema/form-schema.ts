import { z } from 'zod'

import type { ColumnDef, TableDef } from '@/schema/types'

function isEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  )
}

function schemaForColumn(column: ColumnDef): z.ZodType<unknown> {
  const base = column.required ? z.unknown() : z.unknown().optional()
  return base.superRefine((value, context) => {
    if (isEmpty(value)) {
      if (column.required) {
        context.addIssue({
          code: 'custom',
          message: 'Este campo es obligatorio.',
        })
      }
      return
    }

    if (column.type === 'Number' || column.type === 'Price') {
      if (typeof value !== 'number') {
        context.addIssue({ code: 'custom', message: 'Captura un número válido.' })
      }
      return
    }

    if (column.type === 'Bool') {
      if (typeof value !== 'boolean') {
        context.addIssue({ code: 'custom', message: 'Selecciona Sí o No.' })
      }
      return
    }

    if (column.type === 'EnumList') {
      if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
        context.addIssue({ code: 'custom', message: 'Selecciona opciones válidas.' })
        return
      }
      if (column.values && value.some((item) => !column.values?.includes(String(item)))) {
        context.addIssue({ code: 'custom', message: 'Hay una opción fuera del catálogo.' })
      }
      return
    }

    if (typeof value !== 'string') {
      context.addIssue({ code: 'custom', message: 'Captura un valor válido.' })
      return
    }

    if (column.type === 'Email' && !z.email().safeParse(value).success) {
      context.addIssue({ code: 'custom', message: 'Captura un correo electrónico válido.' })
    }

    if (column.type === 'Url' && !z.url().safeParse(value).success) {
      context.addIssue({ code: 'custom', message: 'Captura una URL válida.' })
    }

    if (
      (column.type === 'Enum' || column.type === 'Color') &&
      column.values &&
      !column.values.includes(value)
    ) {
      context.addIssue({ code: 'custom', message: 'Selecciona una opción del catálogo.' })
    }
  })
}

export function buildFormSchema(table: TableDef): z.ZodObject<Record<string, z.ZodType<unknown>>> {
  const shape: Record<string, z.ZodType<unknown>> = {}

  for (const column of table.columns) {
    if (
      column.origin === 'system' ||
      column.hidden ||
      column.virtual ||
      column.readOnly ||
      column.formula ||
      column.type === 'List' ||
      column.type === 'Show'
    ) {
      continue
    }
    shape[column.name] = schemaForColumn(column)
  }

  return z.object(shape)
}
