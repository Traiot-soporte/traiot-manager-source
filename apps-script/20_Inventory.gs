/**
 * Genera un inventario de solo lectura de todos los Google Sheets ubicados en
 * la carpeta configurada y sus subcarpetas. No modifica hojas ni archivos.
 */
function buildDriveInventory_() {
  var config = getRuntimeConfig_();
  var rootFolder = DriveApp.getFolderById(config.folderId);
  var spreadsheets = [];

  collectSpreadsheets_(rootFolder, rootFolder.getName(), spreadsheets);

  var matches = matchExpectedTables_(spreadsheets);

  return {
    folder: {
      id: rootFolder.getId(),
      name: rootFolder.getName()
    },
    totals: {
      spreadsheets: spreadsheets.length,
      sheets: spreadsheets.reduce(function (total, spreadsheet) {
        return total + spreadsheet.sheets.length;
      }, 0),
      expectedTables: TRAIOT_EXPECTED_TABLES.length,
      matchedTables: matches.filter(function (match) {
        return match.status !== 'missing';
      }).length
    },
    matches: matches,
    spreadsheets: spreadsheets
  };
}

function collectSpreadsheets_(folder, relativePath, destination) {
  var files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);

  while (files.hasNext()) {
    var file = files.next();

    try {
      destination.push(inspectSpreadsheet_(file, relativePath));
    } catch (error) {
      destination.push({
        id: file.getId(),
        name: file.getName(),
        path: relativePath,
        url: file.getUrl(),
        error: error && error.message ? error.message : String(error),
        sheets: []
      });
    }
  }

  var folders = folder.getFolders();

  while (folders.hasNext()) {
    var child = folders.next();
    collectSpreadsheets_(child, relativePath + '/' + child.getName(), destination);
  }
}

function inspectSpreadsheet_(file, relativePath) {
  var spreadsheet = SpreadsheetApp.openById(file.getId());

  return {
    id: file.getId(),
    name: file.getName(),
    path: relativePath,
    url: file.getUrl(),
    lastUpdated: file.getLastUpdated().toISOString(),
    sheets: spreadsheet.getSheets().map(function (sheet) {
      var lastColumn = sheet.getLastColumn();
      var lastRow = sheet.getLastRow();
      var headers = lastColumn > 0
        ? sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
        : [];

      return {
        id: sheet.getSheetId(),
        name: sheet.getName(),
        rowCount: Math.max(lastRow - 1, 0),
        columnCount: headers.length,
        headers: headers
      };
    })
  };
}

function matchExpectedTables_(spreadsheets) {
  var candidates = {};

  spreadsheets.forEach(function (spreadsheet) {
    spreadsheet.sheets.forEach(function (sheet) {
      var candidate = {
        spreadsheetId: spreadsheet.id,
        spreadsheetName: spreadsheet.name,
        sheetId: sheet.id,
        sheetName: sheet.name,
        rowCount: sheet.rowCount,
        columnCount: sheet.columnCount
      };

      addCandidate_(candidates, normalizeName_(sheet.name), candidate);

      if (spreadsheet.sheets.length === 1) {
        addCandidate_(candidates, normalizeName_(spreadsheet.name), candidate);
      }
    });
  });

  return TRAIOT_EXPECTED_TABLES.map(function (tableName) {
    var tableCandidates = candidates[normalizeName_(tableName)] || [];
    var uniqueCandidates = dedupeCandidates_(tableCandidates);

    return {
      table: tableName,
      status: uniqueCandidates.length === 0
        ? 'missing'
        : uniqueCandidates.length === 1 ? 'matched' : 'duplicated',
      candidates: uniqueCandidates
    };
  });
}

function addCandidate_(index, key, candidate) {
  if (!index[key]) {
    index[key] = [];
  }

  index[key].push(candidate);
}

function dedupeCandidates_(candidates) {
  var seen = {};

  return candidates.filter(function (candidate) {
    var key = candidate.spreadsheetId + ':' + candidate.sheetId;

    if (seen[key]) {
      return false;
    }

    seen[key] = true;
    return true;
  });
}

function normalizeName_(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Funcion manual para autorizar Drive/Sheets y revisar el inventario en Logs.
 */
function diagnosticarCarpeta() {
  var inventory = buildDriveInventory_();
  console.log(JSON.stringify(inventory, null, 2));
  return inventory;
}
