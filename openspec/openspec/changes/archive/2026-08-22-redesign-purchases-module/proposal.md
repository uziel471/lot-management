## Why

Compras already carries the highest-risk operational workflow in the lot system: money, exchange rates, immutable records, voiding, corrections, and acquisition cost totals. Its UI needs the same shared operational discipline validated in Vehicles so users can capture, review, filter, and void purchases efficiently without changing the underlying business rules.

## What Changes

- Redesign the Purchases list as a compact operational screen with the standard page header, primary create action, search/filter toolbar, result summary, table, footer total, voided-state treatment, and clear reset behavior aligned to `docs/design-system/UI_GUIDELINES.md`.
- Redesign the purchase creation form as a full-page sectioned workflow for identification, currency, cost components, payment/reference data, and notes, preserving live totals, exchange-rate behavior, submission-token protection, validation, and warning feedback.
- Redesign the purchase detail view as a read-only financial record with scannable sections for identity, vehicle/vendor context, cost components, exchange-rate conversion, related correction data, voiding metadata, and role-aware actions.
- Standardize purchase-specific statuses, destructive confirmation, toasts, validation feedback, loading states, empty states, filtered no-results, and responsive behavior through shared UI patterns.
- Improve the purchase acquisition-cost block rendered in vehicle detail so it follows the same section, table, empty-state, and status treatment as the redesigned module.
- Maintain current purchase domain behavior: no purchase editing or deletion, no database schema change, no new permissions, no changes to code issuance, money conversion, voiding, correction, uniqueness, or server authorization.

## Capabilities

### New Capabilities

- `purchases`: Defines the observable purchase module experience for listing, creating, viewing, voiding, correction context, acquisition-cost display, financial feedback, and responsive behavior.

### Modified Capabilities

- `ui-design-system`: Extends the shared redesign contract from Vehicles to Purchases and clarifies that financial, immutable operational modules must reuse shared patterns instead of inventing module-specific UI.

## Impact

- Affects routes under `src/app/(app)/compras` and the purchase acquisition-cost composition inside `src/app/(app)/vehiculos/[code]/page.tsx`.
- Affects purchase UI components under `src/features/purchases/components`.
- May require backward-compatible adjustments to shared components such as `PageHeader`, `PageToolbar`, `DataTable`, `EmptyState`, `StatusBadge`, `FormSection`, `DetailSection`, `ConfirmDialog`, `SubmitButton`, and `MoneyInput`.
- Must follow `docs/design-system/UI_GUIDELINES.md`.
- Must not change purchase models, persistence, `PUR-####` issuance, Server Actions, domain validation, role permissions, immutable purchase behavior, or financial calculations.
