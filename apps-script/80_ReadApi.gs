/**
 * Puente privado utilizado por la interfaz alojada en este mismo Web App.
 * google.script.run invoca esta funcion sin exponer credenciales ni depender
 * de solicitudes CORS desde otro dominio.
 */
var TRAIOT_ROLE_SECTIONS = Object.freeze({
  ADMINISTRADOR: Object.freeze([
    'administracion-comercial',
    'crm',
    'ingenieria',
    'tecnico',
    'seguridad'
  ]),
  GERENCIA: Object.freeze(['administracion-comercial', 'crm', 'ingenieria', 'tecnico']),
  SOPORTE: Object.freeze(['crm', 'ingenieria', 'tecnico']),
  VENTAS: Object.freeze(['crm']),
  TECNICO: Object.freeze(['tecnico'])
});

var TRAIOT_TABLE_SECTIONS = Object.freeze({
  'ALMACEN': 'administracion-comercial',
  'KARDEX': 'administracion-comercial',
  'COMPRAS': 'administracion-comercial',
  'PEDIDOS': 'administracion-comercial',
  'PROVEEDORES': 'administracion-comercial',
  'CLIENTES': 'crm',
  'Gestion Clientes': 'crm',
  'Ticket Soporte': 'ingenieria',
  'Laboratorio': 'ingenieria',
  'INSTALACIONES': 'tecnico',
  'instalacion_fotos': 'tecnico',
  'instalacion_tanques': 'tecnico',
  'instalacion_checklist': 'tecnico',
  'MATRIZ DISPOSITIVOS': 'ingenieria',
  'Perfiles': 'seguridad',
  'Usuarios': 'seguridad',
  'Menu': 'seguridad'
});

function apiRequest(request) {
  var safeRequest = request || {};
  var action = String(safeRequest.action || '').toLowerCase();

  if (action === 'auth-status') {
    return getPublicAuthStatus_();
  }

  if (action === 'login') {
    return loginWithSheetPassword_(
      safeRequest.email,
      safeRequest.password,
      safeRequest.remember
    );
  }

  if (action === 'logout') {
    return logoutSheetSession_(safeRequest.sessionToken);
  }

  var user = resolveApiUser_(safeRequest.sessionToken);

  if (action === 'change-password') {
    return changeSheetPassword_(
      user,
      safeRequest.sessionToken,
      safeRequest.currentPassword,
      safeRequest.nextPassword
    );
  }

  if (action === 'current-user') {
    return serializeApiUser_(user);
  }

  if (user.mustChangePassword) {
    throw new Error('Debes cambiar la contraseña temporal antes de continuar.');
  }

  if (action === 'auth-admin-status') {
    return getAuthAdminStatus_(user);
  }

  if (action === 'auth-security-users') {
    return listAuthSecurityUsers_(user);
  }

  if (action === 'auth-initialize') {
    return initializeSheetAuthentication_(user);
  }

  if (action === 'auth-set-password') {
    return setTemporaryPassword_(
      user,
      String(safeRequest.userUuid || ''),
      safeRequest.password
    );
  }

  if (action === 'auth-unlock-user') {
    return unlockAuthUser_(user, String(safeRequest.userUuid || ''));
  }

  if (action === 'auth-revoke-sessions') {
    return revokeAuthUserSessions_(user, String(safeRequest.userUuid || ''));
  }

  if (action === 'auth-set-user-active') {
    return setAuthUserActive_(
      user,
      String(safeRequest.userUuid || ''),
      safeRequest.active === true
    );
  }

  if (action === 'auth-activate') {
    return activateSheetAuthentication_(user);
  }

  if (action === 'auth-sync-role-matrix') {
    return syncRolePermissionMatrix_(user);
  }

  if (action === 'meeting-participants') {
    return listMeetingParticipants_(user);
  }

  if (action === 'meeting-list') {
    return listCompanyMeetings_(user);
  }

  if (action === 'meeting-create') {
    return createCompanyMeeting_(
      user,
      safeRequest.meeting,
      safeRequest.mutationId
    );
  }

  if (action === 'communication-list') {
    return listScheduledCommunications_(user);
  }

  if (action === 'communication-create') {
    return createScheduledCommunication_(
      user,
      safeRequest.communication,
      safeRequest.mutationId
    );
  }

  if (action === 'communication-status') {
    return updateScheduledCommunicationStatus_(
      user,
      safeRequest.communicationUuid,
      safeRequest.status,
      safeRequest.mutationId
    );
  }

  if (action === 'summaries') {
    return buildApiSummaries_(user);
  }

  if (action === 'list') {
    var listTable = requireApiTable_(safeRequest.table);
    assertApiTableAccess_(user, listTable);
    return listApiRows_(listTable, user);
  }

  if (action === 'get') {
    var getTable = requireApiTable_(safeRequest.table);
    assertApiTableAccess_(user, getTable);
    return getApiRow_(getTable, String(safeRequest.rowUuid || ''), user);
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

function resolveApiUser_(sessionToken) {
  var properties = PropertiesService.getScriptProperties();
  var authMode = properties.getProperty('TRAIOT_AUTH_MODE') || 'OWNER_ONLY';
  var ownerEmail = normalizeApiEmail_(
    properties.getProperty('TRAIOT_OWNER_EMAIL') || Session.getEffectiveUser().getEmail()
  );

  if (authMode === 'OWNER_ONLY') {
    if (properties.getProperty('TRAIOT_PUBLIC_AUTH_REQUIRED') === 'true') {
      throw new Error('El acceso web se encuentra bloqueado hasta reactivar la autenticacion.');
    }

    if (!ownerEmail) {
      throw new Error('No fue posible identificar a la cuenta propietaria.');
    }

    return {
      userUuid: '',
      email: ownerEmail,
      name: 'Administrador',
      role: 'ADMIN',
      mustChangePassword: false,
      permissions: ['*']
    };
  }

  if (authMode === TRAIOT_AUTH_MODE_PASSWORD) {
    return resolveSheetSessionUser_(sessionToken);
  }

  if (authMode === 'LOCKED') {
    throw new Error('El acceso web se encuentra temporalmente deshabilitado.');
  }

  var activeEmail = normalizeApiEmail_(Session.getActiveUser().getEmail());

  if (!activeEmail) {
    throw new Error('No fue posible identificar la cuenta activa.');
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

  var role = canonicalApiRole_(userRow.UserRole);

  if (!role) {
    throw new Error('El usuario no tiene uno de los cinco roles autorizados.');
  }

  return {
    email: email,
    role: role,
    permissions: buildApiRolePermissions_(role)
  };
}

function serializeApiUser_(user) {
  return {
    userUuid: user.userUuid || '',
    email: user.email,
    name: user.name || '',
    role: user.role,
    mustChangePassword: Boolean(user.mustChangePassword),
    permissions: user.permissions.slice()
  };
}

function buildApiSummaries_(user) {
  var spreadsheet = openConfiguredSpreadsheet_();
  ensureInventoryStorage_(spreadsheet, false);

  return TRAIOT_SCHEMA_TABLES.filter(function (schemaTable) {
    return canApiViewTable_(user, schemaTable);
  }).map(function (schemaTable) {
    return {
      name: schemaTable.name,
      module: schemaTable.module,
      description: schemaTable.description,
      icon: schemaTable.icon,
      rowCount: schemaTable.name === 'Gestion Clientes'
        ? readVisibleApiRows_(spreadsheet, schemaTable, user).length
        : countApiRows_(spreadsheet, schemaTable)
    };
  });
}

function listApiRows_(schemaTable, user) {
  var spreadsheet = openConfiguredSpreadsheet_();
  if (schemaTable.name === 'ALMACEN' || schemaTable.name === 'KARDEX') {
    ensureInventoryStorage_(spreadsheet, false);
  }
  return readVisibleApiRows_(spreadsheet, schemaTable, user);
}

function getApiRow_(schemaTable, rowUuid, user) {
  if (!isUuid_(rowUuid)) {
    return null;
  }

  var normalizedUuid = rowUuid.toLowerCase();
  var rows = listApiRows_(schemaTable, user);

  return rows.filter(function (row) {
    return normalizeCell_(row._uuid).toLowerCase() === normalizedUuid;
  })[0] || null;
}

function readVisibleApiRows_(spreadsheet, schemaTable, user) {
  if (schemaTable.name === 'COMPRAS') {
    ensurePurchaseIdNomenclature_(spreadsheet, false);
  }
  if (schemaTable.name === 'PEDIDOS') {
    ensureOrderIdNomenclature_(spreadsheet, false);
  }
  if (schemaTable.name === 'COMPRAS' || schemaTable.name === 'PEDIDOS') {
    ensureProductCategoryStorage_(spreadsheet, false);
  }
  if (schemaTable.name === 'ALMACEN' || schemaTable.name === 'KARDEX') {
    ensureInventoryStorage_(spreadsheet, false);
  }
  if (schemaTable.name === 'Gestion Clientes') {
    ensureCrmCalendarStorage_(spreadsheet, false);
    ensureCrmContactStorage_(spreadsheet, false);
  }
  if (schemaTable.name === 'CLIENTES' || schemaTable.name === 'Gestion Clientes') {
    ensureCrmLifecycleStorage_(spreadsheet, false);
  }

  var rows = readApiRows_(spreadsheet, schemaTable);
  if (schemaTable.name === 'PEDIDOS') {
    rows = enrichOrderClientCompanyRows_(spreadsheet, rows);
  }
  if (schemaTable.name === 'Gestion Clientes') {
    rows = enrichCrmLifecycleRows_(spreadsheet, rows);
    return rows.filter(function (row) { return isCrmCalendarRowVisible_(row, user); });
  }
  return rows;
}

function enrichOrderClientCompanyRows_(spreadsheet, rows) {
  var clientRows = readApiRows_(spreadsheet, requireApiTable_('CLIENTES'));
  var companiesByUuid = {};

  clientRows.forEach(function (client) {
    var uuid = normalizeCell_(client._uuid).toLowerCase();
    if (!uuid) return;
    companiesByUuid[uuid] = normalizeCell_(client['RAZON SOCIAL']) ||
      normalizeCell_(client['ID CLIENTE']);
  });

  return rows.map(function (row) {
    var clientUuid = normalizeCell_(row.cliente_uuid).toLowerCase();
    if (clientUuid && companiesByUuid[clientUuid]) {
      row['RAZON SOCIAL'] = companiesByUuid[clientUuid];
    }
    return row;
  });
}

function isCrmCalendarRowVisible_(row, user) {
  if (normalizeCrmCalendarScope_(row && row.Calendario) !== 'Personal') {
    return true;
  }

  var ownerUuid = normalizeCell_(row && row._calendarOwnerUuid).toLowerCase();
  var userUuid = normalizeCell_(user && user.userUuid).toLowerCase();
  return Boolean(ownerUuid && userUuid && ownerUuid === userUuid);
}

function normalizeCrmCalendarScope_(value) {
  return normalizeLookupValue_(value) === 'PERSONAL' ? 'Personal' : 'Empresarial';
}

function ensureCrmCalendarStorage_(spreadsheet, force) {
  var propertyKey = 'TRAIOT_CRM_CALENDAR_STORAGE_V1';
  var properties = PropertiesService.getScriptProperties();

  if (!force && properties.getProperty(propertyKey) === 'true') {
    return { migrated: false, ready: true };
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    if (!force && properties.getProperty(propertyKey) === 'true') {
      return { migrated: false, ready: true };
    }

    var schemaTable = requireApiTable_('Gestion Clientes');
    var sheet = requireApiSheet_(spreadsheet, schemaTable);
    var headers = readApiHeaders_(sheet);
    var requiredHeaders = ['Calendario', '_calendarOwnerUuid'];
    var addedHeaders = [];

    requiredHeaders.forEach(function (header) {
      if (headers.indexOf(header) < 0) {
        sheet.getRange(1, headers.length + 1).setValue(header);
        headers.push(header);
        addedHeaders.push(header);
      }
    });

    var rowsMigrated = 0;
    var lastRow = sheet.getLastRow();
    var scopeColumn = headers.indexOf('Calendario') + 1;

    if (lastRow > 1 && scopeColumn > 0) {
      var scopeRange = sheet.getRange(2, scopeColumn, lastRow - 1, 1);
      var scopes = scopeRange.getValues();

      scopes.forEach(function (row) {
        if (!normalizeCell_(row[0])) {
          row[0] = 'Empresarial';
          rowsMigrated += 1;
        }
      });

      if (rowsMigrated > 0) {
        scopeRange.setValues(scopes);
      }
    }

    SpreadsheetApp.flush();
    properties.setProperty(propertyKey, 'true');
    return {
      migrated: addedHeaders.length > 0 || rowsMigrated > 0,
      ready: true,
      addedHeaders: addedHeaders,
      rowsMigrated: rowsMigrated
    };
  } finally {
    lock.releaseLock();
  }
}

function migrarCalendariosCrm() {
  return ensureCrmCalendarStorage_(openConfiguredSpreadsheet_(), true);
}

var TRAIOT_EXECUTION_SPREADSHEET_CACHE = null;

function openConfiguredSpreadsheet_() {
  if (TRAIOT_EXECUTION_SPREADSHEET_CACHE) {
    return TRAIOT_EXECUTION_SPREADSHEET_CACHE;
  }
  var config = getRuntimeConfig_();
  var rootFolder = DriveApp.getFolderById(config.folderId);
  var spreadsheetId = resolveSourceSpreadsheetId_(rootFolder, config.spreadsheetId);
  TRAIOT_EXECUTION_SPREADSHEET_CACHE = SpreadsheetApp.openById(spreadsheetId);
  return TRAIOT_EXECUTION_SPREADSHEET_CACHE;
}

function readApiRows_(spreadsheet, schemaTable) {
  var sheet = spreadsheet.getSheetByName(schemaTable.sheet);

  if (!sheet) {
    throw new Error('No se encontro la informacion de ' + schemaTable.name + '.');
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
    return !column.virtual && !column.sensitive;
  }).forEach(function (column) {
    var columnIndex = findApiHeaderIndex_(headers, column.sourceHeader || column.name);

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

function findApiHeaderIndex_(headers, expectedHeader) {
  var exactIndex = headers.indexOf(expectedHeader);
  if (exactIndex >= 0) return exactIndex;

  var expectedKey = normalizeApiHeaderKey_(expectedHeader);
  for (var index = 0; index < headers.length; index += 1) {
    if (normalizeApiHeaderKey_(headers[index]) === expectedKey) return index;
  }
  return -1;
}

function normalizeApiHeaderKey_(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
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
    return serializeApiListCell_(value, column);
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

function splitApiListByCatalog_(value, column) {
  var rawValue = normalizeCell_(value);

  if (!rawValue || !column || !column.values || column.values.length === 0) {
    return splitApiList_(value);
  }

  var normalizedValue = normalizeLookupValue_(rawValue);
  var matches = column.values.map(function (option) {
    var normalizedOption = normalizeLookupValue_(option);
    return {
      option: option,
      normalized: normalizedOption,
      position: normalizedValue.indexOf(normalizedOption)
    };
  }).filter(function (match) {
    return match.position >= 0;
  });

  if (matches.length === 0) {
    return splitApiList_(value);
  }

  var remainder = normalizedValue;
  matches.slice().sort(function (left, right) {
    return right.normalized.length - left.normalized.length;
  }).forEach(function (match) {
    remainder = remainder.replace(match.normalized, '');
  });
  remainder = remainder.replace(/[\s,;|/]+/g, '');

  if (remainder !== '') {
    return splitApiList_(value);
  }

  return matches.sort(function (left, right) {
    return left.position - right.position;
  }).map(function (match) {
    return match.option;
  });
}

function serializeApiListCell_(value, column) {
  var values = Array.isArray(value) ? value.slice() : splitApiListByCatalog_(value, column);

  if (column.name === 'Responsable') {
    values = values.reduce(function (result, item) {
      return result.concat(normalizeCell_(item).split(/\s*\/\s*/));
    }, []).filter(function (item) {
      return item !== '';
    });
  }

  if (!column.values || column.values.length === 0) {
    return values;
  }

  return values.map(function (item) {
    var normalized = normalizeLookupValue_(item);
    var canonical = column.values.filter(function (option) {
      return normalizeLookupValue_(option) === normalized;
    })[0];
    return canonical || String(item);
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
  var section = TRAIOT_TABLE_SECTIONS[schemaTable.name];
  return Boolean(section && canApiRoleAccessSection_(user.role, section));
}

function canonicalApiRole_(role) {
  var normalized = normalizeLookupValue_(role);

  if (normalized === 'ADMIN' || normalized === 'ADMINISTRADOR') return 'Administrador';
  if (normalized === 'GERENCIA') return 'Gerencia';
  if (normalized === 'SOPORTE') return 'Soporte';
  if (normalized === 'VENTAS') return 'Ventas';
  if (normalized === 'TECNICO') return 'Tecnico';
  return '';
}

function apiRoleKey_(role) {
  return normalizeLookupValue_(canonicalApiRole_(role));
}

function apiSectionsForRole_(role) {
  var sections = TRAIOT_ROLE_SECTIONS[apiRoleKey_(role)];
  return sections ? sections.slice() : [];
}

function canApiRoleAccessSection_(role, section) {
  return apiSectionsForRole_(role).indexOf(section) >= 0;
}

function buildApiRolePermissions_(role) {
  if (apiRoleKey_(role) === 'ADMINISTRADOR') {
    return ['*'];
  }

  var permissions = [];
  TRAIOT_SCHEMA_TABLES.forEach(function (schemaTable) {
    if (!canApiViewTable_({ role: role }, schemaTable)) {
      return;
    }

    var permission = schemaTable.permissionView || schemaTable.name;
    var normalizedPermission = normalizeLookupValue_(permission);
    var alreadyPresent = permissions.some(function (candidate) {
      return normalizeLookupValue_(candidate) === normalizedPermission;
    });

    if (!alreadyPresent) {
      permissions.push(permission);
    }
  });

  return permissions;
}

function normalizeApiEmail_(value) {
  return normalizeCell_(value).toLowerCase();
}
