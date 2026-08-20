# Tareas — Compras

## 1. Preparación

- [x] 1.1 Confirmar que `add-vehicles` está archivado y que existe al menos un vehículo vigente y un proveedor activo para poder capturar
- [x] 1.2 Declarar los permisos de compra en `src/lib/auth/permissions.ts`: recurso `purchase` con `create` y `void` —sin `update`, porque la compra es inmutable—; ambas a `admin`, `create` a `capturista`, ninguna a `lectura`
- [x] 1.3 Exportar `PURCHASE_READ_ROLES`, `PURCHASE_WRITE_ROLES` y `PURCHASE_VOID_ROLES` junto a las listas ya existentes de catálogo y vehículo
- [x] 1.4 Extender `scripts/seed-counters.ts` para que cubra también el prefijo `PUR`
- [x] 1.5 Subir la normalización de texto de `features/catalogs/domain.ts` a `src/lib/text.ts` como `normalizeKey`, dejando `toNameKey` delegando en ella, sin cambiar su comportamiento ni sus tests

## 2. Enumeraciones y dominio

- [x] 2.1 Implementar `src/features/purchases/enums.ts` con `sourceType` (Auction, Dealer, Private, Other Lot, Other), `paymentMethod` (Cash, Wire, Check, Card, Financing) y `txType` (Initial, Adjustment, Correction, Related), valor en inglés y etiqueta de UI en español, más la regla documentada de que un valor ya usado nunca se renombra ni se elimina
- [x] 2.2 Definir en el mismo módulo la constante `COST_COMPONENTS`: los ocho componentes en orden, con su clave y su etiqueta en español, como única fuente para el esquema, el formulario, la tabla de desglose y los tests
- [x] 2.3 Implementar `src/features/purchases/domain.ts` con `totalOriginal(components, currency)`: suma los ocho en centavos con `sumMoney`, tratando ausente como cero
- [x] 2.4 Implementar `totalUsd(components, currency, exchangeRate)` delegando en `convertToUsd` de `lib/money.ts`, con el tipo de cambio como cadena decimal
- [x] 2.5 Implementar las reglas de tipo como funciones puras: `allowsNegativeAmounts(txType)`, `requiresExistingPurchase(txType)`, `requiresCorrectionTarget(txType)` y `isUniqueInitial(txType)`
- [x] 2.6 Implementar `hasAnyAmount(components)`: rechaza la compra con los ocho componentes en cero
- [x] 2.7 Implementar `toReferenceKey(reference)` sobre `normalizeKey`, devolviendo nulo cuando la referencia viene vacía
- [x] 2.8 Implementar `accumulateAcquisitionCost(purchases)`: total en USD y desglose por los ocho componentes, convirtiendo cada compra con su propio tipo de cambio y descartando las anuladas
- [x] 2.9 Escribir `src/features/purchases/domain.test.ts`: total con componentes vacíos; total exacto de ocho decimales que romperían en punto flotante; conversión de `370,000.00 MXN` a `18.50` dando `20,000.00 USD`; negativos aceptados solo en `Adjustment`; compra con todo en cero rechazada; referencia ` fac-1023 ` y `FAC-1023` produciendo la misma clave; costo acumulado sumando una compra en USD y otra en MXN; costo acumulado ignorando las anuladas; ajuste negativo bajando el acumulado

## 3. Modelo de datos

- [x] 3.1 Crear `src/lib/db/models/purchase.ts` con `auditableFields` más `vehicleId`, `vendorId`, `purchaseDate`, `sourceType`, `currency`, `exchangeRate`, los ocho componentes, `txType`, `correctsPurchaseId`, `paymentMethod`, `referenceNumber`, `referenceKey`, `lotNumber`, `submissionToken` y `notes`
- [x] 3.2 Guardar los ocho componentes como enteros de centavos con valor por omisión cero, y `exchangeRate` como `Decimal128`
- [x] 3.3 Índices base: `{ code: 1 }` único; `{ vehicleId: 1, purchaseDate: -1 }`; `{ vendorId: 1 }`
- [x] 3.4 Índice único parcial `{ vehicleId: 1 }` con `partialFilterExpression: { txType: "Initial", voidedAt: null }`
- [x] 3.5 Índice único parcial `{ vendorId: 1, referenceKey: 1 }` limitado a las vigentes con referencia
- [x] 3.6 Índice único disperso sobre `submissionToken`
- [x] 3.7 MUST NOT declarar ningún campo de total: los totales no se almacenan

## 4. Esquemas y tipos

- [x] 4.1 Implementar `src/features/purchases/schema.ts` con el esquema de alta: vehículo, proveedor, fecha, moneda, tipo de cambio y tipo obligatorios; componentes, forma de pago, referencia, lote y notas opcionales
- [x] 4.2 Validar el tipo de cambio como cadena decimal positiva, y forzar `"1"` cuando la moneda es `USD`
- [x] 4.3 Validar la fecha de compra como no futura
- [x] 4.4 `superRefine` que aplica el control de signo según `txType` y exige `correctsPurchaseId` en `Correction`
- [x] 4.5 Esquema de anulación por separado, con motivo obligatorio y no vacío
- [x] 4.6 Implementar `src/features/purchases/types.ts` con los DTO serializables del listado, del detalle, del desglose acumulado y de la opción de compra a corregir; el tipo de cambio viaja como cadena y los importes como `Money`

## 5. Lecturas

- [x] 5.1 Implementar `src/features/purchases/queries.ts` con `import 'server-only'` y `requireRole` en cada función
- [x] 5.2 `listPurchases(filtros)`: filtros por vehículo, proveedor, tipo y rango de fechas; excluye las anuladas salvo que se pidan explícitamente; resuelve vehículo y proveedor con `$lookup`
- [x] 5.3 Calcular los totales de cada fila y el total del pie en JavaScript con `domain.ts`, nunca en el pipeline de agregación
- [x] 5.4 `getPurchaseByCode(code)`: detalle con los ocho componentes, el tipo de cambio congelado, la conversión aplicada, los datos de anulación y la compra que corrige o por la que fue corregida
- [x] 5.5 `listPurchasesByVehicle(vehicleId)`: las compras de un vehículo, vigentes y anuladas, ordenadas por fecha
- [x] 5.6 `getVehicleAcquisitionCost(vehicleId)`: total en USD y desglose por componente de las compras vigentes — es la función que consume la ficha del vehículo
- [x] 5.7 `listVoidedPurchasesByVehicle(vehicleId)`: las anuladas sin corrección aún, para el desplegable de `correctsPurchaseId`

## 6. Escrituras

- [x] 6.1 Implementar `src/features/purchases/actions.ts` con `'use server'`, siguiendo el orden `requireRole` → `safeParse` → reglas de dominio → verificaciones contra la base → `nextCode` → escritura → `revalidatePath`, devolviendo siempre `ActionResult`
- [x] 6.2 `createPurchase`: verifica el token de envío antes de cualquier otra cosa y devuelve la compra ya creada si el token existe
- [x] 6.3 Verificar que el vehículo esté vigente y el proveedor activo antes de emitir el código
- [x] 6.4 Aplicar las reglas de tipo: rechazar una segunda `Initial` vigente nombrando la existente; exigir compra base en `Adjustment` y `Related`; exigir que el objetivo de una `Correction` pertenezca al mismo vehículo y esté anulado
- [x] 6.5 Derivar `referenceKey` y verificar el comprobante duplicado antes de escribir, con un mensaje que nombre la compra que ya usa esa referencia
- [x] 6.6 Devolver la advertencia de fecha de compra posterior a la de recepción junto al resultado exitoso, sin bloquear el guardado
- [x] 6.7 Traducir las colisiones de índice único (error 11000) a mensajes de campo comprensibles, distinguiendo compra inicial, comprobante duplicado y token de envío; en el caso del token, releer y devolver la compra ganadora como éxito
- [x] 6.8 `voidPurchase`: reservada a `admin`, exige motivo, rechaza anular una compra ya anulada, registra `voidedAt`, `voidedBy` y `voidReason`
- [x] 6.9 MUST NOT implementar ninguna acción de edición ni de borrado de compras
- [x] 6.10 Modificar `voidVehicle` en `features/vehicles/actions.ts` para rechazar la anulación si el vehículo tiene compras vigentes, nombrándolas en el mensaje — mediante una consulta pasada como dependencia, sin que `features/vehicles` importe `features/purchases`

## 7. Pantallas

- [x] 7.1 Crear `src/app/(app)/compras/page.tsx`: listado con filtros por vehículo, proveedor, tipo y fechas, con el total del pie
- [x] 7.2 Crear `src/app/(app)/compras/nueva/page.tsx` y `src/app/(app)/compras/[code]/page.tsx`
- [x] 7.3 Implementar `src/features/purchases/components/purchase-form.tsx` con las cinco secciones —Identificación, Moneda, Componentes del costo, Pago y referencias, Notas—
- [x] 7.4 Generar el `submissionToken` al montar el formulario y renovarlo tras un guardado exitoso
- [x] 7.5 Fijar el tipo de cambio en `1` y bloquearlo al seleccionar `USD`, y restaurarlo editable al seleccionar `MXN`
- [x] 7.6 Mostrar el total original y su equivalente en USD en vivo, calculados con las mismas funciones de `lib/money.ts` que usa el servidor
- [x] 7.7 Implementar el campo de importe monetario reutilizable y evaluar si sube a `components/shared` — reparaciones, gastos, pagos y ventas lo necesitarán idéntico
- [x] 7.8 Poblar los desplegables de vehículo y proveedor con `listVehicleOptions` y `listActiveOptions("vendors")`, sin modificar ninguna de las dos
- [x] 7.9 Mostrar la frontera de costos como texto de ayuda encima de los ocho componentes
- [x] 7.10 Mostrar el desplegable de compra a corregir solo cuando el tipo es `Correction`
- [x] 7.11 Implementar `purchase-detail.tsx`: ficha de lectura con los ocho componentes, la conversión aplicada, el enlace a la compra relacionada y la acción de anular, sin ninguna acción de editar
- [x] 7.12 Señalar visualmente las compras anuladas en el listado y en el detalle, con su motivo, autor y fecha
- [x] 7.13 Implementar `vehicle-acquisition-cost.tsx`: el costo acumulado con su desglose por componente y la lista de compras del vehículo, nombrado como costo de adquisición
- [x] 7.14 Componer ese bloque en `app/(app)/vehiculos/[code]/page.tsx`, que consulta ambas features y pasa el resultado como prop — `features/vehicles` MUST NOT importar `features/purchases`
- [x] 7.15 Ocultar la acción de anular a quien no sea `admin`, sin que esa ocultación sea la única defensa
- [x] 7.16 Agregar "Compras" al menú del layout `(app)`

## 8. Verificación

- [ ] 8.1 Escribir `tests/integration/purchases.test.ts`: alta válida en USD produce `PUR-0001` con tipo de cambio `1`; alta sin proveedor rechazada sin consumir código; tres altas seguidas producen códigos consecutivos; alta contra vehículo anulado y contra proveedor retirado rechazadas
- [ ] 8.2 Tests de moneda: compra en MXN por `370,000.00` a `18.50` expone `20,000.00 USD`; tipo de cambio `0` o negativo rechazado; tipo de cambio distinto de `1` en una compra en USD rechazado; el equivalente en USD no cambia al consultarla después
- [ ] 8.3 Tests de componentes: compra con solo el precio; compra con los ocho en cero rechazada; suma exacta de ocho importes que romperían en punto flotante; ningún total almacenado en el documento
- [ ] 8.4 Tests de signo y tipo: `Initial` con negativo rechazada; `Adjustment` con negativo aceptada; `Correction` con negativo rechazada; `Adjustment` sin compra base rechazado; `Correction` sin objetivo rechazada; `Correction` señalando una compra vigente rechazada
- [ ] 8.5 Tests de compra inicial única: segunda `Initial` rechazada nombrando la existente; tras anular la `Initial`, una `Correction` se acepta y pasa a ser el costo base; una segunda `Initial` sigue rechazada después de esa corrección
- [ ] 8.6 Test de concurrencia del índice parcial: dos altas `Initial` simultáneas del mismo vehículo dejan exactamente una compra
- [ ] 8.7 Tests de comprobante: referencia duplicada del mismo proveedor rechazada; ` fac-1023 ` colisiona con `FAC-1023`; mismo folio de dos proveedores distintos aceptado; tres compras sin referencia aceptadas; referencia liberada tras anular
- [ ] 8.8 Tests de guardado doble: dos envíos con el mismo token crean una sola compra y el segundo devuelve la misma; dos capturas legítimas con tokens distintos e importes iguales crean dos compras
- [ ] 8.9 Tests de anulación: `capturista` rechazado; `admin` anula con motivo; anulación sin motivo rechazada; doble anulación rechazada; la anulada sale del listado por omisión y sigue consultable; el código no se reutiliza
- [ ] 8.10 Tests de inmutabilidad: no existe operación de edición expuesta; el `code` de una compra no cambia nunca
- [ ] 8.11 Tests de costo acumulado: vehículo sin compras da cero; suma de una compra en USD y otra en MXN; ajuste negativo baja el acumulado; anular una compra lo recalcula sin editar el vehículo; el desglose por componente cuadra con el total
- [ ] 8.12 Tests de anulación de vehículo: con compras vigentes rechazada nombrando las compras; tras anular todas sus compras, aceptada
- [ ] 8.13 Tests de autorización: `lectura` rechazado en toda escritura; escritura sin sesión rechazada; `capturista` registra pero no anula
- [ ] 8.14 Test de integridad de enumeraciones: todos los valores de `sourceType`, `paymentMethod` y `txType` almacenados pertenecen a las listas vigentes
- [ ] 8.15 Correr `pnpm lint`, `pnpm test` y `pnpm build` en limpio
- [x] 8.16 Correr `pnpm spec:validate` y confirmar que el cambio valida en modo estricto
- [ ] 8.17 Recorrido manual de aceptación, que reproduce los seis escenarios de validación de la Fase 2 del plan v2: registrar una compra en USD y comprobar que es `PUR-0001`; registrar una en MXN con tipo de cambio y verificar la conversión; intentar guardar sin un campo obligatorio y comprobar que no se consume código; intentar un negativo con tipo `Initial` y comprobar el rechazo; registrar un `Adjustment` negativo y comprobar que se acepta; verificar que los códigos son consecutivos sin saltos. Después: anular una compra como `admin`, capturar su `Correction`, comprobar el costo acumulado del vehículo en su ficha, intentar anular el vehículo con compras vigentes, y repetir con sesión de capturista para comprobar que no puede anular
