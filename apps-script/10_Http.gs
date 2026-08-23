/**
 * Entrada HTTP del Web App. Durante el inventario inicial el manifiesto limita
 * el acceso a la cuenta propietaria. La autenticacion de usuarios se agregara
 * antes de habilitar mutaciones o publicar el endpoint para la PWA.
 */
function doGet(event) {
  var query = event && event.parameter ? event.parameter : {};

  if (!query.action || String(query.action).toLowerCase() === 'app') {
    return HtmlService
      .createHtmlOutputFromFile('Index')
      .setTitle('TRAIOT MANAGER')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  return handleHttpRequest_(event, null);
}

function doPost(event) {
  var payload = parsePostBody_(event);
  return handleHttpRequest_(event, payload);
}

function handleHttpRequest_(event, payload) {
  var requestId = Utilities.getUuid();

  try {
    var query = event && event.parameter ? event.parameter : {};
    var action = String((payload && payload.action) || query.action || 'health').toLowerCase();
    var data;

    if (action === 'health') {
      data = buildHealth_();
    } else {
      throw createApiError_('INVALID_ACTION', 'La accion solicitada no existe.', false);
    }

    return jsonResponse_({
      ok: true,
      requestId: requestId,
      serverTime: new Date().toISOString(),
      data: data
    });
  } catch (error) {
    var apiError = normalizeApiError_(error);

    console.error(JSON.stringify({
      requestId: requestId,
      code: apiError.code,
      message: apiError.internalMessage
    }));

    return jsonResponse_({
      ok: false,
      requestId: requestId,
      serverTime: new Date().toISOString(),
      error: {
        code: apiError.code,
        message: apiError.message,
        retryable: apiError.retryable
      }
    });
  }
}

function parsePostBody_(event) {
  var contents = event && event.postData ? event.postData.contents : '';

  if (!contents) {
    return {};
  }

  try {
    return JSON.parse(contents);
  } catch (error) {
    throw createApiError_('VALIDATION_ERROR', 'El cuerpo de la solicitud no contiene JSON valido.', false);
  }
}

function buildHealth_() {
  var config = getRuntimeConfig_();

  return {
    service: 'TRAIOT Manager',
    status: 'ok',
    phase: 'inventory',
    schemaVersion: config.schemaVersion,
    timeZone: config.timeZone
  };
}

function jsonResponse_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function createApiError_(code, message, retryable, internalMessage) {
  var error = new Error(internalMessage || message);
  error.apiCode = code;
  error.publicMessage = message;
  error.retryable = Boolean(retryable);
  return error;
}

function normalizeApiError_(error) {
  if (error && error.apiCode) {
    return {
      code: error.apiCode,
      message: error.publicMessage,
      retryable: error.retryable,
      internalMessage: error.message
    };
  }

  return {
    code: 'INTERNAL',
    message: 'Ocurrio un error interno al procesar la solicitud.',
    retryable: false,
    internalMessage: error && error.message ? error.message : String(error)
  };
}
