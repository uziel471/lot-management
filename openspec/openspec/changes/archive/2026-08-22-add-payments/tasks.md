# Tareas - Pagos

## 1. Preparacion

- [x] 1.1 Confirmar que compras, gastos y reparaciones estan disponibles y que sus queries exponen totales USD activos para documentos consultables
- [x] 1.2 Declarar permisos en `src/lib/auth/permissions.ts`: recurso `payment` con `create` y `void`; `admin` puede crear/anular, `capturista` puede crear, `lectura` no puede escribir
- [x] 1.3 Exportar `PAYMENT_READ_ROLES`, `PAYMENT_WRITE_ROLES` y `PAYMENT_VOID_ROLES`
- [x] 1.4 Extender `scripts/seed-counters.ts` para cubrir el prefijo `PAY`
- [x] 1.5 Agregar "Pagos" al menu del layout `(app)` con visibilidad consistente con los roles de lectura

## 2. Enumeraciones y dominio

- [x] 2.1 Crear `src/features/payments/enums.ts` con `paymentMethod`, `paymentSourceType`, `paymentStatus` y etiquetas de UI en espanol
- [x] 2.2 Implementar `src/features/payments/domain.ts` con `paymentTotalUsd(amount, currency, exchangeRate)` delegando en `convertToUsd`
- [x] 2.3 Implementar `sumApplications(applications)` y `assertApplicationsMatchPaymentAmount(payment, applications)` usando importes en centavos de la moneda del pago
- [x] 2.4 Implementar `calculatePaidAndPending(sourceTotalUsd, activeApplications)` y `paymentStatus(sourceTotalUsd, activeApplications)`
- [x] 2.5 Implementar validaciones puras para monto positivo, aplicaciones no vacias, source type soportado y rechazo de sobrepago en USD
- [x] 2.6 Escribir `src/features/payments/domain.test.ts` con pagos parciales, liquidacion exacta, sobrepago, pago MXN convertido a USD, anulados excluidos, suma de aplicaciones y desajuste entre monto y aplicaciones

## 3. Modelo de datos

- [x] 3.1 Crear `src/lib/db/models/payment.ts` con `auditableFields`, `code`, `paymentDate`, `providerId`, `currency`, `exchangeRate`, `amount`, `method`, `referenceNumber`, `accountLabel`, `submissionToken`, `evidence`, `applications`, `notes` y campos de anulacion
- [x] 3.2 Guardar `amount` y aplicaciones como enteros de centavos; guardar `exchangeRate` como `Decimal128`
- [x] 3.3 Modelar cada aplicacion con `sourceType`, `sourceId`, `sourceCode`, `appliedAmount`, `appliedUsd`, `sourceTotalUsdSnapshot` y `sourcePendingUsdSnapshot`
- [x] 3.4 Agregar indices: `{ code: 1 }` unico, `{ paymentDate: -1 }`, `{ providerId: 1 }`, `{ "applications.sourceType": 1, "applications.sourceId": 1 }`, `{ voidedAt: 1 }` e indice unico disperso sobre `submissionToken`
- [x] 3.5 MUST NOT agregar campos derivados de pago en compras, gastos o reparaciones

## 4. Esquemas y tipos

- [x] 4.1 Implementar `src/features/payments/schema.ts` con esquema de alta: fecha, moneda, tipo de cambio, monto, metodo y aplicaciones obligatorias; proveedor, referencia, cuenta, evidencia y notas opcionales
- [x] 4.2 Validar tipo de cambio como cadena decimal positiva y forzar `"1"` cuando la moneda es `USD`
- [x] 4.3 Validar fecha de pago como no futura
- [x] 4.4 Validar que cada aplicacion tenga source type soportado, source id presente e importe positivo
- [x] 4.5 Validar que las aplicaciones sumen exactamente el monto capturado en la moneda del pago
- [x] 4.6 Implementar esquema de anulacion con motivo obligatorio y no vacio
- [x] 4.7 Implementar `src/features/payments/types.ts` con DTOs serializables de lista, detalle, source payable option, aplicacion, resumen de saldo y evidencia

## 5. Adaptadores y lecturas

- [x] 5.1 Crear `src/features/payments/source-documents.ts` para normalizar compras, gastos y reparaciones pagables como `{ type, id, code, providerId, vehicleId, totalUsd, isPayable }`
- [x] 5.2 Implementar busqueda de documentos pagables por proveedor, tipo, codigo y vehiculo, excluyendo anulados/cancelados/no pagables
- [x] 5.3 Implementar `src/features/payments/queries.ts` con `import 'server-only'` y `requireRole` en cada funcion
- [x] 5.4 Implementar `listPayments(filters)` con filtros por fecha, proveedor, source type, metodo, moneda, estado e inclusion de anulados
- [x] 5.5 Implementar `getPaymentByCode(code)` con aplicaciones, enlaces a documentos fuente, evidencia, autor y metadatos de anulacion
- [x] 5.6 Implementar `listActivePaymentApplicationsBySource(sourceRefs)` para calcular saldos en compras, gastos, reparaciones y vehiculos
- [x] 5.7 Implementar `getBlockingPaymentsForSources(sourceRefs)` para acciones de anulacion de documentos fuente
- [x] 5.8 Calcular totales de lista, estados y saldos en JavaScript con `domain.ts`, no en pipelines que reimplementen reglas monetarias

## 6. Escrituras

- [x] 6.1 Implementar `src/features/payments/actions.ts` con `'use server'`, siguiendo el orden `requireRole` -> `safeParse` -> reglas de dominio -> lecturas de documentos fuente -> `nextCode` -> escritura -> `revalidatePath`
- [x] 6.2 Implementar `createPayment` con verificacion temprana de `submissionToken`, devolviendo el pago existente si el token ya fue usado
- [x] 6.3 Verificar que todos los documentos fuente existan, sean pagables y no esten anulados/cancelados antes de emitir codigo
- [x] 6.4 Verificar consistencia de proveedor para pagos multi-documento cuando los documentos fuente tengan proveedor
- [x] 6.5 Calcular aplicaciones USD con el tipo de cambio del pago y rechazar sobrepago contra el saldo pendiente USD de cada documento fuente
- [x] 6.6 Guardar pago y aplicaciones de forma atomica; traducir colisiones de `submissionToken` a exito idempotente
- [x] 6.7 Traducir conflictos de concurrencia que producirian sobrepago a mensajes de usuario que nombren el documento fuente afectado
- [x] 6.8 Implementar `voidPayment`: reservada a `admin`, exige motivo, rechaza anular un pago ya anulado, registra `voidedAt`, `voidedBy` y `voidReason`
- [x] 6.9 MUST NOT implementar acciones de edicion ni borrado de pagos

## 7. Integracion con compras, gastos, reparaciones y vehiculos

- [x] 7.1 Extender DTOs y queries de compras para exponer `paymentStatus`, `paidUsd`, `pendingUsd` y aplicaciones activas relacionadas
- [x] 7.2 Bloquear `voidPurchase` cuando existan pagos activos, nombrando los pagos mediante dependencia inyectada
- [x] 7.3 Extender DTOs y queries de gastos para exponer `paymentStatus`, `paidUsd`, `pendingUsd` y aplicaciones activas relacionadas
- [x] 7.4 Bloquear `voidExpense` cuando existan pagos activos, nombrando los pagos mediante dependencia inyectada
- [x] 7.5 Extender DTOs y queries de reparaciones para exponer `paymentStatus`, `paidUsd`, `pendingUsd` y aplicaciones activas relacionadas
- [x] 7.6 Bloquear `voidRepair` y `cancelRepair` cuando existan pagos activos, nombrando los pagos mediante dependencia inyectada
- [x] 7.7 Extender la ficha de vehiculo para mostrar pagado y pendiente por adquisicion, reparaciones y gastos relacionados, manteniendo los totales separados
- [x] 7.8 Bloquear `voidVehicle` cuando documentos financieros relacionados tengan pagos activos, nombrando pagos y documentos fuente

## 8. Pantallas

- [x] 8.1 Crear `src/app/(app)/pagos/page.tsx` con listado, filtros, totales y estados vacios
- [x] 8.2 Crear `src/app/(app)/pagos/nuevo/page.tsx` y `src/app/(app)/pagos/[code]/page.tsx`
- [x] 8.3 Implementar `src/features/payments/components/payment-form.tsx` con secciones de datos de pago, proveedor, moneda/monto, aplicaciones, referencias, evidencia y notas
- [x] 8.4 Generar `submissionToken` al montar el formulario y renovarlo tras un guardado exitoso
- [x] 8.5 Fijar tipo de cambio en `1` y bloquearlo al seleccionar `USD`; restaurarlo editable al seleccionar `MXN`
- [x] 8.6 Implementar selector de documentos pagables con filtros por proveedor, tipo, codigo y vehiculo
- [x] 8.7 Implementar tabla estable de aplicaciones con total fuente, pagado, pendiente, importe aplicado y equivalente USD en vivo
- [x] 8.8 Implementar accion de "liquidar saldo pendiente" para calcular el importe exacto que cubre el saldo USD con el tipo de cambio capturado
- [x] 8.9 Implementar `payment-detail.tsx` con secciones de identidad, monto, aplicaciones, evidencia, referencias, notas y anulacion
- [x] 8.10 Senalar pagos anulados en lista y detalle, con motivo, autor y fecha
- [x] 8.11 Mostrar enlaces a pagos relacionados en detalles de compras, gastos y reparaciones
- [x] 8.12 Mantener lista, formulario y detalle usables en viewport reducido sin romper tablas, botones ni importes

## 9. Verificacion

- [x] 9.1 Escribir tests de dominio de pagos para conversion, saldos, estados, aplicaciones, anulados y sobrepago
- [x] 9.2 Escribir `tests/integration/payments.test.ts`: pago USD valido produce `PAY-0001`; alta invalida no consume codigo; tres altas validas producen codigos consecutivos
- [x] 9.3 Tests de moneda: pago MXN con tipo de cambio expone USD correcto; tipo de cambio cero/negativo rechazado; USD con tipo de cambio distinto de `1` rechazado
- [x] 9.4 Tests de aplicaciones: pago parcial, pago completo, multi-documento, suma de aplicaciones distinta del monto rechazada y source type no soportado rechazado
- [x] 9.5 Tests de sobrepago: intento mayor al pendiente rechazado; dos pagos simultaneos contra el mismo saldo dejan el documento sin sobrepago
- [x] 9.6 Tests de estados fuente: compra/gasto anulado rechazado; reparacion cancelada o anulada rechazada; reparacion activa aceptada
- [x] 9.7 Tests de anulacion de pago: `capturista` rechazado; `admin` anula con motivo; anulacion sin motivo rechazada; doble anulacion rechazada; saldo fuente se recalcula
- [x] 9.8 Tests de bloqueo de anulacion: compras, gastos, reparaciones y vehiculos con pagos activos no pueden anularse; despues de anular pagos, siguen las reglas existentes
- [x] 9.9 Tests de autorizacion: `lectura` rechazado en toda escritura; escritura sin sesion rechazada; `capturista` registra pero no anula
- [ ] 9.10 Tests de UI o componentes criticos para selector de documentos, suma de aplicaciones, bloqueo de submit y estados responsive cuando exista harness disponible
- [x] 9.11 Correr `pnpm lint`, `pnpm test` y `pnpm build` en limpio
- [x] 9.12 Correr `pnpm spec:validate` y confirmar que el cambio valida en modo estricto
- [~] 9.13 Recorrido manual de aceptacion delegado a Uziel: registrar pago parcial a compra, liquidar saldo, intentar sobrepago, anular pago, verificar saldo liberado, bloquear anulacion de documento con pago activo y repetir con roles `capturista` y `lectura`
