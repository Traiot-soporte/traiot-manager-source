# TRAIOT MANAGER — Esquema completo (extraído de la definición de AppSheet)

Este documento es la **fuente de verdad** para la migración. Colócalo en el repo como `docs/appsheet-schema.md`.

Notación: `NOMBRE :: Tipo [banderas]` · `-> ref:TABLA` = referencia · `| =fórmula` = fórmula de app · `showIf=` = condición de visibilidad.
Tipos de AppSheet usados: Text, LongText, Number, Price, Date, DateTime, Enum, EnumList, Ref, List, Image, Signature, Email, Phone, Url, Address, Color, Name, LatLong, Yes/No, Show.

`_RowNumber` es una columna interna de AppSheet — **no migrarla**. En su lugar, cada tabla lleva `_uuid`, `_updatedAt`, `_deleted`.

---

## Resumen

| Tabla | Cols | Clave | Etiqueta | Rol |
|---|---|---|---|---|
| ALMACEN | 30 | ID PRODUCTO | ID PRODUCTO | Catálogo de productos / inventario |
| COMPRAS | 16 | ID COMPRA | ID COMPRA | Entradas de inventario |
| PEDIDOS | 27 | ID PEDIDO | ID PEDIDO | Salidas / ventas |
| PROVEEDORES | 27 | ID | ID | Padrón de proveedores |
| CLIENTES | 14 | ID CLIENTE | ID CLIENTE | Padrón de clientes |
| Gestion Clientes | 14 | Id_CRM | Id_CRM | Bitácora CRM / prospección |
| Ticket Soporte | 16 | _ComputedKey | Fecha Registro | Mesa de ayuda |
| INSTALACIONES | 94 | FOLIO SERVICIO | FOLIO SERVICIO | Orden de servicio en campo |
| Laboratorio | 26 | FOLIO | FOLIO | RMA / revisión de equipos |
| MATRIZ DISPOSITIVOS | 47 | Modelo | Modelo | Fichas técnicas de GPS |
| Usuarios | 6 | UserID | UserName | Control de acceso |
| Perfiles | 4 | PerfilID | PerfilID | Permisos por vista |
| Menu | 5 | IdMenu | NombreMenu | Launcher de la app |
| _Per User Settings | 15 | _THISUSER | — | Preferencias (sistema AppSheet) |

---

## ALMACEN (30)

```
No. Item                    :: Number [REQ]
ID PRODUCTO                 :: Text [KEY, LABEL, REQ]
IMAGEN                      :: Image [REQ]
PROVEEDOR                   :: Text            ← debería ser Ref a PROVEEDORES
NOMBRE                      :: Text
UNIDAD DE MEDIDA            :: Text [HIDDEN]
UNIDAD DE MEDIDA SAT        :: Text [HIDDEN]
KIT INSTALACION             :: Price [HIDDEN]
MONEDA                      :: Text [HIDDEN]
TIPO DE CAMBIO              :: Price [HIDDEN]
COSTO                       :: Price [HIDDEN]
MANO DE OBRA                :: Price [HIDDEN]
PRECIO VENTA PARA ASESOR    :: Price [HIDDEN]  | = [COSTO]*0.16 + [COSTO]
STOCK MINIMO                :: Number
STOCK MAXIMO                :: Number
AVISO DE COMPRA             :: Text
MTS. CABLE INCLUIDOS        :: Text [HIDDEN]
CATEGORIA                   :: Enum ["GPS","SENSOR","ACCESORIO","CCTV"]
CRITICO                     :: Text [HIDDEN]
CENTRO DE COSTOS            :: Text [HIDDEN]
TIEMPO DE ENTREGA           :: Text [HIDDEN]
CLAVE SAT                   :: Text [HIDDEN]
ESTATUS                     :: Text
COMPRAS                     :: Ref -> ref:COMPRAS
PEDIDOS                     :: Ref -> ref:PEDIDOS
STOCK                       :: Number          ← manual; debería calcularse
Related PEDIDOSs            :: List [VIRTUAL]  | = REF_ROWS("PEDIDOS","ID PRODUCTO")
Related COMPRASs            :: List [VIRTUAL]  | = REF_ROWS("COMPRAS","ID PRODUCTO")
SVG                         :: Show [VIRTUAL]
```

## COMPRAS (16)

```
FECHA COMPRA        :: Date [REQ]
ID COMPRA           :: Text [KEY, LABEL, REQ]
ID PRODUCTO         :: Ref [REQ] -> ref:ALMACEN     validIf = ALMACEN[ID PRODUCTO]
NOMBRE              :: Text   | = [ID PRODUCTO].[NOMBRE]
PROVEEDOR           :: Text   | = [ID PRODUCTO].[PROVEEDOR]
COSTO               :: Price  | = [ID PRODUCTO].[COSTO]
KIT INSTALACION     :: Price  | = [ID PRODUCTO].[KIT INSTALACION]
CANTIDAD            :: Number
SUBTOTAL            :: Price  | = [COSTO]*[CANTIDAD] + [KIT INSTALACION]
COSTO DE ENVIO      :: Price
PRECIO DE COMPRA    :: Price  | = [SUBTOTAL] + [COSTO DE ENVIO]
ESTATUS COMPRA      :: Enum ["RECIBIDA","EN CAMINO","CANCELADA"]
COMENTARIOS         :: Text
VALIDADOR COMPRA    :: Number
Related ALMACENs    :: List [VIRTUAL, HIDDEN] | = REF_ROWS("ALMACEN","COMPRAS")
```

## PEDIDOS (27)

```
FECHA                       :: Date [REQ]
TIPO DE PEDIDO              :: Enum ["VENTA EQUIPO","INSTALACION","REVISION"]
ID PEDIDO                   :: Text [KEY, LABEL, REQ]
ID PRODUCTO                 :: Ref -> ref:ALMACEN    validIf = ALMACEN[ID PRODUCTO]
NOMBRE                      :: Text  | = [ID PRODUCTO].[NOMBRE]
CATEGORIA                   :: Enum ["GPS","SENSOR","CCTV"]
PRECIO VENTA PARA ASESOR    :: Price | = [ID PRODUCTO].[PRECIO VENTA PARA ASESOR]
EQUIPOS A VENDER            :: Number
COSTO INSTALACION           :: Price
ENVIO                       :: Price
SUBTOTAL                    :: Price | = [PRECIO VENTA PARA ASESOR]*[EQUIPOS A VENDER] + [COSTO INSTALACION] + [ENVIO]
IVA                         :: Price | = [SUBTOTAL]*0.16
TOTAL                       :: Price | = [SUBTOTAL] + [IVA] + [ENVIO]   ← BUG: ENVIO duplicado
TIPO CLIENTE                :: Enum ["TRAIOT PLUS","HABITUAL","OCASIONAL","PROSPECTO PLUS","PROSPECTO"]
RAZON SOCIAL                :: Ref -> ref:CLIENTES   validIf = CLIENTES[RAZON SOCIAL]
ID CLIENTE                  :: Text  | = [RAZON SOCIAL].[ID CLIENTE]
DIRECCION                   :: Text  | = [RAZON SOCIAL].[DIRECCION]
TELEFONO                    :: Number| = [RAZON SOCIAL].[TELEFONO]
EMAIL                       :: Email | = [RAZON SOCIAL].[EMAIL]
UBICACION                   :: Url   | = [RAZON SOCIAL].[UBICACION]
CONTACTO                    :: Text
TELEFONO CONTACTO           :: Text
ESTATUS PEDIDO              :: Enum ["APROBADO","NO APROBADO","PENDIENTE APROBACION"]
COMENTARIOS                 :: Text
VALIDADOR VENTA             :: Number
Related ALMACENs            :: List [VIRTUAL] | = REF_ROWS("ALMACEN","PEDIDOS")
```

## CLIENTES (14)

```
ID CLIENTE                  :: Text [KEY, LABEL, REQ]
RAZON SOCIAL                :: Text
DIRECCION                   :: Text
TELEFONO                    :: Text
EMAIL                       :: Email
UBICACION                   :: Url
CONTACTO                    :: Text
TELEFONO CONTACTO           :: Text
IMAGEN                      :: Image
ESTATUS                     :: Enum ["Activo","Inactivo"]
Related PEDIDOSs            :: List [VIRTUAL] | = REF_ROWS("PEDIDOS","RAZON SOCIAL")
Related Gestion Clientes    :: List [VIRTUAL] | = REF_ROWS("Gestion Clientes","Nombre_empresa")
Related Laboratorios        :: List [VIRTUAL] | = REF_ROWS("Laboratorio","CLIENTE")
```

## PROVEEDORES (27)

```
ID                  :: Number [KEY, LABEL, REQ]
RAZON_SOCIAL        :: Text
RFC                 :: Text
CALLE               :: Text
NO_INT              :: Number
NO_EXT              :: Number
COLONIA             :: Text
CP                  :: Number [REQ]
MUNICIPIO           :: Text
CIUDAD              :: Text
ESTADO              :: Text
PAIS                :: Enum ["México","MEXICO","MEXOCO","CHINA","LITHUANIA"]  ← limpiar
TELEFONO            :: Text
TELEFONO2           :: Text
TELEFONO3           :: Text
TELEFONO4           :: Text
CORREO_E            :: Url
WEB                 :: Text
DIAS_PRONTO_PAGO    :: Number [REQ]
DIAS_PLAZO          :: Number [REQ]
DECUENTO_PRONTO     :: Number [REQ]     (typo original: "DECUENTO")
CONTACTO            :: Text
CONDICION_PAGO      :: Text
TIPO                :: Text
INCOTERM            :: Text
EXISTE              :: Number [REQ]
```

## Gestion Clientes (14)

```
Id_CRM                  :: Text [KEY, LABEL, REQ]
Fecha_contacto          :: Date [REQ]
Nombre_empresa          :: Ref [REQ] -> ref:CLIENTES   validIf = CLIENTES[RAZON SOCIAL]
Pagina_empresa          :: Url
Contacto                :: Text  | = [Nombre_empresa].[CONTACTO]
Telefono                :: Phone | = [Nombre_empresa].[TELEFONO CONTACTO]
Email                   :: Email | = [Nombre_empresa].[EMAIL]
Tipo_cliente            :: Enum ["🟢Activo","🔵Prospecto"]
Accion                  :: Enum ["📞Llamada telefónica","✉️Enviar email","💬Seguimiento WhatsApp","🏠Visita","📱Videollamada"]
Responsable             :: Text
Estatus_prospeccion     :: Enum ["⏳Por contactar","📞Primer contacto","🤝En negociación","❌No interesado","✅Cliente"]
                           showIf = [Tipo_cliente] = "🔵Prospecto"
Estatus_cliente         :: Enum ["🟢Activo","🔁Por dar seguimiento","📅Reciente contacto","🛒Compra reciente","⚠️Requiere atención","😟Riesgo de fuga","🔴Perdido"]
                           showIf = [Tipo_cliente] = "🟢Activo"
Notas                   :: Text
```

## Ticket Soporte (16)

```
🗓️Fecha Registro        :: Date [LABEL, REQ]
🏭Cliente               :: Text [REQ]
⭐Tipo de Cliente        :: Enum ["💎VIP","🎯HABITUALES","📈OCASIONAL","💎PROSPECTO PLUS","📈PROSPECTO"]
🧾Cuenta propietaria    :: Enum ["📱TRAIOT","📱PIDEGPS"]
🧑Contacto              :: Text
📞Teléfono              :: Phone [REQ]
✉️Email                 :: Email
💼Asesor de Ventas      :: Text
🎫Canal de  Atención    :: EnumList ["💬Whatsapp","📞Llamada Telefónica","✉️Email","💻Acceso Remoto","📱Video Llamada"]
📌Tipo de Caso          :: Enum ["🛠️Soporte","🚨Incidencia","📝Solicitud","❓Consulta","🧩Requerimiento","🎓Capacitación","📦Otro","🚚Instalacion GPS","🛰️Demostración Plataforma"]
🔎Descripción del problema :: LongText
🧑Atendió               :: Enum ["🧑Ing. Manuel Soto","🧑Ing. Ian Espinoza"]
🛡️Comentarios Soporte   :: LongText
🚦Estatus               :: Enum ["🤝Contactado","🔄En Seguimiento","⏳ En espera del cliente","✅Solucionado"]
_ComputedKey            :: Text [KEY, REQ, VIRTUAL, HIDDEN]
                           | = CONCATENATE([🗓️Fecha Registro], ": ", [🏭Cliente])   ← BUG: colisiona
```

## INSTALACIONES (94) — orden de servicio en campo

### Cabecera
```
FOLIO SERVICIO      :: Text [KEY, LABEL, REQ]  (default con expresión)
FECHA               :: DateTime  (default NOW)
MES                 :: Enum      (default derivado de FECHA)
AÑO EN CURSO        :: Text      (default derivado de FECHA)
CLIENTE             :: Text      ← debería ser Ref a CLIENTES
CONSULTOR VENTAS    :: Text
TIPO DE SERVICIO    :: Text
ESTATUS             :: Text
TECNICO             :: Text      ← debería ser Ref a Usuarios
SOLUCION            :: Text
```

### Dispositivo instalado
```
MARCA DISPOSITIVO   :: Text      ← debería ser Ref a MATRIZ DISPOSITIVOS
MODELO DISPOSITIVO  :: Text
IMEI                :: Text
SIM                 :: Text
PROVEEDOR SIM       :: Text
```

### Contacto y ubicación del servicio
```
CONTACTO            :: Text
TELEFONO            :: Text
EMAIL               :: Email
DIRECCION           :: Address
UBICACION           :: Url
ECONOMICO           :: Text
ACCESORIOS ADICIONALES :: Text
CEREBRO             :: Text
PANICO              :: Text
CORTE               :: Text
```

### Sensores de combustible  → migrar a tabla hija `instalacion_tanques`
```
NO. TANQUES         :: Text
TANQUE 1 (MARCA)    :: Text      TANQUE 1 (SERIE) :: Text
TANQUE 2 (MARCA)    :: Text      TANQUE 2 (SERIE) :: Text
TANQUE 3 (MARCA)    :: Text      TANQUE 3 (SERIE) :: Text
IMAGEN FUEL 1..10   :: Image     ← 10 columnas; migrar a `instalacion_fotos` (categoria='fuel')
NOTAS COMBUSTIBLE   :: Text
```

### Vehículo
```
MARCA AUTO          :: Text
SUBMARCA            :: Text
COLOR               :: Color ["Green","Yellow","Orange","Red","Purple","Blue","White","Black"]
AÑO                 :: Text
VIN                 :: Text
PLACAS              :: Text
ODOMETRO            :: Text
IMAGEN 1..10        :: Image     ← 10 columnas; migrar a `instalacion_fotos` (categoria='general')
COMENTARIOS TECNICO :: LongText
```

### Checklist de recepción — 13 puntos, todos `Enum ["✅OK"]` (booleano disfrazado)
```
LUCES · DIRECCIONALES · INTERMITENTES · CUARTOS · TABLERO · ESTEREO ·
VIDRIOS ELECTRICOS · AIRE ACONDICIONADO · SEGUROS ELECTRICOS · BATERIA ·
CLAXON · LUZ INTERIOR · VISERAS
IMAGEN CHECK 1..5       :: Image  ← migrar a `instalacion_fotos` (categoria='checklist')
CHECKLIST OBSERVACIONES :: Text
```

### Pruebas post-instalación — cada una `Enum ["✅OK"]` + observaciones
```
POSICIONAMIENTO OK                  :: Enum   OBSERVACIONES 1 :: Text
IGNICION                            :: Enum   OBSERVACIONES 2 :: Text
PRUEBA BLOQUEO/HABILITADO DE MOTOR  :: Enum   OBSERVACIONES 3 :: Text
DESCONEXION BATERIA                 :: Enum   OBSERVACIONES 4 :: Text
BOTON SOS                           :: Enum   OBSERVACIONES 5 :: Text
```

### Cierre
```
NOMBRE DE QUIEN RECIBE  :: Text
FIRMA DE QUIEN RECIBE   :: Signature
IMAGEN INE              :: Image
```

## Laboratorio (26)

```
FOLIO                   :: Text [KEY, LABEL, REQ]
FECHA ENTRADA           :: Date
PROBLEMA DETECTADO      :: Enum ["NO DETECTA SIM","NO ACTIVA BLOQUE DE MOTOR/HABILITADO",
                                 "PROBLEMA EN ENTRADAS DIGITALES/ANALOGAS","NO COMUNICA A PLATAFORMA",
                                 "NO ENCIENDE","NO DETECTA IGNICION","NO DETECTA VOLTAJE",
                                 "REVISION GENERAL","REPORTA A PLATAFORMA SIN UBICACIÓN GPS",
                                 "NO DETECTA BOTON SOS"]
ESTATUS                 :: Enum ["📥 RECIBIDO","🛠️ EN REVISION","❌ DAÑADO","🏬 ENVIADO A MATRIZ","📦 ENTREGADO","✅ FUNCIONAL"]
MARCA                   :: Enum ["TOPFLYTECH","RUPTELA","QUECLINK","CONCOX","CALAMP"]
MODELO                  :: Text
IMEI                    :: Text
TEL SIM                 :: Text
CLIENTE                 :: Ref -> ref:CLIENTES    validIf = CLIENTES[RAZON SOCIAL]
REVISADO POR            :: Enum ["Manuel Soto","Ian Espinoza"]
PRUEBAS REALIZADAS      :: EnumList  (18 pruebas, ver abajo)
FECHA SALIDA            :: Date
NOTAS DE REVISION       :: LongText
IMAGEN 1..5             :: Image      con showIf en cascada: IMAGEN N visible si ISNOTBLANK(IMAGEN N-1)
NOTAS IMAGEN 1..5       :: LongText   misma cascada
DIAS LABORATORIO        :: Number | = TOTALHOURS(TODAY() - [FECHA ENTRADA]) / 24
SEMAFORO                :: Text   | = IFS(
                             ISBLANK([DIAS LABORATORIO]), "",
                             IN([ESTATUS], LIST("❌ DAÑADO","🏬 ENVIADO A MATRIZ","✅ ENTREGADO")), "🔵 CERRADO",
                             NUMBER([DIAS LABORATORIO]) <= 3, "🟢 EN TIEMPO",
                             NUMBER([DIAS LABORATORIO]) <= 6, "🟡 POR VENCER",
                             TRUE, "🔴 URGENTE")
                           ← BUG: "✅ ENTREGADO" no existe en el enum (es "📦 ENTREGADO")
```

### Catálogo `PRUEBAS REALIZADAS` (18)
```
🔍 Inspección física general del equipo y arnés de conexión.
🔌 Verificación de alimentación principal (9-36 VDC).
⚡ Verificación del consumo de corriente.
🟢 Comprobación de encendido y funcionamiento del equipo.
🔗 Verificación de comunicación USB con Device Center.
📋 Lectura de información del dispositivo (IMEI, Firmware y Configuración).
💳 Verificación del reconocimiento de la tarjeta SIM.
📶 Verificación del registro en la red GSM/LTE.
🌐 Comprobación de comunicación con el servidor/plataforma.
📡 Validación del envío y recepción de datos.
🛰️ Verificación del posicionamiento GPS (adquisición de satélites y FIX).
🚗 Verificación del estado de Ignición (DIN1).
📥 Prueba de entradas digitales (DIN).
📤 Prueba de salidas digitales (DOUT).
🎚️ Verificación de entradas analógicas (ADC), cuando aplica.
🔋 Verificación de lectura de voltaje interno y voltaje externo.
🔋🛡️ Revisión del respaldo mediante batería interna.
🔬 Revisión visual de la tarjeta electrónica para detectar daños físicos, humedad, corrosión o componentes quemados.
```

## MATRIZ DISPOSITIVOS (47) — ficha técnica de GPS

```
Modelo [KEY, LABEL, REQ] · Marca · Imagen :: Image · Familia · Tipo · Red · BLE · IP ·
Agua_exterior · Ambiente · Dimensiones · Peso_g · Bateria(miliamperios) :: Number · Voltaje ·
Temp_operacion · Temp_almacenamiento · Montaje_instalacion · DI · DO · AI_Config ·
RS232 · RS485 · CAN · One_Wire · RFID · OBD · WiFi · USB_Config · Carga_transmision_datos ·
Antena_red_GNSS · Indicador_LED · Interruptor_fisico · Output_5V_12V · BLE_accessory_support ·
Sensor_temp · Sensor_luz_hall · Acelerometro · Geocercas · FOTA · Protocolos · Seguridad ·
Uso_recomendado · Comentario · Frecuencia_reporte (min) :: Number · Calculadora_bateria :: Number ·
Ficha_Tecnica :: Url
```
Todos `Text` salvo los marcados. Es un datasheet comparativo, no transaccional: en web va como catálogo filtrable + comparador lado a lado.

## Usuarios (6) · Perfiles (4) · Menu (5)

```
Usuarios:  UserID [KEY, REQ] · UserName :: Name [LABEL] · UserEmail :: Email [REQ] ·
           UserRole :: Text  (apunta a Perfiles.PerfilID) · UserActive :: Text [REQ]  ("TRUE"/"FALSE" como texto)

Perfiles:  PerfilID [KEY, LABEL, REQ] · VistasPermitidas :: EnumList (nombres de vistas separados por " , ")
           Related _Per User Settings :: List [VIRTUAL]

Menu:      IdMenu :: Number [KEY, REQ] · NombreMenu :: Text [LABEL] ·
           VistaMenu :: Text (nombre de la vista destino) · ImagenMenu :: Image [LABEL]
```

---

## Vistas (47)

### Vistas de usuario (con control de permisos)
| Vista | Tipo | Tabla | Posición |
|---|---|---|---|
| Menu | Gallery | Menu | left most (launcher) |
| Clientes | Card | CLIENTES | left |
| Almacen | Table | ALMACEN | menu |
| Compras | Table | COMPRAS | ref |
| Salidas | Table | PEDIDOS | ref |
| Servicios | Card | INSTALACIONES | ref |
| Agenda Servicios | Calendar | INSTALACIONES | ref |
| CRM | Dashboard | INSTALACIONES | ref |
| Gestion Clientes | Table | Gestion Clientes | ref |
| Calendario | Calendar | Gestion Clientes | ref |
| Gestion Clientes Chart | Chart | Gestion Clientes | ref |
| Gestion Prospectos Chart | Chart | Gestion Clientes | ref |
| Laboratorio | Table | Laboratorio | ref |
| Matriz Dispositivos | Card | MATRIZ DISPOSITIVOS | ref |
| Ticket Soporte | Table | Ticket Soporte | ref |
| Perfiles | Table | Perfiles | ref |
| Usuarios | Table | Usuarios | ref |

### Vistas generadas (una por tabla)
`_Detail` (Slideshow), `_Form` (Form) e `_Inline` (Table o Deck) para: ALMACEN, CLIENTES, COMPRAS, Gestion Clientes, INSTALACIONES, Laboratorio, MATRIZ DISPOSITIVOS, Menu, PEDIDOS, Perfiles, PROVEEDORES, Ticket Soporte, Usuarios.

### Expresión de permiso (repetida en cada vista de usuario)
```
AND(
  LOOKUP(USEREMAIL(), "Usuarios", "UserEmail", "UserActive") = "TRUE",
  IN("<NombreVista>",
     SPLIT(LOOKUP(LOOKUP(USEREMAIL(), "Usuarios", "UserEmail", "UserRole"),
                  "Perfiles", "PerfilID", "VistasPermitidas"), " , "))
)
```
⚠️ La vista **Laboratorio** valida el permiso `"Almacen"` en lugar de `"Laboratorio"`.

---

## Acciones (57)

Todas son acciones del sistema o de navegación. **No hay acciones de datos personalizadas**, lo que simplifica muchísimo la migración.

- CRUD: `Add`, `Edit`, `Delete` por tabla
- Comunicación: `Compose Email` (CLIENTES.EMAIL, Gestion Clientes.Email, Ticket Soporte.Email, Usuarios.UserEmail), `Call Phone` y `Send SMS` (Gestion Clientes.Telefono, Ticket Soporte.Teléfono)
- Navegación: `View Map (DIRECCION)`, `Open Url` (UBICACION, CORREO_E, Pagina_empresa, Ficha_Tecnica), `View Ref` (COMPRAS, PEDIDOS, ID PRODUCTO, RAZON SOCIAL, Nombre_empresa, CLIENTE), `OpenMenu`
- Exportación (EXPORT_VIEW → CSV): `Kardex`, `Compras`, `Soporte`, `Salidas`

## Automatizaciones

**Ninguna.** 0 bots, 0 procesos, 0 eventos, 0 tareas, 0 workflow rules.
