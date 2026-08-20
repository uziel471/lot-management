# Fase 3 — Vehículos

## Why

Con los catálogos en su lugar, el vehículo es lo siguiente porque es el eje del que cuelga todo lo demás: una compra es la compra de un vehículo, una reparación es la reparación de un vehículo, una venta es la venta de un vehículo. Ningún módulo transaccional puede construirse antes que él.

Es también la primera pantalla del sistema con complejidad real de captura. Los catálogos tienen tres campos; el vehículo tiene veintitrés. Esa diferencia es la que decide si el capturista usa el sistema o vuelve a la hoja: un formulario de veintitrés campos obligatorios es un formulario que nadie llena a la primera. Por eso esta fase declara obligatorios solo cinco —marca, modelo, año, estatus y fecha de recepción— y deja todo lo demás capturable después. El vehículo entra al sistema el día que llega al lote, con lo que se sabe ese día, y se completa conforme aparecen el título, el VIN y el precio.

El sistema anterior llevaba las mismas veintitrés columnas, más cuatro calculadas. Aquí las cuatro calculadas desaparecen —`make_name`, `model_name` y `status_name` son un `$lookup`, y `days_in_inventory` es una resta— y aparece algo que la hoja no podía tener: el historial de estatus. En una hoja, cambiar el estatus de "Listed" a "Sold" sobrescribe la celda y borra el hecho de que el vehículo estuvo publicado cuarenta días. Ese dato es exactamente el que después contesta cuánto tarda en venderse una unidad.

## What Changes

- Registro de vehículos con los veintitrés campos de captura del sistema anterior: identificación, ficha técnica, título, ubicación, fechas, precio de lista y notas.
- Solo cinco campos obligatorios —marca, modelo, año, estatus y fecha de recepción—; el resto se captura después, incluidos el VIN y el número de inventario.
- VIN opcional pero único cuando se captura, normalizado a mayúsculas sin espacios, validado a 17 caracteres sin `I`, `O` ni `Q`. El dígito verificador se comprueba y se advierte, pero no bloquea: hay unidades legítimas cuyo VIN no lo cumple.
- Número de inventario del lote, independiente del `code`, opcional y único cuando se captura.
- Estilo de carrocería, transmisión, combustible, tracción y situación del título como enumeraciones en código, no como catálogos. Son listas cerradas que no cambian y no necesitan código legible, retiro ni autoría.
- Kilometraje con unidad explícita, millas o kilómetros, guardada junto al valor. En un lote fronterizo conviven unidades de los dos mercados, y un número sin unidad es un número que alguien va a leer mal.
- Historial de cambios de estatus con autor y fecha, conservado completo. El orden del catálogo de estatus ordena la presentación pero no restringe las transiciones: una venta que se cae vuelve a "Listed" sin pelear con el sistema.
- Precio de lista en dólares, opcional, sin tipo de cambio congelado —no es una transacción, es un número de referencia que va a cambiar varias veces antes de la venta.
- Días en inventario calculados al consultar, nunca almacenados.
- Inventario filtrable por estatus, marca y rango de fecha de recepción, buscable por código, VIN o número de inventario, con vista de detalle y ficha completa.
- Anulación de vehículos por `admin`, con motivo. Sin borrado, en ningún nivel.

**Fuera de alcance:** el costo acumulado por vehículo y su desglose por categoría. Depende de compras, reparaciones y gastos, y ninguno existe todavía; escribir aquí un spec cuyos escenarios sumarían siempre cero sería escribir un spec que no se puede probar. Llega con compras, en la Fase 4.

Tampoco entran la fecha de venta ni el congelamiento de los días en inventario al vender: los define el módulo de ventas.

## Capabilities

### New Capabilities

- `vehicles`: el registro de las unidades del lote —identidad, ficha, título, estatus con su historial, precio de lista y consulta de inventario.

### Modified Capabilities

Ninguna. Los permisos de vehículo se derivan del requisito de tres roles de `users` (`capturista` crea y edita, `admin` anula) y esta fase los implementa. La emisión del `code`, la representación del dinero y la trazabilidad ya están en `project`.

## Impact

- **Dependencias nuevas:** ninguna.
- **Base de datos:** colección `vehicles`, con índices únicos dispersos sobre `vin` y sobre `stockNumber`, único sobre `code`, y `{ statusId: 1, dateReceived: -1 }` para el inventario. El historial de estatus vive embebido en el documento del vehículo. La colección `counters` recibe el prefijo `VEH`.
- **Código existente que se toca:** `src/lib/auth/permissions.ts` (permisos de vehículo) y el menú del layout `(app)`. Se consume `listActiveOptions` y `listActiveModelsByMake` de la Fase 2 sin modificarlas.
- **Estructura nueva:** `src/features/vehicles/`, `src/lib/db/models/vehicle.ts`, `src/app/(app)/vehiculos/`.
- **UI compartida:** reutiliza `PageHeader`, `DataTable`, `EmptyState`, `ConfirmDialog` y `SubmitButton` de la Fase 2. Lo que agregue —un formulario por secciones y un componente de historial— se evalúa al construirlo para decidir si sube a `components/shared` o se queda en la feature.
- **Prerrequisito:** `add-catalogs` archivado, con los cuatro catálogos cargados y los contadores realineados.
