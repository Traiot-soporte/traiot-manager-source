/**
 * Construye el plan de preparacion estructural. No realiza escrituras.
 */
function buildStructurePlan_(preflight) {
  if (!preflight.summary.safeToPrepareMigration) {
    throw new Error('El preflight contiene bloqueos y no permite preparar la migracion.');
  }

  var operations = [];

  preflight.tables.forEach(function (report) {
    if (report.status === 'pending-create') {
      operations.push({
        type: 'create-sheet',
        table: report.table,
        sheetName: report.sheet,
        headers: report.targetHeadersToAdd
      });
      return;
    }

    if (report.status === 'ready' && report.targetHeadersToAdd.length > 0) {
      operations.push({
        type: 'append-headers',
        table: report.table,
        sheetName: report.sheetName,
        headers: report.targetHeadersToAdd
      });
    }
  });

  return {
    mode: 'structure-plan',
    writesPerformed: false,
    operations: operations,
    summary: {
      createSheets: operations.filter(function (operation) {
        return operation.type === 'create-sheet';
      }).length,
      updateSheets: operations.filter(function (operation) {
        return operation.type === 'append-headers';
      }).length,
      addHeaders: operations.reduce(function (total, operation) {
        return total + operation.headers.length;
      }, 0)
    }
  };
}

/**
 * Ejecuta respaldo + preparacion estructural bajo un bloqueo global.
 */
function prepareMigrationStructure_() {
  var lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    throw new Error('Otra preparacion se encuentra en curso. Intenta nuevamente en un minuto.');
  }

  try {
    var preflight = buildMigrationPreflight_();
    var plan = buildStructurePlan_(preflight);
    var config = getRuntimeConfig_();
    var rootFolder = DriveApp.getFolderById(config.folderId);
    var spreadsheetId = resolveSourceSpreadsheetId_(rootFolder, config.spreadsheetId);
    var backup = ensureSpreadsheetBackup_(rootFolder, spreadsheetId, config);
    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    var appliedOperations = plan.operations.map(function (operation) {
      return applyStructureOperation_(spreadsheet, operation);
    });

    SpreadsheetApp.flush();

    var postflight = buildMigrationPreflight_();

    if (!postflight.summary.safeToPrepareMigration || postflight.summary.newTablesPending !== 0) {
      throw new Error('La verificacion posterior detecto una estructura incompleta. El respaldo permanece disponible.');
    }

    var result = {
      ok: true,
      mode: 'structure-preparation',
      completedAt: new Date().toISOString(),
      backup: backup,
      appliedOperations: appliedOperations,
      verification: postflight.summary
    };

    PropertiesService.getScriptProperties().setProperties({
      TRAIOT_STRUCTURE_PREPARED_AT: result.completedAt,
      TRAIOT_LAST_PREPARATION_RESULT: JSON.stringify(result)
    });

    return result;
  } finally {
    lock.releaseLock();
  }
}

function resolveSourceSpreadsheetId_(rootFolder, configuredSpreadsheetId) {
  if (configuredSpreadsheetId) {
    var configuredFile = DriveApp.getFileById(configuredSpreadsheetId);

    if (!configuredFile.isTrashed() && configuredFile.getMimeType() === MimeType.GOOGLE_SHEETS) {
      return configuredSpreadsheetId;
    }
  }

  var files = rootFolder.getFilesByType(MimeType.GOOGLE_SHEETS);
  var ids = [];

  while (files.hasNext()) {
    ids.push(files.next().getId());
  }

  if (ids.length !== 1) {
    throw new Error('No se pudo identificar de forma unica el Spreadsheet principal.');
  }

  PropertiesService.getScriptProperties().setProperty('TRAIOT_SPREADSHEET_ID', ids[0]);
  return ids[0];
}

function ensureSpreadsheetBackup_(rootFolder, spreadsheetId, config) {
  var properties = PropertiesService.getScriptProperties();
  var existingBackupId = properties.getProperty('TRAIOT_PREPARATION_BACKUP_ID');

  if (existingBackupId) {
    try {
      var existingBackup = DriveApp.getFileById(existingBackupId);

      if (!existingBackup.isTrashed()) {
        return describeBackup_(existingBackup, false);
      }
    } catch (error) {
      console.warn('No se pudo reutilizar el respaldo registrado: ' + String(error));
    }
  }

  var backupFolder = getOrCreateChildFolder_(rootFolder, config.backupFolderName);
  var sourceFile = DriveApp.getFileById(spreadsheetId);
  var backupName = properties.getProperty('TRAIOT_PREPARATION_BACKUP_NAME');

  if (!backupName) {
    backupName = sourceFile.getName() + ' - RESPALDO ESTRUCTURAL ' + Utilities.formatDate(
      new Date(),
      config.timeZone,
      'yyyy-MM-dd_HH-mm-ss'
    );
    properties.setProperty('TRAIOT_PREPARATION_BACKUP_NAME', backupName);
  }

  var matchingBackups = backupFolder.getFilesByName(backupName);
  var backupFile = matchingBackups.hasNext()
    ? matchingBackups.next()
    : sourceFile.makeCopy(backupName, backupFolder);

  properties.setProperty('TRAIOT_PREPARATION_BACKUP_ID', backupFile.getId());

  return describeBackup_(backupFile, true);
}

function getOrCreateChildFolder_(parentFolder, name) {
  var folders = parentFolder.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parentFolder.createFolder(name);
}

function describeBackup_(file, created) {
  return {
    id: file.getId(),
    name: file.getName(),
    url: file.getUrl(),
    created: created
  };
}

function applyStructureOperation_(spreadsheet, operation) {
  var sheet = spreadsheet.getSheetByName(operation.sheetName);
  var created = false;

  if (!sheet) {
    if (operation.type !== 'create-sheet') {
      throw new Error('No se encontro la hoja ' + operation.sheetName + '.');
    }

    sheet = spreadsheet.insertSheet(operation.sheetName);
    created = true;
  }

  var addedHeaders = appendHeaders_(sheet, operation.headers);

  if (created) {
    sheet.setFrozenRows(1);
  }

  return {
    type: operation.type,
    table: operation.table,
    sheetName: sheet.getName(),
    created: created,
    addedHeaders: addedHeaders
  };
}

function appendHeaders_(sheet, headers) {
  if (headers.length === 0) {
    return [];
  }

  var startColumn = sheet.getLastColumn() + 1;
  var requiredLastColumn = startColumn + headers.length - 1;
  var missingCapacity = requiredLastColumn - sheet.getMaxColumns();

  if (missingCapacity > 0) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), missingCapacity);
  }

  sheet
    .getRange(1, startColumn, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold');

  return headers;
}
