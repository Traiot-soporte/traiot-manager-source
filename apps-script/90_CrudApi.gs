/**
 * CRUD real sobre Google Sheets. Todas las escrituras usan bloqueo global,
 * UUID estable, borrado logico y una clave de mutacion para reintentos.
 */
function createApiRow_(user, schemaTable, submittedValues, mutationId) {
  assertApiTableWriteAccess_(user, schemaTable);
  if (schemaTable.name === 'COMPRAS') {
    ensurePurchaseIdNomenclature_(openConfiguredSpreadsheet_(), false);
  }
  if (schemaTable.name === 'PEDIDOS') {
    ensureOrderIdNomenclature_(openConfiguredSpreadsheet_(), false);
  }
  if (schemaTable.name === 'COMPRAS' || schemaTable.name === 'PEDIDOS') {
    ensureProductCategoryStorage_(openConfiguredSpreadsheet_(), false);
  }
  if (isInventoryApiTable_(schemaTable.name)) {
    ensureInventoryStorage_(openConfiguredSpreadsheet_(), false);
  }
  if (schemaTable.name === 'Gestion Clientes') {
    ensureCrmCalendarStorage_(openConfiguredSpreadsheet_(), false);
  }
  if (schemaTable.name === 'CLIENTES' || schemaTable.name === 'Gestion Clientes') {
    ensureCrmLifecycleStorage_(openConfiguredSpreadsheet_(), false);
  }

  return runIdempotentApiMutation_(mutationId, function () {
    var spreadsheet = openConfiguredSpreadsheet_();
    var sheet = requireApiSheet_(spreadsheet, schemaTable);
    var headers = readApiHeaders_(sheet);
    var now = new Date().toISOString();
    var rowUuid = Utilities.getUuid().toLowerCase();
    var record = prepareApiMutationRecord_(
      spreadsheet,
      schemaTable,
      submittedValues,
      { _uuid: rowUuid },
      true,
      now,
      user
    );

    record._uuid = rowUuid;
    record._updatedAt = now;
    record._deleted = false;
    validateApiRecord_(schemaTable, record);
    assertUniqueApiBusinessKey_(sheet, schemaTable, record);
    assertUniqueApiUserEmail_(sheet, schemaTable, record);
    persistApiMediaFields_(
      spreadsheet,
      schemaTable,
      record,
      submittedValues,
      mutationId
    );
    var inventoryPlan = planInventoryMutation_(
      spreadsheet,
      schemaTable,
      null,
      record,
      mutationId,
      user
    );

    var rowNumber = Math.max(sheet.getLastRow() + 1, 2);
    var rowValues = headers.map(function (header) {
      var column = findApiColumnByHeader_(schemaTable, header);
      return column ? toApiSheetCell_(record[column.name], column) : '';
    });

    sheet.getRange(rowNumber, 1, 1, headers.length).setValues([rowValues]);
    try {
      commitInventoryPlan_(spreadsheet, inventoryPlan);
      SpreadsheetApp.flush();
    } catch (error) {
      sheet.getRange(rowNumber, 1, 1, headers.length).clearContent();
      SpreadsheetApp.flush();
      throw error;
    }

    if (schemaTable.name === 'Usuarios') {
      invalidateAuthUserCache_();
    }

    return getApiRowFromSpreadsheet_(spreadsheet, schemaTable, record._uuid);
  });
}

function updateApiRow_(user, schemaTable, rowUuid, submittedChanges, mutationId) {
  assertApiTableWriteAccess_(user, schemaTable);
  if (schemaTable.name === 'COMPRAS' || schemaTable.name === 'PEDIDOS') {
    ensureProductCategoryStorage_(openConfiguredSpreadsheet_(), false);
  }
  if (isInventoryApiTable_(schemaTable.name)) {
    ensureInventoryStorage_(openConfiguredSpreadsheet_(), false);
  }
  if (schemaTable.name === 'Gestion Clientes') {
    ensureCrmCalendarStorage_(openConfiguredSpreadsheet_(), false);
  }
  if (schemaTable.name === 'CLIENTES' || schemaTable.name === 'Gestion Clientes') {
    ensureCrmLifecycleStorage_(openConfiguredSpreadsheet_(), false);
  }

  if (!isUuid_(rowUuid)) {
    throw new Error('El identificador del registro no es valido.');
  }

  return runIdempotentApiMutation_(mutationId, function () {
    var spreadsheet = openConfiguredSpreadsheet_();
    var sheet = requireApiSheet_(spreadsheet, schemaTable);
    var snapshot = findApiRowSnapshot_(sheet, schemaTable, rowUuid);

    if (!snapshot || snapshot.record._deleted === true) {
      throw new Error('El registro solicitado no existe o fue eliminado.');
    }

    assertCrmCalendarMutationAccess_(user, schemaTable, snapshot.record);

    var now = new Date().toISOString();
    var nextRecord = prepareApiMutationRecord_(
      spreadsheet,
      schemaTable,
      submittedChanges,
      snapshot.record,
      false,
      now,
      user
    );

    nextRecord._uuid = rowUuid.toLowerCase();
    nextRecord._updatedAt = now;
    nextRecord._deleted = false;
    validateApiRecord_(schemaTable, nextRecord);
    assertUniqueApiBusinessKey_(sheet, schemaTable, nextRecord);
    assertUniqueApiUserEmail_(sheet, schemaTable, nextRecord);
    persistApiMediaFields_(
      spreadsheet,
      schemaTable,
      nextRecord,
      submittedChanges,
      mutationId
    );
    var inventoryPlan = planInventoryMutation_(
      spreadsheet,
      schemaTable,
      snapshot.record,
      nextRecord,
      mutationId,
      user
    );
    writeApiRecordCells_(
      sheet,
      snapshot.rowNumber,
      snapshot.headers,
      schemaTable,
      nextRecord,
      collectApiMutationColumns_(schemaTable, submittedChanges)
    );
    try {
      commitInventoryPlan_(spreadsheet, inventoryPlan);
      SpreadsheetApp.flush();
    } catch (error) {
      sheet.getRange(snapshot.rowNumber, 1, 1, snapshot.headers.length).setValues([
        snapshot.rawValues
      ]);
      SpreadsheetApp.flush();
      throw error;
    }

    if (schemaTable.name === 'Usuarios') {
      invalidateAuthUserCache_();
    }

    return getApiRowFromSpreadsheet_(spreadsheet, schemaTable, rowUuid);
  });
}

function deleteApiRow_(user, schemaTable, rowUuid, mutationId) {
  assertApiTableWriteAccess_(user, schemaTable);
  if (isInventoryApiTable_(schemaTable.name)) {
    ensureInventoryStorage_(openConfiguredSpreadsheet_(), false);
  }
  if (schemaTable.name === 'Gestion Clientes') {
    ensureCrmCalendarStorage_(openConfiguredSpreadsheet_(), false);
  }

  if (!isUuid_(rowUuid)) {
    throw new Error('El identificador del registro no es valido.');
  }

  return runIdempotentApiMutation_(mutationId, function () {
    var spreadsheet = openConfiguredSpreadsheet_();
    var sheet = requireApiSheet_(spreadsheet, schemaTable);
    var snapshot = findApiRowSnapshot_(sheet, schemaTable, rowUuid);

    if (!snapshot || snapshot.record._deleted === true) {
      throw new Error('El registro solicitado no existe o ya fue eliminado.');
    }

    assertCrmCalendarMutationAccess_(user, schemaTable, snapshot.record);
    if (schemaTable.name === 'ALMACEN') {
      assertInventoryProductDeletionAllowed_(snapshot.record);
    }

    var deletedRecord = copyApiObject_(snapshot.record);
    deletedRecord._deleted = true;
    var inventoryPlan = planInventoryMutation_(
      spreadsheet,
      schemaTable,
      snapshot.record,
      deletedRecord,
      mutationId,
      user
    );

    var deletedColumn = requireHeaderIndex_(snapshot.headers, '_deleted', schemaTable) + 1;
    var updatedAtColumn = requireHeaderIndex_(snapshot.headers, '_updatedAt', schemaTable) + 1;

    sheet.getRange(snapshot.rowNumber, deletedColumn).setValue(true);
    sheet.getRange(snapshot.rowNumber, updatedAtColumn).setValue(new Date().toISOString());
    try {
      commitInventoryPlan_(spreadsheet, inventoryPlan);
      SpreadsheetApp.flush();
    } catch (error) {
      sheet.getRange(snapshot.rowNumber, 1, 1, snapshot.headers.length).setValues([
        snapshot.rawValues
      ]);
      SpreadsheetApp.flush();
      throw error;
    }

    if (schemaTable.name === 'Usuarios') {
      invalidateAuthUserCache_();
    }

    snapshot.record._deleted = true;
    snapshot.record._updatedAt = new Date().toISOString();
    return snapshot.record;
  });
}

function runIdempotentApiMutation_(mutationId, callback) {
  var normalizedMutationId = String(mutationId || '').toLowerCase();

  if (!isUuid_(normalizedMutationId)) {
    throw new Error('La solicitud no contiene una clave de mutacion valida.');
  }

  var lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    throw new Error('Otra escritura se encuentra en curso. Intenta nuevamente en un momento.');
  }

  try {
    var cache = CacheService.getScriptCache();
    var cacheKey = 'mutation:' + normalizedMutationId;
    var cachedResult = cache.get(cacheKey);

    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    var result = callback();
    cache.put(cacheKey, JSON.stringify(result), 21600);
    return result;
  } finally {
    lock.releaseLock();
  }
}

function prepareApiMutationRecord_(
  spreadsheet,
  schemaTable,
  submittedValues,
  currentRecord,
  isCreate,
  now,
  user
) {
  var submitted = submittedValues && typeof submittedValues === 'object' ? submittedValues : {};
  var record = currentRecord ? copyApiObject_(currentRecord) : {};

  schemaTable.columns.filter(isApiEditableColumn_).forEach(function (column) {
    if (!Object.prototype.hasOwnProperty.call(submitted, column.name)) {
      return;
    }

    var submittedValue = coerceApiInput_(submitted[column.name], column);

    if (column.syncTo && column.refTable) {
      applyApiReference_(
        spreadsheet,
        record,
        currentRecord,
        column,
        submittedValue,
        isCreate
      );
      return;
    }

    record[column.name] = submittedValue;
  });

  if (schemaTable.name === 'INSTALACIONES' && isApiBlank_(record.FECHA)) {
    record.FECHA = now;
  }

  if (schemaTable.name === 'Ticket Soporte' && isApiBlank_(record.FOLIO)) {
    record.FOLIO = nextApiTicketFolio_(spreadsheet, now);
  }

  if (schemaTable.name === 'COMPRAS' && isCreate) {
    record['ID COMPRA'] = nextApiPurchaseId_(spreadsheet);
    record['ESTATUS COMPRA'] = 'RECIBIDA';
    record['COSTO DE ENVIO'] = 0;
  }

  if (schemaTable.name === 'PEDIDOS' && isCreate) {
    record['ID PEDIDO'] = nextApiOrderId_(spreadsheet, record.FECHA || now);
    record['ESTATUS PEDIDO'] = 'APROBADO';
  }

  if (schemaTable.name === 'Gestion Clientes' && isCreate) {
    record.Id_CRM = nextApiCrmId_(spreadsheet);
  }

  applyCrmCalendarOwnership_(user, schemaTable, record, isCreate);

  applyApiRoleRules_(schemaTable, record);

  applyApiBusinessFormulas_(spreadsheet, schemaTable, record, now);
  applyCrmLifecycleRules_(
    spreadsheet,
    schemaTable,
    record,
    currentRecord,
    isCreate,
    now,
    user
  );
  return record;
}

function applyApiRoleRules_(schemaTable, record) {
  if (schemaTable.name === 'Perfiles') {
    var profileRole = canonicalApiRole_(record.PerfilID);
    if (!profileRole) {
      throw new Error('PerfilID debe ser Administrador, Gerencia, Soporte, Ventas o Tecnico.');
    }

    var profileMatrix = rolePermissionMatrix_().filter(function (entry) {
      return entry.role === profileRole;
    })[0];
    record.PerfilID = profileRole;
    record.VistasPermitidas = profileMatrix.labels.slice();
  }

  if (schemaTable.name === 'Usuarios') {
    var userRole = canonicalApiRole_(record.UserRole);
    if (!userRole) {
      throw new Error('UserRole debe ser Administrador, Gerencia, Soporte, Ventas o Tecnico.');
    }
    record.UserRole = userRole;
  }
}

function applyCrmCalendarOwnership_(user, schemaTable, record, isCreate) {
  if (schemaTable.name !== 'Gestion Clientes') {
    return;
  }

  var requestedScope = normalizeCell_(record.Calendario);
  var scope = requestedScope
    ? normalizeCrmCalendarScope_(requestedScope)
    : (isCreate ? 'Personal' : 'Empresarial');

  record.Calendario = scope;

  if (scope === 'Personal') {
    var userUuid = normalizeCell_(user && user.userUuid).toLowerCase();

    if (!isUuid_(userUuid)) {
      throw new Error('No fue posible identificar al propietario del calendario personal.');
    }

    record._calendarOwnerUuid = userUuid;
  } else {
    record._calendarOwnerUuid = '';
  }
}

function assertCrmCalendarMutationAccess_(user, schemaTable, record) {
  if (schemaTable.name !== 'Gestion Clientes' ||
      normalizeCrmCalendarScope_(record && record.Calendario) !== 'Personal') {
    return;
  }

  var ownerUuid = normalizeCell_(record && record._calendarOwnerUuid).toLowerCase();
  var userUuid = normalizeCell_(user && user.userUuid).toLowerCase();

  if (!ownerUuid || !userUuid || ownerUuid !== userUuid) {
    throw new Error('Este evento pertenece al calendario personal de otro usuario.');
  }
}

function applyApiReference_(
  spreadsheet,
  record,
  currentRecord,
  column,
  submittedValue,
  isCreate
) {
  var normalizedValue = normalizeCell_(submittedValue);

  if (!normalizedValue) {
    record[column.name] = null;
    record[column.syncTo] = null;
    return;
  }

  if (!isUuid_(normalizedValue)) {
    var currentLegacyValue = currentRecord ? normalizeCell_(currentRecord[column.name]) : '';

    if (!isCreate && normalizedValue === currentLegacyValue) {
      return;
    }

    throw new Error('La referencia ' + column.name + ' no contiene un UUID valido.');
  }

  var targetSchema = requireApiTable_(column.refTable);
  var targetRow = getApiRowFromSpreadsheet_(spreadsheet, targetSchema, normalizedValue);

  if (!targetRow) {
    throw new Error('No existe el registro relacionado de ' + column.refTable + '.');
  }

  var visibleColumn = targetSchema.legacyBusinessKey || targetSchema.labelColumn;
  record[column.name] = targetRow[visibleColumn] || targetRow[targetSchema.labelColumn] || normalizedValue;
  record[column.syncTo] = normalizedValue.toLowerCase();
}

var TRAIOT_PRODUCT_CATEGORY_STORAGE_PROPERTY = 'TRAIOT_PRODUCT_CATEGORY_STORAGE_V1';

function ensureProductCategoryStorage_(spreadsheet, force) {
  var properties = PropertiesService.getScriptProperties();
  var targetNames = ['COMPRAS', 'PEDIDOS'];
  var storageReady = targetNames.every(function (tableName) {
    var schemaTable = requireApiTable_(tableName);
    var sheet = requireApiSheet_(spreadsheet, schemaTable);
    return readApiHeaders_(sheet).indexOf('CATEGORIA') >= 0;
  });

  if (!force && storageReady &&
      properties.getProperty(TRAIOT_PRODUCT_CATEGORY_STORAGE_PROPERTY) === 'true') {
    return { ready: true, synchronized: false };
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var productSchema = requireApiTable_('ALMACEN');
    var products = readApiRows_(spreadsheet, productSchema);
    var productIndex = {};

    products.forEach(function (product) {
      var category = canonicalApiProductCategory_(product.CATEGORIA);
      var uuid = normalizeCell_(product._uuid).toLowerCase();
      var businessId = normalizeCell_(product['ID PRODUCTO']).toUpperCase();
      if (uuid) productIndex[uuid] = category;
      if (businessId) productIndex[businessId] = category;
    });

    var synchronizedRows = 0;
    var addedHeaders = [];

    targetNames.forEach(function (tableName) {
      var schemaTable = requireApiTable_(tableName);
      var sheet = requireApiSheet_(spreadsheet, schemaTable);
      var headers = readApiHeaders_(sheet);

      if (headers.indexOf('CATEGORIA') < 0) {
        sheet.getRange(1, headers.length + 1).setValue('CATEGORIA');
        headers.push('CATEGORIA');
        addedHeaders.push(tableName + '.CATEGORIA');
      }

      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return;

      var uuidIndex = headers.indexOf('producto_uuid');
      var businessIdIndex = headers.indexOf('ID PRODUCTO');
      var categoryIndex = headers.indexOf('CATEGORIA');
      var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
      var categories = values.map(function (row) {
        var uuid = uuidIndex >= 0 ? normalizeCell_(row[uuidIndex]).toLowerCase() : '';
        var businessId = businessIdIndex >= 0
          ? normalizeCell_(row[businessIdIndex]).toUpperCase()
          : '';
        var category = productIndex[uuid] || productIndex[businessId] ||
          canonicalApiProductCategory_(row[categoryIndex]);
        if (category !== canonicalApiProductCategory_(row[categoryIndex])) {
          synchronizedRows += 1;
        }
        return [category || ''];
      });

      sheet.getRange(2, categoryIndex + 1, categories.length, 1).setValues(categories);
    });

    SpreadsheetApp.flush();
    properties.setProperty(TRAIOT_PRODUCT_CATEGORY_STORAGE_PROPERTY, 'true');
    return {
      ready: true,
      synchronized: true,
      addedHeaders: addedHeaders,
      synchronizedRows: synchronizedRows
    };
  } finally {
    lock.releaseLock();
  }
}

function canonicalApiProductCategory_(value) {
  var category = normalizeLookupValue_(value);
  return ['GPS', 'SENSOR', 'ACCESORIO', 'CCTV'].indexOf(category) >= 0 ? category : '';
}

function applyApiBusinessFormulas_(spreadsheet, schemaTable, record, now) {
  if (schemaTable.name === 'ALMACEN') {
    record['PRECIO VENTA PARA ASESOR'] = roundApiCurrency_(apiNumber_(record.COSTO) * 1.16);
    record.STOCK = apiNumber_(record.STOCK);
    record.COMPRAS = apiNumber_(record.COMPRAS);
    record.PEDIDOS = apiNumber_(record.PEDIDOS);
    record['AVISO DE COMPRA'] = calculateInventoryPurchaseNotice_(
      record.STOCK,
      record['STOCK MINIMO'],
      record['STOCK MAXIMO']
    );
  }

  if (schemaTable.name === 'COMPRAS') {
    var purchasedProduct = lookupApiReference_(spreadsheet, 'ALMACEN', record.producto_uuid);
    copyApiFields_(purchasedProduct, record, ['NOMBRE', 'PROVEEDOR', 'COSTO', 'KIT INSTALACION']);
    record.CATEGORIA = canonicalApiProductCategory_(purchasedProduct && purchasedProduct.CATEGORIA);
    record.SUBTOTAL = roundApiCurrency_(
      apiNumber_(record.COSTO) * apiNumber_(record.CANTIDAD) + apiNumber_(record['KIT INSTALACION'])
    );
    record['PRECIO DE COMPRA'] = roundApiCurrency_(apiNumber_(record.SUBTOTAL));
  }

  if (schemaTable.name === 'PEDIDOS') {
    var orderedProduct = lookupApiReference_(spreadsheet, 'ALMACEN', record.producto_uuid);
    copyApiFields_(orderedProduct, record, ['NOMBRE', 'PRECIO VENTA PARA ASESOR']);
    record.CATEGORIA = canonicalApiProductCategory_(orderedProduct && orderedProduct.CATEGORIA);
    var orderedClient = lookupApiReference_(spreadsheet, 'CLIENTES', record.cliente_uuid);
    copyApiFields_(orderedClient, record, [
      'ID CLIENTE',
      'DIRECCION',
      'TELEFONO',
      'EMAIL',
      'UBICACION',
      'CONTACTO',
      'TELEFONO CONTACTO'
    ]);
    record.SUBTOTAL = roundApiCurrency_(
      apiNumber_(record['PRECIO VENTA PARA ASESOR']) * apiNumber_(record['EQUIPOS A VENDER']) +
      apiNumber_(record['COSTO INSTALACION']) + apiNumber_(record.ENVIO)
    );
    record.IVA = roundApiCurrency_(apiNumber_(record.SUBTOTAL) * 0.16);
    record.TOTAL = roundApiCurrency_(apiNumber_(record.SUBTOTAL) + apiNumber_(record.IVA));
  }

  if (schemaTable.name === 'Gestion Clientes') {
    var crmClient = lookupApiReference_(spreadsheet, 'CLIENTES', record.cliente_uuid);

    if (crmClient) {
      record.Contacto = crmClient.CONTACTO;
      record.Telefono = crmClient['TELEFONO CONTACTO'];
      record.Email = crmClient.EMAIL;
    }
  }

  if (schemaTable.name === 'Laboratorio') {
    record['DIAS LABORATORIO'] = calculateApiLaboratoryDays_(record['FECHA ENTRADA'], now);
    record.SEMAFORO = calculateApiLaboratorySemaphore_(record.ESTATUS, record['DIAS LABORATORIO']);
  }
}

function validateApiRecord_(schemaTable, record) {
  var errors = [];

  schemaTable.columns.filter(function (column) {
    return column.required && column.origin !== 'system' && !column.hasFormula;
  }).forEach(function (column) {
    if (isApiBlank_(record[column.name])) {
      errors.push(column.name + ' es obligatorio');
    }
  });

  schemaTable.columns.filter(function (column) {
    return column.values && column.values.length > 0;
  }).forEach(function (column) {
    var value = record[column.name];

    if (isApiBlank_(value)) {
      return;
    }

    var values = Array.isArray(value) ? value : [value];
    values.forEach(function (candidate) {
      if (column.values.indexOf(String(candidate)) < 0) {
        errors.push(column.name + ' contiene una opcion no permitida');
      }
    });
  });

  if (errors.length > 0) {
    throw new Error('No fue posible guardar: ' + errors.join('; ') + '.');
  }
}

function coerceApiInput_(value, column) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (column.type === 'Image' || column.type === 'Signature') {
    return String(value);
  }

  if (column.type === 'Number' || column.type === 'Price') {
    var numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      throw new Error(column.name + ' debe ser numerico.');
    }

    return numericValue;
  }

  if (column.type === 'Bool') {
    var booleanValue = normalizeApiBoolean_(value);

    if (booleanValue === null) {
      throw new Error(column.name + ' debe ser verdadero o falso.');
    }

    return booleanValue;
  }

  if (column.type === 'EnumList' || column.type === 'List') {
    return Array.isArray(value) ? value.map(String) : splitApiList_(value);
  }

  return String(value).trim();
}

function collectApiMutationColumns_(schemaTable, submittedChanges) {
  var submitted = submittedChanges && typeof submittedChanges === 'object' ? submittedChanges : {};
  var columnNames = ['_updatedAt'];

  schemaTable.columns.filter(isApiEditableColumn_).forEach(function (column) {
    if (Object.prototype.hasOwnProperty.call(submitted, column.name)) {
      columnNames.push(column.name);

      if (column.syncTo) {
        columnNames.push(column.syncTo);
      }
    }
  });

  schemaTable.columns.filter(function (column) {
    return column.hasFormula;
  }).forEach(function (column) {
    columnNames.push(column.name);
  });

  if (schemaTable.name === 'Gestion Clientes') {
    columnNames.push('Calendario');
    columnNames.push('_calendarOwnerUuid');
  }

  if (schemaTable.name === 'ALMACEN') {
    columnNames.push('STOCK');
    columnNames.push('AVISO DE COMPRA');
    columnNames.push('COMPRAS');
    columnNames.push('PEDIDOS');
  }

  return columnNames.filter(function (columnName, index, values) {
    return values.indexOf(columnName) === index;
  });
}

function writeApiRecordCells_(sheet, rowNumber, headers, schemaTable, record, columnNames) {
  columnNames.forEach(function (columnName) {
    var column = findApiColumnByName_(schemaTable, columnName);

    if (!column) {
      return;
    }

    var columnIndex = headers.indexOf(column.sourceHeader || column.name);

    if (columnIndex >= 0) {
      sheet.getRange(rowNumber, columnIndex + 1).setValue(
        toApiSheetCell_(record[column.name], column)
      );
    }
  });
}

function findApiRowSnapshot_(sheet, schemaTable, rowUuid) {
  var values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return null;
  }

  var headers = values[0].map(String);
  var uuidIndex = requireHeaderIndex_(headers, '_uuid', schemaTable);
  var normalizedUuid = rowUuid.toLowerCase();

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (normalizeCell_(values[rowIndex][uuidIndex]).toLowerCase() === normalizedUuid) {
      return {
        rowNumber: rowIndex + 1,
        headers: headers,
        rawValues: values[rowIndex].slice(),
        record: mapApiRecordFromRow_(schemaTable, headers, values[rowIndex], false)
      };
    }
  }

  return null;
}

function getApiRowFromSpreadsheet_(spreadsheet, schemaTable, rowUuid) {
  var sheet = requireApiSheet_(spreadsheet, schemaTable);
  var snapshot = findApiRowSnapshot_(sheet, schemaTable, rowUuid);

  if (!snapshot || snapshot.record._deleted === true) {
    return null;
  }

  var values = sheet.getRange(snapshot.rowNumber, 1, 1, snapshot.headers.length).getValues()[0];
  return mapApiRecordFromRow_(schemaTable, snapshot.headers, values, true);
}

function lookupApiReference_(spreadsheet, tableName, rowUuid) {
  return isUuid_(normalizeCell_(rowUuid))
    ? getApiRowFromSpreadsheet_(spreadsheet, requireApiTable_(tableName), String(rowUuid))
    : null;
}

function requireApiSheet_(spreadsheet, schemaTable) {
  var sheet = spreadsheet.getSheetByName(schemaTable.sheet);

  if (!sheet) {
    throw new Error('No se encontro la informacion de ' + schemaTable.name + '.');
  }

  return sheet;
}

function readApiHeaders_(sheet) {
  var lastColumn = sheet.getLastColumn();
  return lastColumn > 0 ? sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map(String) : [];
}

function findApiColumnByName_(schemaTable, columnName) {
  return schemaTable.columns.filter(function (column) {
    return column.name === columnName;
  })[0] || null;
}

function findApiColumnByHeader_(schemaTable, header) {
  return schemaTable.columns.filter(function (column) {
    return (column.sourceHeader || column.name) === header;
  })[0] || null;
}

function isApiEditableColumn_(column) {
  return (column.origin === 'appsheet' || column.origin === 'migration') &&
    !column.hidden &&
    !column.readOnly &&
    !column.hasFormula &&
    column.type !== 'List' &&
    column.type !== 'Show';
}

function assertUniqueApiBusinessKey_(sheet, schemaTable, record) {
  var keyColumn = findApiBusinessKeyColumn_(schemaTable);

  if (!keyColumn || isApiBlank_(record[keyColumn.name])) {
    return;
  }

  var values = sheet.getDataRange().getDisplayValues();

  if (values.length < 2) {
    return;
  }

  var headers = values[0].map(String);
  var keyIndex = requireHeaderIndex_(headers, keyColumn.sourceHeader || keyColumn.name, schemaTable);
  var uuidIndex = requireHeaderIndex_(headers, '_uuid', schemaTable);
  var expectedKey = normalizeApiComparableKey_(record[keyColumn.name]);
  var currentUuid = normalizeCell_(record._uuid).toLowerCase();

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    var existingUuid = normalizeCell_(values[rowIndex][uuidIndex]).toLowerCase();

    if (existingUuid === currentUuid) {
      continue;
    }

    if (normalizeApiComparableKey_(values[rowIndex][keyIndex]) === expectedKey) {
      throw new Error(
        'Ya existe un registro de ' + schemaTable.name + ' con ' +
        keyColumn.name + ' = ' + record[keyColumn.name] + '.'
      );
    }
  }
}

function assertUniqueApiUserEmail_(sheet, schemaTable, record) {
  if (schemaTable.name !== 'Usuarios') {
    return;
  }

  var emailColumn = findApiColumnByName_(schemaTable, 'UserEmail');
  var values = sheet.getDataRange().getDisplayValues();

  if (!emailColumn || values.length < 2 || isApiBlank_(record.UserEmail)) {
    return;
  }

  var headers = values[0].map(String);
  var emailIndex = requireHeaderIndex_(headers, emailColumn.sourceHeader || emailColumn.name, schemaTable);
  var uuidIndex = requireHeaderIndex_(headers, '_uuid', schemaTable);
  var currentUuid = normalizeCell_(record._uuid).toLowerCase();
  var expectedEmail = normalizeApiEmail_(record.UserEmail);

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (normalizeCell_(values[rowIndex][uuidIndex]).toLowerCase() === currentUuid) {
      continue;
    }

    if (normalizeApiEmail_(values[rowIndex][emailIndex]) === expectedEmail) {
      throw new Error('Ya existe otro usuario con el correo ' + record.UserEmail + '.');
    }
  }
}

function findApiBusinessKeyColumn_(schemaTable) {
  var legacyColumn = schemaTable.legacyBusinessKey
    ? findApiColumnByName_(schemaTable, schemaTable.legacyBusinessKey)
    : null;

  if (legacyColumn) {
    return legacyColumn;
  }

  return schemaTable.name === 'Ticket Soporte'
    ? findApiColumnByName_(schemaTable, 'FOLIO')
    : null;
}

function normalizeApiComparableKey_(value) {
  return normalizeCell_(value).toUpperCase();
}

function nextApiTicketFolio_(spreadsheet, now) {
  var schemaTable = requireApiTable_('Ticket Soporte');
  var sheet = requireApiSheet_(spreadsheet, schemaTable);
  var headers = readApiHeaders_(sheet);
  var folioIndex = requireHeaderIndex_(headers, 'FOLIO', schemaTable);
  var year = Utilities.formatDate(
    new Date(now),
    getRuntimeConfig_().timeZone,
    'yyyy'
  );
  var folios = sheet.getLastRow() > 1
    ? sheet.getRange(2, folioIndex + 1, sheet.getLastRow() - 1, 1).getDisplayValues()
      .map(function (row) { return row[0]; })
    : [];

  return buildNextApiTicketFolio_(folios, year);
}

function buildNextApiTicketFolio_(folios, year) {
  var prefix = 'TS-' + year + '-';
  var maximum = (folios || []).reduce(function (currentMaximum, value) {
    var normalized = normalizeCell_(value);

    if (normalized.indexOf(prefix) !== 0) {
      return currentMaximum;
    }

    var sequence = Number(normalized.slice(prefix.length));
    return Number.isInteger(sequence) && sequence > currentMaximum
      ? sequence
      : currentMaximum;
  }, 0);

  return prefix + String(maximum + 1).padStart(4, '0');
}

function nextApiPurchaseId_(spreadsheet) {
  var schemaTable = requireApiTable_('COMPRAS');
  var sheet = requireApiSheet_(spreadsheet, schemaTable);
  var headers = readApiHeaders_(sheet);
  var idIndex = requireHeaderIndex_(headers, 'ID COMPRA', schemaTable);
  var ids = sheet.getLastRow() > 1
    ? sheet.getRange(2, idIndex + 1, sheet.getLastRow() - 1, 1).getDisplayValues()
      .map(function (row) { return row[0]; })
    : [];
  var properties = PropertiesService.getScriptProperties();
  var reservedSequence = Number(properties.getProperty('TRAIOT_PURCHASE_SEQUENCE') || 0);
  var nextId = buildNextApiPurchaseId_(ids, reservedSequence);
  properties.setProperty('TRAIOT_PURCHASE_SEQUENCE', String(parseApiPurchaseSequence_(nextId) || 0));
  return nextId;
}

function buildNextApiPurchaseId_(ids, reservedSequence) {
  var maximum = (ids || []).reduce(function (currentMaximum, value) {
    var sequence = parseApiPurchaseSequence_(value);
    return sequence !== null && sequence > currentMaximum ? sequence : currentMaximum;
  }, Number.isInteger(Number(reservedSequence)) ? Number(reservedSequence) : 0);
  return formatApiPurchaseId_(maximum + 1);
}

function parseApiPurchaseSequence_(value) {
  var normalized = normalizeCell_(value);
  if (!normalized) return null;
  var numericValue = Number(normalized);
  if (Number.isFinite(numericValue) && numericValue >= 1) {
    return Math.floor(numericValue);
  }
  var suffix = normalized.match(/(\d+)$/);
  return suffix ? Number(suffix[1]) : null;
}

function formatApiPurchaseId_(sequence) {
  return 'TRT-' + String(sequence).padStart(3, '0');
}

function ensurePurchaseIdNomenclature_(spreadsheet, force) {
  var propertyKey = 'TRAIOT_PURCHASE_ID_NOMENCLATURE_V1';
  var properties = PropertiesService.getScriptProperties();
  if (!force && properties.getProperty(propertyKey) === 'true') {
    return { ready: true, normalized: 0 };
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    if (!force && properties.getProperty(propertyKey) === 'true') {
      return { ready: true, normalized: 0 };
    }

    var schemaTable = requireApiTable_('COMPRAS');
    var sheet = requireApiSheet_(spreadsheet, schemaTable);
    var headers = readApiHeaders_(sheet);
    var idIndex = requireHeaderIndex_(headers, 'ID COMPRA', schemaTable);
    var lastRow = sheet.getLastRow();
    var normalized = 0;

    if (lastRow > 1) {
      var range = sheet.getRange(2, idIndex + 1, lastRow - 1, 1);
      var ids = range.getDisplayValues();
      var existing = {};
      ids.forEach(function (row) {
        existing[normalizeCell_(row[0]).toUpperCase()] = true;
      });

      ids.forEach(function (row) {
        var current = normalizeCell_(row[0]);
        if (!/^\d+$/.test(current)) return;
        var target = formatApiPurchaseId_(Number(current));
        if (existing[target]) return;
        delete existing[current.toUpperCase()];
        existing[target] = true;
        row[0] = target;
        normalized += 1;
      });

      if (normalized > 0) {
        range.setValues(ids);
        SpreadsheetApp.flush();
      }
    }

    properties.setProperty(propertyKey, 'true');
    return { ready: true, normalized: normalized };
  } finally {
    lock.releaseLock();
  }
}

function nextApiOrderId_(spreadsheet, dateValue) {
  var schemaTable = requireApiTable_('PEDIDOS');
  var sheet = requireApiSheet_(spreadsheet, schemaTable);
  var headers = readApiHeaders_(sheet);
  var idIndex = requireHeaderIndex_(headers, 'ID PEDIDO', schemaTable);
  var ids = sheet.getLastRow() > 1
    ? sheet.getRange(2, idIndex + 1, sheet.getLastRow() - 1, 1).getDisplayValues()
      .map(function (row) { return row[0]; })
    : [];
  var year = apiOrderYear_(dateValue);
  var properties = PropertiesService.getScriptProperties();
  var propertyKey = 'TRAIOT_ORDER_SEQUENCE_' + year;
  var reservedSequence = Number(properties.getProperty(propertyKey) || 0);
  var nextId = buildNextApiOrderId_(ids, year, reservedSequence);
  properties.setProperty(propertyKey, String(parseApiOrderSequence_(nextId, year) || 0));
  return nextId;
}

function buildNextApiOrderId_(ids, year, reservedSequence) {
  var maximum = (ids || []).reduce(function (currentMaximum, value) {
    var sequence = parseApiOrderSequence_(value, year);
    return sequence !== null && sequence > currentMaximum ? sequence : currentMaximum;
  }, Number.isInteger(Number(reservedSequence)) ? Number(reservedSequence) : 0);
  return formatApiOrderId_(year, maximum + 1);
}

function parseApiOrderSequence_(value, year) {
  var normalized = normalizeCell_(value).toUpperCase();
  if (!normalized) return null;
  if (/^\d+$/.test(normalized)) return Number(normalized);
  var prefix = 'PED-' + String(year) + '-';
  if (normalized.indexOf(prefix) !== 0) return null;
  var sequence = Number(normalized.slice(prefix.length));
  return Number.isInteger(sequence) && sequence >= 1 ? sequence : null;
}

function formatApiOrderId_(year, sequence) {
  return 'PED-' + String(year) + '-' + String(sequence).padStart(4, '0');
}

function apiOrderYear_(dateValue) {
  if (dateValue instanceof Date && !Number.isNaN(dateValue.getTime())) {
    return Utilities.formatDate(dateValue, getRuntimeConfig_().timeZone, 'yyyy');
  }
  var normalized = normalizeCell_(dateValue);
  var yearMatch = normalized.match(/(?:19|20)\d{2}/);
  return yearMatch
    ? yearMatch[0]
    : Utilities.formatDate(new Date(), getRuntimeConfig_().timeZone, 'yyyy');
}

function ensureOrderIdNomenclature_(spreadsheet, force) {
  var propertyKey = 'TRAIOT_ORDER_ID_NOMENCLATURE_V1';
  var properties = PropertiesService.getScriptProperties();
  if (!force && properties.getProperty(propertyKey) === 'true') {
    return { ready: true, normalized: 0 };
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    if (!force && properties.getProperty(propertyKey) === 'true') {
      return { ready: true, normalized: 0 };
    }

    var schemaTable = requireApiTable_('PEDIDOS');
    var sheet = requireApiSheet_(spreadsheet, schemaTable);
    var headers = readApiHeaders_(sheet);
    var idIndex = requireHeaderIndex_(headers, 'ID PEDIDO', schemaTable);
    var dateIndex = requireHeaderIndex_(headers, 'FECHA', schemaTable);
    var lastRow = sheet.getLastRow();
    var normalizedCount = 0;

    if (lastRow > 1) {
      var rowCount = lastRow - 1;
      var idRange = sheet.getRange(2, idIndex + 1, rowCount, 1);
      var ids = idRange.getDisplayValues();
      var dates = sheet.getRange(2, dateIndex + 1, rowCount, 1).getValues();
      var existing = {};
      ids.forEach(function (row) {
        existing[normalizeCell_(row[0]).toUpperCase()] = true;
      });

      ids.forEach(function (row, index) {
        var current = normalizeCell_(row[0]);
        if (!/^\d+$/.test(current)) return;
        var target = formatApiOrderId_(apiOrderYear_(dates[index][0]), Number(current));
        if (existing[target]) return;
        delete existing[current.toUpperCase()];
        existing[target] = true;
        row[0] = target;
        normalizedCount += 1;
      });

      if (normalizedCount > 0) {
        idRange.setValues(ids);
        SpreadsheetApp.flush();
      }
    }

    properties.setProperty(propertyKey, 'true');
    return { ready: true, normalized: normalizedCount };
  } finally {
    lock.releaseLock();
  }
}

function nextApiCrmId_(spreadsheet) {
  var schemaTable = requireApiTable_('Gestion Clientes');
  var sheet = requireApiSheet_(spreadsheet, schemaTable);
  var headers = readApiHeaders_(sheet);
  var idIndex = requireHeaderIndex_(headers, 'Id_CRM', schemaTable);
  var ids = sheet.getLastRow() > 1
    ? sheet.getRange(2, idIndex + 1, sheet.getLastRow() - 1, 1).getValues()
      .map(function (row) { return row[0]; })
    : [];

  return buildNextApiCrmId_(ids);
}

function buildNextApiCrmId_(ids) {
  var maximum = (ids || []).reduce(function (currentMaximum, value) {
    var sequence = parseApiCrmSequence_(value);
    return sequence !== null && sequence > currentMaximum ? sequence : currentMaximum;
  }, 0);

  return String(maximum + 1);
}

function parseApiCrmSequence_(value) {
  var normalized = normalizeCell_(value).replace(',', '.');
  var numericValue = Number(normalized);

  if (!normalized || !Number.isFinite(numericValue) || numericValue < 1) {
    return null;
  }

  return Math.floor(numericValue + 0.000000001);
}

function diagnosticarConsecutivoCrm() {
  var spreadsheet = openConfiguredSpreadsheet_();
  var schemaTable = requireApiTable_('Gestion Clientes');
  var sheet = requireApiSheet_(spreadsheet, schemaTable);
  var headers = readApiHeaders_(sheet);
  var idIndex = requireHeaderIndex_(headers, 'Id_CRM', schemaTable);
  var lastRow = sheet.getLastRow();
  var values = lastRow > 1
    ? sheet.getRange(2, idIndex + 1, lastRow - 1, 1).getValues()
      .map(function (row) { return row[0]; })
    : [];
  var decimalIds = values.filter(function (value) {
    var normalized = normalizeCell_(value).replace(',', '.');
    var numericValue = Number(normalized);
    return normalized && Number.isFinite(numericValue) && !Number.isInteger(numericValue);
  });
  var nextId = buildNextApiCrmId_(values);

  return {
    spreadsheetId: spreadsheet.getId(),
    sheet: sheet.getName(),
    sheetId: sheet.getSheetId(),
    range: 'A2:A' + lastRow,
    rowsInspected: values.length,
    decimalIds: decimalIds.length,
    maximumSequence: Number(nextId) - 1,
    nextId: nextId,
    lastValues: values.slice(Math.max(values.length - 15, 0)).map(String)
  };
}

function assertApiTableWriteAccess_(user, schemaTable) {
  if (schemaTable.readOnly) {
    throw new Error('Esta tabla es de solo lectura y se actualiza automaticamente.');
  }
  if (schemaTable.name === 'Usuarios' || schemaTable.name === 'Perfiles') {
    assertAuthAdministrator_(user);
  }

  assertApiTableAccess_(user, schemaTable);
}

function isInventoryApiTable_(tableName) {
  return ['ALMACEN', 'COMPRAS', 'PEDIDOS', 'KARDEX'].indexOf(tableName) >= 0;
}

function toApiSheetCell_(value, column) {
  if (value === null || value === undefined) {
    return '';
  }

  if (column && column.type === 'Date' && /^\d{4}-\d{2}-\d{2}$/.test(String(value).slice(0, 10))) {
    var dateParts = String(value).slice(0, 10).split('-').map(Number);
    return new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 12, 0, 0);
  }

  if (column && column.type === 'DateTime') {
    var dateTime = new Date(value);

    if (!Number.isNaN(dateTime.getTime())) {
      return dateTime;
    }
  }

  return Array.isArray(value) ? value.join(' , ') : value;
}

function copyApiObject_(value) {
  var copy = {};

  Object.keys(value || {}).forEach(function (key) {
    copy[key] = value[key];
  });

  return copy;
}

function copyApiFields_(source, target, fields) {
  if (!source) {
    return;
  }

  fields.forEach(function (field) {
    target[field] = source[field];
  });
}

function apiNumber_(value) {
  var number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function roundApiCurrency_(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isApiBlank_(value) {
  return value === null || value === undefined || value === '' ||
    (Array.isArray(value) && value.length === 0);
}

function calculateApiLaboratoryDays_(entryDate, now) {
  var normalizedDate = normalizeCell_(entryDate).slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    return null;
  }

  var today = Utilities.formatDate(new Date(now), 'America/Mexico_City', 'yyyy-MM-dd');
  var entryParts = normalizedDate.split('-').map(Number);
  var todayParts = today.split('-').map(Number);
  var entryUtc = Date.UTC(entryParts[0], entryParts[1] - 1, entryParts[2]);
  var todayUtc = Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2]);
  return Math.max(0, (todayUtc - entryUtc) / 86400000);
}

function calculateApiLaboratorySemaphore_(status, days) {
  if (days === null) {
    return '';
  }

  var closedStatuses = ['❌ DAÑADO', '🏬 ENVIADO A MATRIZ', '📦 ENTREGADO', '✅ FUNCIONAL'];

  if (closedStatuses.indexOf(normalizeCell_(status)) >= 0) {
    return '🔵 CERRADO';
  }

  if (days <= 3) {
    return '🟢 EN TIEMPO';
  }

  if (days <= 6) {
    return '🟡 POR VENCER';
  }

  return '🔴 URGENTE';
}
