# Diferencias con AppSheet

Este documento registra cambios deliberados respecto de la aplicación original. La fuente de verdad de sus columnas y enums permanece en appsheet-schema.md.

## Estado de los arreglos requeridos

| Cambio | Estado en Fase 1 | Implementación autoritativa pendiente |
|---|---|---|
| PEDIDOS deja de sumar ENVIO dos veces | Aplicado en metadata, fórmula TypeScript, mock y pruebas | Repetir regla en Apps Script, Fase 3 |
| Laboratorio reconoce 📦 ENTREGADO y ✅ FUNCIONAL como cierre | Aplicado en fórmula TypeScript y pruebas | Repetir regla en Apps Script, Fase 3 |
| Ticket Soporte usa _uuid y muestra TS-AAAA-NNNN | Modelado; el mock muestra el folio | Consecutivo bajo LockService, Fase 3 |
| Laboratorio valida permiso Laboratorio | Corregido en TableDef | Validación de servidor, Fase 3 |
| UserActive se normaliza a booleano | Modelado como Bool y normalizador probado | Migración y validación de servidor, Fase 3 |
| PROVEEDORES.PAIS se limpia | Catálogo reducido a México, CHINA y LITHUANIA | Transformación de filas existentes, Fase 3 |
| ALMACEN.STOCK deja de capturarse a mano | Marcado como solo lectura | Saldo inicial, kardex y cálculo autoritativo, Fases 3 y 6 |
| Checklist y pruebas usan OK / FALLA / NO APLICA | Aplicado en metadata | Migración de filas y formulario normalizado, Fases 3 y 5 |

## Cambios estructurales

### Claves y sincronización

Todas las tablas sincronizables incorporan _uuid, _updatedAt y _deleted. Las claves originales se mantienen como folios visibles o identificadores históricos.

### Tabla excluida

_Per User Settings no se migra porque pertenece al runtime de AppSheet. Por ello se conservan 13 tablas funcionales, no 14.

### Instalaciones normalizadas

Se agregan instalacion_fotos, instalacion_tanques e instalacion_checklist. En Fase 1 también se conservan en metadata los 93 campos originales de INSTALACIONES para validar la migración y no perder información. La sustitución física ocurre en las fases de Apps Script e instalaciones.

### Pedidos históricos

PEDIDOS conserva cliente_uuid y mantiene dirección, teléfonos, email, ubicación y contacto como snapshot. Un cambio posterior en CLIENTES no altera el pedido histórico.

### Backend

No se crea un servidor Node ni un backend local. El frontend usa MockRepository exclusivamente durante las primeras fases. El backend productivo será un Google Apps Script Web App.

### Encabezados reales confirmados en Drive

El preflight de Fase 3 confirmó que la hoja física de Ticket Soporte guarda un
salto de línea en `🎫Canal de \nAtención`, aunque el identificador canónico de
AppSheet conserva dos espacios. La metadata mantiene ambos valores mediante
`sourceHeader`, sin renombrar ni modificar la hoja.

Laboratorio conserva las mismas 25 columnas, pero las evidencias están ordenadas
por pares (`IMAGEN 1`, `NOTAS IMAGEN 1`, etc.). La TableDef ahora refleja ese orden
real. Ninguna de estas correcciones cambia datos existentes.
