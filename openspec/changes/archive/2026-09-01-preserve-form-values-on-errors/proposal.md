# Preservar valores de formularios despues de errores

## Why

En `Nueva compra` se detecto que el formulario no conserva correctamente valores capturados cuando el usuario trabaja en USD y ocurre un error de validacion o de servidor. El tipo de cambio en USD debe viajar como `1`, pero al estar el control deshabilitado y al no rehidratar los valores enviados, el formulario puede volver a defaults iniciales o perder lo que el usuario ya capturo.

El mismo patron existe en otros formularios de captura: varios campos usan `defaultValue=""`, inputs sin `defaultValue`, estado local inicial fijo, o componentes monetarios que no reciben el ultimo valor enviado cuando la accion falla. Esto hace que un error obligue al usuario a recapturar datos y aumenta el riesgo de errores operativos en compras, gastos, reparaciones, pagos, ventas, vehiculos, catalogos, usuarios y formularios de cuenta.

## What Changes

- Las Server Actions de formularios de escritura devolveran, en resultados de error, un snapshot serializable de los valores enviados por el usuario.
- Los formularios rehidrataran inputs, selects, textareas, checkboxes, componentes monetarios y estado controlado desde ese snapshot cuando el resultado sea error.
- Los campos con default de negocio, como `currency: "USD"` y `exchangeRate: "1"`, se mantendran consistentes aunque el control visible este deshabilitado.
- Los formularios financieros revisaran especificamente moneda, tipo de cambio, importes en centavos, totales vivos y listas dinamicas como aplicaciones de pago.
- Se agregaran pruebas enfocadas en que errores de validacion preserven datos capturados y no limpien el formulario.

## Out of Scope

- Cambiar reglas de negocio de moneda, conversion o validacion financiera.
- Introducir guardado de borradores persistente en base de datos.
- Cambiar navegacion, permisos o codigos emitidos.
- Redisenar visualmente los formularios.

## Impact

- **Codigo compartido:** `ActionResult`, helpers de resultado, posibles helpers de formulario y `MoneyInput`.
- **Modulos afectados:** compras, gastos, reparaciones, pagos, ventas, vehiculos, catalogos, usuarios y autenticacion/cuenta donde aplique.
- **Pruebas:** unitarias para helpers/acciones y pruebas de componentes para preservacion de valores en formularios clave.
- **Riesgo principal:** mezclar `defaultValue` no controlado con estado controlado. El cambio debe estandarizar un patron por formulario para evitar inconsistencias.
