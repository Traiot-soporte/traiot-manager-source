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
  timeZone: 'America/Mexico_City'
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
    schemaVersion: properties.getProperty('TRAIOT_SCHEMA_VERSION') || TRAIOT_DEFAULT_CONFIG.schemaVersion,
    timeZone: TRAIOT_DEFAULT_CONFIG.timeZone
  };
}

/**
 * Persiste la configuracion inicial en Script Properties.
 * Ejecutar una vez desde el editor de Apps Script.
 */
function configurarBackend() {
  PropertiesService.getScriptProperties().setProperties({
    TRAIOT_FOLDER_ID: TRAIOT_DEFAULT_CONFIG.folderId,
    TRAIOT_SCHEMA_VERSION: TRAIOT_DEFAULT_CONFIG.schemaVersion
  });

  var folder = DriveApp.getFolderById(TRAIOT_DEFAULT_CONFIG.folderId);
  var spreadsheetFiles = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  var spreadsheetsDetected = 0;
  var sheetsDetected = 0;

  while (spreadsheetFiles.hasNext()) {
    var spreadsheetFile = spreadsheetFiles.next();
    var spreadsheet = SpreadsheetApp.openById(spreadsheetFile.getId());
    spreadsheetsDetected += 1;
    sheetsDetected += spreadsheet.getSheets().length;
  }

  return {
    ok: true,
    folderId: folder.getId(),
    folderName: folder.getName(),
    schemaVersion: TRAIOT_DEFAULT_CONFIG.schemaVersion,
    spreadsheetsDetected: spreadsheetsDetected,
    sheetsDetected: sheetsDetected
  };
}
