import { BoolField } from '@/fields/bool-field'
import { ColorField } from '@/fields/color-field'
import { DateField } from '@/fields/date-field'
import { EnumField } from '@/fields/enum-field'
import { EnumListField } from '@/fields/enum-list-field'
import { ImageField } from '@/fields/image-field'
import { NumberField } from '@/fields/number-field'
import { RefField } from '@/fields/ref-field'
import { SignatureField } from '@/fields/signature-field'
import { TextField } from '@/fields/text-field'
import type { FieldComponentProps } from '@/fields/types'
import type { FormulaContext, RowData } from '@/schema'

interface FieldRendererProps extends FieldComponentProps {
  readonly row: RowData
  readonly context: FormulaContext
}

export function FieldRenderer({ column, context, row, ...props }: FieldRendererProps) {
  if (column.showIf && !column.showIf(row, context)) {
    return null
  }

  switch (column.type) {
    case 'Text':
    case 'LongText':
    case 'Email':
    case 'Phone':
    case 'Url':
    case 'Address':
    case 'Name':
    case 'LatLong':
      return <TextField column={column} {...props} />
    case 'Number':
    case 'Price':
      return <NumberField column={column} {...props} />
    case 'Date':
    case 'DateTime':
      return <DateField column={column} {...props} />
    case 'Enum':
      return <EnumField column={column} {...props} />
    case 'EnumList':
      return <EnumListField column={column} {...props} />
    case 'Ref':
      return <RefField column={column} {...props} />
    case 'Image':
      return <ImageField column={column} {...props} />
    case 'Signature':
      return <SignatureField column={column} {...props} />
    case 'Color':
      return <ColorField column={column} {...props} />
    case 'Bool':
      return <BoolField column={column} {...props} />
    case 'List':
    case 'Show':
      return null
  }
}

export type { FieldComponentProps } from '@/fields/types'
