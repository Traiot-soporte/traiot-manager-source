/**
 * Puente privado utilizado por la interfaz alojada en este mismo Web App.
 * google.script.run invoca esta funcion sin exponer credenciales ni depender
 * de solicitudes CORS desde otro dominio.
 */
function apiRequest(request) {
  var safeRequest = request || {};
  var action = String(safeRequest.action || '').toLowerCase();
  var user = resolveApiUser_();

  if (action === 'current-user') {
    return serializeApiUser_(user);
  }

  if (action === 'summaries') {
    return buildApiSummaries_(user);
  }

  if (action === 'list') {
    var listTable = requireApiTable_(safeRequest.table);
    assertApiTableAccess_(user, listTable);
    return listApiRows_(listTable);
  }

  if (action === 'get') {
    var getTable = requireApiTable_(safeRequest.table);
    assertApiTableAccess_(user, getTable);
    return getApiRow_(getTable, String(safeRequest.rowUuid || ''));
  }

  if (action === 'media') {
    var mediaTable = requireApiTable_(safeRequest.table);
    assertApiTableAccess_(user, mediaTable);
    return readApiMedia_(mediaTable, String(safeRequest.value || ''));
  }

  if (action === 'create') {
    var createTable = requireApiTable_(safeRequest.table);
    return createApiRow_(user, createTable, safeRequest.values, safeRequest.mutationId);
  }

  if (action === 'update') {
    var updateTable = requireApiTable_(safeRequest.table);
    return updateApiRow_(
      user,
      updateTable,
      String(safeRequest.rowUuid || ''),
      safeRequest.changes,
      safeRequest.mutationId
    );
  }

  if (action === 'delete') {
    var deleteTable = requireApiTable_(safeRequest.table);
    return deleteApiRow_(
      user,
      deleteTable,
      String(safeRequest.rowUuid || ''),
      safeRequest.mutationId
    );
  }

  throw new Error('La accion de lectura solicitada no existe.');
}

function resolveApiUser_() {
  var properties = PropertiesService.getScriptProperties();
  var authMode = properties.getProperty('TRAIOT_AUTH_MODE') || 'OWNER_ONLY';
  var ownerEmail = normalizeApiEmail_(
    properties.getProperty('TRAIOT_OWNER_EMAIL') || Session.getEffectiveUser().getEmail()
  );

  if (authMode === 'OWNER_ONLY') {
    if (!ownerEmail) {
      throw new Error('No fue posible identificar a la cuenta propietaria.');
    }

    return {
      email: ownerEmail,
      role: 'ADMIN',
      permissions: ['*']
    };
  }

  var activeEmail = normalizeApiEmail_(Session.getActiveUser().getEmail());

  if (!activeEmail) {
    throw new Error('No fue posible identificar la cuenta de Google activa.');
  }

  return findAuthorizedSheetUser_(activeEmail);
}

function findAuthorizedSheetUser_(email) {
  var spreadsheet = openConfiguredSpreadsheet_();
  var usuariosSchema = requireApiTable_('Usuarios');
  var usuariosRows = readApiRows_(spreadsheet, usuariosSchema);
  var userRow = usuariosRows.filter(function (row) {
    return normalizeApiEmail_(row.UserEmail) === email;
  })[0];

  if (!userRow || userRow.UserActive !== true) {
    throw new Error('La cuenta no esta registrada como usuario activo.');
  }

  var role = normalizeCell_(userRow.UserRole);
  var perfilesSchema = requireApiTable_('Perfiles');
  var perfilesRows = readApiRows_(spreadsheet, perfilesSchema);
  var profile = perfilesRows.filter(function (row) {
    return normalizeLookupValue_(row.PerfilID) === normalizeLookupValue_(role) ||
      normalizeCell_(row._uuid) === normalizeCell_(userRow.perfil_uuid);
  })[0];
  var permissions = profile && Array.isArray(profile.VistasPermitidas)
    ? profile.VistasPermitidas
    : splitApiList_(profile ? profile.VistasPermitidas : '');

  return {
    email: email,
    role: role || 'USUARIO',
    permissions: permissions
  };
}

function serializeApiUser_(user) {
  return {
    email: user.email,
    role: user.role,
    permissions: user.permissions.slice()
  };
}

function buildApiSummaries_(user) {
  var spreadsheet = openConfiguredSpreadsheet_();

  return TRAIOT_SCHEMA_TABLES.filter(function (schemaTable) {
    return canApiViewTable_(user, schemaTable);
  }).map(function (schemaTable) {
    return {
      name: schemaTable.name,
      module: schemaTable.module,
      description: schemaTable.description,
      icon: schemaTable.icon,
      rowCount: countApiRows_(spreadsheet, schemaTable)
    };
  });
}

function listApiRows_(schemaTable) {
  return readApiRows_(openConfiguredSpreadsheet_(), schemaTable);
}

function getApiRow_(schemaTable, rowUuid) {
  if (!isUuid_(rowUuid)) {
    return null;
  }

  var normalizedUuid = rowUuid.toLowerCase();
  var rows = listApiRows_(schemaTable);

  return rows.filter(function (row) {
    return normalizeCell_(row._uuid).toLowerCase() === normalizedUuid;
  })[0] || null;
}

function openConfiguredSpreadsheet_() {
  var config = getRuntimeConfig_();
  var rootFolder = DriveApp.getFolderById(config.folderId);
  var spreadsheetId = resolveSourceSpreadsheetId_(rootFolder, config.spreadsheetId);
  return SpreadsheetApp.openById(spreadsheetId);
}

function readApiRows_(spreadsheet, schemaTable) {
  var sheet = spreadsheet.getSheetByName(schemaTable.sheet);

  if (!sheet) {
    throw new Error('No se encontro la hoja ' + schemaTable.sheet + '.');
  }

  return mapApiRowsFromValues_(schemaTable, sheet.getDataRange().getValues());
}

function mapApiRowsFromValues_(schemaTable, values) {
  if (!values || values.length === 0) {
    return [];
  }

  var headers = values[0].map(String);

  return values.slice(1).filter(function (row) {
    return isApiBusinessRow_(row, headers, schemaTable);
  }).map(function (row) {
    return mapApiRecordFromRow_(schemaTable, headers, row, true);
  }).filter(function (row) {
    return row._deleted !== true;
  });
}

function mapApiRecordFromRow_(schemaTable, headers, row, preferTechnicalReferences) {
  var record = {};

  schemaTable.columns.filter(function (column) {
    return !column.virtual;
  }).forEach(function (column) {
    var columnIndex = headers.indexOf(column.sourceHeader || column.name);

    if (columnIndex >= 0) {
      record[column.name] = serializeApiCell_(row[columnIndex], column);
    }
  });

  if (preferTechnicalReferences) {
    schemaTable.columns.filter(function (column) {
      return column.syncTo;
    }).forEach(function (column) {
      var technicalValue = record[column.syncTo];

      if (normalizeCell_(technicalValue) !== '') {
        record[column.name] = technicalValue;
      }
    });
  }

  return record;
}

function isApiBusinessRow_(row, headers, schemaTable) {
  var uuidIndex = headers.indexOf('_uuid');

  return (uuidIndex >= 0 && normalizeCell_(row[uuidIndex]) !== '') ||
    isBusinessRow_(row, headers, schemaTable);
}

function serializeApiCell_(value, column) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (Object.prototype.toString.call(value) === '[object Date]') {
    return value.toISOString();
  }

  if (column.type === 'Bool') {
    return normalizeApiBoolean_(value);
  }

  if (column.type === 'EnumList' || column.type === 'List') {
    return Array.isArray(value) ? value.slice() : splitApiList_(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  return String(value);
}

function normalizeApiBoolean_(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  var normalized = normalizeLookupValue_(value);

  if (['TRUE', 'VERDADERO', 'SI', '1', 'YES'].indexOf(normalized) >= 0) {
    return true;
  }

  if (['FALSE', 'FALSO', 'NO', '0'].indexOf(normalized) >= 0) {
    return false;
  }

  return null;
}

function splitApiList_(value) {
  return normalizeCell_(value).split(/\s*,\s*/).filter(function (item) {
    return item !== '';
  });
}

function countApiRows_(spreadsheet, schemaTable) {
  return readApiRows_(spreadsheet, schemaTable).length;
}

function requireApiTable_(tableName) {
  var normalizedName = String(tableName || '');
  var schemaTable = TRAIOT_SCHEMA_TABLES.filter(function (candidate) {
    return candidate.name === normalizedName;
  })[0];

  if (!schemaTable) {
    throw new Error('Tabla no registrada: ' + normalizedName);
  }

  return schemaTable;
}

function assertApiTableAccess_(user, schemaTable) {
  if (!canApiViewTable_(user, schemaTable)) {
    throw new Error('La cuenta no tiene permiso para consultar ' + schemaTable.name + '.');
  }
}

function canApiViewTable_(user, schemaTable) {
  if (user.permissions.indexOf('*') >= 0) {
    return true;
  }

  var requestedPermission = normalizeLookupValue_(schemaTable.permissionView || schemaTable.name);

  return user.permissions.some(function (permission) {
    return normalizeLookupValue_(permission) === requestedPermission;
  });
}

function normalizeApiEmail_(value) {
  return normalizeCell_(value).toLowerCase();
}
