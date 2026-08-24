export const productCategories = ['GPS', 'SENSOR', 'ACCESORIO', 'CCTV'] as const

export const userRoles = [
  'Administrador',
  'Gerencia',
  'Soporte',
  'Ventas',
  'Tecnico',
] as const

export const permissionSections = [
  'Administración Comercial',
  'CRM',
  'Ingeniería',
  'Técnico',
  'Seguridad',
] as const

export const purchaseStatuses = ['RECIBIDA', 'EN CAMINO', 'CANCELADA'] as const

export const orderTypes = ['VENTA EQUIPO', 'INSTALACION', 'REVISION'] as const
export const orderCategories = ['GPS', 'SENSOR', 'CCTV'] as const
export const orderCustomerTypes = [
  'TRAIOT PLUS',
  'HABITUAL',
  'OCASIONAL',
  'PROSPECTO PLUS',
  'PROSPECTO',
] as const
export const orderStatuses = ['APROBADO', 'NO APROBADO', 'PENDIENTE APROBACION'] as const

export const crmCustomerTypes = ['🟢Activo', '🔵Prospecto'] as const
export const crmLifecycleStages = ['Prospecto', 'Cliente', 'Descartado'] as const
export const crmActions = [
  '📞Llamada telefónica',
  '✉️Enviar email',
  '💬Seguimiento WhatsApp',
  '🏠Visita',
  '📱Videollamada',
] as const
export const crmResponsibles = [
  'Luis Baca',
  'Jesús Ortiz',
  'Oscar Malagón',
  'Rembrand Castaneda',
  'Manuel Soto',
] as const
export const prospectStatuses = [
  '⏳Por contactar',
  '📞Primer contacto',
  '🤝En negociación',
  '❌No interesado',
  '✅Cliente',
] as const
export const activeCustomerStatuses = [
  '🟢Activo',
  '🔁Por dar seguimiento',
  '📅Reciente contacto',
  '🛒Compra reciente',
  '⚠️Requiere atención',
  '😟Riesgo de fuga',
  '🔴Perdido',
] as const

export const ticketCustomerTypes = [
  '💎VIP',
  '🎯HABITUALES',
  '📈OCASIONAL',
  '💎PROSPECTO PLUS',
  '📈PROSPECTO',
] as const
export const ticketOwners = ['📱TRAIOT', '📱PIDEGPS'] as const
export const supportChannels = [
  '💬Whatsapp',
  '📞Llamada Telefónica',
  '✉️Email',
  '💻Acceso Remoto',
  '📱Video Llamada',
] as const
export const supportCaseTypes = [
  '🛠️Soporte',
  '🚨Incidencia',
  '📝Solicitud',
  '❓Consulta',
  '🧩Requerimiento',
  '🎓Capacitación',
  '📦Otro',
  '🚚Instalacion GPS',
  '🛰️Demostración Plataforma',
] as const
export const supportAgents = ['🧑Ing. Manuel Soto', '🧑Ing. Ian Espinoza'] as const
export const supportStatuses = [
  '🤝Contactado',
  '🔄En Seguimiento',
  '⏳ En espera del cliente',
  '✅Solucionado',
] as const

export const vehicleColors = [
  'Green',
  'Yellow',
  'Orange',
  'Red',
  'Purple',
  'Blue',
  'White',
  'Black',
] as const
export const checklistResults = ['OK', 'FALLA', 'NO APLICA'] as const
export const installationPhotoCategories = ['general', 'fuel', 'checklist', 'ine'] as const

export const laboratoryProblems = [
  'NO DETECTA SIM',
  'NO ACTIVA BLOQUE DE MOTOR/HABILITADO',
  'PROBLEMA EN ENTRADAS DIGITALES/ANALOGAS',
  'NO COMUNICA A PLATAFORMA',
  'NO ENCIENDE',
  'NO DETECTA IGNICION',
  'NO DETECTA VOLTAJE',
  'REVISION GENERAL',
  'REPORTA A PLATAFORMA SIN UBICACIÓN GPS',
  'NO DETECTA BOTON SOS',
] as const
export const laboratoryStatuses = [
  '📥 RECIBIDO',
  '🛠️ EN REVISION',
  '❌ DAÑADO',
  '🏬 ENVIADO A MATRIZ',
  '📦 ENTREGADO',
  '✅ FUNCIONAL',
] as const
export const deviceBrands = ['TOPFLYTECH', 'RUPTELA', 'QUECLINK', 'CONCOX', 'CALAMP'] as const
export const laboratoryReviewers = ['Manuel Soto', 'Ian Espinoza'] as const
export const laboratoryTests = [
  '🔍 Inspección física general del equipo y arnés de conexión.',
  '🔌 Verificación de alimentación principal (9-36 VDC).',
  '⚡ Verificación del consumo de corriente.',
  '🟢 Comprobación de encendido y funcionamiento del equipo.',
  '🔗 Verificación de comunicación USB con Device Center.',
  '📋 Lectura de información del dispositivo (IMEI, Firmware y Configuración).',
  '💳 Verificación del reconocimiento de la tarjeta SIM.',
  '📶 Verificación del registro en la red GSM/LTE.',
  '🌐 Comprobación de comunicación con el servidor/plataforma.',
  '📡 Validación del envío y recepción de datos.',
  '🛰️ Verificación del posicionamiento GPS (adquisición de satélites y FIX).',
  '🚗 Verificación del estado de Ignición (DIN1).',
  '📥 Prueba de entradas digitales (DIN).',
  '📤 Prueba de salidas digitales (DOUT).',
  '🎚️ Verificación de entradas analógicas (ADC), cuando aplica.',
  '🔋 Verificación de lectura de voltaje interno y voltaje externo.',
  '🔋🛡️ Revisión del respaldo mediante batería interna.',
  '🔬 Revisión visual de la tarjeta electrónica para detectar daños físicos, humedad, corrosión o componentes quemados.',
] as const
