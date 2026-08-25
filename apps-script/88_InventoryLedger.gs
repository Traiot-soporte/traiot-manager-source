/**
 * Kardex y existencias autoritativas.
 *
 * El saldo existente de ALMACEN se conserva como SALDO INICIAL. A partir de
 * ese punto solo COMPRAS recibidas y PEDIDOS aprobados modifican existencias.
 */
var TRAIOT_INVENTORY_STORAGE_PROPERTY = 'TRAIOT_INVENTORY_LEDGER_V4';

function ensureInventoryStorage_(spreadsheet, force) {
  var properties = PropertiesService.getScriptProperties();

  if (!force && properties.getProperty(TRAIOT_INVENTORY_STORAGE_PROPERTY) === 'true' &&
      spreadsheet.getSheetByName('KARDEX')) {
    return { ready: true, initialized: false };
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var kardexSchema = requireApiTable_('KARDEX');
    var kardexSheet = spreadsheet.getSheetByName(kardexSchema.sheet);

    if (!kardexSheet) {
      kardexSheet = spreadsheet.insertSheet(kardexSchema.sheet);
    }

    var headers = readApiHeaders_(kardexSheet);
    if (headers.length === 0) {
      headers = kardexSchema.targetHeaders.slice();
      kardexSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      kardexSheet.setFrozenRows(1);
    } else {
      kardexSchema.targetHeaders.forEach(function (header) {
        if (headers.indexOf(header) < 0) {
          kardexSheet.getRange(1, headers.length + 1).setValue(header);
          headers.push(header);
        }
      });
    }

    var existingIds = {};
    var idIndex = headers.indexOf('MOVIMIENTO ID');
    var existingValues = kardexSheet.getLastRow() > 1 && idIndex >= 0
      ? kardexSheet.getRange(2, idIndex + 1, kardexSheet.getLastRow() - 1, 1).getDisplayValues()
      : [];
    existingValues.forEach(function (row) {
      existingIds[normalizeCell_(row[0])] = true;
    });

    var almacenSchema = requireApiTable_('ALMACEN');
    var almacenSheet = requireApiSheet_(spreadsheet, almacenSchema);
    var almacenHeaders = readApiHeaders_(almacenSheet);
    var stockIndex = requireHeaderIndex_(almacenHeaders, 'STOCK', almacenSchema);
    var noticeIndex = requireHeaderIndex_(almacenHeaders, 'AVISO DE COMPRA', almacenSchema);
    var purchasesIndex = requireHeaderIndex_(almacenHeaders, 'COMPRAS', almacenSchema);
    var exitsIndex = requireHeaderIndex_(almacenHeaders, 'PEDIDOS', almacenSchema);
    var statusIndex = requireHeaderIndex_(almacenHeaders, 'ESTATUS', almacenSchema);
    var productRows = readApiRows_(spreadsheet, almacenSchema);
    var derivedCounters = buildInventoryAggregateCounters_(spreadsheet);
    var baselineRecords = [];
    var now = new Date().toISOString();

    productRows.forEach(function (product) {
      var productUuid = normalizeCell_(product._uuid).toLowerCase();
      var movementId = 'KDX-INICIAL-' + productUuid;
      var counters = derivedCounters[productUuid] || {
        purchaseTransactions: 0,
        purchaseUnits: 0,
        exits: 0
      };
      var purchases = counters.purchaseTransactions;
      var exits = hasInventoryNumericValue_(product.PEDIDOS)
        ? apiNumber_(product.PEDIDOS)
        : counters.exits;
      var stock = hasInventoryNumericValue_(product.STOCK)
        ? apiNumber_(product.STOCK)
        : counters.purchaseUnits - counters.exits;
      var snapshot = findApiRowSnapshot_(almacenSheet, almacenSchema, productUuid);

      if (snapshot) {
        almacenSheet.getRange(snapshot.rowNumber, stockIndex + 1).setValue(stock);
        almacenSheet.getRange(snapshot.rowNumber, purchasesIndex + 1).setValue(purchases);
        almacenSheet.getRange(snapshot.rowNumber, exitsIndex + 1).setValue(exits);
        almacenSheet.getRange(snapshot.rowNumber, statusIndex + 1).setValue(
          calculateInventoryStatus_(stock, product['STOCK MINIMO'], product['STOCK MAXIMO'])
        );
        almacenSheet.getRange(snapshot.rowNumber, noticeIndex + 1).setValue(
          calculateInventoryPurchaseNotice_(stock, product['STOCK MINIMO'], product['STOCK MAXIMO'])
        );
      }

      if (!existingIds[movementId]) {
        baselineRecords.push(buildInventoryLedgerRecord_({
          movementId: movementId,
          date: now,
          type: 'SALDO INICIAL',
          productUuid: productUuid,
          product: inventoryProductLabel_(product),
          quantity: stock,
          previousStock: 0,
          nextStock: stock,
          origin: 'MIGRACION',
          originUuid: productUuid,
          reference: 'Saldo conservado al activar el Kardex',
          userEmail: 'sistema@traiot.local',
          reason: 'Inicializacion autoritativa de existencias'
        }));
      }
    });

    appendInventoryLedgerRecords_(kardexSheet, kardexSchema, headers, baselineRecords);
    SpreadsheetApp.flush();
    properties.setProperty(TRAIOT_INVENTORY_STORAGE_PROPERTY, 'true');

    return {
      ready: true,
      initialized: true,
      products: productRows.length,
      baselineMovements: baselineRecords.length
    };
  } finally {
    lock.releaseLock();
  }
}

function inventoryContributionForRecord_(tableName, record) {
  if (!record || record._deleted === true) {
    return null;
  }

  var productUuid = normalizeCell_(record.producto_uuid).toLowerCase();
  if (!productUuid) {
    return null;
  }

  // Toda compra registrada representa una entrada confirmada. El inventario ya no
  // depende de un estatus editable u oculto.
  if (tableName === 'COMPRAS') {
    return {
      productUuid: productUuid,
      quantity: Math.abs(apiNumber_(record.CANTIDAD)),
      reference: normalizeCell_(record['ID COMPRA'])
    };
  }

  if (tableName === 'PEDIDOS' && normalizeLookupValue_(record['ESTATUS PEDIDO']) === 'APROBADO') {
    return {
      productUuid: productUuid,
      quantity: -Math.abs(apiNumber_(record['EQUIPOS A VENDER'])),
      reference: normalizeCell_(record['ID PEDIDO'])
    };
  }

  return null;
}

function buildInventoryDeltas_(tableName, beforeRecord, afterRecord) {
  var before = inventoryContributionForRecord_(tableName, beforeRecord);
  var after = inventoryContributionForRecord_(tableName, afterRecord);

  if (!before && !after) {
    return [];
  }

  if (before && after && before.productUuid === after.productUuid) {
    var delta = after.quantity - before.quantity;
    if (delta === 0) return [];
    return [{
      productUuid: after.productUuid,
      delta: delta,
      operationDelta: 0,
      type: !before.quantity ? inventoryNaturalMovementType_(after.quantity)
        : !after.quantity ? 'REVERSO' : 'AJUSTE',
      reference: after.reference || before.reference
    }];
  }

  var deltas = [];
  if (before) {
    deltas.push({
      productUuid: before.productUuid,
      delta: -before.quantity,
      operationDelta: -1,
      type: 'REVERSO',
      reference: before.reference
    });
  }
  if (after) {
    deltas.push({
      productUuid: after.productUuid,
      delta: after.quantity,
      operationDelta: 1,
      type: inventoryNaturalMovementType_(after.quantity),
      reference: after.reference
    });
  }
  return deltas;
}

function inventoryNaturalMovementType_(quantity) {
  return quantity >= 0 ? 'ENTRADA' : 'SALIDA';
}

function planInventoryMutation_(spreadsheet, schemaTable, beforeRecord, afterRecord, mutationId, user) {
  var deltas = buildInventoryDeltas_(schemaTable.name, beforeRecord, afterRecord);
  if (deltas.length === 0) return { entries: [], products: [] };

  var almacenSchema = requireApiTable_('ALMACEN');
  var almacenSheet = requireApiSheet_(spreadsheet, almacenSchema);
  var products = [];
  var entries = [];
  var now = new Date().toISOString();

  deltas.forEach(function (movement, index) {
    var productSnapshot = findApiRowSnapshot_(almacenSheet, almacenSchema, movement.productUuid);
    if (!productSnapshot || productSnapshot.record._deleted === true) {
      throw new Error('No existe el producto asociado al movimiento de inventario.');
    }

    var previousStock = apiNumber_(productSnapshot.record.STOCK);
    var nextStock = previousStock + movement.delta;
    if (nextStock < 0) {
      throw new Error(
        'Existencia insuficiente para ' + inventoryProductLabel_(productSnapshot.record) +
        '. Disponible: ' + previousStock + '; solicitado: ' + Math.abs(movement.delta) + '.'
      );
    }

    var counterField = schemaTable.name === 'COMPRAS' ? 'COMPRAS' : 'PEDIDOS';
    var counterDelta = schemaTable.name === 'COMPRAS'
      ? movement.operationDelta
      : -movement.delta;
    var previousCounter = apiNumber_(productSnapshot.record[counterField]);
    var nextCounter = previousCounter + counterDelta;
    if (nextCounter < 0) {
      throw new Error('El acumulado de ' + counterField.toLowerCase() + ' no puede ser negativo.');
    }

    products.push({
      sheet: almacenSheet,
      schema: almacenSchema,
      snapshot: productSnapshot,
      previousStock: previousStock,
      nextStock: nextStock,
      counterField: counterField,
      previousCounter: previousCounter,
      nextCounter: nextCounter,
      notice: calculateInventoryPurchaseNotice_(
        nextStock,
        productSnapshot.record['STOCK MINIMO'],
        productSnapshot.record['STOCK MAXIMO']
      ),
      status: calculateInventoryStatus_(
        nextStock,
        productSnapshot.record['STOCK MINIMO'],
        productSnapshot.record['STOCK MAXIMO']
      )
    });
    entries.push(buildInventoryLedgerRecord_({
      movementId: 'KDX-' + normalizeCell_(mutationId).toUpperCase() + '-' + String(index + 1),
      date: now,
      type: movement.type,
      productUuid: movement.productUuid,
      product: inventoryProductLabel_(productSnapshot.record),
      quantity: movement.delta,
      previousStock: previousStock,
      nextStock: nextStock,
      origin: schemaTable.name,
      originUuid: normalizeCell_((afterRecord || beforeRecord || {})._uuid),
      reference: movement.reference,
      userEmail: normalizeCell_(user && user.email),
      reason: inventoryMovementReason_(schemaTable.name, movement.type)
    }));
  });

  return { entries: entries, products: products };
}

function commitInventoryPlan_(spreadsheet, plan) {
  if (!plan || plan.entries.length === 0) return;

  var updatedProducts = [];
  var kardexSchema = requireApiTable_('KARDEX');
  var kardexSheet = requireApiSheet_(spreadsheet, kardexSchema);
  var kardexHeaders = readApiHeaders_(kardexSheet);
  var ledgerStartRow = Math.max(kardexSheet.getLastRow() + 1, 2);

  try {
    plan.products.forEach(function (product) {
      var headers = product.snapshot.headers;
      var stockColumn = requireHeaderIndex_(headers, 'STOCK', product.schema) + 1;
      var noticeColumn = requireHeaderIndex_(headers, 'AVISO DE COMPRA', product.schema) + 1;
      var statusColumn = requireHeaderIndex_(headers, 'ESTATUS', product.schema) + 1;
      product.sheet.getRange(product.snapshot.rowNumber, stockColumn).setValue(product.nextStock);
      product.sheet.getRange(product.snapshot.rowNumber, noticeColumn).setValue(product.notice);
      product.sheet.getRange(product.snapshot.rowNumber, statusColumn).setValue(product.status);
      product.sheet.getRange(
        product.snapshot.rowNumber,
        requireHeaderIndex_(headers, product.counterField, product.schema) + 1
      ).setValue(product.nextCounter);
      updatedProducts.push(product);
    });

    appendInventoryLedgerRecords_(kardexSheet, kardexSchema, kardexHeaders, plan.entries);
    SpreadsheetApp.flush();
  } catch (error) {
    updatedProducts.forEach(function (product) {
      var headers = product.snapshot.headers;
      product.sheet.getRange(
        product.snapshot.rowNumber,
        requireHeaderIndex_(headers, 'STOCK', product.schema) + 1
      ).setValue(product.previousStock);
      product.sheet.getRange(
        product.snapshot.rowNumber,
        requireHeaderIndex_(headers, 'AVISO DE COMPRA', product.schema) + 1
      ).setValue(product.snapshot.record['AVISO DE COMPRA'] || '');
      product.sheet.getRange(
        product.snapshot.rowNumber,
        requireHeaderIndex_(headers, 'ESTATUS', product.schema) + 1
      ).setValue(product.snapshot.record.ESTATUS || '');
      product.sheet.getRange(
        product.snapshot.rowNumber,
        requireHeaderIndex_(headers, product.counterField, product.schema) + 1
      ).setValue(product.previousCounter);
    });
    if (plan.entries.length > 0 && kardexSheet.getLastRow() >= ledgerStartRow) {
      kardexSheet.getRange(ledgerStartRow, 1, plan.entries.length, kardexHeaders.length).clearContent();
    }
    SpreadsheetApp.flush();
    throw error;
  }
}

function appendInventoryLedgerRecords_(sheet, schemaTable, headers, records) {
  if (!records || records.length === 0) return;
  var values = records.map(function (record) {
    return headers.map(function (header) {
      var column = findApiColumnByHeader_(schemaTable, header);
      return column ? toApiSheetCell_(record[column.name], column) : '';
    });
  });
  sheet.getRange(Math.max(sheet.getLastRow() + 1, 2), 1, values.length, headers.length).setValues(values);
}

function buildInventoryLedgerRecord_(data) {
  return {
    _uuid: Utilities.getUuid().toLowerCase(),
    _updatedAt: data.date,
    _deleted: false,
    'MOVIMIENTO ID': data.movementId,
    FECHA: data.date,
    TIPO: data.type,
    producto_uuid: data.productUuid,
    PRODUCTO: data.product,
    CANTIDAD: data.quantity,
    'SALDO ANTERIOR': data.previousStock,
    'SALDO NUEVO': data.nextStock,
    ORIGEN: data.origin,
    'ORIGEN UUID': data.originUuid,
    REFERENCIA: data.reference,
    USUARIO: data.userEmail,
    MOTIVO: data.reason
  };
}

function calculateInventoryPurchaseNotice_(stock, minimum, maximum) {
  var normalizedStock = apiNumber_(stock);
  var normalizedMinimum = apiNumber_(minimum);
  var normalizedMaximum = apiNumber_(maximum);
  if (normalizedMinimum > 0 && normalizedStock <= normalizedMinimum) return 'REABASTECER';
  if (normalizedMaximum > 0 && normalizedStock > normalizedMaximum) return 'SOBRESTOCK';
  return 'NIVEL ADECUADO';
}

function calculateInventoryStatus_(stock, minimum, maximum) {
  var normalizedStock = apiNumber_(stock);
  var normalizedMinimum = apiNumber_(minimum);
  var normalizedMaximum = apiNumber_(maximum);
  if (normalizedStock <= 0) return 'STOCK AGOTADO';
  if (normalizedStock <= normalizedMinimum) return 'STOCK BAJO';
  if (normalizedMaximum > 0 && normalizedStock > normalizedMaximum) return 'SOBRESTOCK';
  return 'STOCK SUFICIENTE';
}

function buildInventoryAggregateCounters_(spreadsheet) {
  var counters = {};
  ['COMPRAS', 'PEDIDOS'].forEach(function (tableName) {
    var rows = readApiRows_(spreadsheet, requireApiTable_(tableName));
    rows.forEach(function (row) {
      var contribution = inventoryContributionForRecord_(tableName, row);
      if (!contribution) return;
      if (!counters[contribution.productUuid]) {
        counters[contribution.productUuid] = {
          purchaseTransactions: 0,
          purchaseUnits: 0,
          exits: 0
        };
      }
      if (tableName === 'COMPRAS') {
        counters[contribution.productUuid].purchaseTransactions += 1;
        counters[contribution.productUuid].purchaseUnits += Math.abs(contribution.quantity);
      } else {
        counters[contribution.productUuid].exits += Math.abs(contribution.quantity);
      }
    });
  });
  return counters;
}

function hasInventoryNumericValue_(value) {
  return value !== null && value !== undefined && normalizeCell_(value) !== '' && Number.isFinite(Number(value));
}

function inventoryProductLabel_(product) {
  return normalizeCell_(product['ID PRODUCTO']) || normalizeCell_(product.NOMBRE) || normalizeCell_(product._uuid);
}

function inventoryMovementReason_(tableName, type) {
  var source = tableName === 'COMPRAS' ? 'compra' : 'salida';
  if (type === 'REVERSO') return 'Reversion de ' + source;
  if (type === 'AJUSTE') return 'Actualizacion de ' + source;
  return (type === 'ENTRADA' ? 'Recepcion de ' : 'Aprobacion de ') + source;
}

function assertInventoryProductDeletionAllowed_(record) {
  if (apiNumber_(record && record.STOCK) !== 0) {
    throw new Error('No se puede eliminar un producto con existencias. Registra primero la salida o el ajuste correspondiente.');
  }
}

function inicializarKardex() {
  return ensureInventoryStorage_(openConfiguredSpreadsheet_(), true);
}
