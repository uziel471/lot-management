## Why

El lote necesita registrar egresos operativos que no pertenecen a la compra inicial ni a reparaciones, pero que afectan la consulta financiera del negocio y, cuando aplican, el costo operativo de una unidad. Hoy esos gastos quedan fuera del modelo especificado, lo que impide consultarlos, filtrarlos, anularlos con trazabilidad y reflejarlos de forma consistente en el detalle del vehículo.

## What Changes

- Agregar el módulo `Expenses` para capturar, consultar, filtrar y anular gastos operativos.
- Permitir gastos asociados a un vehículo y gastos generales no asociados a una unidad.
- Registrar proveedor opcional, categoría de gasto, fecha, moneda, tipo de cambio bloqueado, importes, método de pago, referencia, notas y evidencia cuando exista soporte de archivos.
- Calcular totales en moneda original y USD usando las mismas reglas financieras compartidas por compras y reparaciones.
- Excluir gastos anulados de totales activos, conservando su historial consultable.
- Mostrar resumen de gastos relacionados en el detalle de vehículo.
- Aplicar `docs/design-system/UI_GUIDELINES.md` y patrones compartidos para listas, filtros, formularios, detalle, estados, confirmaciones destructivas, validación, feedback y responsive.
- No hay cambios incompatibles planeados.

## Capabilities

### New Capabilities

- `expenses`: Define el comportamiento observable del módulo de gastos, incluyendo lista, captura, detalle, anulación, reglas financieras, permisos, evidencia y visibilidad por vehículo.

### Modified Capabilities

- `vehicles`: Agrega la sección de gastos en el detalle de vehículo y define cómo impactan los totales activos asociados a una unidad.
- `ui-design-system`: Declara que el módulo Expenses debe seguir los patrones operativos y financieros compartidos, sin crear un sistema visual propio.

## Impact

- Nuevas pantallas o rutas autenticadas para listar, crear y consultar gastos.
- Nuevas operaciones de lectura/escritura para gastos, con autorización por rol en la capa de datos.
- Nuevos modelos o tablas para gastos, categorías controladas si el código base no tiene una lista existente, importes, anulación, evidencia y auditoría.
- Integración con proveedores existentes cuando el gasto tenga proveedor externo.
- Integración con vehículos para gastos asociados a una unidad y para el resumen financiero del detalle.
- Actualización de navegación autenticada para exponer Expenses según permisos.
- Tests de validación, permisos, reglas financieras, filtros, anulación, totales y UI principal.
