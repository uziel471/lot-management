## Why

Compras, gastos y reparaciones ya registran obligaciones financieras, pero el sistema todavia no distingue entre costo registrado y dinero efectivamente pagado. El modulo de pagos cierra esa brecha operativa: permite controlar saldos pendientes, pagos parciales, comprobantes, evidencia y anulaciones sin editar los registros de costo originales.

## What Changes

- Nuevo modulo `payments` para registrar pagos salientes contra compras, gastos y reparaciones.
- Cada pago tiene codigo propio, fecha, moneda, tipo de cambio bloqueado, metodo, cuenta o referencia operativa, proveedor opcional, notas, evidencia y autor/auditoria.
- Un pago puede aplicarse a una o varias obligaciones del mismo proveedor operativo cuando aplique, y cada aplicacion define el documento destino, importe aplicado y saldo resultante.
- Se soportan pagos parciales y liquidaciones completas; el sistema calcula saldos pendientes por documento y evita sobrepagar obligaciones activas.
- Los pagos son inmutables: no se editan ni se borran; solo pueden anularse por `admin` con razon, conservando valores historicos y liberando el saldo aplicado.
- La lista y detalle de pagos siguen los patrones operativos compartidos: filtros, totales USD, estados, evidencia, anulado visible, confirmacion destructiva, permisos y responsive.
- Compras, gastos y reparaciones muestran estado de pago, total pagado y saldo pendiente en sus listas, detalles y resumenes de vehiculo donde corresponda.
- Las obligaciones anuladas no pueden recibir pagos nuevos; si se anula una obligacion con pagos activos, el sistema exige anular o reasignar los pagos antes de anular la obligacion.
- Se agrega soporte de catalogo para cuentas/metodos de pago solo si el sistema existente no cubre la necesidad con enumeraciones; la primera version usa enumeraciones de metodo y captura libre controlada de referencia/cuenta.

Fuera de alcance: cobros de ventas, cuentas por cobrar, conciliacion bancaria automatica, importacion de estados de cuenta, archivos binarios de comprobantes y contabilidad de doble partida.

## Capabilities

### New Capabilities

- `payments`: registro, consulta, aplicacion, saldos, evidencia, permisos y anulacion de pagos salientes contra obligaciones operativas.

### Modified Capabilities

- `purchases`: expone estado de pago, total pagado, saldo pendiente y bloqueo de anulacion cuando existan pagos activos.
- `expenses`: expone estado de pago, total pagado, saldo pendiente y bloqueo de anulacion cuando existan pagos activos.
- `repairs`: expone estado de pago, total pagado, saldo pendiente y bloqueo de anulacion cuando existan pagos activos.
- `vehicles`: incorpora saldos pagados y pendientes derivados de compras, gastos y reparaciones en los bloques financieros de la ficha sin convertirlos en costo total unico.

## Impact

- **Base de datos:** nueva coleccion `payments` con indice unico de codigo, indices por fecha/proveedor/estado, indice unico disperso de `submissionToken` y referencias a compras, gastos o reparaciones mediante aplicaciones tipadas.
- **Codigo nuevo:** `src/features/payments/`, `src/lib/db/models/payment.ts`, rutas `src/app/(app)/pagos/` para lista, alta y detalle.
- **Codigo existente que se toca:** permisos, menu del layout `(app)`, queries de compras/gastos/reparaciones para exponer saldos, acciones de anulacion para bloquear documentos con pagos activos y ficha de vehiculo para componer resumenes de pago.
- **UI compartida:** reutiliza patrones de registros financieros inmutables, importes monetarios, filtros, detalles, evidencia y confirmaciones destructivas ya usados por compras/gastos/reparaciones.
- **Dependencias:** ninguna dependencia externa nueva; la aritmetica monetaria sigue pasando por `src/lib/money.ts`.
