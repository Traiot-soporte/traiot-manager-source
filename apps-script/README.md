# Backend de Google Apps Script

Proyecto independiente que funciona como frontera entre la PWA y Google
Sheets/Drive. No existe un servidor backend local.

## Estado actual

- Web App publicado como contenedor del puente; los registros continúan protegidos por
  correo, contraseña, sesión, rol y permisos de `apiRequest`.
- La ruta principal entrega la interfaz React empaquetada y utiliza
  `google.script.run` para consultar Sheets sin CORS ni credenciales en el
  navegador.
- La interfaz conectada permite lectura, altas, ediciones y bajas logicas. Cada
  escritura valida la tabla, los campos obligatorios y catalogos, utiliza
  `LockService` y conserva UUID y marcas de sincronizacion.
- Las imagenes y firmas nuevas se guardan como archivos privados en Google
  Drive; la hoja conserva la ruta y la interfaz las solicita mediante el puente
  autorizado, sin publicar las carpetas.
- Permisos: acceso a Google Drive y Google Sheets. El servicio
  `SpreadsheetApp.openById()` exige el alcance completo de Sheets; las acciones
  de preparación requieren además crear un respaldo en Drive.
- La única acción HTTP de datos disponible es `health`. GitHub Pages usa `Bridge.html`
  mediante `postMessage`; el puente acepta únicamente orígenes autorizados y atiende datos,
  archivos y mutaciones mediante `google.script.run` y una sesión válida.
- Carpeta configurada mediante `TRAIOT_FOLDER_ID` en Script Properties, con un
  valor inicial seguro incluido en `00_Config.gs`.
- Las mutaciones solo están disponibles mediante el puente privado de la
  interfaz alojada.

## Autenticación con la hoja Usuarios

El correo proviene de `Usuarios.UserEmail`. Las contraseñas nunca se escriben
en texto plano: el backend aplica HMAC-SHA-256 con un secreto de Script
Properties y después bcrypt. Los hashes, bloqueos y versiones de sesión son
columnas sensibles que la API no devuelve al navegador.

Flujo de preparación:

1. Corregir correos duplicados entre usuarios activos.
2. Abrir el detalle de un usuario desde la aplicación y pulsar
   `PREPARAR SEGURIDAD` una sola vez.
3. Asignar una contraseña temporal diferente a cada usuario activo desde el
   panel de su detalle. No pegar contraseñas en Sheets, código o conversaciones.
4. Cuando el contador indique que todos están listos, pulsar
   `ACTIVAR PÁGINA DE LOGIN`.
5. Verificar el acceso y solamente entonces desplegar una versión con acceso
   anónimo al Web App; la identidad seguirá validándose contra `Usuarios`.

La primera sesión obliga al usuario a reemplazar la contraseña temporal y dura
como máximo 30 minutos hasta completar el cambio. Como la contraseña ya fue
validada al crear esa sesión, la pantalla solicita únicamente la contraseña
nueva y su confirmación. Cinco
fallos bloquean la cuenta durante 15 minutos. Los tokens se almacenan como hash
en `_AuthSessions`, las acciones de acceso se registran en `_AuthAudit` y ambas
hojas se mantienen ocultas.

Si el administrador pierde el acceso, puede crear temporalmente la Script
Property `TRAIOT_RECOVERY_TEMP_PASSWORD` y ejecutar
`restablecerAccesoAdministrador()` desde el editor. La función elimina esa
propiedad al leerla, restablece bloqueos, revoca sesiones y escribe únicamente
el nuevo hash en `Usuarios`.

La interfaz utiliza rutas independientes dentro de la SPA: `#/login` para el
inicio de sesión, `#/cambiar-contrasena` para el primer acceso y `#/` para el
centro de operación. `Index.html` es solamente el documento técnico que inicia
React y no funciona como pantalla principal.

`#/seguridad-usuarios` concentra restablecimientos temporales, desbloqueos,
revocación de sesiones y activación de cuentas. La ruta, el menú y cada acción
del backend exigen que `UserRole` sea `Administrador`; un permiso comodín por sí
solo no concede administración. Las acciones registran también el UUID del
administrador responsable en `_AuthAudit`.

## Funciones manuales

- `configurarBackend()`: guarda la configuración inicial y confirma acceso a la
  carpeta, sus archivos de Google Sheets y sus pestañas.
- `diagnosticarCarpeta()`: enumera, sin modificar, los archivos de Google Sheets,
  pestañas, encabezados y coincidencias con las 16 tablas esperadas.
- `prepararMigracion()`: crea un respaldo idempotente y aplica exclusivamente
  las hojas y encabezados faltantes; no transforma filas.
- `poblarIdentificadores()`: asigna UUID y completa `_updatedAt` y `_deleted`
  en las filas existentes. Conserva valores validos, puede reanudarse y exige
  que el respaldo estructural registrado siga disponible.
- `poblarRelacionesExactas()`: completa solamente referencias con una
  coincidencia unica. No sobrescribe referencias existentes incompatibles ni
  altera el texto original de una relacion pendiente.

El endpoint `preflight` compara los encabezados reales con la metadata generada
desde `src/schema`, distingue las tres tablas nuevas pendientes y bloquea una
migración si falta una tabla original o si encuentra encabezados incompatibles.
Siempre devuelve `writesPerformed: false`.

La preparación crea o reutiliza `_RESPALDOS_TRAIOT`, carpeta excluida del
inventario para evitar falsos duplicados. El identificador del respaldo y el
resultado se conservan en Script Properties, de modo que un reintento no cree
otra copia ni duplique encabezados.

`data-migration-audit` cuenta filas reales, UUID pendientes, claves visibles
duplicadas, campos obligatorios vacíos y referencias resolubles, ambiguas o no
resueltas. No devuelve valores de clientes ni otros ejemplos sensibles y siempre
informa `writesPerformed: false`.

La migracion de identificadores procesa solamente las 13 tablas originales y
no modifica sus columnas heredadas. Tampoco completa campos obligatorios vacios
ni relaciones que no puedan resolverse exactamente; esos datos permanecen
disponibles para una conciliacion posterior.

La migracion parcial de relaciones se bloquea si encuentra ambiguedades, UUID
invalidos o una referencia tecnica existente que contradiga la coincidencia
actual. Al finalizar vuelve a construir el plan para confirmar que no quede
ninguna coincidencia exacta pendiente de escritura.

## Seguridad

No se debe cambiar `webapp.access` a `ANYONE_ANONYMOUS` hasta que el modo
`SHEET_PASSWORD` esté activo y el inicio de sesión haya sido verificado. En modo
`OWNER_ONLY` también se exige que la cuenta activa sea la propietaria.
Los tokens de `clasp` no pertenecen al código fuente y no deben versionarse.
