/**
 * Ciclo comercial del CRM.
 *
 * CLIENTES conserva una sola empresa maestra. Gestion Clientes funciona como
 * bitacora: una conversion actualiza el estado maestro sin copiar ni borrar el
 * historial de actividades.
 */
var TRAIOT_CRM_LIFECYCLE_PROPERTY = 'TRAIOT_CRM_LIFECYCLE_V1';
var TRAIOT_CRM_LIFECYCLE_HEADERS = Object.freeze([
  'Etapa_CRM',
  'Fecha_conversion',
  'Convertido_por'
]);

function ensureCrmLifecycleStorage_(spreadsheet, force) {
  var properties = PropertiesService.getScriptProperties();

  if (!force && properties.getProperty(TRAIOT_CRM_LIFECYCLE_PROPERTY) === 'true') {
    return { migrated: false, ready: true };
  }

  var lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    throw new Error('No fue posible preparar el ciclo comercial. Intenta nuevamente.');
  }

  try {
    if (!force && properties.getProperty(TRAIOT_CRM_LIFECYCLE_PROPERTY) === 'true') {
      return { migrated: false, ready: true };
    }

    var clientSchema = requireApiTable_('CLIENTES');
    var clientSheet = requireApiSheet_(spreadsheet, clientSchema);
    var headers = readApiHeaders_(clientSheet);
    var addedHeaders = [];

    TRAIOT_CRM_LIFECYCLE_HEADERS.forEach(function (header) {
      if (headers.indexOf(header) < 0) {
        clientSheet.getRange(1, headers.length + 1).setValue(header);
        headers.push(header);
        addedHeaders.push(header);
      }
    });

    SpreadsheetApp.flush();
    var initialized = backfillCrmLifecycle_(spreadsheet, clientSheet, clientSchema, headers);
    properties.setProperty(TRAIOT_CRM_LIFECYCLE_PROPERTY, 'true');

    return {
      migrated: addedHeaders.length > 0 || initialized > 0,
      ready: true,
      addedHeaders: addedHeaders,
      clientsInitialized: initialized
    };
  } finally {
    lock.releaseLock();
  }
}

function backfillCrmLifecycle_(spreadsheet, clientSheet, clientSchema, headers) {
  var values = clientSheet.getDataRange().getValues();

  if (values.length < 2) {
    return 0;
  }

  var crmRows = readApiRows_(spreadsheet, requireApiTable_('Gestion Clientes'));
  var histories = buildCrmHistoryIndex_(crmRows);
  var stageIndex = requireHeaderIndex_(headers, 'Etapa_CRM', clientSchema);
  var dateIndex = requireHeaderIndex_(headers, 'Fecha_conversion', clientSchema);
  var byIndex = requireHeaderIndex_(headers, 'Convertido_por', clientSchema);
  var uuidIndex = requireHeaderIndex_(headers, '_uuid', clientSchema);
  var nameIndex = requireHeaderIndex_(headers, 'RAZON SOCIAL', clientSchema);
  var stageValues = [];
  var dateValues = [];
  var byValues = [];
  var initialized = 0;

  values.slice(1).forEach(function (row) {
    if (!isApiBusinessRow_(row, headers, clientSchema)) {
      stageValues.push([row[stageIndex] || '']);
      dateValues.push([row[dateIndex] || '']);
      byValues.push([row[byIndex] || '']);
      return;
    }

    var existingStage = normalizeCell_(row[stageIndex]);
    var inferred = inferCrmLifecycleFromHistory_(
      collectCrmHistory_(histories, row[uuidIndex], row[nameIndex])
    );
    var stage = existingStage ? normalizeCrmLifecycleStage_(existingStage) : inferred.stage;

    if (!existingStage) {
      initialized += 1;
    }

    stageValues.push([stage]);
    dateValues.push([row[dateIndex] || inferred.convertedAt || '']);
    byValues.push([row[byIndex] || inferred.convertedBy || '']);
  });

  clientSheet.getRange(2, stageIndex + 1, stageValues.length, 1).setValues(stageValues);
  clientSheet.getRange(2, dateIndex + 1, dateValues.length, 1).setValues(dateValues);
  clientSheet.getRange(2, byIndex + 1, byValues.length, 1).setValues(byValues);
  SpreadsheetApp.flush();
  return initialized;
}

function buildCrmHistoryIndex_(rows) {
  var index = {};

  rows.forEach(function (row) {
    var keys = crmLifecycleKeys_(row.cliente_uuid, row.Nombre_empresa);
    keys.forEach(function (key) {
      index[key] = index[key] || [];
      index[key].push(row);
    });
  });
  return index;
}

function collectCrmHistory_(index, clientUuid, companyName) {
  var seen = {};
  var result = [];

  crmLifecycleKeys_(clientUuid, companyName).forEach(function (key) {
    (index[key] || []).forEach(function (row) {
      var identity = normalizeCell_(row._uuid) || normalizeCell_(row.Id_CRM);
      if (!identity || !seen[identity]) {
        if (identity) {
          seen[identity] = true;
        }
        result.push(row);
      }
    });
  });
  return result;
}

function crmLifecycleKeys_(clientUuid, companyName) {
  var keys = [];
  var uuid = normalizeCell_(clientUuid).toLowerCase();
  var name = normalizeLookupValue_(companyName);

  if (uuid) {
    keys.push('uuid:' + uuid);
  }
  if (name && !isUuid_(name)) {
    keys.push('name:' + name);
  }
  return keys;
}

function inferCrmLifecycleFromHistory_(rows) {
  if (!rows || rows.length === 0) {
    return { stage: 'Cliente', convertedAt: '', convertedBy: '' };
  }

  var ordered = rows.slice().sort(compareCrmLifecycleRows_);
  var conversions = ordered.filter(function (row) {
    return isCrmProspectConversion_(row.Estatus_prospeccion);
  });

  if (conversions.length > 0) {
    var conversion = conversions[conversions.length - 1];
    return {
      stage: 'Cliente',
      convertedAt: normalizeCell_(conversion.Fecha_contacto),
      convertedBy: crmLifecycleResponsible_(conversion.Responsable)
    };
  }

  var latest = ordered[ordered.length - 1];
  if (normalizeLookupValue_(latest.Tipo_cliente).indexOf('ACTIVO') >= 0) {
    return { stage: 'Cliente', convertedAt: '', convertedBy: '' };
  }
  if (normalizeLookupValue_(latest.Estatus_prospeccion).indexOf('NO INTERESADO') >= 0) {
    return { stage: 'Descartado', convertedAt: '', convertedBy: '' };
  }
  return { stage: 'Prospecto', convertedAt: '', convertedBy: '' };
}

function compareCrmLifecycleRows_(left, right) {
  var leftDate = Date.parse(normalizeCell_(left.Fecha_contacto)) || 0;
  var rightDate = Date.parse(normalizeCell_(right.Fecha_contacto)) || 0;

  if (leftDate !== rightDate) {
    return leftDate - rightDate;
  }
  return crmLifecycleSequence_(left.Id_CRM) - crmLifecycleSequence_(right.Id_CRM);
}

function crmLifecycleSequence_(value) {
  var matches = normalizeCell_(value).match(/\d+(?:\.\d+)?/g);
  var parsed = Number(matches && matches.length ? matches[matches.length - 1] : 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function crmLifecycleResponsible_(value) {
  return (Array.isArray(value) ? value : splitApiList_(value)).join(', ');
}

function normalizeCrmLifecycleStage_(value) {
  var normalized = normalizeLookupValue_(value);

  if (normalized.indexOf('DESCART') >= 0 || normalized.indexOf('NO INTERESADO') >= 0) {
    return 'Descartado';
  }
  if (normalized.indexOf('CLIENTE') >= 0 || normalized.indexOf('ACTIVO') >= 0) {
    return 'Cliente';
  }
  return 'Prospecto';
}

function isCrmProspectConversion_(value) {
  return normalizeLookupValue_(value).indexOf('CLIENTE') >= 0;
}

function applyCrmLifecycleRules_(
  spreadsheet,
  schemaTable,
  record,
  currentRecord,
  isCreate,
  now,
  user
) {
  if (schemaTable.name === 'CLIENTES') {
    var previousStage = currentRecord
      ? normalizeCrmLifecycleStage_(currentRecord.Etapa_CRM)
      : '';
    var nextStage = normalizeCell_(record.Etapa_CRM)
      ? normalizeCrmLifecycleStage_(record.Etapa_CRM)
      : (previousStage || 'Prospecto');

    record.Etapa_CRM = nextStage;
    if (nextStage === 'Cliente' && previousStage !== 'Cliente') {
      record.Fecha_conversion = now;
      record.Convertido_por = crmLifecycleUserLabel_(user);
    } else if (nextStage !== 'Cliente' && previousStage === 'Cliente') {
      record.Fecha_conversion = null;
      record.Convertido_por = null;
    }
    return;
  }

  if (schemaTable.name !== 'Gestion Clientes') {
    return;
  }

  var client = lookupApiReference_(spreadsheet, 'CLIENTES', record.cliente_uuid);
  if (!client) {
    applyCrmActivityLifecycle_(
      record,
      normalizeLookupValue_(record['Tipo de Contacto']) === 'CLIENTE' ? 'Cliente' : 'Prospecto',
      isCreate
    );
    return;
  }

  var clientStage = normalizeCrmLifecycleStage_(client.Etapa_CRM);
  var convertsProspect = applyCrmActivityLifecycle_(record, clientStage, isCreate);

  if (convertsProspect) {
    writeCrmClientLifecycle_(spreadsheet, client, 'Cliente', now, user);
  }
}

function applyCrmActivityLifecycle_(record, clientStage, isCreate) {
  var convertsProspect = isCrmProspectConversion_(record.Estatus_prospeccion);

  if (convertsProspect) {
    record.Tipo_cliente = '🟢Activo';
    record.Estatus_cliente = record.Estatus_cliente || '🟢Activo';
    return true;
  }

  if (isCreate) {
    if (normalizeCrmLifecycleStage_(clientStage) === 'Cliente') {
      record.Tipo_cliente = '🟢Activo';
      record.Estatus_cliente = record.Estatus_cliente || '🟢Activo';
    } else {
      record.Tipo_cliente = '🔵Prospecto';
    }
  }
  return false;
}

function writeCrmClientLifecycle_(spreadsheet, client, stage, now, user) {
  var schemaTable = requireApiTable_('CLIENTES');
  var sheet = requireApiSheet_(spreadsheet, schemaTable);
  var snapshot = findApiRowSnapshot_(sheet, schemaTable, String(client._uuid || ''));

  if (!snapshot) {
    throw new Error('No fue posible actualizar la etapa comercial de la empresa.');
  }

  var normalizedStage = normalizeCrmLifecycleStage_(stage);
  var updates = {
    Etapa_CRM: normalizedStage,
    Fecha_conversion: normalizedStage === 'Cliente'
      ? (client.Fecha_conversion || now)
      : null,
    Convertido_por: normalizedStage === 'Cliente'
      ? (client.Convertido_por || crmLifecycleUserLabel_(user))
      : null,
    _updatedAt: now
  };

  writeApiRecordCells_(
    sheet,
    snapshot.rowNumber,
    snapshot.headers,
    schemaTable,
    updates,
    ['Etapa_CRM', 'Fecha_conversion', 'Convertido_por', '_updatedAt']
  );
}

function crmLifecycleUserLabel_(user) {
  return normalizeCell_(user && user.name) || normalizeCell_(user && user.email) || 'Sistema';
}

function enrichCrmLifecycleRows_(spreadsheet, rows) {
  var clients = readApiRows_(spreadsheet, requireApiTable_('CLIENTES'));
  var byUuid = {};
  var byName = {};

  clients.forEach(function (client) {
    var uuid = normalizeCell_(client._uuid).toLowerCase();
    var name = normalizeLookupValue_(client['RAZON SOCIAL']);
    if (uuid) {
      byUuid[uuid] = client;
    }
    if (name) {
      byName[name] = client;
    }
  });

  return rows.map(function (row) {
    var uuid = normalizeCell_(row.cliente_uuid).toLowerCase();
    var name = normalizeLookupValue_(row.Nombre_empresa);
    var client = byUuid[uuid] || byName[name];
    if (client) {
      row.Etapa_actual = normalizeCrmLifecycleStage_(client.Etapa_CRM);
    } else {
      delete row.Etapa_actual;
    }
    return row;
  });
}

function migrarCicloCrm() {
  return ensureCrmLifecycleStorage_(openConfiguredSpreadsheet_(), true);
}

var TRAIOT_CRM_CONTACT_PROPERTY = 'TRAIOT_CRM_CONTACT_STORAGE_V3';
var TRAIOT_CRM_CONTACT_HEADERS = Object.freeze([
  'ID',
  'Nombre',
  'Apellido',
  'Segundo Nombre',
  'Cargo',
  'Compañía',
  'Tipo de Contacto',
  'Teléfono del trabajo',
  'Móvil',
  'Otro número de teléfono',
  'Sitio web Corporativo',
  'E-mail del trabajo',
  'Última actualización en',
  'Origen',
  'Información de origen',
  'Incluido en la exportación',
  'Creado por',
  'Creado',
  'Modificado por',
  'Modificado',
  'Comentarios'
]);

function ensureCrmContactStorage_(spreadsheet, force) {
  var properties = PropertiesService.getScriptProperties();
  if (!force && properties.getProperty(TRAIOT_CRM_CONTACT_PROPERTY) === 'true') {
    return { migrated: false, ready: true };
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error('No fue posible preparar las fichas de contacto. Intenta nuevamente.');
  }

  try {
    if (!force && properties.getProperty(TRAIOT_CRM_CONTACT_PROPERTY) === 'true') {
      return { migrated: false, ready: true };
    }

    var schemaTable = requireApiTable_('Gestion Clientes');
    var sheet = requireApiSheet_(spreadsheet, schemaTable);
    var headers = readApiHeaders_(sheet);
    var addedHeaders = [];

    TRAIOT_CRM_CONTACT_HEADERS.forEach(function (header) {
      if (headers.indexOf(header) < 0) {
        sheet.getRange(1, headers.length + 1).setValue(header);
        headers.push(header);
        addedHeaders.push(header);
      }
    });
    SpreadsheetApp.flush();

    var migratedRows = backfillCrmContactRows_(spreadsheet, sheet, headers);
    properties.setProperty(TRAIOT_CRM_CONTACT_PROPERTY, 'true');
    return {
      migrated: addedHeaders.length > 0 || migratedRows > 0,
      ready: true,
      addedHeaders: addedHeaders,
      rowsMigrated: migratedRows
    };
  } finally {
    lock.releaseLock();
  }
}

function backfillCrmContactRows_(spreadsheet, sheet, headers) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  var clients = readApiRows_(spreadsheet, requireApiTable_('CLIENTES'));
  var clientsByUuid = {};
  var clientsByName = {};
  clients.forEach(function (client) {
    var uuid = normalizeCell_(client._uuid).toLowerCase();
    var name = normalizeLookupValue_(client['RAZON SOCIAL']);
    if (uuid) clientsByUuid[uuid] = client;
    if (name) clientsByName[name] = client;
  });

  var maximum = values.reduce(function (current, row) {
    return Math.max(
      current,
      parseApiCrmSequence_(crmContactCell_(row, headers, 'ID')) || 0,
      parseApiCrmSequence_(crmContactCell_(row, headers, 'Id_CRM')) || 0
    );
  }, 0);
  var usedIds = {};
  var migratedRows = 0;

  values.forEach(function (row) {
    var uuid = normalizeCell_(crmContactCell_(row, headers, 'cliente_uuid')).toLowerCase();
    var companyLegacy = crmContactCell_(row, headers, 'Nombre_empresa');
    var client = clientsByUuid[uuid] || clientsByName[normalizeLookupValue_(companyLegacy)] || {};
    var updatedAt = crmContactFirstValue_(
      crmContactCell_(row, headers, '_updatedAt'),
      new Date().toISOString()
    );
    var existingId = crmContactFirstValue_(
      crmContactCell_(row, headers, 'ID'),
      crmContactCell_(row, headers, 'Id_CRM')
    );
    var sequence = parseApiCrmSequence_(existingId);
    var formattedId = sequence ? formatApiCrmId_(sequence) : '';
    if (!sequence || usedIds[formattedId]) {
      maximum += 1;
      sequence = maximum;
      formattedId = formatApiCrmId_(sequence);
    }
    usedIds[formattedId] = true;

    var defaults = {
      'ID': formattedId,
      'Nombre': crmContactFirstValue_(crmContactCell_(row, headers, 'Contacto'), client.CONTACTO, 'Contacto sin nombre'),
      'Compañía': crmContactFirstValue_(companyLegacy, client['RAZON SOCIAL'], 'Sin compañía'),
      'Tipo de Contacto': crmContactTypeFromLegacy_(crmContactCell_(row, headers, 'Tipo_cliente')),
      'Teléfono del trabajo': crmContactFirstValue_(crmContactCell_(row, headers, 'Telefono'), client['TELEFONO CONTACTO'], client.TELEFONO),
      'Sitio web Corporativo': crmContactCell_(row, headers, 'Pagina_empresa'),
      'E-mail del trabajo': crmContactFirstValue_(crmContactCell_(row, headers, 'Email'), client.EMAIL),
      'Última actualización en': updatedAt,
      'Origen': 'Migración',
      'Información de origen': 'Historial anterior del CRM',
      'Incluido en la exportación': false,
      'Creado por': 'Migración TRAIOT',
      'Creado': updatedAt,
      'Modificado por': 'Migración TRAIOT',
      'Modificado': updatedAt,
      'Comentarios': crmContactCell_(row, headers, 'Notas')
    };

    var changed = false;
    var idIndex = headers.indexOf('ID');
    if (idIndex >= 0 && normalizeCell_(row[idIndex]) !== formattedId) {
      row[idIndex] = formattedId;
      changed = true;
    }
    Object.keys(defaults).forEach(function (header) {
      var index = headers.indexOf(header);
      if (header !== 'ID' && index >= 0 && isApiBlank_(row[index])) {
        row[index] = defaults[header];
        changed = true;
      }
    });
    if (changed) migratedRows += 1;
  });

  TRAIOT_CRM_CONTACT_HEADERS.forEach(function (header) {
    var index = headers.indexOf(header);
    sheet.getRange(2, index + 1, values.length, 1).setValues(values.map(function (row) {
      return [row[index]];
    }));
  });
  SpreadsheetApp.flush();
  return migratedRows;
}

function crmContactCell_(row, headers, header) {
  var index = headers.indexOf(header);
  return index >= 0 ? row[index] : '';
}

function crmContactFirstValue_() {
  for (var index = 0; index < arguments.length; index += 1) {
    if (!isApiBlank_(arguments[index])) return arguments[index];
  }
  return '';
}

function crmContactTypeFromLegacy_(value) {
  return normalizeLookupValue_(value).indexOf('ACTIVO') >= 0 ? 'Cliente' : 'Prospecto';
}

function migrarContactosCrm() {
  return ensureCrmContactStorage_(openConfiguredSpreadsheet_(), true);
}
