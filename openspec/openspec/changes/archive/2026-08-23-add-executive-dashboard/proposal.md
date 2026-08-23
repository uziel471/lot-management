## Why

El sistema ya registra inventario, compras, reparaciones, gastos y ventas, pero el dueño no tiene una vista consolidada para entender rapidamente el estado financiero y operativo del lote. Este cambio agrega un Dashboard Ejecutivo que resume indicadores existentes sin duplicar informacion financiera ni introducir un modulo general de reportes.

## What Changes

- Agrega una pantalla de Dashboard Ejecutivo para consultar KPIs del negocio por periodo seleccionado.
- Presenta indicadores de inventario actual, ventas del periodo, gross profit, margen bruto, precio promedio de venta, dias promedio en inventario y gastos generales del periodo.
- Agrega resumen de inventario actual con valor total, costo promedio, aging y conteos mayores a 30, 60 y 90 dias.
- Agrega graficas de ventas, gross profit, unidades vendidas e inventory aging, agrupadas por dia, semana o mes segun el rango seleccionado.
- Agrega una seccion accionable derivada de consultas del dashboard para vehiculos envejecidos, costos elevados y ventas con margen bajo o perdida.
- Define claramente que metricas dependen del periodo y cuales representan estado actual.
- Reutiliza los modelos y reglas existentes de vehiculos, compras, reparaciones, gastos y ventas; no agrega campos para completar metricas faltantes.
- Mantiene la UI dentro de los patrones existentes de `docs/design-system/UI_GUIDELINES.md` y componentes shadcn/ui ya disponibles.
- No incluye modulo general de Reports, exportaciones, P&L, AR/AP, reportes fiscales ni reportes contables avanzados.

## Capabilities

### New Capabilities

- `executive-dashboard`: Vista ejecutiva del negocio con KPIs, resumen de inventario, graficas, periodo seleccionable, estados de UI, permisos y reglas de calculo basadas en datos existentes.

### Modified Capabilities

- None.

## Impact

- Affected routes: `src/app/(app)/dashboard/page.tsx`.
- Affected feature area: new `src/features/dashboard` query/domain/types/components surface.
- Data sources reused: `Vehicle`, `Sale`, `Purchase`, `Repair`, `Expense`, `VehicleStatus`, existing cost domains and existing role checks.
- UI sources reused: shared page, table, card, empty, status, toolbar and shadcn/ui primitives consistent with `docs/design-system/UI_GUIDELINES.md`.
- Security impact: dashboard reads financial data and must be guarded server-side by existing role-based DAL patterns.
- Performance impact: dashboard needs server-side/database aggregation and a single aggregated read response rather than client-side collection loading or many independent page requests.
