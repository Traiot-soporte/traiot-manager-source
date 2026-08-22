# Backend de Google Apps Script

Proyecto independiente que funciona como frontera entre la PWA y Google
Sheets/Drive. No existe un servidor backend local.

## Estado actual

- Web App privado: acceso exclusivo de la cuenta propietaria.
- Permisos: acceso a Google Drive y Google Sheets. El servicio
  `SpreadsheetApp.openById()` exige el alcance completo de Sheets; las acciones
  de preparación requieren además crear un respaldo en Drive.
- Acciones HTTP disponibles: `health`, `inventory`, `preflight` y
  `preparation-plan`.
- Carpeta configurada mediante `TRAIOT_FOLDER_ID` en Script Properties, con un
  valor inicial seguro incluido en `00_Config.gs`.
- Todavía no existen endpoints de mutación ni acceso público para la PWA.

## Funciones manuales

- `configurarBackend()`: guarda la configuración inicial y confirma acceso a la
  carpeta, sus archivos de Google Sheets y sus pestañas.
- `diagnosticarCarpeta()`: enumera, sin modificar, los archivos de Google Sheets,
  pestañas, encabezados y coincidencias con las 16 tablas esperadas.
- `prepararMigracion()`: crea un respaldo idempotente y aplica exclusivamente
  las hojas y encabezados faltantes; no transforma filas.

El endpoint `preflight` compara los encabezados reales con la metadata generada
desde `src/schema`, distingue las tres tablas nuevas pendientes y bloquea una
migración si falta una tabla original o si encuentra encabezados incompatibles.
Siempre devuelve `writesPerformed: false`.

La preparación crea o reutiliza `_RESPALDOS_TRAIOT`, carpeta excluida del
inventario para evitar falsos duplicados. El identificador del respaldo y el
resultado se conservan en Script Properties, de modo que un reintento no cree
otra copia ni duplique encabezados.

## Seguridad

No se debe cambiar `webapp.access` a `ANYONE` o `ANYONE_ANONYMOUS` hasta que la
validación de identidad, usuarios activos y permisos por operación esté terminada.
Los tokens de `clasp` no pertenecen al código fuente y no deben versionarse.
