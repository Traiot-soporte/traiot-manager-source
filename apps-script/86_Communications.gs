/**
 * Agenda privada de comunicaciones. No envia mensajes: conserva la fecha y
 * prepara el enlace que el usuario abre y confirma desde su navegador.
 */
var TRAIOT_COMMUNICATIONS_SHEET = '_TRAIOT_COMUNICACIONES';
var TRAIOT_COMMUNICATION_HEADERS = Object.freeze([
  'CommunicationUuid',
  'EntityTable',
  'EntityUuid',
  'EntityTitle',
  'Channel',
  'Recipient',
  'Subject',
  'Message',
  'ScheduledAt',
  'Status',
  'CreatedByUuid',
  'CreatedByEmail',
  'CreatedAt',
  'OpenedAt',
  'SentAt',
  'CancelledAt',
  'UpdatedAt',
  'RecipientName'
]);

function listScheduledCommunications_(user) {
  var spreadsheet = openConfiguredSpreadsheet_();
  var sheet = ensureCommunicationsSheet_(spreadsheet);
  var values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return [];
  }

  var headers = values[0].map(String);
  var records = values.slice(1).map(function (row, index) {
    return mapCommunicationRecord_(headers, row, index + 2);
  }).filter(function (record) {
    return record.communicationUuid && isCommunicationOwnedBy_(record, user);
  });
  enrichCommunicationRecipientNames_(spreadsheet, records);
  return records.sort(function (left, right) {
    return String(left.scheduledAt).localeCompare(String(right.scheduledAt));
  }).map(serializeCommunicationRecord_);
}

function createScheduledCommunication_(user, submitted, mutationId) {
  assertCommunicationCrmAccess_(user);
  var input = submitted || {};
  var entityTable = normalizeCell_(input.entityTable);

  if (['CLIENTES', 'Gestion Clientes'].indexOf(entityTable) < 0) {
    throw new Error('Solo se pueden programar comunicaciones desde Clientes o Seguimiento Clientes.');
  }

  var schemaTable = requireApiTable_(entityTable);
  assertApiTableAccess_(user, schemaTable);
  var entityUuid = normalizeCell_(input.entityUuid).toLowerCase();

  if (!isUuid_(entityUuid)) {
    throw new Error('El registro relacionado no es valido.');
  }

  var entity = getApiRow_(schemaTable, entityUuid, user);
  if (!entity) {
    throw new Error('El registro relacionado ya no esta disponible.');
  }

  var channel = normalizeCommunicationChannel_(input.channel);
  var recipient = normalizeCell_(input.recipient);
  var subject = normalizeCell_(input.subject).slice(0, 180);
  var message = normalizeCell_(input.message).slice(0, 3000);
  var scheduledDate = new Date(input.scheduledAt);

  if (!channel) {
    throw new Error('Selecciona correo o WhatsApp.');
  }
  if (!isValidCommunicationRecipient_(channel, recipient)) {
    throw new Error(channel === 'EMAIL'
      ? 'El correo del destinatario no es valido.'
      : 'El telefono del destinatario no es valido.');
  }
  if (!message) {
    throw new Error('Captura el mensaje que deseas preparar.');
  }
  if (isNaN(scheduledDate.getTime())) {
    throw new Error('La fecha programada no es valida.');
  }

  return runIdempotentApiMutation_(mutationId, function () {
    var spreadsheet = openConfiguredSpreadsheet_();
    var sheet = ensureCommunicationsSheet_(spreadsheet);
    var now = new Date().toISOString();
    var record = {
      CommunicationUuid: Utilities.getUuid().toLowerCase(),
      EntityTable: entityTable,
      EntityUuid: entityUuid,
      EntityTitle: normalizeCell_(input.entityTitle) || communicationEntityTitle_(schemaTable, entity),
      Channel: channel,
      Recipient: recipient,
      RecipientName: normalizeCell_(input.recipientName).slice(0, 160),
      Subject: channel === 'EMAIL' ? subject : '',
      Message: message,
      ScheduledAt: scheduledDate.toISOString(),
      Status: 'PROGRAMADO',
      CreatedByUuid: normalizeCell_(user.userUuid).toLowerCase(),
      CreatedByEmail: normalizeApiEmail_(user.email),
      CreatedAt: now,
      OpenedAt: '',
      SentAt: '',
      CancelledAt: '',
      UpdatedAt: now
    };
    sheet.appendRow(TRAIOT_COMMUNICATION_HEADERS.map(function (header) {
      return record[header] || '';
    }));
    SpreadsheetApp.flush();
    return serializeCommunicationRecord_(record);
  });
}

function updateScheduledCommunicationStatus_(user, communicationUuid, requestedStatus, mutationId) {
  var normalizedUuid = normalizeCell_(communicationUuid).toLowerCase();
  var status = normalizeLookupValue_(requestedStatus);

  if (!isUuid_(normalizedUuid)) {
    throw new Error('La comunicacion programada no es valida.');
  }
  if (['ABIERTO', 'ENVIADO', 'CANCELADO'].indexOf(status) < 0) {
    throw new Error('El estado solicitado no es valido.');
  }

  return runIdempotentApiMutation_(mutationId, function () {
    var spreadsheet = openConfiguredSpreadsheet_();
    var sheet = ensureCommunicationsSheet_(spreadsheet);
    var values = sheet.getDataRange().getValues();
    var headers = values[0].map(String);
    var match = null;

    for (var index = 1; index < values.length; index += 1) {
      var candidate = mapCommunicationRecord_(headers, values[index], index + 1);
      if (normalizeCell_(candidate.communicationUuid).toLowerCase() === normalizedUuid) {
        match = candidate;
        break;
      }
    }

    if (!match || !isCommunicationOwnedBy_(match, user)) {
      throw new Error('La comunicacion programada no existe o pertenece a otra cuenta.');
    }
    if (match.status === 'ENVIADO' || match.status === 'CANCELADO') {
      throw new Error('La comunicacion ya se encuentra cerrada.');
    }

    var now = new Date().toISOString();
    writeCommunicationField_(sheet, match.rowNumber, headers, 'Status', status);
    writeCommunicationField_(sheet, match.rowNumber, headers, 'UpdatedAt', now);
    if (status === 'ABIERTO') writeCommunicationField_(sheet, match.rowNumber, headers, 'OpenedAt', now);
    if (status === 'ENVIADO') writeCommunicationField_(sheet, match.rowNumber, headers, 'SentAt', now);
    if (status === 'CANCELADO') writeCommunicationField_(sheet, match.rowNumber, headers, 'CancelledAt', now);
    SpreadsheetApp.flush();

    var refreshed = sheet.getRange(match.rowNumber, 1, 1, headers.length).getValues()[0];
    return serializeCommunicationRecord_(mapCommunicationRecord_(headers, refreshed, match.rowNumber));
  });
}

function ensureCommunicationsSheet_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(TRAIOT_COMMUNICATIONS_SHEET);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(TRAIOT_COMMUNICATIONS_SHEET);
  }

  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, TRAIOT_COMMUNICATION_HEADERS.length)
      .setValues([TRAIOT_COMMUNICATION_HEADERS.slice()])
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else {
    var headers = readApiHeaders_(sheet);
    TRAIOT_COMMUNICATION_HEADERS.forEach(function (header) {
      if (headers.indexOf(header) < 0) {
        sheet.getRange(1, headers.length + 1).setValue(header);
        headers.push(header);
      }
    });
  }

  if (!sheet.isSheetHidden()) {
    sheet.hideSheet();
  }
  return sheet;
}

function mapCommunicationRecord_(headers, row, rowNumber) {
  var record = { rowNumber: rowNumber };
  headers.forEach(function (header, columnIndex) {
    var value = row[columnIndex];
    record[header] = Object.prototype.toString.call(value) === '[object Date]'
      ? value.toISOString()
      : value;
  });
  record.communicationUuid = normalizeCell_(record.CommunicationUuid);
  record.entityTable = normalizeCell_(record.EntityTable);
  record.entityUuid = normalizeCell_(record.EntityUuid);
  record.entityTitle = normalizeCell_(record.EntityTitle);
  record.channel = normalizeCell_(record.Channel);
  record.recipient = normalizeCell_(record.Recipient);
  record.recipientName = normalizeCell_(record.RecipientName);
  record.subject = normalizeCell_(record.Subject);
  record.message = normalizeCell_(record.Message);
  record.scheduledAt = normalizeCell_(record.ScheduledAt);
  record.status = normalizeCell_(record.Status);
  record.createdByUuid = normalizeCell_(record.CreatedByUuid);
  record.createdByEmail = normalizeApiEmail_(record.CreatedByEmail);
  record.createdAt = normalizeCell_(record.CreatedAt);
  record.openedAt = normalizeCell_(record.OpenedAt);
  record.sentAt = normalizeCell_(record.SentAt);
  record.cancelledAt = normalizeCell_(record.CancelledAt);
  return record;
}

function serializeCommunicationRecord_(record) {
  return {
    communicationUuid: normalizeCell_(record.communicationUuid || record.CommunicationUuid),
    entityTable: normalizeCell_(record.entityTable || record.EntityTable),
    entityUuid: normalizeCell_(record.entityUuid || record.EntityUuid),
    entityTitle: normalizeCell_(record.entityTitle || record.EntityTitle),
    channel: normalizeCell_(record.channel || record.Channel),
    recipient: normalizeCell_(record.recipient || record.Recipient),
    recipientName: normalizeCell_(record.recipientName || record.RecipientName),
    subject: normalizeCell_(record.subject || record.Subject),
    message: normalizeCell_(record.message || record.Message),
    scheduledAt: normalizeCell_(record.scheduledAt || record.ScheduledAt),
    status: normalizeCell_(record.status || record.Status),
    createdAt: normalizeCell_(record.createdAt || record.CreatedAt),
    openedAt: normalizeCell_(record.openedAt || record.OpenedAt),
    sentAt: normalizeCell_(record.sentAt || record.SentAt),
    cancelledAt: normalizeCell_(record.cancelledAt || record.CancelledAt)
  };
}

function enrichCommunicationRecipientNames_(spreadsheet, records) {
  var meetingSheet = spreadsheet.getSheetByName(TRAIOT_MEETINGS_SHEET);
  if (!meetingSheet || meetingSheet.getLastRow() < 2) return records;

  var meetingValues = meetingSheet.getDataRange().getValues();
  var meetingHeaders = meetingValues[0].map(String);
  var namesByMeetingAndPhone = {};

  meetingValues.slice(1).forEach(function (row) {
    var meeting = serializeMeetingRecord_(mapMeetingRecord_(meetingHeaders, row));
    if (!meeting.meetingUuid) return;
    var namesByPhone = {};
    meeting.participants.forEach(function (participant) {
      var phone = normalizeMeetingWhatsAppPhone_(participant.phone);
      var name = normalizeCell_(participant.name);
      if (phone && name) namesByPhone[phone] = name;
    });
    namesByMeetingAndPhone[meeting.meetingUuid] = namesByPhone;
  });

  records.forEach(function (record) {
    if (record.recipientName || record.channel !== 'WHATSAPP' || record.entityTable !== 'Reuniones') {
      return;
    }
    var namesByPhone = namesByMeetingAndPhone[record.entityUuid] || {};
    var phone = normalizeMeetingWhatsAppPhone_(record.recipient);
    record.recipientName = namesByPhone[phone] || '';
  });
  return records;
}

function isCommunicationOwnedBy_(record, user) {
  var recordUuid = normalizeCell_(record.createdByUuid || record.CreatedByUuid).toLowerCase();
  var userUuid = normalizeCell_(user.userUuid).toLowerCase();
  if (recordUuid && userUuid) return recordUuid === userUuid;
  return normalizeApiEmail_(record.createdByEmail || record.CreatedByEmail) === normalizeApiEmail_(user.email);
}

function normalizeCommunicationChannel_(value) {
  var normalized = normalizeLookupValue_(value);
  if (normalized === 'EMAIL' || normalized === 'CORREO') return 'EMAIL';
  if (normalized === 'WHATSAPP') return 'WHATSAPP';
  return '';
}

function isValidCommunicationRecipient_(channel, recipient) {
  if (channel === 'EMAIL') {
    var emails = String(recipient || '').split(/[,;\n]+/).map(function (email) {
      return normalizeCell_(email);
    }).filter(Boolean);
    return emails.length > 0 && emails.every(function (email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    });
  }
  return String(recipient || '').replace(/\D/g, '').length >= 10;
}

function communicationEntityTitle_(schemaTable, entity) {
  var title = schemaTable.labelColumn ? entity[schemaTable.labelColumn] : '';
  return normalizeCell_(title) || normalizeCell_(entity._uuid);
}

function assertCommunicationCrmAccess_(user) {
  if (!canApiRoleAccessSection_(user.role, 'crm')) {
    throw new Error('La cuenta no tiene permiso para administrar comunicaciones de clientes.');
  }
}

function writeCommunicationField_(sheet, rowNumber, headers, header, value) {
  var columnIndex = headers.indexOf(header);
  if (columnIndex < 0) throw new Error('Falta el campo interno ' + header + '.');
  sheet.getRange(rowNumber, columnIndex + 1).setValue(value);
}
