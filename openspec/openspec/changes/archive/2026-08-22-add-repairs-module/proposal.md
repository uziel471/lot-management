## Why

El lote necesita controlar reparaciones y acondicionamientos por vehículo con costos, proveedores, fechas, estatus y evidencia operativa. Hoy el vehículo ya concentra compras, gastos y ventas, pero falta un módulo dedicado para registrar trabajos de reparación que afectan preparación, costo operativo y seguimiento antes de venta.

## What Changes

- Add a Repairs module for listing, filtering, creating, consulting, updating status, completing, and voiding vehicle repair records.
- Support repair financial data in USD/MXN with locked USD exchange-rate behavior, MXN exchange-rate validation, line items, labor/parts/tax/other breakdowns, and USD totals.
- Support repair lifecycle states from requested/quoted/in progress/completed/cancelled/voided with role-aware actions and immutable completion/voiding metadata.
- Add repair visibility to vehicle detail, including active repair totals, repair history, status summaries, and exclusion of voided repairs from active totals.
- Apply `docs/design-system/UI_GUIDELINES.md` and shared operational patterns for lists, filters, forms, details, statuses, financial totals, validation, empty states, destructive confirmations, and responsive behavior.
- No breaking changes are intended.

## Capabilities

### New Capabilities

- `repairs`: Covers repair registration, list consultation, filtering, detail, lifecycle status changes, completion, voiding, financial totals, provider/vehicle relationships, notes, and UI behavior for the Repairs module.

### Modified Capabilities

- `vehicles`: Adds vehicle-detail repair visibility, active repair totals, repair history, and repair status summary behavior.
- `ui-design-system`: Extends shared operational UI expectations to include repair-specific financial, lifecycle, and service-work patterns when they are reusable.

## Impact

- Adds repair domain models, validation, persistence, server actions or APIs, permission checks, and UI routes/components for the Repairs module.
- Integrates repairs into vehicle detail and any vehicle cost summary that must distinguish acquisition cost from repair cost.
- Reuses existing catalog/provider, vehicle, user, currency, status, form, table, confirmation, and feedback infrastructure where available.
- May require seed data or enum definitions for repair statuses and repair cost categories if the current codebase does not already provide them.
