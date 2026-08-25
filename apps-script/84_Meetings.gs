/**
 * Reuniones empresariales e invitaciones preparadas para los colaboradores.
 * Los correos y WhatsApp se conservan como comunicaciones pendientes: el
 * organizador abre cada canal y confirma el envio desde su cuenta.
 */
var TRAIOT_MEETINGS_SHEET = '_TRAIOT_REUNIONES';
var TRAIOT_MEETING_HEADERS = Object.freeze([
  'MeetingUuid',
  'Title',
  'Description',
  'StartAt',
  'EndAt',
  'MeetUrl',
  'ParticipantUuids',
  'ParticipantEmails',
  'ParticipantsJson',
  'OrganizerUuid',
  'OrganizerName',
  'OrganizerEmail',
  'Status',
  'CreatedAt',
  'UpdatedAt'
]);

function listMeetingParticipants_(user) {
  if (!user || !normalizeCell_(user.userUuid)) {
    throw new Error('La sesion no es valida.');
  }
  return readAuthUsers_(openConfiguredSpreadsheet_()).filter(function (candidate) {
    return candidate.UserActive === true &&
      normalizeApiBoolean_(candidate._deleted) !== true &&
      Boolean(normalizeApiEmail_(candidate.UserEmail));
  }).map(function (candidate) {
    return {
      userUuid: normalizeCell_(candidate._uuid).toLowerCase(),
      name: normalizeCell_(candidate.UserName) || normalizeCell_(candidate.UserID) || 'Usuario',
      email: normalizeApiEmail_(candidate.UserEmail),
      role: canonicalApiRole_(candidate.UserRole) || normalizeCell_(candidate.UserRole)
    };
  }).sort(function (left, right) {
    return left.name.localeCompare(right.name);
  });
}

function listCompanyMeetings_(user) {
  if (!user || !normalizeCell_(user.userUuid)) {
    throw new Error('La sesion no es valida.');
  }
  var sheet = ensureMeetingsSheet_(openConfiguredSpreadsheet_());
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(String);
  return values.slice(1).map(function (row) {
    return serializeMeetingRecord_(mapMeetingRecord_(headers, row));
  }).filter(function (meeting) {
    return meeting.meetingUuid && meeting.status !== 'CANCELADA';
  }).sort(function (left, right) {
    return String(left.startAt).localeCompare(String(right.startAt));
  });
}

function createCompanyMeeting_(user, submitted, mutationId) {
  var input = submitted || {};
  var title = normalizeCell_(input.title).slice(0, 160);
  var description = normalizeCell_(input.description).slice(0, 3000);
  var meetUrl = normalizeMeetingUrl_(input.meetUrl);
  var startAt = new Date(input.startAt);
  var endAt = new Date(input.endAt);
  var requestedUuids = uniqueMeetingValues_(input.participantUuids).map(function (value) {
    return value.toLowerCase();
  });
  var whatsappRecipients = uniqueMeetingValues_(input.whatsappRecipients).filter(function (value) {
    return isValidCommunicationRecipient_('WHATSAPP', value);
  });

  if (!title) throw new Error('Captura el titulo de la reunion.');
  if (!meetUrl) throw new Error('Captura un enlace valido de Google Meet.');
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || endAt.getTime() <= startAt.getTime()) {
    throw new Error('La fecha de termino debe ser posterior al inicio.');
  }

  var available = listMeetingParticipants_(user);
  var participants = available.filter(function (participant) {
    return requestedUuids.indexOf(participant.userUuid) >= 0;
  });
  if (participants.length === 0) {
    throw new Error('Selecciona al menos un colaborador activo.');
  }

  return runIdempotentApiMutation_(mutationId, function () {
    var spreadsheet = openConfiguredSpreadsheet_();
    var meetingSheet = ensureMeetingsSheet_(spreadsheet);
    var communicationSheet = ensureCommunicationsSheet_(spreadsheet);
    var now = new Date().toISOString();
    var meetingUuid = Utilities.getUuid().toLowerCase();
    var record = {
      MeetingUuid: meetingUuid,
      Title: title,
      Description: description,
      StartAt: startAt.toISOString(),
      EndAt: endAt.toISOString(),
      MeetUrl: meetUrl,
      ParticipantUuids: JSON.stringify(participants.map(function (participant) { return participant.userUuid; })),
      ParticipantEmails: JSON.stringify(participants.map(function (participant) { return participant.email; })),
      ParticipantsJson: JSON.stringify(participants),
      OrganizerUuid: normalizeCell_(user.userUuid).toLowerCase(),
      OrganizerName: normalizeCell_(user.name) || normalizeApiEmail_(user.email),
      OrganizerEmail: normalizeApiEmail_(user.email),
      Status: 'PROGRAMADA',
      CreatedAt: now,
      UpdatedAt: now
    };
    meetingSheet.appendRow(TRAIOT_MEETING_HEADERS.map(function (header) {
      return record[header] || '';
    }));

    var serialized = serializeMeetingRecord_(record);
    var invitationText = buildMeetingInvitationText_(serialized);
    var communicationRecords = [];
    participants.forEach(function (participant) {
      communicationRecords.push(buildMeetingCommunicationRecord_(
        user,
        serialized,
        'EMAIL',
        participant.email,
        invitationText,
        now
      ));
    });
    whatsappRecipients.forEach(function (recipient) {
      communicationRecords.push(buildMeetingCommunicationRecord_(
        user,
        serialized,
        'WHATSAPP',
        recipient,
        invitationText,
        now
      ));
    });
    if (communicationRecords.length > 0) {
      communicationSheet.getRange(
        communicationSheet.getLastRow() + 1,
        1,
        communicationRecords.length,
        TRAIOT_COMMUNICATION_HEADERS.length
      ).setValues(communicationRecords.map(function (communication) {
        return TRAIOT_COMMUNICATION_HEADERS.map(function (header) {
          return communication[header] || '';
        });
      }));
    }
    SpreadsheetApp.flush();
    return {
      meeting: serialized,
      emailInvitations: participants.length,
      whatsappInvitations: whatsappRecipients.length
    };
  });
}

function ensureMeetingsSheet_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(TRAIOT_MEETINGS_SHEET);
  if (!sheet) sheet = spreadsheet.insertSheet(TRAIOT_MEETINGS_SHEET);
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, TRAIOT_MEETING_HEADERS.length)
      .setValues([TRAIOT_MEETING_HEADERS.slice()])
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else {
    var headers = readApiHeaders_(sheet);
    TRAIOT_MEETING_HEADERS.forEach(function (header) {
      if (headers.indexOf(header) < 0) {
        sheet.getRange(1, headers.length + 1).setValue(header);
        headers.push(header);
      }
    });
  }
  if (!sheet.isSheetHidden()) sheet.hideSheet();
  return sheet;
}

function mapMeetingRecord_(headers, row) {
  var record = {};
  headers.forEach(function (header, index) {
    var value = row[index];
    record[header] = Object.prototype.toString.call(value) === '[object Date]'
      ? value.toISOString()
      : value;
  });
  return record;
}

function serializeMeetingRecord_(record) {
  return {
    meetingUuid: normalizeCell_(record.meetingUuid || record.MeetingUuid),
    title: normalizeCell_(record.title || record.Title),
    description: normalizeCell_(record.description || record.Description),
    startAt: normalizeCell_(record.startAt || record.StartAt),
    endAt: normalizeCell_(record.endAt || record.EndAt),
    meetUrl: normalizeCell_(record.meetUrl || record.MeetUrl),
    participants: parseMeetingParticipants_(record.participants || record.ParticipantsJson),
    organizerName: normalizeCell_(record.organizerName || record.OrganizerName),
    organizerEmail: normalizeApiEmail_(record.organizerEmail || record.OrganizerEmail),
    status: normalizeCell_(record.status || record.Status),
    createdAt: normalizeCell_(record.createdAt || record.CreatedAt)
  };
}

function parseMeetingParticipants_(value) {
  if (Array.isArray(value)) return value;
  try {
    var parsed = JSON.parse(normalizeCell_(value) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function buildMeetingCommunicationRecord_(user, meeting, channel, recipient, message, now) {
  return {
    CommunicationUuid: Utilities.getUuid().toLowerCase(),
    EntityTable: 'Reuniones',
    EntityUuid: meeting.meetingUuid,
    EntityTitle: 'Reunion · ' + meeting.title,
    Channel: channel,
    Recipient: recipient,
    Subject: channel === 'EMAIL' ? 'Invitacion a reunion · ' + meeting.title : '',
    Message: message,
    ScheduledAt: now,
    Status: 'PROGRAMADO',
    CreatedByUuid: normalizeCell_(user.userUuid).toLowerCase(),
    CreatedByEmail: normalizeApiEmail_(user.email),
    CreatedAt: now,
    OpenedAt: '',
    SentAt: '',
    CancelledAt: '',
    UpdatedAt: now
  };
}

function buildMeetingInvitationText_(meeting) {
  var start = new Date(meeting.startAt);
  var end = new Date(meeting.endAt);
  var timeZone = getRuntimeConfig_().timeZone;
  return [
    'Reunion TRAIOT: ' + meeting.title,
    'Fecha: ' + Utilities.formatDate(start, timeZone, 'dd/MM/yyyy'),
    'Horario: ' + Utilities.formatDate(start, timeZone, 'HH:mm') + ' - ' + Utilities.formatDate(end, timeZone, 'HH:mm'),
    'Google Meet: ' + meeting.meetUrl,
    meeting.description ? 'Agenda: ' + meeting.description : ''
  ].filter(Boolean).join('\n\n');
}

function normalizeMeetingUrl_(value) {
  var url = normalizeCell_(value);
  return /^https:\/\/meet\.google\.com\/[a-z0-9-]+(?:\?.*)?$/i.test(url) ? url : '';
}

function uniqueMeetingValues_(values) {
  if (!Array.isArray(values)) return [];
  var seen = {};
  return values.map(normalizeCell_).filter(function (value) {
    var key = value.toLowerCase();
    if (!value || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}
