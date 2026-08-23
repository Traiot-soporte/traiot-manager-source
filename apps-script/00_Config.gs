/**
 * Configuracion inicial del backend TRAIOT Manager.
 *
 * Los valores se pueden sobrescribir desde Script Properties sin modificar
 * el codigo. El identificador de carpeta no es una credencial; los permisos
 * reales siempre los determina Google Drive para la cuenta que ejecuta.
 */
var TRAIOT_DEFAULT_CONFIG = Object.freeze({
  folderId: '1FT8lpteo4FNj7ORQQZEr3IwU4_1LWKA7',
  schemaVersion: '1.0.0',
  timeZone: 'America/Mexico_City',
  backupFolderName: '_RESPALDOS_TRAIOT'
});

var TRAIOT_EXPECTED_TABLES = Object.freeze([
  'ALMACEN',
  'COMPRAS',
  'PEDIDOS',
  'PROVEEDORES',
  'CLIENTES',
  'Gestion Clientes',
  'Ticket Soporte',
  'INSTALACIONES',
  'instalacion_fotos',
  'instalacion_tanques',
  'instalacion_checklist',
  'Laboratorio',
  'MATRIZ DISPOSITIVOS',
  'Usuarios',
  'Perfiles',
  'Menu'
]);

function getRuntimeConfig_() {
  var properties = PropertiesService.getScriptProperties();

  return {
    folderId: properties.getProperty('TRAIOT_FOLDER_ID') || TRAIOT_DEFAULT_CONFIG.folderId,
    spreadsheetId: properties.getProperty('TRAIOT_SPREADSHEET_ID') || '',
    schemaVersion: properties.getProperty('TRAIOT_SCHEMA_VERSION') || TRAIOT_DEFAULT_CONFIG.schemaVersion,
    timeZone: TRAIOT_DEFAULT_CONFIG.timeZone,
    backupFolderName: TRAIOT_DEFAULT_CONFIG.backupFolderName
  };
}

/**
 * Persiste la configuracion inicial en Script Properties.
 * Ejecutar una vez desde el editor de Apps Script.
 */
function configurarBackend() {
  var scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperties({
    TRAIOT_FOLDER_ID: TRAIOT_DEFAULT_CONFIG.folderId,
    TRAIOT_SCHEMA_VERSION: TRAIOT_DEFAULT_CONFIG.schemaVersion,
    TRAIOT_OWNER_EMAIL: Session.getEffectiveUser().getEmail()
  });

  if (!scriptProperties.getProperty('TRAIOT_AUTH_MODE')) {
    scriptProperties.setProperty('TRAIOT_AUTH_MODE', 'OWNER_ONLY');
  }

  var folder = DriveApp.getFolderById(TRAIOT_DEFAULT_CONFIG.folderId);
  var spreadsheetFiles = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  var spreadsheetIds = [];
  var spreadsheetsDetected = 0;
  var sheetsDetected = 0;

  while (spreadsheetFiles.hasNext()) {
    var spreadsheetFile = spreadsheetFiles.next();
    var spreadsheet = SpreadsheetApp.openById(spreadsheetFile.getId());
    spreadsheetIds.push(spreadsheetFile.getId());
    spreadsheetsDetected += 1;
    sheetsDetected += spreadsheet.getSheets().length;
  }

  if (spreadsheetIds.length !== 1) {
    throw new Error('La carpeta debe contener exactamente un archivo de Google Sheets en su nivel principal.');
  }

  PropertiesService.getScriptProperties().setProperty(
    'TRAIOT_SPREADSHEET_ID',
    spreadsheetIds[0]
  );

  return {
    ok: true,
    folderId: folder.getId(),
    folderName: folder.getName(),
    schemaVersion: TRAIOT_DEFAULT_CONFIG.schemaVersion,
    spreadsheetsDetected: spreadsheetsDetected,
    sheetsDetected: sheetsDetected
  };
}

/**
 * Recuperacion administrativa: bloquea todo acceso web sin borrar credenciales
 * ni sesiones. Ejecutar solo desde el editor de Apps Script si el login requiere
 * mantenimiento; para reactivarlo se debe corregir y volver a desplegar.
 */
function desactivarAutenticacion() {
  PropertiesService.getScriptProperties().setProperty('TRAIOT_AUTH_MODE', 'LOCKED');
  return { ok: true, mode: 'LOCKED' };
}

/**
 * Diagnostico seguro del acceso por Usuarios. No devuelve hashes, tokens ni
 * contraseñas y no modifica celdas. Ejecutar desde el editor de Apps Script.
 */
function diagnosticarAutenticacion() {
  var properties = PropertiesService.getScriptProperties();
  var ownerEmail = normalizeApiEmail_(properties.getProperty('TRAIOT_OWNER_EMAIL'));
  var executorEmail = normalizeApiEmail_(Session.getEffectiveUser().getEmail());

  if (!ownerEmail || executorEmail !== ownerEmail) {
    throw new Error('Solo la cuenta propietaria puede ejecutar este diagnostico.');
  }

  var configured = Boolean(properties.getProperty('TRAIOT_AUTH_CONFIGURED_AT'));
  var result = {
    mode: properties.getProperty('TRAIOT_AUTH_MODE') || 'OWNER_ONLY',
    configured: configured,
    duplicates: [],
    users: []
  };

  if (!configured) {
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  var spreadsheet = openConfiguredSpreadsheet_();
  var status = buildAuthAdminStatus_(spreadsheet);
  var now = Date.now();
  result.duplicates = status.duplicates;
  result.users = readAuthUsers_(spreadsheet).map(function (user) {
    var lockedUntil = normalizeCell_(user.LockedUntil);
    return {
      userId: normalizeCell_(user.UserID),
      name: normalizeCell_(user.UserName),
      email: normalizeApiEmail_(user.UserEmail),
      active: user.UserActive === true,
      credentialConfigured: Boolean(normalizeCell_(user.PasswordHash)),
      mustChangePassword: user.MustChangePassword === true,
      failedAttempts: authNumber_(user.FailedAttempts),
      locked: authDateMillis_(lockedUntil) > now,
      lockedUntil: lockedUntil,
      lastLoginAt: normalizeCell_(user.LastLoginAt)
    };
  });

  console.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Crea el respaldo y prepara la estructura sin transformar filas existentes.
 * Esta funcion es idempotente y puede retomarse despues de una interrupcion.
 */
function prepararMigracion() {
  var result = prepareMigrationStructure_();
  console.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Puebla los identificadores y metadatos tecnicos de las filas existentes.
 * No modifica ninguna columna original ni intenta resolver relaciones.
 */
function poblarIdentificadores() {
  var result = migrateTechnicalIdentifiers_();
  console.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Puebla solamente relaciones con una coincidencia unica y verificable.
 * Los textos originales y las relaciones no resueltas permanecen intactos.
 */
function poblarRelacionesExactas() {
  var result = migrateExactRelations_();
  console.log(JSON.stringify(result, null, 2));
  return result;
}
