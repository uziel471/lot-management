## Context

See `proposal.md` for motivation. Purchases currently uses App Router pages under `src/app/(app)/compras`, feature components under `src/features/purchases/components`, Server Actions in `src/features/purchases/actions.ts`, read queries in `src/features/purchases/queries.ts`, and domain rules in `domain.ts`, `schema.ts`, and `enums.ts`.

`docs/design-system/UI_GUIDELINES.md` is the UI source of truth. The existing module already has a client-side `PurchaseTable`, a full-page `PurchaseForm`, a read-only `PurchaseDetail`, a `VehicleAcquisitionCost` block, shared `MoneyInput`, live totals, toasts, and a confirmation dialog. The redesign should improve composition, scanability, and shared reuse without changing purchase persistence, validation, permissions, code issuance, voiding, correction, or money calculation behavior.

The previous Vehicles redesign established the operational pattern this change should reuse: standard page headers, compact filters, scannable tables, full-page sectioned forms, readable detail sections, semantic statuses, destructive confirmations, clear empty states, and responsive behavior.

## Goals / Non-Goals

**Goals:**

- Make Purchases the reference implementation for financial, immutable operational records in the shared UI system.
- Keep the current App Router routes, Server Actions, DTOs, domain validation, money helpers, catalog and vehicle dependencies, and permission checks.
- Preserve client-side filtering for current data sizes while making table and filter composition easier to replace with server-side filtering later.
- Move reusable financial or immutable-record presentation behavior into shared components only when it will serve Purchases and future modules such as repairs, expenses, payments, or sales.
- Improve the vehicle acquisition-cost block without introducing a dependency from `features/vehicles` to `features/purchases`.

**Non-Goals:**

- No database schema changes, migrations, new purchase fields, new roles, or new purchase lifecycle rules.
- No edit or delete workflow for purchases.
- No changes to `PUR-####` issuance, double-submit token semantics, money conversion, voiding authorization, correction rules, duplicate-reference handling, or accumulated-cost calculation.
- No redesign of the authenticated app shell unless small page-container or header usage is already supported by shared components.
- No new external UI framework or purchase-specific visual theme.

## Decisions

### Use shared operational composition for all purchase screens

Purchase pages should be composed from `PageHeader`, `PageToolbar`, `DataTable`, `EmptyState`, `FormSection`, `DetailSection`, `StatusBadge`, `ConfirmDialog`, `SubmitButton`, `MoneyInput`, and existing UI primitives. Local wrappers are acceptable when they encode purchase-specific data mapping, but visual structure should come from shared patterns.

Alternative considered: polish `PurchaseTable`, `PurchaseForm`, `PurchaseDetail`, and `VehicleAcquisitionCost` locally. That would be quicker, but it would leave the first financial module with one-off patterns that repairs, expenses, payments, and sales would either copy or contradict.

### Treat actions, queries, schema, and domain functions as compatibility boundaries

The redesign should treat `actions.ts`, `queries.ts`, `schema.ts`, `domain.ts`, `enums.ts`, and DTO shapes as behavior boundaries. UI can improve where validation messages, warnings, pending states, and permission-sensitive actions appear, but the authoritative validation and authorization stay in the existing server and domain layers.

Alternative considered: reshape action results or DTOs to make new components simpler. That increases blast radius and risks turning a UI redesign into a business-behavior change.

### Make the purchases list denser and financially explicit

The list should keep compact filters above the table, a visible reset path, result summary, monospaced purchase codes, semantic active/voided treatment, right-aligned money columns, clear row access, and a footer total that matches the current filter semantics. Filters should cover the existing list behavior first: type and voided inclusion, plus any vehicle/vendor/date filters already provided by the page layer.

Alternative considered: replace the table with cards to make voided and financial details more descriptive. That weakens desktop scanability for a table-heavy accounting workflow. A compact responsive fallback can be considered later if mobile purchase review becomes frequent.

### Keep purchase creation full-page and sectioned

The creation form remains a full-page form. Sections should follow the user's decisions: identification, currency, cost components, payment and references, and notes. Live totals should remain close to the component inputs. `Correction`-specific controls should appear only when relevant. Submit and cancel actions should be stable, pending-safe, and consistent with the Vehicles form pattern.

Alternative considered: split purchase creation into steps. The current workflow benefits from seeing the financial context in one place, especially currency, type, components, and total. A stepper would add navigation state without changing validation complexity.

### Make purchase detail an immutable record view

The detail screen should visually communicate that a purchase is a record, not an editable object. It should use detail sections for identity/context, financial components, totals/conversion, references, correction relationships, notes, and voiding metadata. There should be no edit or delete affordance. Voiding should remain visible only to admins and should use a proper destructive confirmation with a required reason field instead of relying on a browser prompt.

Alternative considered: keep void reason collection inside the current confirmation callback. That is functional but inconsistent with the shared confirmation and validation patterns, and it makes required reason feedback harder to present cleanly.

### Keep vehicle acquisition cost as cross-feature page composition

`VehicleAcquisitionCost` should be redesigned as a purchase-owned component rendered by the vehicle detail page. The page may import both features and pass data down, but `features/vehicles` should not import `features/purchases`. The block should share Purchases' table, status, empty-state, and money treatment while continuing to name the value as acquisition cost, not total vehicle cost.

Alternative considered: move acquisition-cost display into Vehicles. That would blur ownership and create the same cross-feature dependency the original purchase design intentionally avoided.

## Risks / Trade-offs

- Shared component changes could affect Vehicles, Catalogs, Users, or existing Purchases pages -> keep shared APIs backward-compatible and verify current call sites.
- Client-side list filtering may remain limited as purchases grow -> preserve current behavior now, but isolate filter state and table inputs so server-side filtering can replace them later.
- UI cleanup can accidentally hide or expose role-sensitive actions -> source action visibility from existing permission values and verify admin, capturista, and lectura states.
- Financial totals are easy to misrepresent during presentation refactors -> use existing `formatMoney`, `totalOriginal`, `totalUsd`, and DTO totals; do not duplicate financial arithmetic in UI markup.
- A richer void confirmation needs a slightly more capable shared dialog pattern -> implement it generically enough for future destructive flows, while preserving the existing `voidPurchaseAction` contract.

## Migration Plan

1. Read the local Next.js App Router guidance before changing routes or Server/Client Component boundaries.
2. Review `docs/design-system/UI_GUIDELINES.md`, current Purchases pages, current Vehicles redesign patterns, and shared UI component APIs.
3. Update or extend shared UI components in a backward-compatible way where Purchases needs reusable financial, detail, filter, empty-state, or destructive-confirmation behavior.
4. Redesign the Purchases list and table using the shared header, toolbar, table, status, empty-state, reset, and footer-total patterns.
5. Redesign the purchase creation form using shared form sections, visible required fields, field/form validation, live totals, stable save/cancel actions, and pending state.
6. Redesign purchase detail using shared detail sections, immutable-record framing, semantic voided status, correction relationship display, and destructive void confirmation with required reason.
7. Redesign the vehicle acquisition-cost block using shared section/table/empty-state/status patterns while preserving cross-feature composition in the page layer.
8. Run typecheck/lint/tests and manually verify admin, capturista, lectura, empty purchases, filtered no-results, active and voided purchases, valid save, validation failure, MXN conversion, USD exchange-rate lock, correction target, duplicate-submit behavior, void confirmation, and responsive layouts.

Rollback is limited to reverting UI component and page/component changes because no persistence, domain, permission, or data migration is part of this change.
