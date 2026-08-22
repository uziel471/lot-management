## Context

See `proposal.md` for motivation. The existing specs establish Vehicles as the core entity and Purchases as the closest financial-record precedent: vehicle-scoped records, USD/MXN money handling, role-aware actions, destructive voiding, immutable historical values, and vehicle-detail cost blocks.

This change adds the first service-work module. Repairs are not acquisition costs and should not be merged into purchase totals, but they do affect vehicle preparation and operational cost visibility. The design must therefore reuse the financial and vehicle-composition patterns from Purchases while giving repairs their own lifecycle and history.

`docs/design-system/UI_GUIDELINES.md` remains the UI source of truth. Repairs should use the shared operational screen system, and reusable repair lifecycle or service-work patterns should become shared conventions instead of local-only UI.

## Goals / Non-Goals

**Goals:**

- Add a repair domain that is vehicle-scoped, financially explicit, lifecycle-aware, and consultable after completion or voiding.
- Keep repair financial totals separate from acquisition cost while making both visible in vehicle detail.
- Use the same money discipline as Purchases: original currency stored, exchange rate locked, USD total calculated consistently, and no floating-point UI arithmetic as the source of truth.
- Keep lifecycle history auditable enough for operational review without introducing a broad audit-log system.
- Preserve role boundaries for admin, capturista, and lectura users in both UI affordances and server-side authorization.
- Reuse shared UI components and patterns for list, filter, form, detail, status, empty, loading, validation, and destructive confirmation states.

**Non-Goals:**

- No combined "total vehicle cost" requirement; acquisition cost and repair cost stay separately labeled.
- No file attachment storage for invoices, photos, or work evidence unless the current app already has a reusable document mechanism.
- No automatic inventory status transition when a repair changes status.
- No external shop scheduling, parts inventory, warranty tracking, accounting export, or payment workflow.
- No hard delete behavior for repair records.

## Decisions

### Model repairs as their own vehicle-scoped financial records

Repairs should have their own collection/table/entity with a generated `REP-####` code, `vehicleId`, optional `providerId`, category, lifecycle status, opened/completed/cancelled/voided metadata, financial fields, work description, references, notes, and author timestamps. A repair belongs to exactly one vehicle and remains linked after completion, cancellation, or voiding.

Alternative considered: store repairs as a subtype of expenses or purchases. That would blur requirements: repairs have service-work lifecycle and vehicle preparation semantics that purchases do not have, while purchases have acquisition-specific correction rules that repairs should not inherit.

### Use named cost components with derived totals

The repair financial breakdown should use named fields or named line-item categories for labor, parts, tax, outside service, and other costs. The saved record should preserve original-currency amounts and exchange rate; totals can be derived through the same money helpers used by the rest of the system.

Alternative considered: a fully dynamic list of cost rows from day one. Dynamic rows are more flexible, but they make reporting and vehicle summaries harder before there is evidence the operation needs arbitrary categories. If the current app already has reusable line items, the implementation can use them while still projecting the required named totals.

### Keep repair lifecycle separate from vehicle status

Repair status transitions should be stored in a repair-specific history with previous status, new status, author, timestamp, and optional note. Completing, cancelling, and voiding are explicit actions with their own metadata. These actions do not automatically change vehicle status; users remain responsible for vehicle status changes until a future requirement defines automation.

Alternative considered: map repair status to vehicle status automatically, for example marking a vehicle "In Reconditioning" when a repair starts. That creates hidden cross-module behavior and depends on local status catalog conventions, so it is intentionally out of scope.

### Treat completed and voided repairs as historical records

Completed repairs should be consultable as final operational records. They should not expose ordinary edit actions that mutate financial values. Voided repairs preserve all original values and are excluded from active totals, matching the immutable-record pattern from Purchases.

Alternative considered: allow editing completed repair notes or costs. That creates exceptions around a financial record and weakens auditability. Later comments could be added as separate append-only notes if the operation needs post-completion context.

### Compose vehicle repair visibility at the page/application layer

Vehicle detail should obtain vehicle data and repair summary data through their respective feature boundaries, then render a Repairs-owned summary component inside the vehicle page. The Vehicles feature should not become responsible for repair business rules or repair money calculations.

Alternative considered: embed repair queries directly inside the Vehicles feature. That is simpler locally but creates cross-feature ownership problems as purchases, repairs, expenses, and sales all want to appear on the vehicle detail.

### Keep UI patterns shared and operational

The repairs list should use compact filters, a scannable table, semantic status treatment, right-aligned money, row actions, totals, resettable filters, and responsive behavior from the shared design system. The creation form should be full-page and sectioned because it captures vehicle, provider, dates, service classification, financial values, and work details. Detail should use read-only sections and lifecycle action dialogs.

Alternative considered: design Repairs as a card board by status. A board may be useful later for shop scheduling, but the current requirement is record capture, financial review, and vehicle history; a dense table is the better default for repeated operations.

## Risks / Trade-offs

- Repair categories and statuses may not match the lot's real vocabulary -> seed conservative defaults and keep labels centralized so they can be adjusted without changing stored historical values.
- Active repair totals can be confused with acquisition cost -> keep separate labels in list, detail, and vehicle summary, and avoid any combined total unless a future spec adds it.
- Lifecycle rules can become too rigid for real work -> enforce only the required terminal-state protections now and keep non-terminal transitions simple unless the operation proves stricter sequencing is needed.
- Adding shared lifecycle UI can affect other modules -> keep shared component APIs additive and verify existing module screens after reuse.
- Financial conversion bugs are high impact -> route all server-side totals through existing money helpers and add focused tests for USD lock, MXN conversion, negative amounts, zero totals, void exclusion, and vehicle summaries.
- Optional provider can weaken reporting -> make internal/unspecified provider display explicit so missing provider data is visible instead of silent.

## Migration Plan

1. Review the local Next.js guidance before changing application routes or Server/Client Component boundaries.
2. Review `docs/design-system/UI_GUIDELINES.md`, existing Purchases implementation, vehicle detail composition, permission helpers, money helpers, and code-sequence utilities.
3. Add repair persistence, code sequencing, lifecycle history, validation schema, domain functions, permissions, and queries/actions or API handlers.
4. Add seed/default definitions for repair statuses and categories if no existing catalog or enum already provides them.
5. Build Repairs list, filters, table, create form, detail page, lifecycle dialogs, completion/cancellation handling, and destructive voiding with shared UI patterns.
6. Add vehicle repair summary queries and render a Repairs-owned summary section inside vehicle detail while keeping repair totals separate from acquisition cost.
7. Add tests for domain validation, authorization, code issuance, duplicate submission protection, lifecycle transitions, completion/voiding metadata, money conversion, void exclusion, and vehicle repair summaries.
8. Run typecheck, lint, relevant unit/integration tests, and manual responsive checks for admin, capturista, lectura, empty state, filtered no-results, active repair, completed repair, cancelled repair, voided repair, USD, MXN, and vehicle detail.

Rollback is reverting the repair routes/components/actions, dropping the repair persistence artifacts if migrations were applied, and removing the vehicle repair summary composition. Existing vehicles and purchases should not require data migration rollback because this change only adds repair-linked data.
