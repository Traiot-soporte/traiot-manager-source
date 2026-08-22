/**
 * Puebla UUID y metadatos tecnicos en las tablas originales.
 *
 * La operacion es idempotente: conserva cualquier valor tecnico valido y solo
 * completa celdas vacias. Las columnas heredadas nunca se modifican.
 */
function migrateTechnicalIdentifiers_() {
  var lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    throw new Error('Otra migracion se encuentra en curso. Intenta nuevamente en un minuto.');
  }

  try {
    var audit = buildDataMigrationAudit_();

    if (!audit.summary.safeToPopulateUuids) {
      throw new Error('La auditoria detecto UUID invalidos o duplicados. No se realizaron cambios.');
    }

    var backup = requirePreparationBackup_();
    var config = getRuntimeConfig_();
    var rootFolder = DriveApp.getFolderById(config.folderId);
    var spreadsheetId = resolveSourceSpreadsheetId_(rootFolder, config.spreadsheetId);
    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    var migrationTimestamp = new Date().toISOString();
    var tableReports = TRAIOT_SCHEMA_TABLES.filter(function (schemaTable) {
      return !schemaTable.newTable;
    }).map(function (schemaTable) {
      return migrateTableIdentifiers_(spreadsheet, schemaTable, migrationTimestamp);
    });

    SpreadsheetApp.flush();

    var verification = buildDataMigrationAudit_();

    if (
      verification.summary.uuidsToAssign !== 0 ||
      verification.summary.invalidUuids !== 0 ||
      verification.summary.duplicateUuids !== 0
    ) {
      throw new Error('La verificacion posterior encontro identificadores incompletos o invalidos.');
    }

    var result = {
      ok: true,
      mode: 'identifier-migration',
      completedAt: new Date().toISOString(),
      migrationTimestamp: migrationTimestamp,
      backup: backup,
      summary: {
        tablesProcessed: tableReports.length,
        rowsProcessed: sumBy_(tableReports, 'rowsProcessed'),
        uuidsAssigned: sumBy_(tableReports, 'uuidsAssigned'),
        updatedAtInitialized: sumBy_(tableReports, 'updatedAtInitialized'),
        deletedInitialized: sumBy_(tableReports, 'deletedInitialized'),
        rowsChanged: sumBy_(tableReports, 'rowsChanged')
      },
      tables: tableReports,
      verification: {
        rowsAudited: verification.summary.rowsAudited,
        uuidsToAssign: verification.summary.uuidsToAssign,
        invalidUuids: verification.summary.invalidUuids,
        duplicateUuids: verification.summary.duplicateUuids,
        relationsResolved: verification.summary.relationsResolved,
        relationsUnresolved: verification.summary.relationsUnresolved,
        relationsAmbiguous: verification.summary.relationsAmbiguous
      }
    };

    PropertiesService.getScriptProperties().setProperties({
      TRAIOT_IDENTIFIERS_MIGRATED_AT: result.completedAt,
      TRAIOT_LAST_IDENTIFIER_MIGRATION_RESULT: JSON.stringify(result)
    });

    return result;
  } finally {
    lock.releaseLock();
  }
}

function requirePreparationBackup_() {
  var backupId = PropertiesService
    .getScriptProperties()
    .getProperty('TRAIOT_PREPARATION_BACKUP_ID');

  if (!backupId) {
    throw new Error('No existe un respaldo registrado. Ejecuta prepararMigracion antes de continuar.');
  }

  var backupFile;

  try {
    backupFile = DriveApp.getFileById(backupId);
  } catch (error) {
    throw new Error('No fue posible abrir el respaldo registrado. No se realizaron cambios.');
  }

  if (backupFile.isTrashed()) {
    throw new Error('El respaldo registrado esta en la papelera. Restauralo antes de continuar.');
  }

  return describeBackup_(backupFile, false);
}

function migrateTableIdentifiers_(spreadsheet, schemaTable, migrationTimestamp) {
  var sheet = spreadsheet.getSheetByName(schemaTable.sheet);

  if (!sheet) {
    throw new Error('No se encontro la hoja ' + schemaTable.sheet + '.');
  }

  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return emptyIdentifierMigrationReport_(schemaTable);
  }

  var displayValues = sheet.getDataRange().getDisplayValues();
  var headers = displayValues[0].map(String);
  var uuidColumn = requireHeaderIndex_(headers, '_uuid', schemaTable) + 1;
  var updatedAtColumn = requireHeaderIndex_(headers, '_updatedAt', schemaTable) + 1;
  var deletedColumn = requireHeaderIndex_(headers, '_deleted', schemaTable) + 1;
  var dataRowCount = lastRow - 1;
  var businessFlags = displayValues.slice(1).map(function (row) {
    return isBusinessRow_(row, headers, schemaTable);
  });
  var uuidRange = sheet.getRange(2, uuidColumn, dataRowCount, 1);
  var updatedAtRange = sheet.getRange(2, updatedAtColumn, dataRowCount, 1);
  var deletedRange = sheet.getRange(2, deletedColumn, dataRowCount, 1);
  var updates = buildIdentifierColumnUpdates_(
    businessFlags,
    flattenColumn_(uuidRange.getValues()),
    flattenColumn_(updatedAtRange.getValues()),
    flattenColumn_(deletedRange.getValues()),
    migrationTimestamp,
    function () { return Utilities.getUuid().toLowerCase(); }
  );

  if (updates.uuidsAssigned > 0) {
    uuidRange.setValues(toColumn_(updates.uuidValues));
  }

  if (updates.updatedAtInitialized > 0) {
    updatedAtRange.setValues(toColumn_(updates.updatedAtValues));
  }

  if (updates.deletedInitialized > 0) {
    deletedRange.setValues(toColumn_(updates.deletedValues));
  }

  return {
    table: schemaTable.name,
    sheet: schemaTable.sheet,
    rowsProcessed: updates.rowsProcessed,
    uuidsAssigned: updates.uuidsAssigned,
    updatedAtInitialized: updates.updatedAtInitialized,
    deletedInitialized: updates.deletedInitialized,
    rowsChanged: updates.rowsChanged
  };
}

function buildIdentifierColumnUpdates_(
  businessFlags,
  uuidValues,
  updatedAtValues,
  deletedValues,
  migrationTimestamp,
  uuidFactory
) {
  var rowCount = businessFlags.length;

  if (
    uuidValues.length !== rowCount ||
    updatedAtValues.length !== rowCount ||
    deletedValues.length !== rowCount
  ) {
    throw new Error('Las columnas tecnicas no tienen la misma cantidad de filas.');
  }

  var nextUuidValues = uuidValues.slice();
  var nextUpdatedAtValues = updatedAtValues.slice();
  var nextDeletedValues = deletedValues.slice();
  var report = {
    rowsProcessed: 0,
    uuidsAssigned: 0,
    updatedAtInitialized: 0,
    deletedInitialized: 0,
    rowsChanged: 0
  };

  businessFlags.forEach(function (isBusinessRow, rowIndex) {
    if (!isBusinessRow) {
      return;
    }

    report.rowsProcessed += 1;
    var changed = false;
    var currentUuid = normalizeCell_(nextUuidValues[rowIndex]);

    if (currentUuid && !isUuid_(currentUuid)) {
      throw new Error('Se encontro un UUID invalido en la fila ' + (rowIndex + 2) + '.');
    }

    if (!currentUuid) {
      var generatedUuid = String(uuidFactory()).toLowerCase();

      if (!isUuid_(generatedUuid)) {
        throw new Error('El generador produjo un UUID invalido.');
      }

      nextUuidValues[rowIndex] = generatedUuid;
      report.uuidsAssigned += 1;
      changed = true;
    }

    if (normalizeCell_(nextUpdatedAtValues[rowIndex]) === '') {
      nextUpdatedAtValues[rowIndex] = migrationTimestamp;
      report.updatedAtInitialized += 1;
      changed = true;
    }

    if (normalizeCell_(nextDeletedValues[rowIndex]) === '') {
      nextDeletedValues[rowIndex] = false;
      report.deletedInitialized += 1;
      changed = true;
    }

    if (changed) {
      report.rowsChanged += 1;
    }
  });

  return {
    uuidValues: nextUuidValues,
    updatedAtValues: nextUpdatedAtValues,
    deletedValues: nextDeletedValues,
    rowsProcessed: report.rowsProcessed,
    uuidsAssigned: report.uuidsAssigned,
    updatedAtInitialized: report.updatedAtInitialized,
    deletedInitialized: report.deletedInitialized,
    rowsChanged: report.rowsChanged
  };
}

function requireHeaderIndex_(headers, header, schemaTable) {
  var index = headers.indexOf(header);

  if (index < 0) {
    throw new Error('Falta el encabezado ' + header + ' en la hoja ' + schemaTable.sheet + '.');
  }

  return index;
}

function flattenColumn_(values) {
  return values.map(function (row) { return row[0]; });
}

function toColumn_(values) {
  return values.map(function (value) { return [value]; });
}

function emptyIdentifierMigrationReport_(schemaTable) {
  return {
    table: schemaTable.name,
    sheet: schemaTable.sheet,
    rowsProcessed: 0,
    uuidsAssigned: 0,
    updatedAtInitialized: 0,
    deletedInitialized: 0,
    rowsChanged: 0
  };
}
