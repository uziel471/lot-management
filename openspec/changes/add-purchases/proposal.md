# Fase 4 — Compras

## Why

Con los catálogos y los vehículos en su lugar, el sistema sabe qué unidades hay en el lote pero no lo que costaron. Esa es la cifra de la que cuelga todo el negocio: sin costo de adquisición no hay margen, no hay ROI y no hay forma de decidir un precio de venta. Compras es el módulo que la introduce, y es el primero verdaderamente transaccional —el primero con dinero, con moneda, con anulación y con un tipo que gobierna qué está permitido.

Es también donde se cobra la deuda que originó todo este proyecto. El plan v2 nació de que la hoja `PURCHASES` consumió seis identificadores sin una sola compra real: fórmulas, checkboxes y borrados disparaban el auto-ID porque el `onEdit` no podía distinguir una captura humana de un recálculo. La Fase 0 ya dejó la emisión de códigos atómica y condicionada a que la escritura ocurra; esta fase es la que finalmente la ejerce sobre la tabla que la rompió. Los seis escenarios de validación de la Fase 2 del plan v2 se convierten aquí en tests, no en una lista de comprobaciones manuales.

Y cierra el pendiente que la Fase 3 dejó abierto a propósito. El costo acumulado por vehículo se sacó del alcance de vehículos porque sus escenarios habrían sumado siempre cero: no había nada que sumar. Ahora sí lo hay. La ficha del vehículo deja de ser un inventario de características y pasa a responder la pregunta que de verdad se le hace a un lote —cuánto llevo metido en esta unidad.

## What Changes

- Registro de compras con los ocho componentes del costo de adquisición: precio del vehículo, comisiones de subasta, transporte de adquisición, trámites y documentación de título, impuesto de compra, aranceles de importación, honorarios del agente aduanal y otros costos. Cada uno independiente, en centavos, y ausente equivale a cero.
- Bimoneda por transacción: cada compra es monomoneda, con tipo de cambio congelado al capturar —MXN por 1 USD, exactamente `1` cuando la moneda es USD—. El total en la moneda original y su equivalente en dólares se calculan, nunca se guardan.
- Total en vivo durante la captura: el formulario muestra el total original y el equivalente en USD conforme se llenan los componentes, antes de guardar.
- Cuatro tipos de compra —`Initial`, `Adjustment`, `Correction`, `Related`— con control de signo: solo `Adjustment` admite componentes negativos.
- Una única compra `Initial` vigente por vehículo, garantizada por índice, no solo por validación. `Adjustment` y `Related` exigen que el vehículo ya tenga costo base; `Correction` exige señalar la compra anulada que corrige.
- Compras inmutables: una vez registrada, una compra no se edita. Se anula —con motivo, autor y fecha, reservado a `admin`— y se captura una compra `Correction` aparte. El histórico nunca se borra ni se reescribe.
- Unicidad de comprobante dentro de compras: un mismo proveedor no puede tener dos compras vigentes con el mismo número de referencia, con la referencia normalizada igual que los nombres de catálogo.
- Protección contra guardado doble por token de envío, no solo por deshabilitar el botón: la segunda pulsación devuelve la compra que ya se creó, no una nueva.
- Listado de compras filtrable por vehículo, proveedor, tipo y rango de fechas, con las anuladas señaladas y excluibles, y total del pie coherente con el filtro aplicado.
- Costo de adquisición acumulado por vehículo, con desglose por componente, en la ficha del vehículo y en el detalle de sus compras. Las anuladas cuentan como cero.
- `sourceType`, `paymentMethod` y el tipo de compra como enumeraciones en código, con la misma regla de evolución que las cinco listas cerradas del vehículo: se agregan valores, no se renombran ni se eliminan.
- Anulación de un vehículo bloqueada mientras tenga compras vigentes —la pregunta abierta que dejó la Fase 3.

**Fuera de alcance:** reparaciones y gastos, y con ellos el costo total del vehículo. Lo que esta fase entrega es el costo *de adquisición*, nombrado así en toda la interfaz para que nadie lo lea como costo total. La frontera cruzada —que un mismo comprobante no se registre como compra y como reparación— se agrega como requisito modificado cuando exista `repairs`, en la Fase 6; hoy no hay una segunda colección contra la cual verificarla.

Tampoco entran el buscador transversal ni el flujo asistido de corrección —anular y precargar el formulario con los datos de la original—: pertenecen a la Fase 5. Aquí la corrección se captura a mano, señalando la compra que corrige.

## Capabilities

### New Capabilities

- `purchases`: el registro del costo de adquisición de cada unidad —componentes, moneda, tipos de transacción, anulación, corrección, consulta y costo acumulado por vehículo.

### Modified Capabilities

- `vehicles`: dos requisitos cambian. **Edición y anulación de vehículos** incorpora que un vehículo con compras vigentes no puede anularse hasta que se anulen sus compras. **Consulta de inventario** incorpora el costo de adquisición acumulado en la ficha de detalle.

Los permisos de compra se derivan del requisito de tres roles de `users`. La emisión del `code`, la representación del dinero, la conversión bimoneda y la trazabilidad ya están en `project` y esta fase las consume sin modificarlas —es la primera capacidad que las ejerce completas.

## Impact

- **Dependencias nuevas:** ninguna.
- **Base de datos:** colección `purchases`. Índices: `{ code: 1 }` único; `{ vehicleId: 1, purchaseDate: -1 }`; `{ vendorId: 1 }`; único parcial sobre `{ vehicleId: 1 }` limitado a `txType: "Initial"` no anuladas; único parcial sobre `{ vendorId: 1, referenceKey: 1 }` para las vigentes con referencia; único disperso sobre `submissionToken`. La colección `counters` recibe el prefijo `PUR`, que arranca en cero: los seis códigos consumidos en la hoja no se recuperan.
- **Código existente que se toca:** `src/lib/auth/permissions.ts` (recurso `purchase` con `create` y `void`, sin `update`), `scripts/seed-counters.ts` (prefijo `PUR`), el menú del layout `(app)`, y `src/features/vehicles/actions.ts` para bloquear la anulación de un vehículo con compras vigentes.
- **Estructura nueva:** `src/features/purchases/`, `src/lib/db/models/purchase.ts`, `src/app/(app)/compras/`.
- **Composición entre features:** la ficha del vehículo muestra el costo acumulado, pero `features/vehicles` **no** importa `features/purchases`. La composición ocurre en `app/(app)/vehiculos/[code]/page.tsx`, que consulta ambas features y pasa el resultado como prop. La única dirección que se establece es la contraria: compras consume `listVehicleOptions` y `listActiveOptions("vendors")`, ambas ya existentes.
- **UI compartida:** reutiliza `PageHeader`, `DataTable`, `EmptyState`, `ConfirmDialog` y `SubmitButton`. Agrega un campo de importe monetario que es el primer candidato serio a subir a `components/shared`, porque reparaciones, gastos, pagos y ventas van a necesitarlo idéntico.
- **Prerrequisito:** `add-vehicles` archivado, con al menos un vehículo y un proveedor activos para poder capturar.
