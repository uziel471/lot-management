## Why

El sistema ya puede registrar el inventario y acumular costo por adquisicion, reparacion y gasto, pero todavia no registra la venta que convierte esos costos en resultado. El modulo SALES cierra el ciclo operacional costo -> venta -> profit -> ROI para saber que unidades dejaron margen, cuales destruyeron valor y como se comporta el lote por periodo.

## What Changes

- Agrega registro de ventas por vehiculo con codigo secuencial, comprador, fecha, precio de venta en USD, terminos basicos, referencia, notas, autor y estado consultable.
- Restringe la venta a vehiculos activos, no anulados y sin venta activa previa, manteniendo el historico consultable cuando una venta se anula.
- Calcula costo total activo del vehiculo en USD a partir de compras, reparaciones y gastos vehiculares no anulados.
- Calcula profit como precio de venta menos costo total activo, y ROI como profit dividido entre costo total activo cuando el costo es mayor que cero.
- Presenta lista, alta, detalle, anulacion y resumen financiero de ventas usando los patrones operacionales compartidos.
- Incorpora visibilidad de venta, profit y ROI en el detalle del vehiculo vendido sin mover las fuentes de costo a SALES.
- Reserva la anulacion de ventas a `admin`; `admin` y `capturista` pueden crear ventas; `lectura` solo consulta.
- Fuera de alcance: pagos/cobranza, financiamiento, comisiones posteriores a la venta, impuestos de utilidad, integraciones contables y reportes avanzados multi-periodo.

## Capabilities

### New Capabilities

- `sales`: registro de ventas por vehiculo, calculo de costo total, profit, ROI, consulta, anulacion, permisos y experiencia operacional del modulo SALES.

### Modified Capabilities

- `vehicles`: agrega visibilidad del estado de venta, venta relacionada, profit y ROI en el detalle del vehiculo, y evita acciones incompatibles con una venta activa.

## Impact

- Codigo nuevo esperado en `src/features/sales/`, `src/lib/db/models/sale.ts` y rutas bajo `src/app/(app)/ventas/`.
- Codigo existente afectado: navegacion del layout, permisos, seed de contadores, detalle de vehiculo y validaciones de operaciones de vehiculo que deban respetar venta activa.
- Dependencias de dominio: SALES consulta vehiculos, compras, reparaciones y gastos para componer costos; esas features siguen siendo las fuentes de verdad de sus propios registros.
- Datos: nueva coleccion `sales`, contador `SAL`, indices para `code`, vehiculo con venta activa unica, referencia opcional, fecha de venta y token de envio.
- UI: reutiliza patrones compartidos para cabecera, filtros, tabla, formularios seccionados, detalle financiero, estados, feedback y confirmacion destructiva.
