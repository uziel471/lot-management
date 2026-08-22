## Why

El modulo de vehiculos ya concentra las reglas operativas principales del lote, pero su experiencia debe convertirse en la pantalla de referencia para validar el sistema de diseno compartido. Este cambio mejora la consulta, captura, detalle y acciones de vehiculos para que sean mas escaneables, consistentes y eficientes sin cambiar las reglas de negocio existentes.

## What Changes

- Redisenar el listado de vehiculos como una pantalla operacional compacta con encabezado estandar, busqueda, filtros, tabla, estados vacios y acciones alineadas a `docs/design-system/UI_GUIDELINES.md`.
- Redisenar el formulario de alta y edicion como formulario completo por secciones, con campos obligatorios claros, validacion visible y acciones de guardar/cancelar consistentes.
- Redisenar la vista de detalle para mostrar identidad, ficha, titulo, precio, estatus, historial y acciones del vehiculo en secciones escaneables.
- Estandarizar estados, toasts, confirmaciones destructivas, loading/empty states, permisos visibles y comportamiento responsive dentro del modulo.
- Mantener las reglas actuales de VIN, catalogos, estatus, precio, titulo, anulacion, autorizacion y consulta; no se introducen cambios de base de datos ni nuevos permisos.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `ui-design-system`: Refuerza que el rediseno del modulo de vehiculos debe aplicar el sistema de diseno compartido y servir como validacion de sus patrones operacionales.
- `vehicles`: Cambia la experiencia observable de consulta, captura, edicion, detalle, confirmaciones y feedback del modulo de vehiculos, manteniendo sus reglas de negocio.

## Impact

- Afecta rutas de vehiculos bajo `src/app/(app)/vehiculos`.
- Afecta componentes de vehiculos bajo `src/features/vehicles/components`.
- Puede requerir ajustes acotados en componentes compartidos existentes como `PageHeader`, `PageToolbar`, `DataTable`, `EmptyState`, `StatusBadge`, `FormSection`, `DetailSection`, `ConfirmDialog`, `SubmitButton` y `MoneyInput`.
- No debe cambiar modelos, persistencia, codigos `VEH-####`, validaciones de dominio, permisos, Server Actions ni comportamiento transaccional salvo que sea necesario para exponer los mismos errores y estados con patrones UI consistentes.
