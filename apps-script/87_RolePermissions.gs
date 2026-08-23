/**
 * Sincroniza la representacion visible de Perfiles con la matriz fija usada
 * para autorizar cada solicitud. Conserva UUID, credenciales y demas datos.
 */
var TRAIOT_ROLE_SECTION_LABELS = Object.freeze({
  'administracion-comercial': 'Administración Comercial',
  'crm': 'CRM',
  'ingenieria': 'Ingeniería',
  'tecnico': 'Técnico',
  'seguridad': 'Seguridad'
});

function rolePermissionMatrix_() {
  return ['Administrador', 'Gerencia', 'Soporte', 'Ventas', 'Tecnico'].map(function (role) {
    return {
      role: role,
      sections: apiSectionsForRole_(role),
      labels: apiSectionsForRole_(role).map(function (section) {
        return TRAIOT_ROLE_SECTION_LABELS[section];
      })
    };
  });
}

function sincronizarRolesYPermisos() {
  var result = syncRolePermissionMatrix_({
    role: 'Administrador',
    email: Session.getEffectiveUser().getEmail(),
    permissions: ['*']
  });
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function syncRolePermissionMatrix_(user) {
  assertAuthAdministrator_(user);
  var lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    throw new Error('Otra escritura se encuentra en curso. Intenta nuevamente en un momento.');
  }

  try {
    var spreadsheet = openConfiguredSpreadsheet_();
    var profilesSheet = requireApiSheet_(spreadsheet, requireApiTable_('Perfiles'));
    var usersSheet = requireApiSheet_(spreadsheet, requireApiTable_('Usuarios'));
    var profileResult = syncRoleProfiles_(profilesSheet);
    var userResult = syncUserRoles_(usersSheet, profileResult.profileUuids);
    SpreadsheetApp.flush();

    return {
      ok: true,
      matrix: rolePermissionMatrix_(),
      profilesUpdated: profileResult.updated,
      profilesCreated: profileResult.created,
      duplicateOrUnknownProfilesDisabled: profileResult.disabled,
      usersUpdated: userResult.updated,
      invalidUsers: userResult.invalidUsers
    };
  } finally {
    lock.releaseLock();
  }
}

function syncRoleProfiles_(sheet) {
  var headers = readApiHeaders_(sheet);
  var roleColumn = requireRoleHeaderColumn_(headers, 'PerfilID');
  var sectionsColumn = requireRoleHeaderColumn_(headers, 'VistasPermitidas');
  var uuidColumn = requireRoleHeaderColumn_(headers, '_uuid');
  var updatedColumn = requireRoleHeaderColumn_(headers, '_updatedAt');
  var deletedColumn = requireRoleHeaderColumn_(headers, '_deleted');
  var values = sheet.getDataRange().getValues();
  var matrix = rolePermissionMatrix_();
  var claimedRows = {};
  var profileUuids = {};
  var updated = 0;
  var created = 0;
  var disabled = 0;

  matrix.forEach(function (entry) {
    var rowNumber = 0;

    for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
      if (claimedRows[rowIndex + 1]) continue;
      if (canonicalApiRole_(values[rowIndex][roleColumn - 1]) !== entry.role) continue;
      if (normalizeApiBoolean_(values[rowIndex][deletedColumn - 1]) === true) continue;
      rowNumber = rowIndex + 1;
      break;
    }

    if (!rowNumber) {
      rowNumber = Math.max(sheet.getLastRow() + 1, 2);
      sheet.insertRowAfter(rowNumber - 1);
      if (rowNumber > 2) {
        sheet.getRange(rowNumber - 1, 1, 1, headers.length)
          .copyTo(sheet.getRange(rowNumber, 1, 1, headers.length), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
      }
      created += 1;
    }

    claimedRows[rowNumber] = true;
    var uuid = normalizeCell_(sheet.getRange(rowNumber, uuidColumn).getValue()) ||
      Utilities.getUuid().toLowerCase();
    profileUuids[entry.role] = uuid;
    writeRoleCell_(sheet, rowNumber, roleColumn, entry.role);
    writeRoleCell_(sheet, rowNumber, sectionsColumn, entry.labels.join(', '));
    writeRoleCell_(sheet, rowNumber, uuidColumn, uuid);
    writeRoleCell_(sheet, rowNumber, updatedColumn, new Date().toISOString());
    writeRoleCell_(sheet, rowNumber, deletedColumn, false);
    updated += 1;
  });

  for (var existingRow = 2; existingRow <= sheet.getLastRow(); existingRow += 1) {
    if (claimedRows[existingRow]) continue;
    var currentRole = normalizeCell_(sheet.getRange(existingRow, roleColumn).getValue());
    if (!currentRole) continue;
    writeRoleCell_(sheet, existingRow, deletedColumn, true);
    writeRoleCell_(sheet, existingRow, updatedColumn, new Date().toISOString());
    disabled += 1;
  }

  return {
    profileUuids: profileUuids,
    updated: updated,
    created: created,
    disabled: disabled
  };
}

function syncUserRoles_(sheet, profileUuids) {
  var headers = readApiHeaders_(sheet);
  var roleColumn = requireRoleHeaderColumn_(headers, 'UserRole');
  var profileColumn = requireRoleHeaderColumn_(headers, 'perfil_uuid');
  var emailColumn = requireRoleHeaderColumn_(headers, 'UserEmail');
  var deletedColumn = requireRoleHeaderColumn_(headers, '_deleted');
  var lastRow = sheet.getLastRow();
  var updated = 0;
  var invalidUsers = [];

  for (var rowNumber = 2; rowNumber <= lastRow; rowNumber += 1) {
    if (normalizeApiBoolean_(sheet.getRange(rowNumber, deletedColumn).getValue()) === true) continue;
    var currentRole = sheet.getRange(rowNumber, roleColumn).getValue();
    var canonicalRole = canonicalApiRole_(currentRole);

    if (!canonicalRole) {
      invalidUsers.push(normalizeApiEmail_(sheet.getRange(rowNumber, emailColumn).getValue()));
      continue;
    }

    var expectedProfileUuid = profileUuids[canonicalRole];
    var currentProfileUuid = normalizeCell_(sheet.getRange(rowNumber, profileColumn).getValue());
    if (normalizeCell_(currentRole) !== canonicalRole || currentProfileUuid !== expectedProfileUuid) {
      writeRoleCell_(sheet, rowNumber, roleColumn, canonicalRole);
      writeRoleCell_(sheet, rowNumber, profileColumn, expectedProfileUuid);
      updated += 1;
    }
  }

  return { updated: updated, invalidUsers: invalidUsers.filter(Boolean) };
}

function requireRoleHeaderColumn_(headers, name) {
  var index = headers.indexOf(name);
  if (index < 0) throw new Error('Falta el encabezado ' + name + ' para sincronizar roles.');
  return index + 1;
}

function writeRoleCell_(sheet, row, column, value) {
  var range = sheet.getRange(row, column);
  if (String(range.getValue()) !== String(value)) range.setValue(value);
}
