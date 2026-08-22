## Context

See `proposal.md` for motivation. The current app is a Next.js application organized by feature folders under `src/features/<domain>`, with App Router pages under `src/app/(app)`. MongoDB persistence uses Mongoose models in `src/lib/db/models`, role checks happen inside queries and actions through `requireRole()`, and business permissions are declared in `src/lib/auth/permissions.ts`.

Purchases and repairs already establish the financial transaction pattern: codes emitted by `nextCode`, original currency plus locked `exchangeRate`, totals calculated in feature `domain.ts` instead of stored, `submissionToken` for duplicate-submit protection, voiding through auditable fields, and vehicle detail revalidation when vehicle-related financial records change. Expenses should reuse that pattern instead of introducing a separate financial model.

## Goals / Non-Goals

**Goals:**

- Add Expenses as a first-class feature with list, create, detail, voiding, financial totals, permissions, tests, and vehicle detail integration.
- Support both general expenses and vehicle-related expenses without forcing a vehicle on every record.
- Keep the persisted record immutable after creation except for voiding metadata.
- Keep totals derived and testable in pure domain functions.
- Reuse shared UI and financial patterns from Purchases and Repairs.

**Non-Goals:**

- No editable expense records after creation; corrections are handled by voiding and creating a replacement expense.
- No allocation or prorating of general expenses across vehicles.
- No new external file-storage provider. Evidence support should store and display metadata/links only unless the project already has upload infrastructure when implementation begins.
- No reporting/dashboard rollup beyond list totals and vehicle detail summaries in this change.
- No changes to existing purchase or repair financial semantics.

## Decisions

### Expense model mirrors existing financial records

Create a Mongoose `Expense` model with `EXP-####` codes, `auditableFields`, timestamps, optional `vehicleId`, optional `vendorId`, category, expense date, currency, Decimal128 `exchangeRate`, monetary components, payment/reference fields, evidence metadata, `submissionToken`, and notes.

Rationale: this matches purchases and repairs, keeps audit and voiding behavior consistent, and supports general expenses by allowing `vehicleId: null`.

Alternatives considered:

- Reuse `Repair` for vehicle expenses: rejected because many expenses are not service work and should not enter the repair lifecycle.
- Store expenses as generic ledger rows now: rejected because the app currently uses domain-specific operational records, and payments/sales are future phases.

### Categories start as code enums

Define expense categories in `src/features/expenses/enums.ts`, with labels for UI and schema validation. Treat them as a closed operational list for this change.

Rationale: existing repair categories are code enums, while catalogs currently cover makes, models, vehicle statuses, and vendors. Adding a full category administration surface would expand scope and require catalog specs beyond the requested module.

Alternatives considered:

- Add expense categories to Catalogos: deferred because it changes catalog administration behavior and permission surface.
- Free-text categories: rejected because specs require consistent filtering and reporting.

### Financial components are explicit fields

Use named numeric fields such as `amount`, `tax`, `fees`, `discount`, and `adjustment`, with domain functions deriving original and USD totals. Discounts and adjustments can reduce the total but the final saved total must remain positive.

Rationale: named fields follow the purchase/repair model and avoid ambiguous positional arrays. Derived totals avoid storing a second source of truth.

Alternatives considered:

- Single total amount only: rejected because tax/fees/discount behavior is part of the spec and helps reconcile receipts.
- Persist `totalOriginal` and `totalUsd`: rejected for the same reason purchases and repairs avoid persisted calculated totals.

### Expenses are immutable except voiding

Expose create and detail workflows, plus admin-only voiding. Do not add edit operations or update permissions.

Rationale: financial records should remain auditable. If a mistake is found, voiding preserves the original capture and creates an explicit replacement.

Alternatives considered:

- Allow edits before reconciliation: rejected because no reconciliation state exists yet and it would add ambiguous partial mutability.

### Permission declarations get an expense resource

Add `expense: ["create", "void"]` to `permissions.ts`, plus `EXPENSE_READ_ROLES`, `EXPENSE_WRITE_ROLES`, and `EXPENSE_VOID_ROLES`. Queries should require read roles, create should require write roles, and void should require admin-only void roles.

Rationale: this follows purchase permissions and keeps authorization next to data access.

Alternatives considered:

- Reuse purchase permissions: rejected because the resource should be independently reviewable and extensible.

### Vehicle integration is a read-side aggregation

Vehicle detail should call an expense query such as `getVehicleExpenseSummary(vehicleId)` and list vehicle-related expenses separately from acquisition and repair costs. General expenses are excluded because they have no vehicle relationship.

Rationale: the vehicle spec requires separate labeled totals. Query-time aggregation keeps vehicle documents unchanged and avoids denormalized financial fields.

Alternatives considered:

- Embed expense totals on `Vehicle`: rejected because totals are derived and voiding would create synchronization risk.
- Include general expense allocation: explicitly out of scope.

### UI follows the established Spanish route pattern

Use Spanish routes and labels consistent with the app: `/gastos`, `/gastos/nuevo`, and `/gastos/[code]`. Keep the internal feature name `expenses` to match specs and architecture references.

Rationale: current user-facing routes are `/vehiculos`, `/compras`, and `/reparaciones`; using `/expenses` would be inconsistent for users.

Alternatives considered:

- English route names: rejected for UX consistency.

## Risks / Trade-offs

- Category enum may be too rigid if operators need custom categories -> Mitigation: keep enum definitions isolated so a later catalog-backed category change can replace validation/options without changing expense record semantics.
- Evidence support may imply file upload expectations -> Mitigation: implement evidence as optional metadata/link fields unless a shared document upload capability already exists.
- Optional vehicle association can make totals easy to misunderstand -> Mitigation: label general expenses clearly and exclude them from vehicle summaries by construction.
- Duplicate references are not specified as unique -> Mitigation: allow repeated references initially, but make reference filtering/search useful; add uniqueness later only with a requirement.
- Large expense lists may become slow if filtering is client-side like current tables -> Mitigation: add database indexes now and move filtering server-side if volume requires it without changing specs.

## Migration Plan

1. Add model, enums, schemas, domain functions, queries, actions, permissions, and tests.
2. Add app routes and UI components for list, create, detail, and voiding.
3. Integrate navigation and vehicle detail summary.
4. Seed or define initial expense category enum values in code.
5. Deploy with additive collections and indexes; no existing data migration is required.

Rollback is limited to removing the new routes from navigation and disabling expense write access. Existing expense documents can remain in MongoDB because no existing collection behavior depends on them.

## Open Questions

- Which exact initial expense categories should be shown to users? A conservative implementation can start with operational defaults such as documentation, transport, cleaning, fuel, storage, marketing, administrative, and other.
- Should evidence accept only URLs/reference text at first, or is there existing document upload support to reuse by implementation time?
