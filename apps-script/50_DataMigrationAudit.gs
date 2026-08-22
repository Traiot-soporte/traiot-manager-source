/**
 * Audita filas y referencias antes de poblar UUID. No realiza escrituras.
 */
function buildDataMigrationAudit_() {
  var preflight = buildMigrationPreflight_();

  if (!preflight.summary.safeToPrepareMigration || preflight.summary.newTablesPending !== 0) {
    throw new Error('La estructura debe estar completamente preparada antes de auditar los datos.');
  }

  var config = getRuntimeConfig_();
  var rootFolder = DriveApp.getFolderById(config.folderId);
  var spreadsheetId = resolveSourceSpreadsheetId_(rootFolder, config.spreadsheetId);
  var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  var datasets = TRAIOT_SCHEMA_TABLES.filter(function (schemaTable) {
    return !schemaTable.newTable;
  }).map(function (schemaTable) {
    return readTableDataset_(spreadsheet, schemaTable);
  });
  var tableReports = datasets.map(auditTableRows_);
  var relationReports = auditRelations_(datasets);
  var summary = {
    tablesAudited: tableReports.length,
    rowsAudited: sumBy_(tableReports, 'rowCount'),
    uuidsToAssign: sumBy_(tableReports, 'uuidsToAssign'),
    invalidUuids: sumBy_(tableReports, 'invalidUuids'),
    duplicateUuids: sumBy_(tableReports, 'duplicateUuids'),
    blankBusinessKeys: sumBy_(tableReports, 'blankBusinessKeys'),
    duplicateBusinessKeys: sumBy_(tableReports, 'duplicateBusinessKeys'),
    requiredValuesMissing: sumBy_(tableReports, 'requiredValuesMissing'),
    relationsResolved: sumBy_(relationReports, 'resolved'),
    relationsUnresolved: sumBy_(relationReports, 'unresolved'),
    relationsAmbiguous: sumBy_(relationReports, 'ambiguous')
  };

  summary.safeToPopulateUuids = summary.invalidUuids === 0 && summary.duplicateUuids === 0;
  summary.safeToPopulateRelations = summary.relationsUnresolved === 0 && summary.relationsAmbiguous === 0;

  return {
    mode: 'data-migration-dry-run',
    writesPerformed: false,
    schemaVersion: config.schemaVersion,
    summary: summary,
    tables: tableReports,
    relations: relationReports,
    normalizations: buildNormalizationAudit_(datasets)
  };
}

function readTableDataset_(spreadsheet, schemaTable) {
  var sheet = spreadsheet.getSheetByName(schemaTable.sheet);

  if (!sheet) {
    throw new Error('No se encontro la hoja ' + schemaTable.sheet + '.');
  }

  var values = sheet.getDataRange().getDisplayValues();
  var headers = values.length > 0 ? values[0].map(String) : [];
  var rows = values.slice(1).filter(function (row) {
    return isBusinessRow_(row, headers, schemaTable);
  });

  return {
    schema: schemaTable,
    headers: headers,
    rows: rows
  };
}

function isBusinessRow_(row, headers, schemaTable) {
  return schemaTable.sourceHeaders.some(function (header) {
    var index = headers.indexOf(header);
    return index >= 0 && normalizeCell_(row[index]) !== '';
  });
}

function auditTableRows_(dataset) {
  var schemaTable = dataset.schema;
  var uuidIndex = dataset.headers.indexOf('_uuid');
  var uuidValues = uuidIndex >= 0
    ? dataset.rows.map(function (row) { return normalizeCell_(row[uuidIndex]); })
    : dataset.rows.map(function () { return ''; });
  var businessKeyColumn = findSchemaColumn_(schemaTable, schemaTable.legacyBusinessKey);
  var businessKeyIndex = businessKeyColumn
    ? dataset.headers.indexOf(businessKeyColumn.sourceHeader)
    : -1;
  var businessKeyValues = businessKeyIndex >= 0
    ? dataset.rows.map(function (row) { return normalizeCell_(row[businessKeyIndex]); })
    : [];
  var requiredMissingByColumn = {};

  schemaTable.columns.filter(function (column) {
    return column.required && column.origin === 'appsheet';
  }).forEach(function (column) {
    var columnIndex = dataset.headers.indexOf(column.sourceHeader);
    var missing = dataset.rows.filter(function (row) {
      return columnIndex < 0 || normalizeCell_(row[columnIndex]) === '';
    }).length;

    if (missing > 0) {
      requiredMissingByColumn[column.name] = missing;
    }
  });

  return {
    table: schemaTable.name,
    rowCount: dataset.rows.length,
    uuidsToAssign: uuidValues.filter(function (value) { return value === ''; }).length,
    invalidUuids: uuidValues.filter(function (value) {
      return value !== '' && !isUuid_(value);
    }).length,
    duplicateUuids: countDuplicateValues_(uuidValues),
    businessKey: schemaTable.legacyBusinessKey,
    businessKeyAvailable: businessKeyIndex >= 0,
    blankBusinessKeys: businessKeyIndex >= 0
      ? businessKeyValues.filter(function (value) { return value === ''; }).length
      : 0,
    duplicateBusinessKeys: businessKeyIndex >= 0
      ? countDuplicateValues_(businessKeyValues)
      : 0,
    requiredValuesMissing: Object.keys(requiredMissingByColumn).reduce(function (total, columnName) {
      return total + requiredMissingByColumn[columnName];
    }, 0),
    requiredMissingByColumn: requiredMissingByColumn
  };
}

function auditRelations_(datasets) {
  var datasetsByTable = {};

  datasets.forEach(function (dataset) {
    datasetsByTable[dataset.schema.name] = dataset;
  });

  var reports = [];

  datasets.forEach(function (sourceDataset) {
    sourceDataset.schema.columns.filter(function (column) {
      return column.syncTo && column.refTable;
    }).forEach(function (column) {
      var targetDataset = datasetsByTable[column.refTable];

      if (!targetDataset) {
        reports.push(buildMissingTargetRelationReport_(sourceDataset.schema, column));
        return;
      }

      reports.push(analyzeRelation_(sourceDataset, column, targetDataset));
    });
  });

  return reports;
}

function analyzeRelation_(sourceDataset, column, targetDataset) {
  var sourceIndex = sourceDataset.headers.indexOf(column.sourceHeader);
  var targetLookup = buildTargetLookup_(targetDataset);
  var resolved = 0;
  var unresolved = 0;
  var ambiguous = 0;
  var blank = 0;

  sourceDataset.rows.forEach(function (row) {
    var value = sourceIndex >= 0 ? normalizeLookupValue_(row[sourceIndex]) : '';

    if (!value) {
      blank += 1;
      return;
    }

    var candidates = targetLookup[value] || [];

    if (candidates.length === 1) {
      resolved += 1;
    } else if (candidates.length === 0) {
      unresolved += 1;
    } else {
      ambiguous += 1;
    }
  });

  return {
    sourceTable: sourceDataset.schema.name,
    sourceColumn: column.name,
    targetColumn: column.syncTo,
    targetTable: column.refTable,
    rows: sourceDataset.rows.length,
    blank: blank,
    resolved: resolved,
    unresolved: unresolved,
    ambiguous: ambiguous
  };
}

function buildTargetLookup_(targetDataset) {
  var lookup = {};
  var lookupColumns = [
    targetDataset.schema.legacyBusinessKey,
    targetDataset.schema.labelColumn
  ].filter(function (columnName, index, values) {
    return columnName && values.indexOf(columnName) === index;
  }).map(function (columnName) {
    return findSchemaColumn_(targetDataset.schema, columnName);
  }).filter(Boolean);

  targetDataset.rows.forEach(function (row, rowIndex) {
    lookupColumns.forEach(function (column) {
      var columnIndex = targetDataset.headers.indexOf(column.sourceHeader);
      var value = columnIndex >= 0 ? normalizeLookupValue_(row[columnIndex]) : '';

      if (!value) {
        return;
      }

      if (!lookup[value]) {
        lookup[value] = [];
      }

      if (lookup[value].indexOf(rowIndex) === -1) {
        lookup[value].push(rowIndex);
      }
    });
  });

  return lookup;
}

function buildMissingTargetRelationReport_(sourceSchema, column) {
  return {
    sourceTable: sourceSchema.name,
    sourceColumn: column.name,
    targetColumn: column.syncTo,
    targetTable: column.refTable,
    rows: 0,
    blank: 0,
    resolved: 0,
    unresolved: 0,
    ambiguous: 1
  };
}

function buildNormalizationAudit_(datasets) {
  return [
    buildValueDistribution_(datasets, 'Usuarios', 'UserActive'),
    buildValueDistribution_(datasets, 'PROVEEDORES', 'PAIS')
  ].filter(Boolean);
}

function buildValueDistribution_(datasets, tableName, columnName) {
  var dataset = datasets.find(function (candidate) {
    return candidate.schema.name === tableName;
  });

  if (!dataset) {
    return null;
  }

  var column = findSchemaColumn_(dataset.schema, columnName);
  var columnIndex = column ? dataset.headers.indexOf(column.sourceHeader) : -1;
  var counts = {};

  dataset.rows.forEach(function (row) {
    var value = columnIndex >= 0 ? normalizeCell_(row[columnIndex]) : '';
    var safeValue = value || '(VACIO)';
    counts[safeValue] = (counts[safeValue] || 0) + 1;
  });

  return {
    table: tableName,
    column: columnName,
    values: Object.keys(counts).sort().map(function (value) {
      return { value: value, count: counts[value] };
    })
  };
}

function findSchemaColumn_(schemaTable, columnName) {
  return schemaTable.columns.find(function (column) {
    return column.name === columnName;
  }) || null;
}

function normalizeCell_(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function normalizeLookupValue_(value) {
  return normalizeCell_(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function isUuid_(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function countDuplicateValues_(values) {
  var counts = {};

  values.filter(function (value) {
    return value !== '';
  }).forEach(function (value) {
    counts[value] = (counts[value] || 0) + 1;
  });

  return Object.keys(counts).filter(function (value) {
    return counts[value] > 1;
  }).length;
}

function sumBy_(reports, field) {
  return reports.reduce(function (total, report) {
    return total + Number(report[field] || 0);
  }, 0);
}
