/**
 * Archivos privados de imagen y firma. Los binarios permanecen dentro de la
 * carpeta configurada de TRAIOT y solo se entregan despues de autorizar al
 * usuario y la tabla solicitada.
 */
function persistApiMediaFields_(spreadsheet, schemaTable, record, submittedValues, mutationId) {
  var submitted = submittedValues && typeof submittedValues === 'object' ? submittedValues : {};

  schemaTable.columns.filter(function (column) {
    return isApiEditableColumn_(column) &&
      (column.type === 'Image' || column.type === 'Signature') &&
      Object.prototype.hasOwnProperty.call(submitted, column.name);
  }).forEach(function (column) {
    var value = record[column.name];

    if (isApiBlank_(value)) {
      record[column.name] = null;
      return;
    }

    var normalized = String(value);

    if (normalized.indexOf('blob:') === 0) {
      throw new Error('No fue posible leer ' + column.name + '. Selecciona el archivo nuevamente.');
    }

    if (normalized.indexOf('data:') !== 0) {
      return;
    }

    var media = parseApiImageDataUrl_(normalized);
    var folder = getApiMediaFolder_(schemaTable, true);
    var fileName = buildApiMediaFileName_(record._uuid, column.name, mutationId, media.extension);
    var existingFiles = folder.getFilesByName(fileName);
    var file = existingFiles.hasNext()
      ? existingFiles.next()
      : folder.createFile(Utilities.newBlob(media.bytes, media.mimeType, fileName));

    record[column.name] = folder.getName() + '/' + file.getName();
  });
}

function readApiMedia_(schemaTable, storedValue) {
  var value = String(storedValue || '').trim();

  if (!value) {
    return null;
  }

  if (value.indexOf('data:image/') === 0 || /^https:\/\//i.test(value)) {
    return value;
  }

  var normalizedPath = value.replace(/\\/g, '/').replace(/^\/+/, '');
  var parts = normalizedPath.split('/').filter(function (part) { return part !== ''; });
  var folder = getApiMediaFolder_(schemaTable, false);

  if (!folder) {
    throw new Error('No existe la carpeta de archivos de ' + schemaTable.name + '.');
  }

  if (parts.length === 2 && parts[0] !== folder.getName()) {
    throw new Error('La ruta del archivo no corresponde a ' + schemaTable.name + '.');
  }

  if (parts.length < 1 || parts.length > 2 || parts.some(function (part) { return part === '..'; })) {
    throw new Error('La ruta del archivo no es valida.');
  }

  var fileName = parts[parts.length - 1];
  var files = folder.getFilesByName(fileName);

  if (!files.hasNext()) {
    throw new Error('No se encontro el archivo solicitado en el almacenamiento.');
  }

  var blob = files.next().getBlob();
  var mimeType = blob.getContentType() || 'application/octet-stream';
  return 'data:' + mimeType + ';base64,' + Utilities.base64Encode(blob.getBytes());
}

function getApiMediaFolder_(schemaTable, createWhenMissing) {
  var folderName = schemaTable.name + '_Images';
  var rootFolder = DriveApp.getFolderById(getRuntimeConfig_().folderId);
  var folders = rootFolder.getFoldersByName(folderName);

  if (folders.hasNext()) {
    return folders.next();
  }

  return createWhenMissing ? rootFolder.createFolder(folderName) : null;
}

function parseApiImageDataUrl_(value) {
  var match = String(value || '').match(
    /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/
  );

  if (!match) {
    throw new Error('El archivo debe ser una imagen JPEG, PNG, WEBP o GIF valida.');
  }

  var bytes = Utilities.base64Decode(match[2].replace(/\s/g, ''));

  if (bytes.length > 8 * 1024 * 1024) {
    throw new Error('La imagen excede el limite de 8 MB.');
  }

  var extensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif'
  };

  return {
    mimeType: match[1],
    extension: extensions[match[1]],
    bytes: bytes
  };
}

function buildApiMediaFileName_(rowUuid, columnName, mutationId, extension) {
  var columnSlug = String(columnName || 'archivo')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'archivo';

  return String(rowUuid).toLowerCase() + '.' + columnSlug + '.' +
    String(mutationId).toLowerCase() + '.' + extension;
}
