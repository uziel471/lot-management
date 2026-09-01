# Tareas - Preservar valores de formularios despues de errores

## 1. Contrato compartido

- [x] 1.1 Extender `ActionResult` para soportar `values` en errores recuperables sin romper consumidores existentes
- [x] 1.2 Agregar helpers para construir errores con `fieldErrors` y `values`
- [x] 1.3 Agregar helper seguro para serializar `FormData` de formularios simples y documentar cuando usar serializer especifico
- [x] 1.4 Ajustar `MoneyInput` para aceptar valor rehidratado/controlado o remount estable cuando cambie el snapshot de error

## 2. Formularios financieros

- [x] 2.1 Corregir `PurchaseForm` para preservar vehiculo, proveedor, fecha, origen, tipo, correccion, moneda, tipo de cambio, componentes, pago, referencias y notas tras error
- [x] 2.2 Garantizar que compra en USD envie `exchangeRate=1` aunque el control visible no sea editable
- [x] 2.3 Corregir `ExpenseForm` con el mismo patron para categoria, fecha, vehiculo, proveedor, moneda, tipo de cambio, componentes, evidencia, referencias y notas
- [x] 2.4 Corregir `RepairForm` con el mismo patron para vehiculo, proveedor, categoria, fecha, moneda, tipo de cambio, componentes, descripcion, referencias y notas
- [x] 2.5 Corregir `PaymentForm` para preservar fecha, metodo, proveedor, moneda, tipo de cambio, monto, filtros locales relevantes y aplicaciones seleccionadas tras errores
- [x] 2.6 Corregir `SaleForm` para preservar vehiculo, comprador, contacto, fecha, precio, terminos, referencia y notas tras errores

## 3. Otros formularios de escritura

- [x] 3.1 Corregir `VehicleForm` para preservar make/model, identificacion, ficha tecnica, documentos, precio objetivo y notas tras errores
- [x] 3.2 Corregir formularios de catalogos para preservar valores capturados al fallar validacion o duplicados
- [x] 3.3 Corregir formularios de usuarios para preservar nombre, email, rol y switches seguros tras errores sin conservar passwords
- [x] 3.4 Revisar formularios de autenticacion/cuenta; preservar campos seguros y no rehidratar passwords ni secretos
- [x] 3.5 Revisar formularios embebidos en detalles y confirmaciones que tengan errores recuperables

## 4. Pruebas

- [x] 4.1 Agregar pruebas para Nueva compra USD: error en otro campo preserva `currency=USD`, `exchangeRate=1` e importes
  Nota: cubierto con pruebas unitarias de snapshot/normalizacion compartida en `src/lib/form-values.test.ts`; no hay infraestructura de pruebas UI/componentes en el repo.
- [x] 4.2 Agregar pruebas para Nueva compra MXN: error preserva tipo de cambio capturado e importes
  Nota: cubierto con pruebas unitarias de snapshot/normalizacion compartida en `src/lib/form-values.test.ts`.
- [x] 4.3 Agregar pruebas para gastos y reparaciones con importes capturados y errores de campos requeridos
  Nota: cubierto con pruebas unitarias de snapshot/normalizacion compartida en `src/lib/form-values.test.ts`.
- [x] 4.4 Agregar pruebas para pagos con aplicaciones seleccionadas y error de validacion
  Nota: cubierto con parser compartido para grupos indexados y pruebas unitarias en `src/lib/form-values.test.ts`.
- [x] 4.5 Agregar pruebas para vehiculos y catalogos con errores recuperables
  Nota: cubierto con pruebas unitarias de snapshot/checkbox/default seguro en `src/lib/form-values.test.ts`.

## 5. Verificacion

- [x] 5.1 Correr `pnpm exec tsc --noEmit`
- [x] 5.2 Correr `pnpm test`
  Nota: en sandbox falla porque `mongodb-memory-server` no puede abrir puerto (`listen EPERM 0.0.0.0`); con ejecucion aprobada fuera del sandbox pasa completo.
- [x] 5.3 Correr `pnpm build` o el build alterno documentado si Turbopack sigue fallando
- [x] 5.4 Correr `pnpm spec:validate` o `openspec validate --specs` si el comando completo sigue bloqueado
- [x] 5.5 Probar manualmente Nueva compra en USD y MXN confirmando que los errores no limpian el formulario
