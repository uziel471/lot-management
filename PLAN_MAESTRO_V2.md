# PLAN MAESTRO v2 — Sistema LOTE VEHICULOS - MANAGEMENT

**Actualización principal respecto a v1:** se adopta una **capa de interfaz (HtmlService)** para toda la captura de datos. Esto cambia la arquitectura de asignación de IDs y el rol del `onEdit`.

**Source of truth:** Google Spreadsheet `LOTE VEHICULOS - MANAGEMENT` (ID `15Beb1XZqiuFqOGrztCoIBl6nOOnsgMpkUz-sdIpCuYU`) + proyecto Apps Script `LOTE VEHICULOS - Automations`.

---

## PARTE 0 — CAMBIO ARQUITECTÓNICO: CAPA DE INTERFAZ

### 0.1 Por qué se agrega

Durante la construcción de `PURCHASES` se detectó un problema estructural, no un bug puntual:

> El auto-ID vía `onEdit` no puede distinguir de forma confiable entre "el usuario está capturando una compra" y "una fórmula, un checkbox o un borrado modificó la fila".

Síntomas reales observados:
- Escribir las fórmulas de `P2`/`Q2` generó `PUR-0002` sin intervención humana.
- Un checkbox `is_void` sin marcar (valor literal `FALSE`) contaba como "hay datos".
- Borrar `purchase_id` regeneraba otro ID inmediatamente.
- Se consumieron **6 IDs** (`PUR-0001` … `PUR-0006`) sin una sola compra real.

Cada síntoma se parchó (`ignoreCols`, `v !== false`, guard de borrado), pero **la causa raíz es la captura directa en celdas**. Mientras exista, seguirán apareciendo casos borde nuevos.

### 0.2 Cómo lo resuelve la interfaz

Con captura por formulario, el ID se asigna **del lado del servidor, en una transacción controlada**:

```
Usuario abre formulario
      ↓
Llena campos (con dropdowns dependientes y validación en vivo)
      ↓
Presiona "Guardar"
      ↓
guardarCompra(datos)  ← servidor
      ├─ 1. Valida TODO (FKs, moneda, negativos, campos obligatorios)
      ├─ 2. Si algo falla → devuelve error, NO escribe nada, NO consume ID
      ├─ 3. Toma el lock, pide el siguiente ID, libera el lock
      └─ 4. appendRow() con la fila completa, de un solo golpe
      ↓
Confirma al usuario con el ID asignado
```

**Consecuencias directas:**

| Problema actual | Estado con interfaz |
|---|---|
| IDs fantasma por fórmulas | Eliminado — las fórmulas nunca disparan asignación |
| Checkbox `FALSE` cuenta como dato | Eliminado — no hay evaluación de "¿hay datos?" |
| Borrar ID regenera otro | Eliminado — el ID solo se asigna al guardar |
| Carrera de asignación de ID | Eliminado — una sola llamada atómica con lock |
| Contador desfasado por pruebas | Eliminado — no se consume ID si la validación falla |
| Necesidad de `ignoreCols` | Innecesaria |
| Capturista rompe fórmulas | Eliminado — rangos protegidos, no toca la hoja |

### 0.3 Rol del `onEdit` después del cambio

El `onEdit` **no se elimina**, pero cambia de rol:

- **Antes:** mecanismo principal de asignación de ID.
- **Después:** red de seguridad para ediciones manuales de emergencia (admin corrigiendo directo en la hoja).

Se mantiene el principio: **un único `onEdit(e)` centralizado, router modular, cero triggers instalados.**

### 0.4 Arquitectura de la interfaz

```
┌─────────────────────────────────────────────┐
│  CAPA DE PRESENTACIÓN (HtmlService)         │
│  Formulario_Purchases.html                  │
│  Formulario_Vehicles.html                   │
│  Formulario_Vendors.html      (por módulo)  │
└──────────────────┬──────────────────────────┘
                   │ google.script.run
┌──────────────────▼──────────────────────────┐
│  CAPA DE SERVICIO (Apps Script)             │
│  ├─ UI_Menu.gs        → menú y aperturas    │
│  ├─ Svc_Purchases.gs  → guardar/validar     │
│  ├─ Svc_Catalogs.gs   → listas para combos  │
│  └─ Core_Ids.gs       → nextId_ con lock    │
└──────────────────┬──────────────────────────┘
                   │ SpreadsheetApp
┌──────────────────▼──────────────────────────┐
│  CAPA DE DATOS (hojas del spreadsheet)      │
│  VEHICLES, VENDORS, PURCHASES, catálogos    │
│  ← rangos de captura PROTEGIDOS             │
└─────────────────────────────────────────────┘
```

### 0.5 Decisión pendiente: alcance del despliegue

| Modalidad | Cómo se usa | Cuándo conviene |
|---|---|---|
| **Sidebar / Modal** (dentro de Sheets) | Menú "🚗 Captura" en la barra de Sheets | Capturistas con acceso al archivo, desde computadora |
| **Web App** (URL propia) | Link independiente, no requiere ver el Sheet | Capturistas en celular / que no deben ver la hoja |

**Recomendación:** empezar con Sidebar (más simple, menos permisos), y evaluar Web App cuando haya un capturista real que trabaje desde celular. El mismo código de servicio sirve para ambos.

---

## PARTE 1 — ESTADO ACTUAL REAL (actualizado)

### 1.1 Hojas

| Hoja | Estado | Notas |
|---|---|---|
| `VEHICLES` | ✅ Completa, vacía | Próximo `VEH-0001` |
| `VEHICLE_STATUS` | ✅ 10 activos | `NEXT: STATUS-0011` |
| `MAKES` | ✅ 11 activos | `NEXT: MAKE-0012` |
| `MODELS` | ✅ 44 activos | `NEXT: MODEL-0045` |
| `VENDORS` | ✅ Completa, vacía | Próximo `VEND-0001` |
| `PURCHASES` | 🟡 Estructura lista, contador desfasado | Ver 1.2 |
| `_README` | ✅ Viva | Falta sección PURCHASES |
| `_LISTS` | ✅ Oculta | `active_vendor_ids` vacío (correcto) |

### 1.2 `PURCHASES` — estado detallado

**Verificado y correcto:**
- 26 columnas con encabezados aprobados.
- Validaciones completas (todas con "Reject the input"):
  - `vehicle_id` (B) ← `VEHICLES!$A$2:$A$1000`
  - `vendor_id` (D) ← `'_LISTS'!$C$2:$C$200`
  - `source_type` (E): Auction, Dealer, Private, Other Lot, Other
  - `currency` (F): USD, MXN
  - `exchange_rate` (G): `=AND(ISNUMBER(G2),G2>0,OR($F2<>"USD",G2=1))`
  - Costos (H:O): `=OR($U2="Adjustment",H2>=0)`
  - `payment_method` (R): Cash, Wire, Check, Card, Financing
  - `purchase_type` (U): Initial, Adjustment, Correction, Related
  - `is_void` (V): checkbox `V2:V1000`
- Fórmulas P, Q, Y, Z construidas y funcionando.

**Pendiente / con deuda:**
- ⚠️ `PUR_COUNTER` desfasado — se consumieron 6 IDs en pruebas (`PUR-0001` a `PUR-0006`). **Requiere reset a 0.**
- ⚠️ Datos de prueba residuales en fila 2: `A2`, `E2` (`Auction`), `F2` (`USD`).
- ⚠️ Existe función `checkAndResetPurCounterTemp()` en el código — resetea el contador si alguien la ejecuta. Decidir si se elimina.
- Sin documentación en `_README`.

### 1.3 Apps Script — estado

- Un solo archivo `Code.gs` (~532 líneas), un solo `onEdit(e)`.
- `AUTO_ID_CONFIG` con `VEHICLES` y `PURCHASES` (esta última con `ignoreCols: [16,17,24,25,26]`).
- `assignAutoId_` con dos guards agregados: exclusión de columnas calculadas + guard de borrado directo.
- `nextId_` usa `LockService` con `waitLock(5000)` — la carrera de ID ya estaba mitigada (el plan v1 la listaba como no resuelta; **corregido**).
- **0 triggers instalados.**

---

## PARTE 2 — DESGLOSE DE TAREAS POR FASES

Cada fase es una iteración cerrada: se construye, se valida por interfaz, y se aprueba antes de pasar a la siguiente.

**Convención de validación:** a partir de la Fase 2, tú validas usando la interfaz, no revisando celdas.

---

### FASE 0 — Estabilizar PURCHASES (limpieza de deuda)

**Objetivo:** dejar `PURCHASES` en estado limpio y consistente antes de construir encima.

| # | Tarea | Responsable | Validación |
|---|---|---|---|
| 0.1 | Decidir destino de `checkAndResetPurCounterTemp()` (eliminar o conservar) | Tú (decisión) | — |
| 0.2 | Resetear `PUR_COUNTER` a 0 | Tú (ejecución manual) | Log muestra `after=0` |
| 0.3 | Limpiar datos de prueba residuales (`A2`, `E2`, `F2`) | Tú (manual) | Fila 2 vacía |
| 0.4 | Verificar que la fila 2 vacía no regenera ID | Tú (manual) | `A2` sigue vacía |
| 0.5 | Confirmar 1 `onEdit`, 0 triggers | Claude (lectura) | Reporte |

**Criterio de salida:** hoja vacía, contador en 0, próximo ID real = `PUR-0001`.

**Nota:** esta fase es la única donde todavía tocas celdas directamente. A partir de la Fase 2 ya no.

---

### FASE 1 — Infraestructura de la capa de interfaz

**Objetivo:** montar el esqueleto reutilizable que servirá para todos los módulos.

| # | Tarea | Entregable |
|---|---|---|
| 1.1 | Reorganizar `Code.gs` en archivos separados por responsabilidad | `Core_Ids.gs`, `Core_Router.gs`, `Setup_*.gs` |
| 1.2 | Crear `Core_Ids.gs` con `nextId_` y `peekNextId_` (leer sin consumir) | Función de lectura no destructiva |
| 1.3 | Crear `UI_Menu.gs` con `onOpen()` y menú "🚗 Captura" | Menú visible en Sheets |
| 1.4 | Crear `Svc_Catalogs.gs`: funciones que devuelven listas activas para combos | `getVendorsActivos()`, `getVehiculos()`, etc. |
| 1.5 | Crear plantilla HTML base (estilos, helpers, manejo de errores) | `UI_Base.html` |
| 1.6 | Formulario de prueba mínimo ("hola mundo") para validar el pipeline | Sidebar que abre y cierra |

**Criterio de salida:** el menú aparece en Sheets, abre un panel, y el panel puede leer datos del servidor.

**Validación tuya:** abrir el menú y ver el panel.

**Riesgo:** `onOpen()` es un trigger simple — no cuenta como trigger instalado, no viola la regla de "0 triggers".

---

### FASE 2 — Formulario de PURCHASES (el primero real)

**Objetivo:** captura completa de compras sin tocar celdas.

| # | Tarea | Detalle |
|---|---|---|
| 2.1 | Diseñar el layout del formulario | Agrupado: Identificación / Moneda / Costos / Referencias |
| 2.2 | Implementar dropdowns poblados desde catálogos | Vehículo, Vendor, source_type, currency, payment_method, purchase_type |
| 2.3 | Lógica de moneda en vivo | Si USD → `exchange_rate` se fija en 1 y se bloquea |
| 2.4 | Cálculo de total en vivo | Muestra total_orig y total_usd mientras llena |
| 2.5 | Validación completa del lado servidor | Replica las 9 reglas ya existentes |
| 2.6 | `guardarCompra()` atómica con asignación de ID | Un solo `appendRow` |
| 2.7 | Manejo de errores visible al usuario | Mensaje claro, sin consumir ID |
| 2.8 | Proteger rangos de `PURCHASES` | Columnas calculadas + `purchase_id` bloqueadas |

**Criterio de salida:** puedes registrar una compra completa desde el formulario, con ID correcto y sin tocar la hoja.

**Validación tuya (por interfaz):**
1. Registrar compra USD → ID debe ser `PUR-0001`
2. Registrar compra MXN con tipo de cambio → verificar conversión
3. Intentar guardar con campo obligatorio vacío → debe rechazar sin consumir ID
4. Intentar negativo con `purchase_type=Initial` → debe rechazar
5. Registrar `Adjustment` negativo → debe aceptar
6. Verificar que los IDs son consecutivos sin saltos

---

### FASE 3 — Formularios de catálogos y VEHICLES

**Objetivo:** que todo el flujo de alta esté cubierto por interfaz.

| # | Tarea |
|---|---|
| 3.1 | Formulario `VENDORS` (alta y edición) |
| 3.2 | Formulario `VEHICLES` con dropdown dependiente Make→Model |
| 3.3 | Formulario de catálogos (`MAKES`, `MODELS`, `VEHICLE_STATUS`) |
| 3.4 | Función "desactivar" (nunca borrar) desde interfaz |
| 3.5 | Proteger rangos de las hojas de catálogo |

**Criterio de salida:** un capturista puede operar el sistema completo sin abrir ninguna hoja.

**Validación tuya:** dar de alta un vendor, un vehículo, y usarlos en una compra — todo por formulario.

---

### FASE 4 — Consulta y edición

**Objetivo:** no solo capturar, también consultar y corregir.

| # | Tarea |
|---|---|
| 4.1 | Buscador de compras por vehículo / vendor / fecha |
| 4.2 | Vista de detalle de una compra |
| 4.3 | Función "anular" (`is_void=TRUE`) desde interfaz, con confirmación |
| 4.4 | Función "corregir" (anula + precarga formulario con los datos) |
| 4.5 | Vista de resumen por vehículo (costo acumulado) |

**Criterio de salida:** ciclo completo alta → consulta → corrección sin tocar celdas.

---

### FASE 5 en adelante — Módulos de negocio restantes

A partir de aquí, **cada módulo nuevo incluye su formulario en la misma fase** (no se construye la hoja primero y el formulario después):

| Fase | Módulo | Incluye |
|---|---|---|
| 5 | `REPAIRS` | Hoja + catálogo `REPAIR_CATEGORIES` + formulario |
| 6 | `EXPENSES` | Hoja + catálogo `EXPENSE_CATEGORIES` + formulario |
| 7 | `PAYMENTS` | Hoja + formulario + columnas de balance |
| 8 | `SALES` | Hoja + formulario + profit/ROI |
| 9 | `INVENTORY_VIEW` + `_QA_CHECKS` | Solo lectura, fórmulas nativas |
| 10 | `DASHBOARD` + `REPORTES` | Panel ejecutivo |

**Decisiones de negocio a resolver antes de cada fase** (heredadas del plan v1):
- Antes de Fase 5: frontera exacta `REPAIRS` vs `EXPENSES` con ejemplos.
- Antes de Fase 6: ¿gastos generales se prorratean al costo por vehículo?
- Antes de Fase 7: FK polimórfica vs. 4 columnas dedicadas (recomendado: dedicadas).
- Antes de Fase 8: manejo de venta devuelta (return).
- Condicional: ¿el negocio usa financiamiento de inventario (floor plan)? Si sí, `FINANCING` entra entre 7 y 8.

---

## PARTE 3 — PRINCIPIOS QUE NO CAMBIAN

Todo lo siguiente se mantiene íntegro del plan v1:

1. **Un único `onEdit(e)`** centralizado, router por hoja. Nunca un segundo.
2. **Cero triggers instalados** (`onOpen` simple no cuenta).
3. **IDs con prefijo + contador en `PropertiesService`**, nunca `ROW()`.
4. **Principio bimoneda:** cada transacción monomoneda; USD base de reporting; `exchange_rate` = MXN por 1 USD, congelado; monedas mezcladas = múltiples filas.
5. **Patrón de anulación:** `is_void=TRUE` anula (total 0), nunca borrar histórico. `Correction` = anular el error + capturar correcto aparte.
6. **Solo `Adjustment` permite negativos.**
7. **Catálogos:** nunca borrar, retirar con `is_active=FALSE`, nunca reutilizar IDs.
8. **Frontera de costos:** `PURCHASES` (adquisición) / `REPAIRS` (reacondicionamiento) / `EXPENSES` (todo lo demás). Nunca duplicar un costo.
9. **Preferir fórmulas nativas** sobre Apps Script cuando basten.
10. **Aprobación explícita del diseño antes de construir.**

---

## PARTE 4 — RIESGOS ESPECÍFICOS DE LA CAPA DE INTERFAZ

| Riesgo | Mitigación |
|---|---|
| Formulario y hoja se desincronizan (se agrega columna y el form no la conoce) | Definir las columnas en una constante compartida, no hardcodear en dos lados |
| Usuario con permiso de edición evade el formulario | Proteger rangos; dejar solo al admin como editor de la hoja |
| `google.script.run` falla silenciosamente | Manejo explícito de `withFailureHandler` en todos los llamados |
| Tiempo de carga del formulario si los catálogos crecen | Cachear listas con `CacheService`; paginar si supera ~500 items |
| Doble submit por doble clic | Deshabilitar el botón al enviar; idempotencia por token de sesión |
| Límite de 6 min de ejecución en Apps Script | No aplica a formularios de una fila; vigilar en cargas masivas futuras |

---

## PARTE 5 — MASTER CONTEXT (actualizado para chats futuros)

```
PROYECTO: Sistema de administración de lote de vehículos usados (Tijuana).
SOURCE OF TRUTH: Google Spreadsheet "LOTE VEHICULOS - MANAGEMENT"
(ID 15Beb1XZqiuFqOGrztCoIBl6nOOnsgMpkUz-sdIpCuYU) + Apps Script
"LOTE VEHICULOS - Automations".

CAMBIO ARQUITECTÓNICO v2 (IMPORTANTE):
La captura de datos se hace por INTERFAZ (HtmlService), NO tecleando en celdas.
Los IDs se asignan del lado del servidor en una transacción atómica al guardar
el formulario, NO por onEdit. El onEdit queda como red de seguridad para
ediciones manuales de emergencia. Los rangos de captura están PROTEGIDOS.
Razón: el auto-ID por onEdit no puede distinguir captura humana de cambios por
fórmula/checkbox/borrado; se consumieron 6 IDs fantasma antes de este cambio.

ARQUITECTURA DE DATOS (sin cambios respecto a v1):
- VEHICLES: 24 cols captura + make_name/model_name/status_name + days_in_inventory.
  vehicle_id = VEH-####. Dropdown model_id dependiente de make_id.
- VEHICLE_STATUS / MAKES / MODELS / VENDORS: catálogos. Patrón: *_id (PK con
  prefijo), *_name, is_active (checkbox), NEXT ID asistido. Nunca borrar,
  nunca reutilizar ID.
- PURCHASES: 26 cols. purchase_id (PUR-####), vehicle_id FK, purchase_date,
  vendor_id FK activo, source_type, currency, exchange_rate, 8 componentes de
  costo (H:O), total_acquisition_cost_orig [calc P], total_acquisition_cost_usd
  [calc Q], payment_method, reference_number, lot_number, purchase_type, is_void,
  notes, created_at [auto X], vendor_name [calc Y], vehicle_desc [calc Z].
- _LISTS: hoja técnica OCULTA con listas de activos. Nunca capturar ahí.
- _README: documentación viva.

PRINCIPIO BIMONEDA (PURCHASES, REPAIRS, EXPENSES, PAYMENTS, SALES):
- Cada transacción MONOMONEDA. USD es la base de reporting.
- exchange_rate = MXN por 1 USD, congelado al capturar. USD => rate = 1.
- Monedas mezcladas = múltiples filas del mismo vehicle_id.
- total_*_orig = suma de componentes (0 si is_void). total_*_usd = orig / rate.

PATRÓN DE ANULACIÓN (todas las transaccionales):
- *_type: Initial / Adjustment / Correction / Related. Solo Adjustment permite
  negativos.
- is_void=TRUE anula (total 0, fuera de cálculos). NUNCA borrar histórico.
- Correction: anular el erróneo + capturar el correcto en fila aparte.

APPS SCRIPT:
- UN ÚNICO onEdit(e) centralizado. NUNCA un segundo. 0 triggers instalados
  (onOpen simple no cuenta).
- AUTO_ID_CONFIG central por hoja transaccional.
- nextId_ con LockService + contador en PropertiesService. Nunca ROW().
- Preferir fórmulas nativas sobre Apps Script cuando basten.

FRONTERA DE COSTOS (crítica):
- PURCHASES: adquisición inicial (precio, transporte al lote, título inicial,
  nacionalización).
- REPAIRS: reacondicionamiento pre-venta, una fila por gasto.
- EXPENSES: todo lo demás (puede o no tener vehicle_id).
- NUNCA registrar el mismo costo en dos tablas.

ORDEN DE FASES: 0 Estabilizar PURCHASES → 1 Infraestructura UI → 2 Form
PURCHASES → 3 Forms catálogos/VEHICLES → 4 Consulta/edición → 5 REPAIRS →
6 EXPENSES → 7 PAYMENTS → 8 SALES → 9 INVENTORY_VIEW/QA → 10 DASHBOARD.
Cada módulo nuevo incluye su formulario en la misma fase.

ESTILO DE TRABAJO:
- Aprobación explícita del diseño ANTES de construir.
- El usuario valida por INTERFAZ, no revisando celdas.
- Claude NO ejecuta pruebas que modifiquen el spreadsheet; entrega escenarios
  de prueba manuales para que el usuario los ejecute.
- Datos de prueba mínimos y limpieza total al terminar cada módulo.
- Detenerse y reportar al final de cada fase; no avanzar sin autorización.
- No sobrescribir, no borrar, no asumir — preguntar antes de modificar.
```

---

## PARTE 6 — DECISIONES QUE NECESITO DE TI

Antes de arrancar la Fase 0/1:

1. **`checkAndResetPurCounterTemp()`**: ¿la elimino o la conservas para usarla tú?
2. **Modalidad de interfaz**: ¿Sidebar dentro de Sheets, o Web App con URL propia? (recomendado: empezar con Sidebar)
3. **Reorganización del código**: ¿autorizas dividir `Code.gs` en varios archivos, o prefieres mantener un solo archivo?
4. **¿Quién capturará?** ¿Tú, o habrá un capturista distinto? Define si necesita ver la hoja o solo el formulario.
5. **Orden de arranque**: ¿Fase 0 primero (limpiar deuda), o prefieres empezar directo con la interfaz y limpiar después?
