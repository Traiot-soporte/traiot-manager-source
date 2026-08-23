import { checklistResults, vehicleColors } from '@/schema/catalogs'
import { defineTable, migrationRef, namedColumns, repeatedColumns } from '@/schema/helpers'

const receptionChecklist = [
  'LUCES',
  'DIRECCIONALES',
  'INTERMITENTES',
  'CUARTOS',
  'TABLERO',
  'ESTEREO',
  'VIDRIOS ELECTRICOS',
  'AIRE ACONDICIONADO',
  'SEGUROS ELECTRICOS',
  'BATERIA',
  'CLAXON',
  'LUZ INTERIOR',
  'VISERAS',
] as const

const postInstallationTests = [
  'POSICIONAMIENTO OK',
  'IGNICION',
  'PRUEBA BLOQUEO/HABILITADO DE MOTOR',
  'DESCONEXION BATERIA',
  'BOTON SOS',
] as const

export const instalacionesTable = defineTable({
  name: 'INSTALACIONES',
  displayName: 'Servicios GPS',
  sheet: 'INSTALACIONES',
  label: 'FOLIO SERVICIO',
  legacyBusinessKey: 'FOLIO SERVICIO',
  permissionView: 'Servicios',
  module: 'Operación',
  icon: 'Wrench',
  description: 'Órdenes de servicio e instalaciones en campo.',
  defaultView: 'card',
  childTables: [
    { table: 'instalacion_fotos', foreignKey: 'instalacion_uuid' },
    { table: 'instalacion_tanques', foreignKey: 'instalacion_uuid' },
    { table: 'instalacion_checklist', foreignKey: 'instalacion_uuid' },
  ],
  columns: [
    migrationRef('cliente_uuid', 'Cliente interno', 'CLIENTES'),
    migrationRef('tecnico_uuid', 'Técnico interno', 'Usuarios'),
    migrationRef('consultor_uuid', 'Consultor interno', 'Usuarios'),
    migrationRef('dispositivo_uuid', 'Dispositivo interno', 'MATRIZ DISPOSITIVOS'),

    {
      name: 'FOLIO SERVICIO',
      type: 'Text',
      labelColumn: true,
      required: true,
      section: 'Servicio',
    },
    {
      name: 'FECHA',
      type: 'DateTime',
      section: 'Servicio',
      defaultValue: (_row, context) => context.now.toISOString(),
    },
    { name: 'MES', type: 'Enum', readOnly: true, section: 'Servicio' },
    { name: 'AÑO EN CURSO', type: 'Text', readOnly: true, section: 'Servicio' },
    {
      name: 'CLIENTE',
      type: 'Ref',
      ref: { table: 'CLIENTES', keyColumn: '_uuid' },
      syncTo: 'cliente_uuid',
      section: 'Servicio',
    },
    {
      name: 'CONSULTOR VENTAS',
      type: 'Ref',
      ref: { table: 'Usuarios', keyColumn: '_uuid' },
      syncTo: 'consultor_uuid',
      section: 'Servicio',
    },
    { name: 'TIPO DE SERVICIO', type: 'Text', section: 'Servicio' },
    { name: 'ESTATUS', type: 'Text', section: 'Servicio' },
    {
      name: 'TECNICO',
      type: 'Ref',
      ref: { table: 'Usuarios', keyColumn: '_uuid' },
      syncTo: 'tecnico_uuid',
      section: 'Servicio',
    },
    { name: 'SOLUCION', type: 'Text', section: 'Servicio' },

    { name: 'MARCA DISPOSITIVO', type: 'Text', section: 'Dispositivo' },
    { name: 'MODELO DISPOSITIVO', type: 'Text', section: 'Dispositivo' },
    { name: 'IMEI', type: 'Text', section: 'Dispositivo' },
    { name: 'SIM', type: 'Text', section: 'Dispositivo' },
    { name: 'PROVEEDOR SIM', type: 'Text', section: 'Dispositivo' },

    { name: 'CONTACTO', type: 'Text', section: 'Contacto y ubicación' },
    { name: 'TELEFONO', type: 'Text', section: 'Contacto y ubicación' },
    { name: 'EMAIL', type: 'Email', section: 'Contacto y ubicación' },
    { name: 'DIRECCION', type: 'Address', section: 'Contacto y ubicación' },
    { name: 'UBICACION', type: 'Url', section: 'Contacto y ubicación' },
    { name: 'ECONOMICO', type: 'Text', section: 'Contacto y ubicación' },
    { name: 'ACCESORIOS ADICIONALES', type: 'Text', section: 'Contacto y ubicación' },
    { name: 'CEREBRO', type: 'Text', section: 'Contacto y ubicación' },
    { name: 'PANICO', type: 'Text', section: 'Contacto y ubicación' },
    { name: 'CORTE', type: 'Text', section: 'Contacto y ubicación' },

    { name: 'NO. TANQUES', type: 'Text', section: 'Combustible' },
    ...namedColumns(
      [
        'TANQUE 1 (MARCA)',
        'TANQUE 1 (SERIE)',
        'TANQUE 2 (MARCA)',
        'TANQUE 2 (SERIE)',
        'TANQUE 3 (MARCA)',
        'TANQUE 3 (SERIE)',
      ],
      'Text',
      { section: 'Combustible' },
    ),
    ...repeatedColumns('IMAGEN FUEL', 10, 'Image', {
      section: 'Combustible',
      description: 'Campo heredado; se migrará a instalacion_fotos.',
    }),
    { name: 'NOTAS COMBUSTIBLE', type: 'Text', section: 'Combustible' },

    { name: 'MARCA AUTO', type: 'Text', section: 'Vehículo' },
    { name: 'SUBMARCA', type: 'Text', section: 'Vehículo' },
    { name: 'COLOR', type: 'Color', values: vehicleColors, section: 'Vehículo' },
    { name: 'AÑO', type: 'Text', section: 'Vehículo' },
    { name: 'VIN', type: 'Text', section: 'Vehículo' },
    { name: 'PLACAS', type: 'Text', section: 'Vehículo' },
    { name: 'ODOMETRO', type: 'Text', section: 'Vehículo' },
    ...repeatedColumns('IMAGEN', 10, 'Image', {
      section: 'Evidencia general',
      description: 'Campo heredado; se migrará a instalacion_fotos.',
    }),
    { name: 'COMENTARIOS TECNICO', type: 'LongText', section: 'Evidencia general' },

    ...namedColumns(receptionChecklist, 'Enum', {
      values: checklistResults,
      section: 'Recepción del vehículo',
      description: 'Corregido desde el enum de valor único ✅OK.',
    }),
    ...repeatedColumns('IMAGEN CHECK', 5, 'Image', {
      section: 'Recepción del vehículo',
      description: 'Campo heredado; se migrará a instalacion_fotos.',
    }),
    {
      name: 'CHECKLIST OBSERVACIONES',
      type: 'Text',
      section: 'Recepción del vehículo',
    },

    ...postInstallationTests.flatMap((name, index) => [
      {
        name,
        type: 'Enum' as const,
        values: checklistResults,
        section: 'Pruebas post-instalación',
        description: 'Corregido a OK / FALLA / NO APLICA.',
      },
      {
        name: 'OBSERVACIONES ' + String(index + 1),
        type: 'Text' as const,
        section: 'Pruebas post-instalación',
      },
    ]),

    { name: 'NOMBRE DE QUIEN RECIBE', type: 'Text', section: 'Cierre' },
    { name: 'FIRMA DE QUIEN RECIBE', type: 'Signature', section: 'Cierre' },
    {
      name: 'IMAGEN INE',
      type: 'Image',
      section: 'Cierre',
      description: 'Campo heredado; se migrará a instalacion_fotos con categoría ine.',
    },
  ],
})
