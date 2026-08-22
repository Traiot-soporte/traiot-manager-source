# Backend de Google Apps Script

Proyecto independiente que funciona como frontera entre la PWA y Google
Sheets/Drive. No existe un servidor backend local.

## Estado actual

- Web App privado: acceso exclusivo de la cuenta propietaria.
- Permisos: lectura de Google Drive y Google Sheets.
- Acciones HTTP disponibles: `health` e `inventory`.
- Carpeta configurada mediante `TRAIOT_FOLDER_ID` en Script Properties, con un
  valor inicial seguro incluido en `00_Config.gs`.
- Todavía no existen endpoints de mutación ni acceso público para la PWA.

## Funciones manuales

- `configurarBackend()`: guarda la configuración inicial y confirma acceso a la
  carpeta, sus archivos de Google Sheets y sus pestañas.
- `diagnosticarCarpeta()`: enumera, sin modificar, los archivos de Google Sheets,
  pestañas, encabezados y coincidencias con las 16 tablas esperadas.

## Seguridad

No se debe cambiar `webapp.access` a `ANYONE` o `ANYONE_ANONYMOUS` hasta que la
validación de identidad, usuarios activos y permisos por operación esté terminada.
Los tokens de `clasp` no pertenecen al código fuente y no deben versionarse.
