# TRAIOT MANAGER — Análisis de la app AppSheet y arquitectura propuesta para web/PWA

Fecha de análisis: 22 de agosto de 2026
Fuente: definición interna de la app AppSheet `TRAIOT MANAGER` (id `fd9f02f4-a0dd-4243-a83b-c0bf3d169246`, versión 1.000528, PlatformVersion 5.1)

---

## 1. Qué es hoy la app

Un ERP + CRM ligero para una empresa de rastreo GPS / IoT vehicular. Números reales:

| Elemento | Cantidad |
|---|---|
| Tablas (hojas de Google Sheets) | 14 |
| Columnas totales | 341 (327 sin `_RowNumber`) |
| Vistas | 47 (17 de usuario + 30 generadas: form/detail/inline) |
| Acciones | 57 (casi todas del sistema: Add/Edit/Delete/Email/Call/SMS/Navigate) |
| Slices | 0 |
| Bots / automatizaciones / workflows | **0** |
| Reglas de formato condicional | 22 |
| Roles definidos | User, Admin (no se usan: los permisos van por tabla propia) |
| Offline en AppSheet | activado (`LaunchOffline: true`) |

**Traducción:** la app es esencialmente **CRUD sobre hojas de cálculo con permisos por perfil**. No hay lógica de servidor, ni integraciones, ni notificaciones. Eso es una **muy buena noticia** para reescribirla: casi todo el valor está en el modelo de datos, los formularios y las reglas de visibilidad, y todo eso se replica bien en web.

---

## 2. Los 6 módulos

### 2.1 Almacén / Inventario
`ALMACEN` (30 col) es el catálogo maestro de productos.
- Clave: `ID PRODUCTO`. Campos de costo casi todos ocultos en la UI (COSTO, MONEDA, TIPO DE CAMBIO, MANO DE OBRA, CLAVE SAT…) → solo compras/admin los ve.
- `PRECIO VENTA PARA ASESOR = [COSTO]*0.16 + [COSTO]`
- `STOCK`, `STOCK MINIMO`, `STOCK MAXIMO`, `AVISO DE COMPRA`
- Relaciona hacia `COMPRAS` y `PEDIDOS` con columnas Ref + dos `REF_ROWS` virtuales.

### 2.2 Compras (entradas)
`COMPRAS` (16 col). Ref real a `ALMACEN`, con desnormalización por fórmula (`NOMBRE`, `PROVEEDOR`, `COSTO`, `KIT INSTALACION` se copian del producto).
- `SUBTOTAL = COSTO*CANTIDAD + KIT INSTALACION`
- `PRECIO DE COMPRA = SUBTOTAL + COSTO DE ENVIO`
- Estatus: RECIBIDA / EN CAMINO / CANCELADA

### 2.3 Pedidos (salidas / ventas)
`PEDIDOS` (27 col). Ref a `ALMACEN` y a `CLIENTES`, con desnormalización de todo el cliente (DIRECCION, TELEFONO, EMAIL, UBICACION).
- `SUBTOTAL = PRECIO VENTA*EQUIPOS + COSTO INSTALACION + ENVIO`
- `IVA = SUBTOTAL*0.16`
- `TOTAL = SUBTOTAL + IVA + ENVIO`
- Estatus: APROBADO / NO APROBADO / PENDIENTE APROBACION

### 2.4 CRM
- `CLIENTES` (14 col) — padrón, con 3 relaciones inversas (pedidos, gestión, laboratorio).
- `Gestion Clientes` (14 col) — bitácora de prospección. Campos condicionales: `Estatus_prospeccion` solo si Tipo = 🔵Prospecto, `Estatus_cliente` solo si 🟢Activo. Tiene 2 gráficas y un calendario.
- `Ticket Soporte` (16 col) — mesa de ayuda con canal de atención, tipo de caso y estatus.

### 2.5 Operación de campo — la joya y el problema
`INSTALACIONES` (**94 columnas**) es el reporte de servicio técnico. En una sola fila plana viven:
1. Cabecera del servicio (folio, fecha, cliente, técnico, tipo de servicio, estatus)
2. Datos del dispositivo GPS instalado (marca, modelo, IMEI, SIM, proveedor SIM)
3. Datos del vehículo (marca, submarca, color, año, VIN, placas, odómetro)
4. Sensores de combustible: hasta 3 tanques (marca+serie) + **10 imágenes** + notas
5. Evidencia general: **10 imágenes** + comentarios
6. Checklist de recepción del vehículo: 13 puntos (luces, direccionales, tablero, batería…) + **5 imágenes**
7. Pruebas post-instalación: 5 pruebas (posicionamiento, ignición, bloqueo de motor, desconexión de batería, botón SOS) cada una con su campo de observaciones
8. Cierre: nombre de quien recibe + **firma digital** + imagen del INE

Es decir: **26 campos de imagen (25 numerados a mano) más uno de firma** en una sola fila. Funciona, pero es el mayor candidato a rediseño.

### 2.6 Laboratorio y catálogo técnico
- `Laboratorio` (26 col) — RMA de equipos con SLA por semáforo:
  `DIAS LABORATORIO = TOTALHOURS(TODAY()-[FECHA ENTRADA])/24`
  `SEMAFORO`: ≤3 días 🟢 EN TIEMPO, ≤6 🟡 POR VENCER, más 🔴 URGENTE, cerrado 🔵.
  18 pruebas estandarizadas en un EnumList (inspección física, voltaje, GSM/LTE, FIX GPS, DIN/DOUT, ADC…).
- `MATRIZ DISPOSITIVOS` (47 col) — ficha técnica comparativa de GPS (Topflytech, Ruptela, Queclink, Concox, CalAmp): red, BLE, IP, batería, DI/DO, RS232/485, CAN, OBD, protocolos, ficha técnica PDF. Es prácticamente un **datasheet navegable**, no transaccional.

### 2.7 Seguridad y navegación
No usa los roles nativos de AppSheet. Usa tres tablas:
- `Usuarios` (UserID, UserName, UserEmail, UserRole, UserActive)
- `Perfiles` (PerfilID, VistasPermitidas como EnumList)
- `Menu` (IdMenu, NombreMenu, VistaMenu, ImagenMenu) → galería que hace de launcher

Y **cada vista repite esta expresión** en su `Show_If`:

```
AND(
  LOOKUP(USEREMAIL(), "Usuarios", "UserEmail", "UserActive") = "TRUE",
  IN("<NombreVista>", SPLIT(LOOKUP(LOOKUP(USEREMAIL(), "Usuarios", "UserEmail", "UserRole"),
      "Perfiles", "PerfilID", "VistasPermitidas"), " , "))
)
```

Un doble LOOKUP anidado que se evalúa en cada render. En web esto se resuelve **una vez al iniciar sesión** y se guarda en el contexto de usuario.

---

## 3. Hallazgos: bugs reales y deuda técnica

Esto es lo que encontré revisando las fórmulas. Vale la pena arreglarlo **durante** la migración, no después.

### 🔴 Bugs de lógica

**1. El envío se cobra dos veces en PEDIDOS.**
```
SUBTOTAL = [PRECIO VENTA]*[EQUIPOS] + [COSTO INSTALACION] + [ENVIO]
TOTAL    = [SUBTOTAL] + [IVA] + [ENVIO]        ← ENVIO ya venía dentro de SUBTOTAL
```
El cliente paga el envío 1.16 veces de más. Correcto sería `TOTAL = SUBTOTAL + IVA`.

**2. El semáforo de Laboratorio nunca cierra los equipos entregados.**
`SEMAFORO` pregunta `IN([ESTATUS], LIST("❌ DAÑADO","🏬 ENVIADO A MATRIZ","✅ ENTREGADO"))`, pero el enum real de `ESTATUS` es `📥 RECIBIDO / 🛠️ EN REVISION / ❌ DAÑADO / 🏬 ENVIADO A MATRIZ / 📦 ENTREGADO / ✅ FUNCIONAL`. **"✅ ENTREGADO" no existe** (es "📦 ENTREGADO"). Resultado: los equipos entregados siguen sumando días y aparecen en 🔴 URGENTE.

**3. La clave de Ticket Soporte puede colisionar.**
`_ComputedKey = CONCATENATE([🗓️Fecha Registro], ": ", [🏭Cliente])`. Dos tickets del mismo cliente el mismo día se pisan.

**4. Permiso copiado/pegado en la vista Laboratorio.**
Su `Show_If` valida el permiso `"Almacen"`, no `"Laboratorio"`. Quien tenga acceso a Almacén ve Laboratorio aunque no debería.

**5. `UserActive` se compara contra el texto `"TRUE"`,** no contra un booleano. Un `true`, `Sí` o `VERDADERO` en la hoja deja al usuario fuera sin explicación.

### 🟡 Deuda de modelo

**6. Relaciones que son texto libre, no referencias.**
`ALMACEN.PROVEEDOR` es Text (existiendo la tabla `PROVEEDORES`), `INSTALACIONES.CLIENTE`, `TECNICO`, `CONSULTOR VENTAS` también. Imposible filtrar de forma confiable, cualquier typo crea un "proveedor" nuevo.

**7. `PROVEEDORES.PAIS` = `["México","MEXICO","MEXOCO","CHINA","LITHUANIA"]`.** Tres formas de escribir México, una con typo. Síntoma de enums que crecieron desde los datos.

**8. Los 13 checklists de INSTALACIONES son Enum de un solo valor `["✅OK"]`.** Eso es un booleano disfrazado. Y no distingue "no revisado" de "revisado y mal".

**9. `STOCK` es un número que se captura a mano.** No se deriva de `COMPRAS − PEDIDOS`. Es la mayor fuente de descuadre en cualquier inventario, y es donde más valor puedes ganar en la versión web (kardex real y calculado).

**10. Los 25 campos de imagen numerados** (`IMAGEN 1..10`, `IMAGEN FUEL 1..10`, `IMAGEN CHECK 1..5`) y los 3 tanques (`TANQUE 1/2/3 MARCA+SERIE`) deberían ser tablas hijas. Hoy si necesitas 11 fotos, no hay dónde ponerlas.

**11. Desnormalización total por fórmula.** `PEDIDOS` copia dirección, teléfono, email y ubicación del cliente. Si el cliente se muda, los pedidos históricos mienten... o se actualizan solos y rompen el histórico. En web hay que decidir explícitamente cuáles son **snapshot** (dirección de entrega del momento) y cuáles son **lookup vivo**.

### 🟢 Oportunidades que AppSheet no te está dando

- Sin automatizaciones: nada avisa cuando el stock baja del mínimo, cuando un ticket lleva 3 días sin respuesta o cuando un equipo de laboratorio se vuelve 🔴 URGENTE.
- Sin PDF de orden de servicio: hoy la firma se captura pero no genera un comprobante entregable al cliente.
- Los exports (`Kardex`, `Compras`, `Soporte`, `Salidas`) son EXPORT_VIEW planos, sin agregados ni periodos.

---

## 4. Arquitectura propuesta

Elegiste **conservar Google Sheets** y preguntaste si se puede hacer **todo en el front, sin backend, o con Apps Script**. Respuesta corta:

> **Sin backend de ningún tipo: no.** Con **Google Apps Script como capa de API: sí, y es la opción correcta para ti.**

### Por qué no "solo frontend"

Para que el navegador escriba directo a Sheets necesitarías la Google Sheets API con OAuth desde el cliente. Eso implica que **cada usuario tendría que tener permiso de edición sobre las hojas**, es decir: acceso total a costos, márgenes y padrón de clientes, y capacidad de borrar la base entera desde Google Sheets sin pasar por tu app. Además el `client_secret` o la API key quedarían expuestos, y no habría forma de validar nada del lado servidor. No es viable para datos de negocio.

### La arquitectura que sí funciona

```
┌────────────────────────────────────────────────────┐
│  PWA (React + TypeScript, hosting estático)        │
│  ├─ UI: renderizadores genéricos por tipo de vista │
│  ├─ Dexie / IndexedDB  ← espejo local de las tablas│
│  ├─ Outbox: cola de mutaciones pendientes          │
│  └─ Service Worker (Workbox) + Background Sync     │
└───────────────┬────────────────────────────────────┘
                │ HTTPS, JSON, un solo endpoint
                ▼
┌────────────────────────────────────────────────────┐
│  Google Apps Script Web App  (doGet / doPost)      │
│  ├─ Verifica el ID token de Google del usuario     │
│  ├─ Resuelve permisos contra Usuarios + Perfiles   │
│  ├─ LockService en toda escritura                  │
│  ├─ Reglas de negocio (totales, stock, folios)     │
│  └─ Sube imágenes/firmas a Drive, guarda el fileId │
└───────────────┬────────────────────────────────────┘
                ▼
     Google Sheets (datos)  +  Google Drive (archivos)
```

Las hojas dejan de compartirse con nadie. **El único que las toca es el script**, que corre con tu cuenta. Los usuarios solo hablan con la app.

### Cambios obligatorios en las hojas

Agregar tres columnas a **cada** hoja transaccional:

| Columna | Para qué |
|---|---|
| `_uuid` | Clave estable e inmutable. **Nunca uses `_RowNumber`**: cambia al ordenar o borrar filas. |
| `_updatedAt` | Timestamp ISO. Permite sincronización incremental (`?since=`) en vez de bajar todo cada vez. |
| `_deleted` | Borrado lógico. Sin esto, el cliente offline no puede enterarse de que una fila desapareció. |

Los `ID PRODUCTO`, `ID PEDIDO`, `FOLIO` etc. se conservan como **folio de negocio visible**, pero la relación interna va por `_uuid`.

### Cómo funciona el offline

1. **Todo lee de IndexedDB, siempre.** La UI nunca espera a la red. Dexie es el origen de verdad para la pantalla.
2. **Toda escritura entra al outbox** con un `mutationId` (UUID). Se aplica optimistamente al espejo local y se marca la fila como "pendiente".
3. **Push:** al haber red, se manda el lote de mutaciones. El `mutationId` hace la operación **idempotente**: si el técnico pierde señal justo después de que el script escribió, el reintento no duplica la fila.
4. **Pull:** se piden los deltas por `_updatedAt > lastSync` de todas las tablas en **una sola llamada**.
5. **Imágenes:** el Blob se guarda en IndexedDB y se muestra con `URL.createObjectURL()`. Se sube por separado al reconectar; el `fileId` de Drive reemplaza al blob local. Una instalación puede traer 30 fotos: se suben de una en una, con reintentos, no todas en el mismo request.
6. **Conflictos:** último en escribir gana **por campo** (no por fila), comparando `_updatedAt`. Los conflictos se registran en un log visible en la app — no se resuelven en silencio.

### Los límites que debes conocer de antemano

Sé honesto contigo mismo sobre esto antes de invertir:

| Límite | Realidad |
|---|---|
| Tiempo por ejecución de Apps Script | 6 minutos |
| Tiempo total diario | ~90 min/día en cuenta gratuita, ~6 h con Workspace |
| Ejecuciones simultáneas | 30 |
| Escrituras concurrentes | Requieren `LockService`, se serializan |
| Tamaño de hoja | Se degrada notablemente pasando ~50 000 celdas leídas de golpe |
| Transacciones entre hojas | **No existen.** Descontar stock al crear un pedido no es atómico. |

Para **5–15 usuarios concurrentes** esto va perfecto. Si mañana son 50 técnicos sincronizando fotos, se cae. Por eso el prompt te pide meter todo el acceso a datos detrás de una interfaz `Repository`: **el día que necesites Postgres, cambias la implementación y la UI ni se entera.**

Con `INSTALACIONES` a 94 columnas, además, hay que particionar por año (`INSTALACIONES_2026`) o el `getDataRange().getValues()` completo se vuelve el cuello de botella.

---

## 5. Stack recomendado

| Capa | Elección | Por qué |
|---|---|---|
| Build / framework | **Vite + React 19 + TypeScript** | No hay servidor que renderizar; una SPA estática es más simple, más barata y más fácil de volver PWA que Next.js. |
| Estilos | **Tailwind CSS + shadcn/ui** | Componentes accesibles que se copian al repo. Cero dependencia de diseño. |
| Rutas | **React Router 7** | Rutas anidadas que mapean 1:1 con la jerarquía de vistas de AppSheet. |
| Estado servidor | **TanStack Query** con Dexie como persister | Cache, reintentos y estado de sync resueltos. |
| Base local | **Dexie (IndexedDB)** | Espejo offline + outbox + blobs de imágenes. |
| Formularios | **react-hook-form + Zod** | Los 94 campos de INSTALACIONES se generan desde el esquema, no a mano. |
| PWA | **vite-plugin-pwa (Workbox)** | Service worker, precache del shell, Background Sync. |
| Firma | **signature_pad** | Reemplaza el tipo Signature de AppSheet. |
| Gráficas | **Recharts** | Cubre las 2 charts y el dashboard CRM. |
| Auth | **Google Identity Services** (ID token) | Mismo login que ya usan. El token se valida en Apps Script. |
| Backend | **Google Apps Script Web App** | Único con permiso de escritura sobre las hojas. |
| Hosting | **Cloudflare Pages / Netlify / Vercel** | Estático, gratis, HTTPS (requisito para PWA). |

### La decisión de diseño más importante

**No codifiques 341 columnas a mano.** Replica lo que hace AppSheet: define el esquema como **metadata en TypeScript** y escribe **renderizadores genéricos**.

```ts
// src/schema/almacen.ts
export const ALMACEN: TableDef = {
  name: 'ALMACEN',
  key: 'ID PRODUCTO',
  label: 'ID PRODUCTO',
  columns: [
    { name: 'ID PRODUCTO', type: 'Text', required: true, key: true },
    { name: 'IMAGEN', type: 'Image', required: true },
    { name: 'CATEGORIA', type: 'Enum', values: ['GPS','SENSOR','ACCESORIO','CCTV'] },
    { name: 'COSTO', type: 'Price', hidden: true, showIf: (_, u) => u.can('ver_costos') },
    { name: 'PRECIO VENTA PARA ASESOR', type: 'Price',
      formula: (r) => (r['COSTO'] ?? 0) * 1.16 },
    // ...
  ],
}
```

Un `<TableView>`, un `<DetailView>`, un `<FormView>`, un `<CardView>`, un `<DeckView>`, un `<CalendarView>` y un `<ChartView>` genéricos leen esa metadata. Con eso, agregar una columna es una línea, no una pantalla. Es literalmente el modelo mental de AppSheet, y por eso migrarás en semanas y no en meses.

Y las fórmulas: **tradúcelas a funciones TypeScript**, no construyas un intérprete de expresiones de AppSheet. Son ~30 fórmulas en total.

---

## 6. Roadmap sugerido

**Fase 0 — Preparar los datos (1–2 días).**
Agregar `_uuid` / `_updatedAt` / `_deleted` a las 14 hojas, poblar los UUID, limpiar `PAIS`, y quitar los permisos de edición de las hojas a todos menos a ti.

**Fase 1 — API en Apps Script (3–5 días).**
`doGet` (bootstrap + deltas) y `doPost` (mutaciones en lote + upload a Drive). Verificación de token, permisos, `LockService`, idempotencia por `mutationId`. Probar con `curl` antes de tocar el front.

**Fase 2 — Motor de la app (1 semana).**
Esquema en TS de las 14 tablas, renderizadores genéricos de vistas, capa Repository, Dexie, login y resolución de permisos. Sin lógica de negocio todavía.

**Fase 3 — Módulos en orden de dolor (2–3 semanas).**
1. **INSTALACIONES** primero. Es el que más duele y el que valida el offline con fotos y firma. Si esto funciona, todo lo demás es fácil.
2. Almacén + Compras + Pedidos (con los totales corregidos y kardex calculado).
3. CRM (Clientes, Gestión, Tickets) + dashboard.
4. Laboratorio (con el semáforo arreglado) + Matriz Dispositivos.

**Fase 4 — Offline duro y PWA (1 semana).**
Service worker, background sync, cola de imágenes, indicador de estado de sincronización, pantalla de conflictos, instalación en pantalla de inicio.

**Fase 5 — Lo que AppSheet no te daba.**
PDF de orden de servicio con la firma, alertas de stock mínimo, SLA de tickets y laboratorio, kardex real.

---

## 7. Qué hacer ahora

1. Lee `02-ESQUEMA-COMPLETO.md` — es el volcado fiel de las 14 tablas. Ese archivo va **dentro del repo**, en `docs/appsheet-schema.md`. Es la fuente de verdad para Claude Code.
2. Copia el contenido de `03-PROMPT-CLAUDE-CODE.md` y pégalo en Claude Code dentro de una carpeta vacía.
3. Deja la app de AppSheet viva mientras migras. Es tu especificación ejecutable y tu plan B.
