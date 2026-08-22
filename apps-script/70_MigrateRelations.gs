/**
 * Puebla exclusivamente referencias que tienen una coincidencia unica.
 * Las relaciones no resueltas se conservan vacias y sus textos fuente no se
 * modifican, de modo que puedan conciliarse posteriormente.
 */
function migrateExactRelations_() {
  var lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    throw new Error('Otra migracion se encuentra en curso. Intenta nuevamente en un minuto.');
  }

  try {
    var audit = buildDataMigrationAudit_();

    if (!audit.summary.safeToPopulateExactRelations) {
      throw new Error('La auditoria no permite poblar relaciones exactas. No se realizaron cambios.');
    }

    var backup = requirePreparationBackup_();
    var config = getRuntimeConfig_();
    var rootFolder = DriveApp.getFolderById(config.folderId);
    var spreadsheetId = resolveSourceSpreadsheetId_(rootFolder, config.spreadsheetId);
    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    var plan = buildExactRelationMigrationPlan_(spreadsheet);

    if (plan.summary.ambiguous > 0 || plan.summary.conflicts > 0 || plan.summary.invalidExisting > 0) {
      throw new Error('El plan contiene relaciones ambiguas o incompatibles. No se realizaron cambios.');
    }

    plan.operations.forEach(function (operation) {
      if (operation.report.populated > 0) {
        operation.range.setValues(toColumn_(operation.values));
      }
    });

    SpreadsheetApp.flush();

    var verificationPlan = buildExactRelationMigrationPlan_(spreadsheet);

    if (
      verificationPlan.summary.toPopulate !== 0 ||
      verificationPlan.summary.ambiguous !== 0 ||
      verificationPlan.summary.conflicts !== 0 ||
      verificationPlan.summary.invalidExisting !== 0
    ) {
      throw new Error('La verificacion posterior encontro relaciones exactas pendientes o incompatibles.');
    }

    var completedAt = new Date().toISOString();
    var result = {
      ok: true,
      mode: 'exact-relation-migration',
      completedAt: completedAt,
      backup: backup,
      summary: {
        relationsProcessed: plan.summary.relationsProcessed,
        rowsEvaluated: plan.summary.rowsEvaluated,
        populated: plan.summary.toPopulate,
        alreadyPopulated: plan.summary.alreadyPopulated,
        unresolved: plan.summary.unresolved,
        blank: plan.summary.blank,
        ambiguous: plan.summary.ambiguous,
        conflicts: plan.summary.conflicts,
        invalidExisting: plan.summary.invalidExisting
      },
      relations: plan.operations.map(function (operation) {
        return operation.report;
      }),
      verification: {
        toPopulate: verificationPlan.summary.toPopulate,
        alreadyPopulated: verificationPlan.summary.alreadyPopulated,
        unresolved: verificationPlan.summary.unresolved,
        ambiguous: verificationPlan.summary.ambiguous,
        conflicts: verificationPlan.summary.conflicts,
        invalidExisting: verificationPlan.summary.invalidExisting
      }
    };

    PropertiesService.getScriptProperties().setProperties({
      TRAIOT_EXACT_RELATIONS_MIGRATED_AT: completedAt,
      TRAIOT_LAST_EXACT_RELATION_MIGRATION_RESULT: JSON.stringify(result)
    });

    return result;
  } finally {
    lock.releaseLock();
  }
}

function buildExactRelationMigrationPlan_(spreadsheet) {
  var schemaTables = TRAIOT_SCHEMA_TABLES.filter(function (schemaTable) {
    return !schemaTable.newTable;
  });
  var datasetsByTable = {};

  schemaTables.forEach(function (schemaTable) {
    datasetsByTable[schemaTable.name] = readRelationMigrationDataset_(spreadsheet, schemaTable);
  });

  var operations = [];

  schemaTables.forEach(function (sourceSchema) {
    var sourceDataset = datasetsByTable[sourceSchema.name];

    sourceSchema.columns.filter(function (column) {
      return column.syncTo && column.refTable;
    }).forEach(function (column) {
      var targetDataset = datasetsByTable[column.refTable];

      if (!targetDataset) {
        throw new Error('No existe la tabla destino ' + column.refTable + '.');
      }

      operations.push(buildRelationMigrationOperation_(sourceDataset, column, targetDataset));
    });
  });

  return {
    operations: operations,
    summary: {
      relationsProcessed: operations.length,
      rowsEvaluated: sumRelationReports_(operations, 'rowsEvaluated'),
      toPopulate: sumRelationReports_(operations, 'populated'),
      alreadyPopulated: sumRelationReports_(operations, 'alreadyPopulated'),
      unresolved: sumRelationReports_(operations, 'unresolved'),
      blank: sumRelationReports_(operations, 'blank'),
      ambiguous: sumRelationReports_(operations, 'ambiguous'),
      conflicts: sumRelationReports_(operations, 'conflicts'),
      invalidExisting: sumRelationReports_(operations, 'invalidExisting')
    }
  };
}

function readRelationMigrationDataset_(spreadsheet, schemaTable) {
  var sheet = spreadsheet.getSheetByName(schemaTable.sheet);

  if (!sheet) {
    throw new Error('No se encontro la hoja ' + schemaTable.sheet + '.');
  }

  var displayValues = sheet.getDataRange().getDisplayValues();
  var headers = displayValues.length > 0 ? displayValues[0].map(String) : [];

  return {
    schema: schemaTable,
    sheet: sheet,
    headers: headers,
    displayRows: displayValues.slice(1),
    businessFlags: displayValues.slice(1).map(function (row) {
      return isBusinessRow_(row, headers, schemaTable);
    })
  };
}

function buildRelationMigrationOperation_(sourceDataset, column, targetDataset) {
  var sourceIndex = requireHeaderIndex_(sourceDataset.headers, column.sourceHeader, sourceDataset.schema);
  var targetColumnIndex = requireHeaderIndex_(sourceDataset.headers, column.syncTo, sourceDataset.schema);
  var rowCount = sourceDataset.displayRows.length;
  var range = sourceDataset.sheet.getRange(2, targetColumnIndex + 1, rowCount, 1);
  var currentValues = flattenColumn_(range.getValues());
  var targetLookup = buildTargetUuidLookup_(targetDataset);
  var update = buildRelationColumnUpdates_(
    sourceDataset.businessFlags,
    sourceDataset.displayRows.map(function (row) { return row[sourceIndex]; }),
    currentValues,
    targetLookup
  );

  return {
    range: range,
    values: update.values,
    report: {
      sourceTable: sourceDataset.schema.name,
      sourceColumn: column.name,
      targetColumn: column.syncTo,
      targetTable: column.refTable,
      rowsEvaluated: update.rowsEvaluated,
      populated: update.populated,
      alreadyPopulated: update.alreadyPopulated,
      unresolved: update.unresolved,
      blank: update.blank,
      ambiguous: update.ambiguous,
      conflicts: update.conflicts,
      invalidExisting: update.invalidExisting
    }
  };
}

function buildTargetUuidLookup_(targetDataset) {
  var uuidIndex = requireHeaderIndex_(targetDataset.headers, '_uuid', targetDataset.schema);
  var lookupColumns = [
    targetDataset.schema.legacyBusinessKey,
    targetDataset.schema.labelColumn
  ].filter(function (columnName, index, values) {
    return columnName && values.indexOf(columnName) === index;
  }).map(function (columnName) {
    return findSchemaColumn_(targetDataset.schema, columnName);
  }).filter(Boolean);
  var lookup = {};

  targetDataset.displayRows.forEach(function (row, rowIndex) {
    if (!targetDataset.businessFlags[rowIndex]) {
      return;
    }

    var uuid = normalizeCell_(row[uuidIndex]).toLowerCase();

    if (!isUuid_(uuid)) {
      throw new Error('La tabla ' + targetDataset.schema.name + ' contiene un UUID invalido.');
    }

    lookupColumns.forEach(function (lookupColumn) {
      var lookupIndex = targetDataset.headers.indexOf(lookupColumn.sourceHeader);
      var lookupValue = lookupIndex >= 0 ? normalizeLookupValue_(row[lookupIndex]) : '';

      if (!lookupValue) {
        return;
      }

      if (!lookup[lookupValue]) {
        lookup[lookupValue] = [];
      }

      if (lookup[lookupValue].indexOf(uuid) === -1) {
        lookup[lookupValue].push(uuid);
      }
    });
  });

  return lookup;
}

function buildRelationColumnUpdates_(businessFlags, sourceValues, existingValues, targetLookup) {
  if (
    sourceValues.length !== businessFlags.length ||
    existingValues.length !== businessFlags.length
  ) {
    throw new Error('Las columnas de relacion no tienen la misma cantidad de filas.');
  }

  var nextValues = existingValues.slice();
  var report = {
    rowsEvaluated: 0,
    populated: 0,
    alreadyPopulated: 0,
    unresolved: 0,
    blank: 0,
    ambiguous: 0,
    conflicts: 0,
    invalidExisting: 0
  };

  businessFlags.forEach(function (isBusinessRow, rowIndex) {
    if (!isBusinessRow) {
      return;
    }

    report.rowsEvaluated += 1;
    var existing = normalizeCell_(nextValues[rowIndex]).toLowerCase();

    if (existing && !isUuid_(existing)) {
      report.invalidExisting += 1;
      return;
    }

    var sourceValue = normalizeLookupValue_(sourceValues[rowIndex]);

    if (!sourceValue) {
      report.blank += 1;
      return;
    }

    var candidates = targetLookup[sourceValue] || [];

    if (candidates.length === 0) {
      report.unresolved += 1;
      return;
    }

    if (candidates.length > 1) {
      report.ambiguous += 1;
      return;
    }

    var targetUuid = candidates[0];

    if (!existing) {
      nextValues[rowIndex] = targetUuid;
      report.populated += 1;
    } else if (existing === targetUuid) {
      report.alreadyPopulated += 1;
    } else {
      report.conflicts += 1;
    }
  });

  return {
    values: nextValues,
    rowsEvaluated: report.rowsEvaluated,
    populated: report.populated,
    alreadyPopulated: report.alreadyPopulated,
    unresolved: report.unresolved,
    blank: report.blank,
    ambiguous: report.ambiguous,
    conflicts: report.conflicts,
    invalidExisting: report.invalidExisting
  };
}

function sumRelationReports_(operations, field) {
  return operations.reduce(function (total, operation) {
    return total + Number(operation.report[field] || 0);
  }, 0);
}
