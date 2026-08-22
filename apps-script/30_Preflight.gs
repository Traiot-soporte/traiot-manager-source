/**
 * Compara la estructura real de Google Sheets con la metadata compilada del
 * frontend. Este diagnostico es de solo lectura: no crea hojas ni columnas.
 */
function buildMigrationPreflight_() {
  var inventory = buildDriveInventory_();
  var reports = TRAIOT_SCHEMA_TABLES.map(function (schemaTable) {
    var match = inventory.matches.find(function (candidate) {
      return candidate.table === schemaTable.name;
    });

    if (!match || match.status === 'missing') {
      return buildMissingTableReport_(schemaTable);
    }

    if (match.status === 'duplicated') {
      return {
        table: schemaTable.name,
        sheet: schemaTable.sheet,
        newTable: schemaTable.newTable,
        status: 'ambiguous',
        candidates: match.candidates,
        blockers: ['Se encontraron varias hojas candidatas.']
      };
    }

    var sheetData = findInventorySheet_(inventory, match.candidates[0]);

    if (!sheetData) {
      return {
        table: schemaTable.name,
        sheet: schemaTable.sheet,
        newTable: schemaTable.newTable,
        status: 'inaccessible',
        candidates: match.candidates,
        blockers: ['No se pudo leer la hoja candidata.']
      };
    }

    return analyzeTablePreflight_(schemaTable, match.candidates[0], sheetData);
  });

  var blockingReports = reports.filter(function (report) {
    return ['missing-source', 'ambiguous', 'inaccessible', 'header-mismatch'].indexOf(report.status) >= 0;
  });

  return {
    mode: 'dry-run',
    writesPerformed: false,
    schemaVersion: getRuntimeConfig_().schemaVersion,
    summary: {
      spreadsheets: inventory.totals.spreadsheets,
      sheetsFound: inventory.totals.sheets,
      originalTablesExpected: TRAIOT_SCHEMA_TABLES.filter(function (table) {
        return !table.newTable;
      }).length,
      originalTablesReady: reports.filter(function (report) {
        return !report.newTable && report.status === 'ready';
      }).length,
      newTablesPending: reports.filter(function (report) {
        return report.newTable && report.status === 'pending-create';
      }).length,
      blockingTables: blockingReports.length,
      safeToPrepareMigration: blockingReports.length === 0
    },
    blockers: blockingReports.map(function (report) {
      return {
        table: report.table,
        status: report.status,
        details: report.blockers
      };
    }),
    tables: reports
  };
}

function buildMissingTableReport_(schemaTable) {
  if (schemaTable.newTable) {
    return {
      table: schemaTable.name,
      sheet: schemaTable.sheet,
      newTable: true,
      status: 'pending-create',
      rowCount: 0,
      currentHeaders: [],
      targetHeadersToAdd: schemaTable.targetHeaders,
      blockers: []
    };
  }

  return {
    table: schemaTable.name,
    sheet: schemaTable.sheet,
    newTable: false,
    status: 'missing-source',
    rowCount: 0,
    currentHeaders: [],
    missingSourceHeaders: schemaTable.sourceHeaders,
    targetHeadersToAdd: schemaTable.targetHeaders,
    blockers: ['No se encontro la hoja original.']
  };
}

function analyzeTablePreflight_(schemaTable, candidate, sheetData) {
  var headers = sheetData.headers.map(function (header) {
    return String(header);
  });
  var missingSourceHeaders = difference_(schemaTable.sourceHeaders, headers);
  var unrecognizedHeaders = difference_(headers, schemaTable.targetHeaders);
  var duplicateHeaders = findDuplicates_(headers);
  var targetHeadersToAdd = difference_(schemaTable.targetHeaders, headers);
  var presentTargetAdditions = schemaTable.targetHeaders.filter(function (header) {
    return schemaTable.sourceHeaders.indexOf(header) === -1 && headers.indexOf(header) >= 0;
  });
  var sourceOrderMatches = hasExpectedSourceOrder_(schemaTable.sourceHeaders, headers);
  var blockers = [];

  if (missingSourceHeaders.length > 0) {
    blockers.push('Faltan encabezados originales.');
  }
  if (unrecognizedHeaders.length > 0) {
    blockers.push('Existen encabezados no reconocidos.');
  }
  if (duplicateHeaders.length > 0) {
    blockers.push('Existen encabezados duplicados.');
  }
  if (!sourceOrderMatches) {
    blockers.push('El orden de los encabezados originales no coincide.');
  }

  return {
    table: schemaTable.name,
    sheet: schemaTable.sheet,
    newTable: schemaTable.newTable,
    status: blockers.length === 0 ? 'ready' : 'header-mismatch',
    spreadsheetId: candidate.spreadsheetId,
    spreadsheetName: candidate.spreadsheetName,
    sheetId: candidate.sheetId,
    sheetName: candidate.sheetName,
    rowCount: sheetData.rowCount,
    currentHeaders: headers,
    missingSourceHeaders: missingSourceHeaders,
    unrecognizedHeaders: unrecognizedHeaders,
    duplicateHeaders: duplicateHeaders,
    sourceOrderMatches: sourceOrderMatches,
    presentTargetAdditions: presentTargetAdditions,
    targetHeadersToAdd: targetHeadersToAdd,
    blockers: blockers
  };
}

function findInventorySheet_(inventory, candidate) {
  for (var spreadsheetIndex = 0; spreadsheetIndex < inventory.spreadsheets.length; spreadsheetIndex += 1) {
    var spreadsheet = inventory.spreadsheets[spreadsheetIndex];

    if (spreadsheet.id !== candidate.spreadsheetId) {
      continue;
    }

    for (var sheetIndex = 0; sheetIndex < spreadsheet.sheets.length; sheetIndex += 1) {
      if (spreadsheet.sheets[sheetIndex].id === candidate.sheetId) {
        return spreadsheet.sheets[sheetIndex];
      }
    }
  }

  return null;
}

function difference_(left, right) {
  return left.filter(function (value) {
    return right.indexOf(value) === -1;
  });
}

function findDuplicates_(values) {
  var seen = {};
  var duplicates = {};

  values.forEach(function (value) {
    if (seen[value]) {
      duplicates[value] = true;
    }
    seen[value] = true;
  });

  return Object.keys(duplicates);
}

function hasExpectedSourceOrder_(expectedHeaders, actualHeaders) {
  var expectedSet = {};

  expectedHeaders.forEach(function (header) {
    expectedSet[header] = true;
  });

  var actualSourceHeaders = actualHeaders.filter(function (header) {
    return expectedSet[header];
  });

  return JSON.stringify(actualSourceHeaders) === JSON.stringify(expectedHeaders);
}
