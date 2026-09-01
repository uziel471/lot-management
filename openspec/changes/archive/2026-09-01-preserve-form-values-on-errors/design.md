# Diseno tecnico - Preservar valores de formularios despues de errores

## Context

Los formularios de escritura usan `useActionState` y Server Actions que devuelven `ActionResult`. Actualmente `ActionResult` solo puede regresar `fieldErrors`; no hay un contrato comun para devolver los valores enviados cuando falla la validacion.

En `src/features/purchases/components/purchase-form.tsx`, el formulario mantiene `currency`, `exchangeRate`, `txType` y componentes monetarios en estado local, pero muchos campos usan `defaultValue=""` o no tienen default. Si `savePurchaseAction` devuelve error, los errores aparecen, pero el formulario no rehidrata vehiculo, proveedor, fecha, origen, referencias, notas ni algunos campos dinamicos desde el `FormData` enviado. El mismo patron se repite en gastos, reparaciones, pagos, ventas y vehiculos.

`MoneyInput` tambien conserva estado interno inicial basado en `defaultValueCents`, pero no tiene un mecanismo claro para rehidratarse desde un valor enviado despues de error ni para sincronizar valores cuando el padre cambia el snapshot.

## Goals

- Preservar lo capturado cuando una accion de formulario devuelve error.
- Mantener defaults de negocio cuando el usuario no capturo valor, especialmente `currency: "USD"` y `exchangeRate: "1"`.
- Asegurar que los inputs deshabilitados que representen datos requeridos sigan enviando un valor valido.
- Cubrir formularios financieros y no financieros con un patron comun.
- Evitar cambios de reglas de dominio.

## Non-Goals

- No se guardan borradores persistentes.
- No se agrega modo offline.
- No se cambian esquemas monetarios ni conversiones.
- No se redisenan layouts.

## Approach

### 1. Extender el contrato de error de acciones

Agregar una forma generica para que un resultado de error pueda incluir valores enviados:

```ts
type ActionFailure<TValues = Record<string, unknown>> = {
  ok: false
  error: string
  fieldErrors?: Record<string, string[]>
  values?: TValues
}
```

El contrato debe seguir siendo compatible con consumidores existentes que solo leen `error` y `fieldErrors`.

### 2. Serializar `FormData` por formulario

Cada accion de guardado debe capturar un snapshot seguro antes o durante la validacion. No debe incluir archivos binarios ni datos secretos. Para formularios financieros, los valores deben mantenerse como strings o enteros de centavos segun lo espera el componente:

- selects/text/date/url/email: string
- checkboxes: boolean o valor normalizado segun el formulario
- money inputs: entero de centavos
- currency: `"USD"` o `"MXN"`, con fallback a `"USD"`
- exchangeRate: `"1"` para USD y el string capturado para MXN
- arrays dinamicos, como `applications.N.*` en pagos, reconstruidos como arreglo estable

La serializacion debe preservar valores aun cuando el schema Zod falle, porque justamente esos valores son necesarios para rehidratar el formulario.

### 3. Rehidratar estado local y campos no controlados

Cada formulario debe derivar `formValues` con esta prioridad:

1. valores devueltos por error (`state.values`)
2. datos de entrada existentes en modo edicion o defaults de ruta (`entry`, `defaultVehicleId`, etc.)
3. defaults de negocio del formulario

Los controles con estado local (`currency`, `exchangeRate`, `components`, `txType`, `vehicleId`, `applications`) deben inicializarse desde esa fuente y sincronizarse cuando aparece un nuevo error.

Los campos no controlados deben recibir `defaultValue={formValues.campo}`. Si un campo cambia a controlado, hacerlo de forma consistente y no mezclar `value` con `defaultValue` en el mismo control.

### 4. Moneda USD y campos deshabilitados

Los formularios financieros deshabilitan `exchangeRate` cuando `currency === "USD"`. HTML no envia campos deshabilitados, por lo que la implementacion debe garantizar uno de estos patrones:

- no deshabilitar el input y usar `readOnly` para USD; o
- mantener un hidden input con `name="exchangeRate"` y valor `1` cuando el control visible este deshabilitado; o
- remover `name` del control deshabilitado visible y enviar siempre un hidden canonical.

El valor enviado para USD debe ser exactamente `"1"` y debe coincidir con el valor usado por los totales vivos.

### 5. Formularios a revisar

Revisar todos los formularios de escritura con `useActionState` o Server Actions:

- `src/features/purchases/components/purchase-form.tsx`
- `src/features/expenses/components/expense-form.tsx`
- `src/features/repairs/components/repair-form.tsx`
- `src/features/payments/components/payment-form.tsx`
- `src/features/sales/components/sale-form.tsx`
- `src/features/vehicles/components/vehicle-form.tsx`
- `src/features/catalogs/components/catalog-form.tsx`
- `src/features/users/components/create-user-form.tsx`
- `src/features/auth/components/change-password-form.tsx`
- `src/app/(auth)/login/login-form.tsx`
- formularios embebidos en detalles cuando tengan errores recuperables

### 6. Pruebas

Agregar pruebas que simulen errores de validacion y confirmen que los valores siguen visibles. Priorizar:

- Nueva compra con `currency=USD`, `exchangeRate=1`, importes y campos obligatorios faltantes.
- Nueva compra con `currency=MXN`, tipo de cambio invalido y componentes capturados.
- Gasto/reparacion con importes capturados y error en fecha/categoria.
- Pago con aplicaciones seleccionadas y error en suma/aplicacion.
- Vehiculo con campos de texto/select capturados y error de VIN o requerido.

## Risks

- Cambiar todos los formularios a la vez puede tocar bastante superficie. Mitigar con helper compartido y pruebas por modulo.
- `MoneyInput` tiene estado interno; debe evitar quedarse con un valor viejo cuando el snapshot de error cambia.
- Arrays dinamicos de pagos pueden perder orden si se reconstruyen con parsing ad hoc. Usar parser por prefijo/index.
