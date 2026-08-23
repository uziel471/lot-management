## Why

La LLC del lote necesita reportes operativos, financieros, contables y de auditoria que consoliden ventas, inventario, compras, reparaciones, gastos y pagos sin depender de hojas externas. Hoy la informacion existe en modulos separados, pero no hay una forma consistente de revisarla por periodo, exportarla o usarla para cierres administrativos.

## What Changes

- Add a new Reports module with a report catalog, period controls, filters, role-aware access, on-screen summaries, detail tables, and CSV/PDF export.
- Add financial reports for profit and loss, sales profitability, inventory value, cost breakdown, accounts payable, payments, expenses, and cash-out activity using active non-voided records.
- Add operational reports for inventory aging, sold units, vehicles without title, vehicles by status, repair/reconditioning workload, and pending balances.
- Add LLC administration reports for tax/export preparation, including sales tax support fields when available, deductible expense categories, vendor/provider payments, and immutable audit trails.
- Preserve source-of-truth rules from existing modules: reports are read-only, do not create financial fields, do not mutate source records, and identify unavailable metrics instead of fabricating values.
- Apply existing shared UI patterns for dense operational pages, filters, tables, loading/error/empty states, responsive behavior, and permissions.

## Capabilities

### New Capabilities

- `reports`: Report catalog, report execution, financial formulas, export behavior, role-aware access, auditability, and report UI requirements for an LLC car-lot business.

### Modified Capabilities

- None.

## Impact

- Affected code areas will likely include `src/app/(app)/reportes`, a new `src/features/reports` feature, shared financial formatting/export utilities, and server-side read models spanning vehicles, sales, purchases, repairs, expenses, payments, and catalogs.
- Reports will rely on existing Mongoose models and domain formulas, including sale snapshots for sold-vehicle profitability and current active source records for unsold inventory value.
- The module may require database indexes for period, status, vehicle, provider, voided, and source-document queries once implementation profiles the actual query shapes.
- No breaking changes are expected; existing transaction modules remain the source of truth.
