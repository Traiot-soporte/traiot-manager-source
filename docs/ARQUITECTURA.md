# TRAIOT MANAGER — Arquitectura de la migración web/PWA

Estado: Fase 0, propuesta para aprobación  
Fecha: 21 de agosto de 2026  
Fuente de verdad funcional: docs/appsheet-schema.md

## 1. Alcance de esta fase

Este documento convierte el análisis y el esquema de AppSheet en un plan técnico ejecutable. Define:

- la arquitectura objetivo;
- el modelo de datos normalizado;
- el contrato lógico exacto de la API;
- el comportamiento offline y el algoritmo de sincronización;
- las reglas de seguridad, permisos y consistencia;
- las pruebas y criterios de aceptación;
- las decisiones que deben resolverse antes de implementar las fases afectadas.

Esta fase no crea frontend, backend ni scripts de migración. El desarrollo debe comenzar únicamente después de aprobar las decisiones abiertas del apartado 14.

## 2. Objetivos y restricciones

### Objetivos

1. Sustituir AppSheet sin perder los 6 módulos actuales ni sus datos.
2. Permitir que un técnico capture una instalación completa sin conexión, incluidas fotos y firma.
3. Mantener Google Sheets como almacenamiento central y Google Drive como almacenamiento de archivos.
4. Corregir los ocho defectos descritos en el documento de requerimientos.
5. Evitar que la UI dependa de Google Sheets o de Apps Script mediante una interfaz Repository.
6. Conservar una ruta de migración futura a una base transaccional sin reescribir las pantallas.

### Restricciones aceptadas

- Frontend: SPA estática con Vite, React 19 y TypeScript estricto.
- Backend: un Google Apps Script Web App ejecutado con la cuenta propietaria.
- Datos: Google Sheets; archivos: Google Drive.
- Los usuarios finales no tendrán permiso de edición sobre las hojas.
- Dexie/IndexedDB será la fuente de lectura inmediata de la UI.
- Las mutaciones usarán una outbox idempotente.
- La interfaz, mensajes y formatos serán español de México.
- La fecha civil de negocio se interpretará en America/Mexico_City y los timestamps técnicos se guardarán en UTC ISO 8601.

## 3. Vista general

~~~text
┌──────────────────────────────────────────────────────────────┐
│ PWA React                                                    │
│                                                              │
│ Rutas y módulos → vistas genéricas → campos genéricos        │
│                         ↓                                    │
│                 Repository / casos de uso                    │
│                         ↓                                    │
│ Dexie: filas, outbox, blobs, conflictos, estado de sync      │
│                         ↓                                    │
│ Coordinador de sync + worker + bloqueo entre pestañas        │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS / JSON
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ Google Apps Script Web App                                   │
│ Auth → permisos → validación → reglas de negocio → repositorio│
│             │                         │                      │
│             ▼                         ▼                      │
│      Google Sheets                 Google Drive              │
└──────────────────────────────────────────────────────────────┘
~~~

### Responsabilidad por capa

| Capa | Responsabilidad |
|---|---|
| Metadata compilada | Tipos, etiquetas, enum, referencias, secciones, visibilidad y fórmulas optimistas |
| Vistas y campos | Renderizar la metadata sin contener reglas de persistencia |
| Casos de uso | Validar la intención del usuario y crear mutaciones |
| Dexie | Espejo local, lectura reactiva, outbox, blobs y conflictos |
| Sync | Push, upload, pull, reintentos, orden causal y reconciliación |
| Apps Script | Seguridad, permisos, idempotencia, folios, importes, stock y timestamps oficiales |
| Sheets/Drive | Persistencia central; no son accedidos directamente por el navegador |

TanStack Query no será una segunda fuente de verdad. Servirá para coordinar comandos, invalidaciones y estado de operaciones; los datos que pintan las vistas siempre se leerán desde Dexie.

## 4. Motor guiado por metadata

El frontend contendrá una definición TableDef por cada tabla visible. Las funciones de fórmula, showIf y editableIf quedan compiladas en TypeScript porque no son serializables.

El bootstrap del backend devolverá:

- schemaVersion;
- una proyección serializable de tablas y columnas;
- permisos efectivos por tabla, operación y campo;
- los datos permitidos.

Al arrancar, el cliente comprobará que el schemaVersion del backend sea compatible con el esquema compilado. Si no lo es, permitirá consultar los datos locales, bloqueará nuevas mutaciones y pedirá actualizar la aplicación. Esto evita escribir con una versión antigua del formulario después de una migración de hojas.

Los componentes genéricos previstos son:

- TableView, DeckView, CardView y DetailView;
- FormView con Zod derivado de metadata;
- CalendarView, ChartView y DashboardView;
- campos específicos para cada ColumnType, incluidos Image, Signature, EnumList, Ref, Address, Phone y Url.

Las fórmulas se implementarán dos veces:

1. en TypeScript para previsualización optimista y validación rápida;
2. en Apps Script como cálculo autoritativo.

Las pruebas usarán los mismos casos de entrada para detectar diferencias entre ambas implementaciones.

## 5. Modelo de datos final

### 5.1 Columnas técnicas comunes

Toda hoja sincronizable tendrá:

| Columna | Tipo lógico | Regla |
|---|---|---|
| _uuid | UUID de texto | Inmutable, asignado en cliente para altas offline o durante migración |
| _updatedAt | DateTime ISO UTC | Solo el servidor asigna el valor oficial |
| _deleted | Boolean | Borrado lógico; nunca se elimina físicamente durante la retención |

Las claves visibles actuales se conservan como folios o códigos de negocio. Ninguna relación nueva dependerá de _RowNumber ni de un texto visible.

Los campos Ref guardarán el _uuid técnico y la UI mostrará la columna etiqueta de la tabla relacionada. Durante la migración se conservarán temporalmente los identificadores originales para auditoría y conciliación.

### 5.2 Tablas de negocio conservadas

| Tabla | Uso final | Cambio principal |
|---|---|---|
| ALMACEN | Catálogo de productos | PROVEEDOR pasa a relación; STOCK queda de solo lectura y autoritativo |
| COMPRAS | Entradas | Relación interna producto_uuid; importes recalculados en servidor |
| PEDIDOS | Salidas/ventas | Relaciones producto_uuid y cliente_uuid; TOTAL ya no suma ENVIO dos veces |
| PROVEEDORES | Catálogo | PAIS normalizado |
| CLIENTES | Catálogo | Clave técnica _uuid; datos de contacto vigentes |
| Gestion Clientes | Bitácora CRM | Relación interna cliente_uuid |
| Ticket Soporte | Mesa de ayuda | _uuid como clave y folio visible TS-AAAA-NNNN |
| INSTALACIONES | Cabecera de orden | Se eliminan de la cabecera los grupos repetidos migrados a hijas |
| Laboratorio | RMA | Semáforo corregido; cliente_uuid |
| MATRIZ DISPOSITIVOS | Catálogo técnico | Lectura, filtros y comparación |
| Usuarios | Identidad interna | UserActive normalizado a booleano al leer/migrar |
| Perfiles | Permisos | Permisos resueltos una vez, pero aplicados también en servidor |
| Menu | Navegación configurable | Solo muestra destinos autorizados |

La tabla de sistema _Per User Settings no se migrará al modelo funcional porque pertenece al runtime de AppSheet y no contiene una función de negocio descrita. Esta exclusión requiere confirmación en D-09.

### 5.3 Relaciones técnicas propuestas

| Origen | Columna técnica | Destino |
|---|---|---|
| ALMACEN | proveedor_uuid | PROVEEDORES._uuid |
| COMPRAS | producto_uuid | ALMACEN._uuid |
| PEDIDOS | producto_uuid | ALMACEN._uuid |
| PEDIDOS | cliente_uuid | CLIENTES._uuid |
| Gestion Clientes | cliente_uuid | CLIENTES._uuid |
| Laboratorio | cliente_uuid | CLIENTES._uuid |
| INSTALACIONES | cliente_uuid | CLIENTES._uuid |
| INSTALACIONES | tecnico_uuid | Usuarios._uuid |
| INSTALACIONES | consultor_uuid | Usuarios._uuid, si los consultores pertenecen al padrón |
| INSTALACIONES | dispositivo_uuid | MATRIZ_DISPOSITIVOS._uuid, cuando exista coincidencia confiable |
| Tablas hijas de instalación | instalacion_uuid | INSTALACIONES._uuid |

Los nombres visibles originales permanecen como snapshot cuando exista valor histórico y no pueda resolverse una relación sin ambigüedad. El script de migración producirá un reporte de referencias no resueltas; nunca escogerá silenciosamente entre dos coincidencias.

### 5.4 Normalización de INSTALACIONES

INSTALACIONES conservará:

- cabecera, fecha, mes, año, cliente, consultor, técnico, tipo, estatus y solución;
- dispositivo, contacto y ubicación;
- vehículo y accesorios;
- notas generales y datos de cierre;
- nombre de quien recibe y referencia de la firma subida a Drive.

Se crearán tres hojas hijas:

| Hoja | Columnas de negocio |
|---|---|
| instalacion_fotos | instalacion_uuid, categoria, orden, driveFileId, nota |
| instalacion_tanques | instalacion_uuid, orden, marca, serie |
| instalacion_checklist | instalacion_uuid, punto, resultado, observacion |

Además, cada hija tendrá _uuid, _updatedAt y _deleted.

Valores permitidos:

- categoria: general, fuel, checklist, ine;
- resultado: OK, FALLA, NO APLICA;
- orden: entero positivo único dentro de instalación y categoría.

instalacion_checklist tendrá 18 filas esperadas: los 13 puntos de recepción y las 5 pruebas post-instalación. La aplicación mostrará los nombres del esquema original, pero almacenará el resultado triestado sin el antiguo valor único ✅OK.

La firma se captura como blob local, se sube de forma independiente y la cabecera conserva su referencia de Drive. La imagen del INE se recomienda almacenar en instalacion_fotos con categoria ine; se confirma en D-05.

### 5.5 Tablas internas del backend

Estas hojas no se exponen como módulos de usuario:

| Hoja | Finalidad |
|---|---|
| _mutations_log | Dedupe de mutationId, estado y resultado mínimo de cada operación |
| _counters | Consecutivos por tipo de folio y año |

_mutations_log permitirá devolver el mismo resultado cuando el cliente repita una mutación ya aplicada. No bastará con ignorarla: la outbox necesita una confirmación reproducible para poder cerrarla.

Los conflictos devueltos por el servidor se guardarán en Dexie y su resumen quedará asociado al resultado de _mutations_log. La política de retención se define en D-10.

### 5.6 Datos derivados y snapshots

- Los campos virtuales Related no se almacenan; se calculan con índices locales por _uuid.
- MES y AÑO EN CURSO se derivan de FECHA.
- DIAS LABORATORIO y SEMAFORO se calculan al leer y en el servidor al responder.
- Los importes monetarios se redondean en servidor a dos decimales MXN.
- Los campos de contacto de PEDIDOS deben ser snapshots históricos, no lookups vivos; requiere aprobación en D-04.
- STOCK se muestra como calculado y no será editable.

El saldo inicial de inventario no está definido por el esquema actual. No es seguro sumar todo el historial a un STOCK que ya refleja movimientos pasados. La estrategia de corte se decide en D-03.

## 6. Repository y límites de dependencia

La UI solo conocerá una interfaz Repository con capacidades equivalentes a:

- observar una lista o una fila local;
- crear, actualizar y borrar lógicamente;
- adjuntar un blob;
- consultar pendientes y conflictos;
- solicitar sincronización;
- consultar al usuario y sus permisos efectivos.

Implementaciones previstas:

1. MockRepository para las fases 1 y 2.
2. DexieRepository para lectura/escritura local y outbox.
3. AppsScriptGateway, usado únicamente por el coordinador de sincronización.
4. En el futuro, otro gateway para una base transaccional.

Los componentes no llamarán fetch, Dexie ni Apps Script directamente. Las reglas de negocio no vivirán en componentes React.

## 7. Contrato de API v1

### 7.1 Convenciones

- Un solo WEB_APP_URL.
- JSON UTF-8.
- POST con Content-Type: text/plain;charset=utf-8 para evitar preflight OPTIONS.
- Fechas civiles: YYYY-MM-DD.
- Timestamps: UTC ISO 8601 con milisegundos.
- UUID: versión 4 en minúsculas.
- Los nombres de tabla del protocolo son identificadores canónicos, no textos proporcionados libremente por el usuario.
- El backend ignora _updatedAt recibido dentro de una fila y asigna el oficial.

Respuesta exitosa común:

~~~json
{
  "ok": true,
  "requestId": "uuid",
  "serverTime": "2026-08-22T03:15:21.123Z",
  "data": {}
}
~~~

Respuesta de error común:

~~~json
{
  "ok": false,
  "requestId": "uuid",
  "serverTime": "2026-08-22T03:15:21.123Z",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "No se pudo guardar el pedido.",
    "retryable": false,
    "details": [
      { "field": "EQUIPOS A VENDER", "reason": "Debe ser mayor que cero." }
    ]
  }
}
~~~

Códigos previstos: UNAUTHENTICATED, USER_INACTIVE, FORBIDDEN, INVALID_ACTION, VALIDATION_ERROR, NOT_FOUND, CONFLICT, LOCK_TIMEOUT, PAYLOAD_TOO_LARGE, RATE_LIMITED e INTERNAL.

### 7.2 Bootstrap

Solicitud requerida por el planteamiento original:

~~~http
GET WEB_APP_URL?action=bootstrap&idToken=JWT&deviceId=UUID&schemaVersion=VERSION
~~~

Respuesta:

~~~json
{
  "ok": true,
  "requestId": "uuid",
  "serverTime": "2026-08-22T03:15:21.123Z",
  "data": {
    "schemaVersion": "1.0.0",
    "minimumClientVersion": "1.0.0",
    "schema": {
      "tables": []
    },
    "user": {
      "uuid": "uuid",
      "name": "Nombre",
      "email": "usuario@empresa.com",
      "role": "TECNICO"
    },
    "permissions": {
      "views": ["Menu", "Servicios"],
      "tables": {
        "INSTALACIONES": {
          "read": true,
          "create": true,
          "update": true,
          "delete": false,
          "readFields": ["*"],
          "writeFields": ["*"]
        }
      }
    },
    "tables": {
      "INSTALACIONES": [],
      "instalacion_fotos": []
    },
    "syncCursor": "2026-08-22T03:15:21.123Z"
  }
}
~~~

Solo se incluyen tablas, filas y campos legibles por el usuario. La respuesta no incluirá blobs; solo referencias de archivo.

### 7.3 Delta

Solicitud:

~~~http
GET WEB_APP_URL?action=delta&idToken=JWT&deviceId=UUID&since=2026-08-22T03%3A15%3A21.123Z
~~~

Respuesta:

~~~json
{
  "ok": true,
  "requestId": "uuid",
  "serverTime": "2026-08-22T03:20:00.000Z",
  "data": {
    "tables": {
      "PEDIDOS": [
        {
          "_uuid": "uuid",
          "_updatedAt": "2026-08-22T03:19:04.114Z",
          "_deleted": false
        }
      ]
    },
    "conflicts": [],
    "syncCursor": "2026-08-22T03:20:00.000Z"
  }
}
~~~

El servidor toma un high-water mark al iniciar la lectura y devuelve filas donde since < _updatedAt <= high-water mark. Los timestamps de escritura se asignan de forma monotónica bajo el lock del script. El cliente solo avanza syncCursor después de aplicar toda la respuesta en una transacción Dexie. Las filas borradas viajan como tombstones con _deleted=true.

### 7.4 Mutate

Solicitud:

~~~json
{
  "action": "mutate",
  "requestId": "uuid",
  "idToken": "JWT",
  "deviceId": "uuid",
  "mutations": [
    {
      "mutationId": "uuid",
      "table": "PEDIDOS",
      "operation": "update",
      "rowUuid": "uuid",
      "baseUpdatedAt": "2026-08-22T02:50:00.000Z",
      "clientCreatedAt": "2026-08-22T03:00:00.000Z",
      "changes": {
        "ESTATUS PEDIDO": "APROBADO"
      },
      "baseValues": {
        "ESTATUS PEDIDO": "PENDIENTE APROBACION"
      },
      "dependsOn": []
    }
  ]
}
~~~

operation admite insert, update y delete. insert incluye los campos iniciales dentro de changes. delete genera un tombstone.

Respuesta:

~~~json
{
  "ok": true,
  "requestId": "uuid",
  "serverTime": "2026-08-22T03:20:01.000Z",
  "data": {
    "results": [
      {
        "mutationId": "uuid",
        "status": "applied",
        "row": {
          "_uuid": "uuid",
          "_updatedAt": "2026-08-22T03:20:01.000Z",
          "_deleted": false,
          "ESTATUS PEDIDO": "APROBADO"
        },
        "conflicts": []
      }
    ]
  }
}
~~~

status admite applied, duplicate, rejected y conflict. Un resultado duplicate devuelve el resultado original almacenado en _mutations_log.

El servidor ejecuta, en este orden:

1. validar token, usuario activo y audiencia;
2. resolver permisos actuales;
3. validar tamaño, tabla, operación y campos permitidos;
4. adquirir LockService.getScriptLock;
5. consultar mutationId;
6. leer cada hoja afectada una sola vez;
7. validar referencias y reglas de negocio;
8. aplicar parches por campo;
9. calcular folios, importes, stock y timestamps oficiales;
10. escribir rangos completos por lote y registrar resultados;
11. liberar el lock y responder.

Una falla de una mutación no invalida necesariamente otras independientes del lote. Las mutaciones enlazadas por dependsOn se rechazan si falla su dependencia. El resultado siempre es individual.

### 7.5 Upload

Solicitud, una imagen por petición:

~~~json
{
  "action": "upload",
  "requestId": "uuid",
  "idToken": "JWT",
  "deviceId": "uuid",
  "mutationId": "uuid",
  "photoUuid": "uuid",
  "installationUuid": "uuid",
  "category": "general",
  "order": 1,
  "fileName": "evidencia-1.jpg",
  "mimeType": "image/jpeg",
  "sha256": "hex",
  "contentBase64": "..."
}
~~~

Respuesta:

~~~json
{
  "ok": true,
  "requestId": "uuid",
  "serverTime": "2026-08-22T03:21:10.000Z",
  "data": {
    "mutationId": "uuid",
    "photoUuid": "uuid",
    "driveFileId": "drive-id",
    "rowUpdatedAt": "2026-08-22T03:21:10.000Z"
  }
}
~~~

El nombre interno en Drive se deriva de photoUuid, no del nombre proporcionado. Un reintento busca el archivo determinista y consulta _mutations_log antes de crear otro. Al terminar, el backend actualiza instalacion_fotos o el campo de firma correspondiente y devuelve la fila reconciliada.

La política de tamaño, compresión y entrega de archivos privados se decide en D-06 y D-07.

### 7.6 Transporte de autenticación pendiente de aprobación

Apps Script no expone los encabezados HTTP de forma fiable en doGet y no permite responder a OPTIONS. Por ello, el contrato GET anterior obliga a colocar el ID token en la URL, donde puede quedar registrado en infraestructura y herramientas de diagnóstico.

La recomendación es usar POST text/plain para bootstrap y delta también, conservando las mismas acciones y respuestas:

~~~json
{
  "action": "delta",
  "requestId": "uuid",
  "idToken": "JWT",
  "deviceId": "uuid",
  "since": "2026-08-22T03:15:21.123Z"
}
~~~

Esta desviación de los GET originales requiere aprobación en D-01 antes de la Fase 3.

## 8. Autenticación y autorización

### Autenticación online

1. Google Identity Services obtiene un ID token.
2. Apps Script consulta tokeninfo.
3. Valida aud contra GOOGLE_CLIENT_ID y exige email_verified=true.
4. Normaliza el email y busca una coincidencia exacta en Usuarios.
5. Normaliza UserActive aceptando TRUE, true, VERDADERO, SI y 1.
6. Resuelve UserRole y Perfiles.
7. Cachea durante pocos minutos una decisión identificada por hash de token/email, nunca el token en claro.

La caché reduce lecturas, pero cada mutación sigue pasando por una autorización del servidor. Un usuario inactivo recibe USER_INACTIVE y el cliente detiene el push.

### Autorización

VistasPermitidas solo expresa visibilidad de vistas. No distingue lectura, alta, edición, borrado ni campos sensibles. No alcanza para una seguridad de servidor correcta.

Se necesita una matriz efectiva:

~~~text
perfil × tabla × operación × campo
~~~

Mientras no exista, el backend no puede inferir que ver Almacén autoriza modificar COSTO o borrar productos. La solución recomendada está en D-02.

El backend tendrá un mapa canónico vista → tabla para corregir el caso Laboratorio. No confiará en VistaMenu ni en nombres enviados por el cliente.

### Uso offline

La PWA puede abrir datos ya sincronizados sin red, pero no puede renovar un ID token de Google offline. Las nuevas acciones permanecen en outbox hasta recuperar una sesión online válida.

IndexedDB no cifra por sí mismo. La duración de la sesión local y la política para dispositivos perdidos se deciden en D-08.

## 9. Algoritmo de sincronización

### 9.1 Estado local

Dexie mantendrá:

- una colección por tabla sincronizable;
- outbox;
- blobs;
- conflicts;
- syncState;
- authCache mínimo;
- schemaState.

Cada fila local tendrá estado de presentación: synced, pending, conflict o error. Esos estados no se envían como columnas de negocio.

Una entrada de outbox contiene mutationId, tabla, rowUuid, operación, cambios, valores base, dependencias, intentos, próximo intento y error más reciente.

### 9.2 Escritura local

Dentro de una sola transacción Dexie:

1. se valida contra Zod y permisos locales;
2. se genera _uuid si es un alta;
3. se aplica el cambio optimista;
4. se crea la mutación con su snapshot base;
5. se marca la fila pending.

Si falla cualquiera de esos pasos, ninguno queda aplicado.

### 9.3 Arranque

1. Abrir Dexie y ejecutar migraciones locales.
2. Pintar inmediatamente el último estado local permitido.
3. Si nunca hubo bootstrap, solicitar autenticación y bootstrap.
4. Si existe cursor, comprobar sesión, ejecutar push y después delta.
5. Si cambia schemaVersion, migrar Dexie antes de aceptar nuevas escrituras.

No se muestra un spinner global esperando Google. Se muestra el contenido local con el estado de sincronización.

### 9.4 Reconexión

online del navegador es solo una señal. La conectividad se confirma con una petición real.

1. Elegir una única pestaña líder mediante Web Locks y BroadcastChannel.
2. Renovar/autenticar sesión si es necesario.
3. Compactar mutaciones compatibles de una misma fila sin perder el mutationId auditable.
4. Enviar lotes pequeños respetando dependsOn.
5. Procesar uploads pendientes secuencialmente.
6. Guardar resultados autoritativos y conflictos.
7. Solicitar delta desde el último cursor confirmado.
8. Aplicar todo el delta en una transacción.
9. Avanzar el cursor y actualizar el indicador.

Orden requerido: push y después pull. Esto permite que el servidor detecte una base obsoleta antes de que el cliente reemplace su snapshot.

### 9.5 Reintentos

- Errores de red, LOCK_TIMEOUT, RATE_LIMITED y errores 5xx: reintento exponencial con jitter.
- UNAUTHENTICATED: detener y renovar sesión.
- USER_INACTIVE o FORBIDDEN: detener, conservar la mutación y mostrar acción requerida.
- VALIDATION_ERROR: no reintentar; la fila queda en error editable.
- PAYLOAD_TOO_LARGE: no reintentar sin recomprimir.
- duplicate se considera confirmación exitosa.

Los uploads se procesan uno por uno. Una foto fallida no bloquea datos independientes, pero una orden no se marca totalmente sincronizada mientras falten evidencias.

### 9.6 Conflictos por campo

El cliente manda solo los campos modificados y el valor base observado. El servidor compara cada campo:

- si el valor central sigue igual al valor base, aplica el cambio sin conflicto;
- si cambió otro campo, ambos parches se combinan;
- si cambió el mismo campo, registra conflicto y la mutación procesada al final gana ese campo;
- el servidor asigna el nuevo _updatedAt y devuelve valor anterior, valor entrante, ganador, usuarios y timestamps disponibles.

No se confía en el reloj del dispositivo para decidir el ganador. El orden autoritativo es el orden de procesamiento bajo LockService. Esto implementa last-write-wins por campo sin necesitar una columna de timestamp por cada uno de los 341 campos.

El usuario puede abrir una pantalla de conflictos, comparar valores y crear una nueva mutación correctiva. Ningún conflicto se oculta aunque el sistema haya seleccionado un ganador.

### 9.7 Borrados

delete establece _deleted=true y conserva _uuid y _updatedAt. Las referencias históricas siguen siendo resolubles. La UI excluye tombstones de listas normales.

La purga física será un proceso administrativo posterior al periodo de retención y después de comprobar que ningún dispositivo conserva un cursor anterior. No forma parte de las primeras fases.

### 9.8 Service worker

- Precache del app shell y recursos versionados.
- Navegación con fallback al shell.
- Endpoint de Apps Script en NetworkOnly.
- Nunca se cachean POST ni respuestas con datos de negocio en Cache Storage.
- Background Sync solo despierta el coordinador; Dexie conserva la operación real.
- Si Google exige interacción para renovar credenciales, el worker deja la cola intacta y la app pide iniciar sesión al abrirse.

## 10. Reglas de negocio autoritativas

### PEDIDOS

~~~text
SUBTOTAL = PRECIO_VENTA × EQUIPOS + COSTO_INSTALACION + ENVIO
IVA      = redondear(SUBTOTAL × 0.16, 2)
TOTAL    = SUBTOTAL + IVA
~~~

El servidor rechaza cantidades negativas, referencias inexistentes y una aprobación que viole la política de stock que se apruebe.

### COMPRAS

~~~text
SUBTOTAL         = COSTO × CANTIDAD + KIT_INSTALACION
PRECIO_DE_COMPRA = SUBTOTAL + COSTO_DE_ENVIO
~~~

Una compra aporta inventario solo con ESTATUS COMPRA=RECIBIDA.

### Inventario

~~~text
STOCK = SALDO_INICIAL
      + suma(COMPRAS RECIBIDAS)
      - suma(PEDIDOS APROBADOS)
~~~

Los cambios de estatus crean o revierten el efecto una sola vez de manera idempotente. La definición de SALDO_INICIAL se decide en D-03.

### Laboratorio

Estados cerrados:

- ❌ DAÑADO
- 🏬 ENVIADO A MATRIZ
- 📦 ENTREGADO
- ✅ FUNCIONAL

Para estados no cerrados:

- hasta 3 días: 🟢 EN TIEMPO;
- hasta 6 días: 🟡 POR VENCER;
- más de 6 días: 🔴 URGENTE.

### Ticket Soporte

_uuid es la clave técnica. El folio visible usa TS-AAAA-NNNN y se asigna bajo lock con _counters. No se reutilizan huecos.

### País y usuarios

La migración normaliza México, MEXICO y MEXOCO a México. Los demás valores se conservarán como catálogo limpio después de decidir si LITHUANIA se muestra como Lituania o se mantienen países en mayúsculas.

UserActive se convierte a booleano. Después de migrar, las nuevas escrituras solo aceptan booleanos.

## 11. Migración y convivencia

La futura migración será repetible y tendrá modo dry-run.

Orden previsto:

1. crear copia de seguridad versionada del Spreadsheet y carpeta de Drive;
2. inventariar encabezados reales y compararlos con schemaVersion;
3. agregar columnas técnicas;
4. poblar UUID y mapa clave antigua → UUID;
5. resolver referencias y reportar huérfanos/duplicados;
6. crear hojas hijas e internas;
7. transformar fotos, tanques y checklist;
8. normalizar países, booleanos y estados;
9. establecer saldos iniciales y contadores;
10. validar recuentos, checksums e importes;
11. ejecutar una prueba de bootstrap/delta;
12. realizar corte controlado.

Cada paso registrará cantidad leída, migrada, omitida y fallida. Un segundo intento no duplicará filas ni archivos.

AppSheet puede seguir siendo referencia visual durante el desarrollo, pero escribir simultáneamente en las mismas hojas es peligroso: sus cambios no asignarán correctamente _updatedAt, _uuid ni mutationId y no poblarán las hojas normalizadas. La estrategia de corte se decide en D-11.

## 12. Pruebas y criterios de aceptación

### Pruebas unitarias

- fórmulas de COMPRAS y PEDIDOS, incluidos redondeos;
- semáforo de Laboratorio en límites de 3 y 6 días;
- normalización de UserActive y PAIS;
- cálculo/reversión de stock;
- folios concurrentes;
- validación metadata → Zod;
- compactación y dedupe de outbox;
- merge y conflicto por campo;
- orden de dependencias;
- cursores de delta y tombstones.

### Pruebas de integración

- repetir una mutación después de perder la respuesta no duplica datos;
- dos usuarios editan campos distintos de una fila y ambos cambios sobreviven;
- dos usuarios editan el mismo campo y se registra el conflicto;
- aprobar/cancelar/reaprobar compra o pedido no duplica stock;
- token inválido, audiencia incorrecta, usuario inactivo y permiso insuficiente;
- lock timeout y recuperación;
- upload interrumpido después de crear archivo no crea un segundo archivo;
- migración dry-run y segundo pase idempotente.

### Pruebas PWA

- arranque sin red con datos ya sincronizados;
- alta y edición completa en modo avión;
- 30 fotos y firma pendientes;
- cierre forzado de la app y recuperación de la cola;
- reconexión parcial/lenta;
- dos pestañas abiertas sin doble push;
- actualización de versión con outbox pendiente;
- targets táctiles de al menos 44 px y contraste AA.

### Criterios para avanzar de fase

No se conecta el frontend a datos reales hasta que:

- la migración tenga respaldo, dry-run y reporte;
- el API rechace mutaciones no autorizadas;
- idempotencia y cursores estén probados;
- se haya acordado stock inicial, permisos y acceso a imágenes.

## 13. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Cuotas y tiempo de Apps Script | Lectura única por hoja/request, lotes pequeños, caché de auth y métricas |
| Fotos grandes/base64 | Compresión previa, upload secuencial, límite explícito y reanudación |
| Falta de transacciones entre hojas | Lock global, mutaciones idempotentes, escritura por etapas recuperable y conciliación |
| Edición manual/AppSheet fuera de API | Corte controlado y hojas sin edición para usuarios |
| Token vencido durante Background Sync | Conservar cola y reanudar tras autenticación |
| Datos sensibles en IndexedDB | Política de sesión, bloqueo de dispositivo y borrado local |
| Desfase entre metadata y hojas | schemaVersion, verificación de encabezados y bloqueo de escrituras incompatibles |
| Crecimiento de INSTALACIONES | Normalización, índices lógicos y particionado oculto detrás de Repository si las métricas lo exigen |
| Fechas y cambios horarios | UTC técnico, zona de negocio explícita y pruebas de límites de día |

## 14. Decisiones abiertas

Cada decisión incluye la recomendación técnica. Las marcadas como bloqueante deben resolverse antes de la fase indicada.

### D-01. Transporte de bootstrap y delta — bloquea Fase 3

Recomendación: usar POST text/plain para las cuatro acciones y enviar el ID token en el cuerpo. Mantiene un único protocolo, evita preflight y evita exponer el token en la URL.

Alternativa: conservar GET tal como pide el documento original y aceptar que el ID token viaje como query parameter.

Decisión solicitada: ¿autorizas cambiar bootstrap y delta de GET a POST?

### D-02. Permisos de escritura — bloquea Fases 1 y 3

Recomendación: ampliar Perfiles con permisos explícitos de read/create/update/delete y campos sensibles por tabla. La visibilidad de una vista no debe implicar permiso para borrar o cambiar costos.

Alternativa temporal: mapa fijo en backend por nombre de perfil. Es seguro si se define completo, pero obliga a desplegar código para cambiar permisos.

Decisión solicitada: facilitar la matriz de permisos por perfil o aprobar el mapa fijo inicial.

### D-03. Saldo inicial y kardex — bloquea migración y Fase 6

Recomendación: en la fecha de corte crear un movimiento APERTURA por producto con el STOCK actual y contar compras/pedidos solo desde ese corte. Esto requiere una hoja inventario_movimientos y da auditoría clara.

Alternativa: agregar STOCK INICIAL a ALMACEN y derivar el resto sin ledger. Es más simple, pero ofrece menos trazabilidad.

No debe reconstruirse con todo el historial sin comprobar antes que el histórico esté completo.

Decisión solicitada: apertura con ledger o columna de stock inicial.

### D-04. Snapshot de cliente en PEDIDOS — bloquea TableDef de PEDIDOS

Recomendación: conservar DIRECCION, TELEFONO, EMAIL, UBICACION y CONTACTO como snapshot del pedido, además de cliente_uuid. Los cambios futuros del cliente no alterarán documentos históricos.

Alternativa: mostrar siempre el dato vigente de CLIENTES.

Decisión solicitada: confirmar snapshots históricos.

### D-05. INE y firma — bloquea Fase 5

Recomendación: guardar IMAGEN INE en instalacion_fotos con categoria ine; mantener la firma referenciada desde INSTALACIONES como exige el modelo.

Decisión solicitada: confirmar si el INE debe ir en la tabla hija y definir quién puede verlo por tratarse de un documento sensible.

### D-06. Calidad y tamaño de imágenes — bloquea Fase 5

Recomendación inicial: corregir orientación, máximo 1920 px en el lado largo, JPEG 80 %, objetivo máximo 2 MB por foto; firma en PNG. Conservar el original solo si el usuario lo solicita explícitamente.

Decisión solicitada: confirmar si esa compresión tiene validez operativa/legal o si deben conservarse originales.

### D-07. Lectura de archivos privados de Drive — bloquea Fases 3 y 5

Los usuarios no podrán mostrar un driveFileId privado desde una SPA sin un mecanismo de entrega.

Recomendación: mantener Drive privado y agregar una acción autorizada de descarga/thumbnail en Apps Script, con caché local en IndexedDB. Es más segura, pero consume cuota y ancho de banda.

Alternativas: compartir la carpeta como lectura con un dominio de Workspace, o publicar archivos para cualquiera con el enlace. La última opción no se recomienda para INE y firmas.

Decisión solicitada: indicar si existe Google Workspace/dominio administrado y elegir el nivel de privacidad.

### D-08. Política offline y dispositivo perdido — bloquea diseño de auth

Recomendación: permitir abrir el caché durante 7 días desde la última autenticación online en dispositivos corporativos con bloqueo de pantalla; después exigir conexión. Incluir “Cerrar sesión y borrar datos locales”.

Decisión solicitada: confirmar si los equipos son corporativos o personales y la duración offline aceptable.

### D-09. Cantidad de TableDef y tabla de preferencias — bloquea Fase 1

El esquema enumera 14 tablas porque incluye _Per User Settings, pero esa tabla es interna de AppSheet. Al excluirla quedan 13 tablas originales de negocio; con las 3 hijas normalizadas resultan 16 TableDef.

Recomendación: implementar 16 TableDef y no migrar _Per User Settings.

Decisión solicitada: confirmar esta interpretación.

### D-10. Retención de logs y borrados — bloquea operación

Recomendación inicial: _mutations_log por 90 días, conflictos por 180 días y tombstones por 180 días, con respaldo antes de purgar.

Decisión solicitada: confirmar plazos o indicar requisitos fiscales/contractuales.

### D-11. Convivencia con AppSheet — bloquea el corte

Recomendación: usar AppSheet durante la construcción, pero congelar capturas durante una ventana breve de migración y dejarlo en solo lectura al activar la PWA. No se recomienda doble escritura.

Decisión solicitada: definir cuánto tiempo de indisponibilidad se acepta para el corte y si AppSheet puede quedar solo lectura.

### D-12. Formatos de folio y zona de negocio — bloquea backend

Solo está definido TS-AAAA-NNNN para soporte. Faltan reglas confirmadas para compras, pedidos, instalaciones y laboratorio: prefijo, longitud, reinicio anual y tratamiento de huecos.

Recomendación de zona: America/Mexico_City para fechas civiles; UTC para sincronización.

Decisión solicitada: proporcionar los formatos actuales deseados y confirmar la zona.

### D-13. Referencias de técnicos, consultores y dispositivos — bloquea migración

Recomendación: TECNICO y CONSULTOR VENTAS referencian Usuarios cuando exista coincidencia única; MARCA/MODELO enlazan MATRIZ DISPOSITIVOS. Los textos históricos sin coincidencia se conservan y se reportan para corrección manual.

Decisión solicitada: confirmar que todos los técnicos y consultores deben estar en Usuarios.

### D-14. Particionado de instalaciones

Recomendación: no particionar físicamente desde el primer día después de normalizar las 94 columnas. Medir filas, tiempo de bootstrap y tamaño; si se supera el umbral acordado, AppsScriptGateway podrá enrutar por año detrás de una tabla lógica única.

Decisión solicitada: indicar cuántas instalaciones existen hoy y cuántas se generan al mes.

## 15. Secuencia propuesta después de aprobar la Fase 0

1. Fase 1: scaffold, metadata y MockRepository.
2. Fase 2: vistas/campos genéricos y CRUD local con mock.
3. Fase 3: Apps Script, seguridad, API y migración dry-run.
4. Fase 4: Dexie, outbox, sync y conexión real.
5. Fase 5: instalaciones, fotos, firma y PDF.
6. Fase 6: inventario, compras, pedidos, CRM, soporte y laboratorio.
7. Fase 7: PWA, pruebas en modo avión, observabilidad y preparación de corte.

No se iniciará la Fase 1 hasta recibir aprobación de este documento y respuesta, al menos, a D-02, D-04 y D-09. Las demás decisiones deben resolverse antes de la fase indicada.
