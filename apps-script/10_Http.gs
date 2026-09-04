/**
 * Entrada HTTP del Web App. Durante el inventario inicial el manifiesto limita
 * el acceso a la cuenta propietaria. La autenticacion de usuarios se agregara
 * antes de habilitar mutaciones o publicar el endpoint para la PWA.
 */
function doGet(event) {
  var query = event && event.parameter ? event.parameter : {};
  var action = String(query.action || 'app').toLowerCase();

  if (action === 'app') {
    return HtmlService
      .createHtmlOutputFromFile('Index')
      .setTitle('TRAIOT MANAGER')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (action === 'bridge') {
    var template = HtmlService.createTemplateFromFile('Bridge');
    template.allowedOriginsJson = JSON.stringify(getAllowedFrontendOrigins_());
    return template
      .evaluate()
      .setTitle('TRAIOT Manager — conexión segura')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return handleHttpRequest_(event, null);
}

function getAllowedFrontendOrigins_() {
  var defaults = ['https://traiot-soporte.github.io'];
  var configured = PropertiesService
    .getScriptProperties()
    .getProperty('TRAIOT_ALLOWED_FRONTEND_ORIGINS');
  var candidates = defaults.concat(String(configured || '').split(','));
  var origins = [];

  candidates.forEach(function(candidate) {
    var origin = String(candidate || '').trim().replace(/\/$/, '');
    if (!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(origin)) return;
    if (origins.indexOf(origin) === -1) origins.push(origin);
  });

  return origins;
}

function doPost(event) {
  var payload = parsePostBody_(event);
  return handleHttpRequest_(event, payload);
}

function handleHttpRequest_(event, payload) {
  var requestId = Utilities.getUuid();
  var isApiPost = payload !== null && typeof payload === 'object';

  try {
    var query = event && event.parameter ? event.parameter : {};
    var action = String((payload && payload.action) || query.action || 'health').toLowerCase();
    var data;

    if (action === 'health') {
      data = buildHealth_();
    } else if (isApiPost) {
      data = apiRequest(payload);
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

    // apiRequest historically runs through google.script.run, where validation
    // and authentication messages are returned to the client. Preserve those
    // safe messages for the equivalent authenticated HTTP API.
    if (isApiPost && error && !error.apiCode && error.message) {
      apiError.message = String(error.message).slice(0, 500);
    }

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
