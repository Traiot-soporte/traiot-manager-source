var TRAIOT_AUTH_MODE_PASSWORD = 'SHEET_PASSWORD';
var TRAIOT_AUTH_USERS_SHEET = 'Usuarios';
var TRAIOT_AUTH_SESSIONS_SHEET = '_AuthSessions';
var TRAIOT_AUTH_AUDIT_SHEET = '_AuthAudit';
var TRAIOT_AUTH_MAX_ATTEMPTS = 5;
var TRAIOT_AUTH_LOCK_MINUTES = 15;
var TRAIOT_AUTH_BCRYPT_ROUNDS = 11;
var TRAIOT_AUTH_USER_HEADERS = Object.freeze([
  'PasswordHash',
  'PasswordUpdatedAt',
  'MustChangePassword',
  'FailedAttempts',
  'LockedUntil',
  'LastLoginAt',
  'SessionVersion'
]);
var TRAIOT_AUTH_SESSION_HEADERS = Object.freeze([
  'SessionHash',
  'UserUuid',
  'SessionVersion',
  'CreatedAt',
  'ExpiresAt',
  'RevokedAt',
  'LastSeenAt'
]);
var TRAIOT_AUTH_AUDIT_HEADERS = Object.freeze([
  'Timestamp',
  'EmailHash',
  'UserUuid',
  'Event',
  'Success',
  'Detail',
  'ActorUserUuid'
]);

function getPublicAuthStatus_() {
  var properties = PropertiesService.getScriptProperties();
  var mode = properties.getProperty('TRAIOT_AUTH_MODE') || 'OWNER_ONLY';

  return {
    mode: mode,
    passwordLoginActive: mode === TRAIOT_AUTH_MODE_PASSWORD,
    configured: Boolean(properties.getProperty('TRAIOT_AUTH_CONFIGURED_AT'))
  };
}

function initializeSheetAuthentication_(adminUser) {
  assertAuthAdministrator_(adminUser);
  var lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    throw new Error('Otra configuracion se encuentra en curso. Intenta nuevamente.');
  }

  try {
    var spreadsheet = openConfiguredSpreadsheet_();
    var usuariosSheet = requireAuthSheet_(spreadsheet, TRAIOT_AUTH_USERS_SHEET);
    appendHeaders_(usuariosSheet, TRAIOT_AUTH_USER_HEADERS.filter(function (header) {
      return readApiHeaders_(usuariosSheet).indexOf(header) < 0;
    }));
    ensureAuthInternalSheet_(spreadsheet, TRAIOT_AUTH_SESSIONS_SHEET, TRAIOT_AUTH_SESSION_HEADERS);
    ensureAuthInternalSheet_(spreadsheet, TRAIOT_AUTH_AUDIT_SHEET, TRAIOT_AUTH_AUDIT_HEADERS);
    ensureAuthSecrets_();

    var configuredAt = new Date().toISOString();
    PropertiesService.getScriptProperties().setProperty('TRAIOT_AUTH_CONFIGURED_AT', configuredAt);
    SpreadsheetApp.flush();
    writeAuthAudit_(spreadsheet, '', adminUser.userUuid || '', 'AUTH_INITIALIZED', true, '', adminUser.userUuid);
    return buildAuthAdminStatus_(spreadsheet);
  } finally {
    lock.releaseLock();
  }
}

function getAuthAdminStatus_(adminUser) {
  assertAuthAdministrator_(adminUser);
  var properties = PropertiesService.getScriptProperties();

  if (!properties.getProperty('TRAIOT_AUTH_CONFIGURED_AT')) {
    return {
      configured: false,
      mode: properties.getProperty('TRAIOT_AUTH_MODE') || 'OWNER_ONLY',
      activeUsers: 0,
      credentialsReady: 0,
      duplicates: [],
      usersMissingPassword: []
    };
  }

  return buildAuthAdminStatus_(openConfiguredSpreadsheet_());
}

function listAuthSecurityUsers_(adminUser) {
  assertAuthAdministrator_(adminUser);
  var spreadsheet = openConfiguredSpreadsheet_();
  ensureAuthReady_(spreadsheet);
  var now = Date.now();
  var sessions = readAuthSessions_(spreadsheet);

  return readAuthUsers_(spreadsheet).map(function (user) {
    var sessionVersion = authNumber_(user.SessionVersion);
    var activeSessions = sessions.filter(function (session) {
      return normalizeCell_(session.UserUuid) === normalizeCell_(user._uuid) &&
        !session.RevokedAt && authDateMillis_(session.ExpiresAt) > now &&
        authNumber_(session.SessionVersion) === sessionVersion;
    }).length;
    var lockedUntil = normalizeCell_(user.LockedUntil);

    return {
      userUuid: normalizeCell_(user._uuid),
      userId: normalizeCell_(user.UserID),
      name: normalizeCell_(user.UserName),
      email: normalizeApiEmail_(user.UserEmail),
      role: normalizeCell_(user.UserRole),
      active: user.UserActive === true,
      credentialConfigured: Boolean(normalizeCell_(user.PasswordHash)),
      mustChangePassword: user.MustChangePassword === true,
      failedAttempts: authNumber_(user.FailedAttempts),
      locked: authDateMillis_(lockedUntil) > now,
      lockedUntil: lockedUntil,
      lastLoginAt: normalizeCell_(user.LastLoginAt),
      passwordUpdatedAt: normalizeCell_(user.PasswordUpdatedAt),
      activeSessions: activeSessions
    };
  });
}

function unlockAuthUser_(adminUser, userUuid) {
  return mutateAuthSecurityUser_(adminUser, userUuid, function (spreadsheet, user) {
    writeAuthUserFields_(user, { FailedAttempts: 0, LockedUntil: '' });
    writeAuthAudit_(
      spreadsheet,
      user.UserEmail,
      user._uuid,
      'ACCOUNT_UNLOCKED',
      true,
      '',
      adminUser.userUuid
    );
    return { unlocked: true };
  });
}

function revokeAuthUserSessions_(adminUser, userUuid) {
  return mutateAuthSecurityUser_(adminUser, userUuid, function (spreadsheet, user) {
    var now = new Date().toISOString();
    var nextVersion = authNumber_(user.SessionVersion) + 1;
    writeAuthUserFields_(user, { SessionVersion: nextVersion });
    revokeAuthSessionsForUser_(spreadsheet, user._uuid, now);
    writeAuthAudit_(
      spreadsheet,
      user.UserEmail,
      user._uuid,
      'SESSIONS_REVOKED',
      true,
      '',
      adminUser.userUuid
    );
    return { sessionsRevoked: true };
  });
}

function setAuthUserActive_(adminUser, userUuid, active) {
  var nextActive = active === true;

  if (!nextActive && normalizeCell_(adminUser.userUuid) === normalizeCell_(userUuid)) {
    throw new Error('No puedes desactivar tu propia cuenta administrativa.');
  }

  return mutateAuthSecurityUser_(adminUser, userUuid, function (spreadsheet, user) {
    var now = new Date().toISOString();
    var nextVersion = authNumber_(user.SessionVersion) + 1;
    writeAuthUserFields_(user, {
      UserActive: nextActive,
      FailedAttempts: 0,
      LockedUntil: '',
      SessionVersion: nextVersion
    });
    revokeAuthSessionsForUser_(spreadsheet, user._uuid, now);
    writeAuthAudit_(
      spreadsheet,
      user.UserEmail,
      user._uuid,
      nextActive ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED',
      true,
      '',
      adminUser.userUuid
    );
    return { active: nextActive, sessionsRevoked: true };
  });
}

function mutateAuthSecurityUser_(adminUser, userUuid, callback) {
  assertAuthAdministrator_(adminUser);
  var lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    throw new Error('Otra operacion de seguridad se encuentra en curso. Intenta nuevamente.');
  }

  try {
    var spreadsheet = openConfiguredSpreadsheet_();
    ensureAuthReady_(spreadsheet);
    var user = findAuthUserByUuid_(spreadsheet, userUuid);

    if (!user) {
      throw new Error('No se encontro el usuario solicitado.');
    }

    var result = callback(spreadsheet, user);
    SpreadsheetApp.flush();
    return result;
  } finally {
    lock.releaseLock();
  }
}

function setTemporaryPassword_(adminUser, userUuid, password) {
  assertAuthAdministrator_(adminUser);
  validateAuthPassword_(password);
  var lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    throw new Error('Otra operacion de acceso se encuentra en curso. Intenta nuevamente.');
  }

  try {
    var spreadsheet = openConfiguredSpreadsheet_();
    ensureAuthReady_(spreadsheet);
    var userRecord = findAuthUserByUuid_(spreadsheet, userUuid);

    if (!userRecord) {
      throw new Error('No se encontro el usuario solicitado.');
    }

    var now = new Date().toISOString();
    var nextVersion = authNumber_(userRecord.SessionVersion) + 1;
    writeAuthUserFields_(userRecord, {
      PasswordHash: hashAuthPassword_(password),
      PasswordUpdatedAt: now,
      MustChangePassword: true,
      FailedAttempts: 0,
      LockedUntil: '',
      SessionVersion: nextVersion
    });
    revokeAuthSessionsForUser_(spreadsheet, userRecord._uuid, now);
    writeAuthAudit_(spreadsheet, userRecord.UserEmail, userRecord._uuid, 'PASSWORD_TEMPORARY_SET', true, '', adminUser.userUuid);
    SpreadsheetApp.flush();

    return {
      userUuid: userRecord._uuid,
      email: userRecord.UserEmail,
      mustChangePassword: true,
      passwordConfigured: true
    };
  } finally {
    lock.releaseLock();
  }
}

function activateSheetAuthentication_(adminUser) {
  assertAuthAdministrator_(adminUser);
  var lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    throw new Error('Otra configuracion se encuentra en curso. Intenta nuevamente.');
  }

  try {
    var spreadsheet = openConfiguredSpreadsheet_();
    ensureAuthReady_(spreadsheet);
    var status = buildAuthAdminStatus_(spreadsheet);

    if (status.duplicates.length > 0) {
      throw new Error('No se puede activar: existen correos duplicados en Usuarios.');
    }

    if (status.usersMissingPassword.length > 0) {
      throw new Error('No se puede activar: hay usuarios activos sin contraseña temporal.');
    }

    PropertiesService.getScriptProperties().setProperties({
      TRAIOT_AUTH_MODE: TRAIOT_AUTH_MODE_PASSWORD,
      TRAIOT_PUBLIC_AUTH_REQUIRED: 'true'
    });
    writeAuthAudit_(spreadsheet, adminUser.email, adminUser.userUuid || '', 'AUTH_ACTIVATED', true, '', adminUser.userUuid);

    return {
      activated: true,
      mode: TRAIOT_AUTH_MODE_PASSWORD,
      activeUsers: status.activeUsers
    };
  } finally {
    lock.releaseLock();
  }
}

function loginWithSheetPassword_(email, password, remember) {
  if (getPublicAuthStatus_().mode !== TRAIOT_AUTH_MODE_PASSWORD) {
    throw new Error('El acceso por contraseña aun no se encuentra activo.');
  }

  var normalizedEmail = normalizeApiEmail_(email);
  var submittedPassword = String(password || '');

  if (!isAuthEmail_(normalizedEmail) || !submittedPassword || submittedPassword.length > 200) {
    throwInvalidAuthCredentials_();
  }

  var rateKey = 'auth-attempt:' + hashAuthValue_(normalizedEmail).slice(0, 32);
  var rateCache = CacheService.getScriptCache();
  var rateAttempts = authNumber_(rateCache.get(rateKey));

  if (rateAttempts >= TRAIOT_AUTH_MAX_ATTEMPTS * 2) {
    throwInvalidAuthCredentials_();
  }

  var lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    throw new Error('El acceso esta ocupado. Intenta nuevamente en un momento.');
  }

  try {
    var spreadsheet = openConfiguredSpreadsheet_();
    ensureAuthReady_(spreadsheet);
    var candidates = findAuthUsersByEmail_(spreadsheet, normalizedEmail);
    var userRecord = candidates.length === 1 ? candidates[0] : null;
    var now = new Date();
    var locked = userRecord && authDateMillis_(userRecord.LockedUntil) > now.getTime();
    var configuredHash = userRecord ? normalizeCell_(userRecord.PasswordHash) : '';
    var comparisonHash = configuredHash || getAuthDummyHash_();
    var validPassword = compareAuthPassword_(submittedPassword, comparisonHash);
    var validUser = Boolean(
      userRecord &&
      userRecord.UserActive === true &&
      candidates.length === 1 &&
      configuredHash &&
      !locked &&
      validPassword
    );

    if (!validUser) {
      rateAttempts += 1;
      rateCache.put(rateKey, String(rateAttempts), TRAIOT_AUTH_LOCK_MINUTES * 60);

      if (userRecord && userRecord.UserActive === true) {
        registerAuthFailure_(spreadsheet, userRecord, now);
      } else {
        writeAuthAudit_(spreadsheet, normalizedEmail, '', 'LOGIN_FAILED', false, 'INVALID_CREDENTIALS');
      }

      SpreadsheetApp.flush();
      throwInvalidAuthCredentials_();
    }

    rateCache.remove(rateKey);
    writeAuthUserFields_(userRecord, {
      FailedAttempts: 0,
      LockedUntil: '',
      LastLoginAt: now.toISOString()
    });
    var session = createAuthSession_(spreadsheet, userRecord, Boolean(remember));
    var apiUser = buildApiUserFromAuthRecord_(spreadsheet, userRecord);
    writeAuthAudit_(spreadsheet, normalizedEmail, userRecord._uuid, 'LOGIN_SUCCEEDED', true, '');
    SpreadsheetApp.flush();
    return serializeAuthLoginResult_(session, apiUser);
  } finally {
    lock.releaseLock();
  }
}

function resolveSheetSessionUser_(sessionToken) {
  var normalizedToken = String(sessionToken || '');

  if (normalizedToken.length < 64 || normalizedToken.length > 256) {
    throw new Error('La sesion no es valida o ya vencio.');
  }

  var spreadsheet = openConfiguredSpreadsheet_();
  var session = findAuthSession_(spreadsheet, hashAuthToken_(normalizedToken));
  var now = new Date();

  if (!session || session.RevokedAt || authDateMillis_(session.ExpiresAt) <= now.getTime()) {
    throw new Error('La sesion no es valida o ya vencio.');
  }

  var userRecord = findAuthUserByUuid_(spreadsheet, session.UserUuid);

  if (!userRecord || userRecord.UserActive !== true ||
      authNumber_(userRecord.SessionVersion) !== authNumber_(session.SessionVersion)) {
    throw new Error('La sesion no es valida o ya vencio.');
  }

  return buildApiUserFromAuthRecord_(spreadsheet, userRecord);
}

function logoutSheetSession_(sessionToken) {
  var token = String(sessionToken || '');

  if (token.length < 64 || token.length > 256) {
    return { loggedOut: true };
  }

  var lock = LockService.getScriptLock();

  if (!lock.tryLock(10000)) {
    return { loggedOut: true };
  }

  try {
    var spreadsheet = openConfiguredSpreadsheet_();
    var session = findAuthSession_(spreadsheet, hashAuthToken_(token));

    if (session && !session.RevokedAt) {
      writeAuthSessionFields_(session, { RevokedAt: new Date().toISOString() });
      writeAuthAudit_(spreadsheet, '', session.UserUuid, 'LOGOUT', true, '');
      SpreadsheetApp.flush();
    }

    return { loggedOut: true };
  } finally {
    lock.releaseLock();
  }
}

function changeSheetPassword_(apiUser, sessionToken, currentPassword, nextPassword) {
  validateAuthPassword_(nextPassword);

  if (String(currentPassword || '') === String(nextPassword || '')) {
    throw new Error('La contraseña nueva debe ser diferente a la actual.');
  }

  var lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    throw new Error('Otra operacion de acceso se encuentra en curso. Intenta nuevamente.');
  }

  try {
    var spreadsheet = openConfiguredSpreadsheet_();
    var userRecord = findAuthUserByUuid_(spreadsheet, apiUser.userUuid);

    if (!userRecord) {
      throw new Error('La cuenta ya no se encuentra disponible.');
    }

    if (shouldRequireCurrentAuthPassword_(apiUser, userRecord) &&
        !compareAuthPassword_(String(currentPassword || ''), userRecord.PasswordHash)) {
      throw new Error('La contraseña actual no es correcta.');
    }

    if (compareAuthPassword_(String(nextPassword || ''), userRecord.PasswordHash)) {
      throw new Error('La contraseña nueva debe ser diferente a la temporal o actual.');
    }

    var now = new Date().toISOString();
    var nextVersion = authNumber_(userRecord.SessionVersion) + 1;
    writeAuthUserFields_(userRecord, {
      PasswordHash: hashAuthPassword_(String(nextPassword)),
      PasswordUpdatedAt: now,
      MustChangePassword: false,
      FailedAttempts: 0,
      LockedUntil: '',
      SessionVersion: nextVersion
    });
    revokeAuthSessionsForUser_(spreadsheet, userRecord._uuid, now);
    userRecord.SessionVersion = nextVersion;
    userRecord.MustChangePassword = false;
    var session = createAuthSession_(spreadsheet, userRecord, false);
    var nextApiUser = buildApiUserFromAuthRecord_(spreadsheet, userRecord);
    writeAuthAudit_(spreadsheet, userRecord.UserEmail, userRecord._uuid, 'PASSWORD_CHANGED', true, '');
    SpreadsheetApp.flush();
    return serializeAuthLoginResult_(session, nextApiUser);
  } finally {
    lock.releaseLock();
  }
}

function ensureAuthReady_(spreadsheet) {
  var properties = PropertiesService.getScriptProperties();

  if (!properties.getProperty('TRAIOT_AUTH_CONFIGURED_AT')) {
    throw new Error('La autenticacion aun no ha sido preparada.');
  }

  requireAuthSheet_(spreadsheet, TRAIOT_AUTH_USERS_SHEET);
  ensureAuthInternalSheet_(
    spreadsheet,
    TRAIOT_AUTH_SESSIONS_SHEET,
    TRAIOT_AUTH_SESSION_HEADERS
  );
  ensureAuthInternalSheet_(
    spreadsheet,
    TRAIOT_AUTH_AUDIT_SHEET,
    TRAIOT_AUTH_AUDIT_HEADERS
  );
  ensureAuthSecrets_();
}

function ensureAuthSecrets_() {
  var properties = PropertiesService.getScriptProperties();
  var pepper = properties.getProperty('TRAIOT_AUTH_PEPPER');

  if (!pepper) {
    pepper = generateAuthToken_();
    properties.setProperty('TRAIOT_AUTH_PEPPER', pepper);
  }

  configureAuthBcryptRandom_();

  if (!properties.getProperty('TRAIOT_AUTH_DUMMY_HASH')) {
    properties.setProperty(
      'TRAIOT_AUTH_DUMMY_HASH',
      bcrypt.hashSync(prehashAuthPassword_(generateAuthToken_()), TRAIOT_AUTH_BCRYPT_ROUNDS)
    );
  }
}

function configureAuthBcryptRandom_() {
  bcrypt.setRandomFallback(function (length) {
    var result = [];

    while (result.length < length) {
      var seed = Utilities.getUuid() + Utilities.getUuid() + new Date().toISOString();
      var digest = Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        seed,
        Utilities.Charset.UTF_8
      );
      digest.forEach(function (value) {
        if (result.length < length) {
          result.push(value < 0 ? value + 256 : value);
        }
      });
    }

    return result;
  });
}

function hashAuthPassword_(password) {
  ensureAuthSecrets_();
  return bcrypt.hashSync(prehashAuthPassword_(password), TRAIOT_AUTH_BCRYPT_ROUNDS);
}

function compareAuthPassword_(password, passwordHash) {
  try {
    ensureAuthSecrets_();
    return bcrypt.compareSync(prehashAuthPassword_(password), String(passwordHash || ''));
  } catch (error) {
    return false;
  }
}

function prehashAuthPassword_(password) {
  var pepper = PropertiesService.getScriptProperties().getProperty('TRAIOT_AUTH_PEPPER') || '';
  var signature = Utilities.computeHmacSha256Signature(
    String(password || ''),
    pepper,
    Utilities.Charset.UTF_8
  );
  return Utilities.base64Encode(signature);
}

function getAuthDummyHash_() {
  ensureAuthSecrets_();
  return PropertiesService.getScriptProperties().getProperty('TRAIOT_AUTH_DUMMY_HASH');
}

function validateAuthPassword_(password) {
  var value = String(password || '');
  var valid = value === value.trim() && value.length >= 12 && value.length <= 128 &&
    /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value) &&
    /[^A-Za-z0-9]/.test(value);

  if (!valid) {
    throw new Error(
      'La contraseña debe tener de 12 a 128 caracteres, sin espacios al inicio o final, mayuscula, minuscula, numero y simbolo.'
    );
  }
}

function shouldRequireCurrentAuthPassword_(apiUser, userRecord) {
  return !(apiUser && apiUser.mustChangePassword === true &&
    userRecord && userRecord.MustChangePassword === true);
}

function createAuthSession_(spreadsheet, userRecord, remember) {
  var sheet = requireAuthSheet_(spreadsheet, TRAIOT_AUTH_SESSIONS_SHEET);
  var token = generateAuthToken_();
  var createdAt = new Date();
  var duration = userRecord.MustChangePassword === true
    ? 30 * 60 * 1000
    : (remember ? 7 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000);
  var expiresAt = new Date(createdAt.getTime() + duration);
  var row = [
    hashAuthToken_(token),
    userRecord._uuid,
    authNumber_(userRecord.SessionVersion),
    createdAt.toISOString(),
    expiresAt.toISOString(),
    '',
    createdAt.toISOString()
  ];
  sheet.appendRow(row);

  return {
    token: token,
    expiresAt: expiresAt.toISOString()
  };
}

function serializeAuthLoginResult_(session, apiUser) {
  return {
    token: session.token,
    expiresAt: session.expiresAt,
    mustChangePassword: Boolean(apiUser.mustChangePassword),
    user: serializeApiUser_(apiUser)
  };
}

function generateAuthToken_() {
  return [Utilities.getUuid(), Utilities.getUuid(), Utilities.getUuid(), Utilities.getUuid()]
    .join('')
    .replace(/-/g, '');
}

function hashAuthToken_(token) {
  return hashAuthValue_(String(token || '') + ':' +
    (PropertiesService.getScriptProperties().getProperty('TRAIOT_AUTH_PEPPER') || ''));
}

function hashAuthValue_(value) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value || ''),
    Utilities.Charset.UTF_8
  );
  return Utilities.base64EncodeWebSafe(digest).replace(/=+$/g, '');
}

function registerAuthFailure_(spreadsheet, userRecord, now) {
  var attempts = authNumber_(userRecord.FailedAttempts) + 1;
  var lockedUntil = attempts >= TRAIOT_AUTH_MAX_ATTEMPTS
    ? new Date(now.getTime() + TRAIOT_AUTH_LOCK_MINUTES * 60 * 1000).toISOString()
    : '';
  writeAuthUserFields_(userRecord, {
    FailedAttempts: attempts,
    LockedUntil: lockedUntil
  });
  writeAuthAudit_(
    spreadsheet,
    userRecord.UserEmail,
    userRecord._uuid,
    'LOGIN_FAILED',
    false,
    lockedUntil ? 'ACCOUNT_TEMPORARILY_LOCKED' : 'INVALID_CREDENTIALS'
  );
}

function throwInvalidAuthCredentials_() {
  throw new Error('No fue posible iniciar sesion. Revisa tus datos o espera unos minutos.');
}

function buildAuthAdminStatus_(spreadsheet) {
  var users = readAuthUsers_(spreadsheet).filter(function (user) {
    return user.UserActive === true;
  });
  var emailCounts = {};

  users.forEach(function (user) {
    var email = normalizeApiEmail_(user.UserEmail);
    emailCounts[email] = (emailCounts[email] || 0) + 1;
  });

  return {
    configured: true,
    mode: PropertiesService.getScriptProperties().getProperty('TRAIOT_AUTH_MODE') || 'OWNER_ONLY',
    activeUsers: users.length,
    credentialsReady: users.filter(function (user) {
      return Boolean(normalizeCell_(user.PasswordHash));
    }).length,
    duplicates: Object.keys(emailCounts).filter(function (email) {
      return !email || emailCounts[email] > 1;
    }),
    usersMissingPassword: users.filter(function (user) {
      return !normalizeCell_(user.PasswordHash);
    }).map(function (user) {
      return { userUuid: user._uuid, name: user.UserName, email: user.UserEmail };
    })
  };
}

function buildApiUserFromAuthRecord_(spreadsheet, userRecord) {
  var role = canonicalApiRole_(userRecord.UserRole);

  if (!role) {
    throw new Error('El usuario no tiene uno de los cinco roles autorizados.');
  }

  return {
    userUuid: userRecord._uuid,
    email: normalizeApiEmail_(userRecord.UserEmail),
    name: normalizeCell_(userRecord.UserName) || normalizeCell_(userRecord.UserID),
    role: role,
    mustChangePassword: userRecord.MustChangePassword === true,
    permissions: buildApiRolePermissions_(role)
  };
}

function readAuthUsers_(spreadsheet) {
  var sheet = requireAuthSheet_(spreadsheet, TRAIOT_AUTH_USERS_SHEET);
  var values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return [];
  }

  var headers = values[0].map(String);
  return values.slice(1).map(function (row, index) {
    var record = { rowNumber: index + 2, sheet: sheet, headers: headers };
    headers.forEach(function (header, columnIndex) {
      record[header] = row[columnIndex];
    });
    record.UserActive = normalizeApiBoolean_(record.UserActive) === true;
    record.MustChangePassword = normalizeApiBoolean_(record.MustChangePassword) === true;
    return record;
  }).filter(function (record) {
    return normalizeCell_(record._uuid) !== '';
  });
}

function findAuthUsersByEmail_(spreadsheet, email) {
  return readAuthUsers_(spreadsheet).filter(function (user) {
    return normalizeApiEmail_(user.UserEmail) === email;
  });
}

function findAuthUserByUuid_(spreadsheet, userUuid) {
  var normalizedUuid = normalizeCell_(userUuid).toLowerCase();
  return readAuthUsers_(spreadsheet).filter(function (user) {
    return normalizeCell_(user._uuid).toLowerCase() === normalizedUuid;
  })[0] || null;
}

function writeAuthUserFields_(userRecord, fields) {
  Object.keys(fields).forEach(function (header) {
    var columnIndex = requireAuthHeaderIndex_(userRecord.headers, header);
    userRecord.sheet.getRange(userRecord.rowNumber, columnIndex + 1).setValue(fields[header]);
    userRecord[header] = fields[header];
  });
}

function readAuthSessions_(spreadsheet) {
  var sheet = requireAuthSheet_(spreadsheet, TRAIOT_AUTH_SESSIONS_SHEET);
  var values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return [];
  }

  var headers = values[0].map(String);
  return values.slice(1).map(function (row, index) {
    var record = { rowNumber: index + 2, sheet: sheet, headers: headers };
    headers.forEach(function (header, columnIndex) {
      record[header] = row[columnIndex];
    });
    return record;
  }).filter(function (record) {
    return normalizeCell_(record.SessionHash) !== '';
  });
}

function findAuthSession_(spreadsheet, sessionHash) {
  return readAuthSessions_(spreadsheet).filter(function (session) {
    return constantTimeAuthEqual_(normalizeCell_(session.SessionHash), sessionHash);
  })[0] || null;
}

function writeAuthSessionFields_(sessionRecord, fields) {
  Object.keys(fields).forEach(function (header) {
    var columnIndex = requireAuthHeaderIndex_(sessionRecord.headers, header);
    sessionRecord.sheet.getRange(sessionRecord.rowNumber, columnIndex + 1).setValue(fields[header]);
    sessionRecord[header] = fields[header];
  });
}

function revokeAuthSessionsForUser_(spreadsheet, userUuid, revokedAt) {
  readAuthSessions_(spreadsheet).filter(function (session) {
    return normalizeCell_(session.UserUuid) === normalizeCell_(userUuid) && !session.RevokedAt;
  }).forEach(function (session) {
    writeAuthSessionFields_(session, { RevokedAt: revokedAt });
  });
}

function writeAuthAudit_(spreadsheet, email, userUuid, eventName, success, detail, actorUserUuid) {
  var sheet = requireAuthSheet_(spreadsheet, TRAIOT_AUTH_AUDIT_SHEET);
  sheet.appendRow([
    new Date().toISOString(),
    email ? hashAuthValue_(normalizeApiEmail_(email)) : '',
    userUuid || '',
    eventName,
    Boolean(success),
    detail || '',
    actorUserUuid || ''
  ]);
}

function ensureAuthInternalSheet_(spreadsheet, sheetName, headers) {
  var sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else {
    var existingHeaders = readApiHeaders_(sheet);
    appendHeaders_(sheet, headers.filter(function (header) {
      return existingHeaders.indexOf(header) < 0;
    }));
  }

  if (!sheet.isSheetHidden()) {
    sheet.hideSheet();
  }

  return sheet;
}

function requireAuthSheet_(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error('Falta la hoja interna ' + sheetName + '.');
  }

  return sheet;
}

function requireAuthHeaderIndex_(headers, header) {
  var index = headers.indexOf(header);

  if (index < 0) {
    throw new Error('Falta el encabezado de autenticacion ' + header + '.');
  }

  return index;
}

function assertAuthAdministrator_(user) {
  var role = normalizeLookupValue_(user && user.role);
  var isAdmin = user && (role === 'ADMIN' || role === 'ADMINISTRADOR');

  if (!isAdmin) {
    throw new Error('Se requieren permisos de administrador.');
  }
}

function isAuthEmail_(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));
}

function authNumber_(value) {
  var number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function authDateMillis_(value) {
  if (!value) {
    return 0;
  }

  var date = Object.prototype.toString.call(value) === '[object Date]'
    ? value
    : new Date(value);
  var millis = date.getTime();
  return Number.isFinite(millis) ? millis : 0;
}

function constantTimeAuthEqual_(left, right) {
  var first = String(left || '');
  var second = String(right || '');
  var difference = first.length ^ second.length;
  var length = Math.max(first.length, second.length);

  for (var index = 0; index < length; index += 1) {
    difference |= (first.charCodeAt(index) || 0) ^ (second.charCodeAt(index) || 0);
  }

  return difference === 0;
}
