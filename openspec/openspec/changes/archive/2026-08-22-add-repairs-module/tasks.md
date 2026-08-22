## 1. Context and Existing Patterns

- [x] 1.1 Read the local Next.js docs required by `AGENTS.md` before editing routes, server actions, or component boundaries.
- [x] 1.2 Review `docs/design-system/UI_GUIDELINES.md` and identify the shared list, filter, form, detail, status, empty-state, validation, and destructive-confirmation patterns Repairs must reuse.
- [x] 1.3 Review Purchases money handling, code issuance, duplicate submission protection, voiding, vehicle-detail composition, and financial summary patterns.
- [x] 1.4 Review Vehicles detail composition and current acquisition-cost display so repair cost can be added without merging it into acquisition cost.

## 2. Domain and Persistence

- [x] 2.1 Add repair persistence artifacts with generated `REP-####` code, vehicle relationship, optional provider relationship, category, status, dates, financial fields, description, references, notes, author metadata, lifecycle history, completion metadata, cancellation metadata, and voiding metadata.
- [x] 2.2 Add indexes or constraints for repair code uniqueness, vehicle/provider lookup, status/date filtering, and duplicate-submission token protection where the current persistence layer supports them.
- [x] 2.3 Add repair status and category definitions or seeds using centralized labels and stable stored values.
- [x] 2.4 Implement repair domain validation for active vehicle requirement, optional provider handling, required category/opened date/currency, MXN exchange-rate validity, USD exchange-rate lock, non-negative amounts, positive total, completion date constraints, and terminal-state protections.
- [x] 2.5 Implement repair money helpers or projections that reuse existing money utilities for original-currency totals, locked exchange rates, USD totals, and void exclusion.
- [x] 2.6 Implement repair lifecycle helpers for status transitions, completion, cancellation, and voiding with previous/new status, author, timestamp, and optional note or reason.

## 3. Server Behavior and Permissions

- [x] 3.1 Add repair create, list, detail, lifecycle transition, complete, cancel, and void queries/actions or API handlers following existing feature boundaries.
- [x] 3.2 Enforce role permissions server-side so admin/capturista can perform authorized capture and lifecycle actions, lectura can consult only, and only admin can void.
- [x] 3.3 Ensure validation failures do not consume repair codes and duplicate submissions return or preserve the authoritative repair result without creating duplicates.
- [x] 3.4 Ensure completed, cancelled, and voided repairs remain consultable and that voided repairs are excluded from active repair totals.

## 4. Repairs User Interface

- [x] 4.1 Add Repairs navigation entry and route access using existing authenticated shell and role-aware navigation conventions.
- [x] 4.2 Build the repairs list with standard page header, role-aware create action, compact filters for vehicle/provider/status/category/date/currency/voided inclusion, result summary, reset behavior, table, loading state, empty state, filtered no-results state, active USD total, and responsive layout.
- [x] 4.3 Build the full-page sectioned repair creation form for vehicle/provider, repair classification, schedule, financial data, work details, references, and notes.
- [x] 4.4 Add live financial totals to the form with USD exchange rate locked at `1`, MXN exchange-rate validation feedback, non-negative amount feedback, positive-total feedback, pending save state, cancel action, and duplicate-submit-safe behavior.
- [x] 4.5 Build the repair detail view with identity, vehicle, provider/internal marker, category, status, dates, financial breakdown, totals, work description, references, notes, lifecycle history, completion metadata, cancellation metadata, voiding metadata, and role-aware actions.
- [x] 4.6 Build lifecycle action dialogs or forms for status changes, completion, cancellation, and admin-only destructive voiding with required reason validation.
- [x] 4.7 Add semantic status treatments for requested, quoted, in progress, completed, cancelled, and voided repairs using shared status conventions.

## 5. Vehicle Integration

- [x] 5.1 Add repair summary query/projection for vehicle detail that returns active USD repair total, status summary, related repair rows, and voided repair visibility.
- [x] 5.2 Render a Repairs-owned vehicle repair section inside vehicle detail using shared section, table, status, empty-state, and responsive patterns.
- [x] 5.3 Keep acquisition cost and repair cost as separately labeled vehicle financial totals wherever both appear.
- [x] 5.4 Add repair detail navigation from the vehicle repair section while preserving the repair-to-vehicle relationship.

## 6. Shared UI Adjustments

- [x] 6.1 Add or extend shared lifecycle/status, financial summary, detail-section, filter, or destructive-confirmation components only where Repairs and other modules can reuse them.
- [x] 6.2 Verify shared UI changes remain backward-compatible with existing Vehicles, Purchases, Catalogs, and Users screens.
- [x] 6.3 Update design-system documentation or examples if a reusable service-work, lifecycle-history, or repair financial-summary pattern is introduced.

## 7. Verification

- [x] 7.1 Add unit tests for repair domain validation, money conversion, lifecycle transitions, completion constraints, cancellation, voiding, and terminal-state protections.
- [x] 7.2 Add integration or action tests for permissions, code issuance, duplicate submission behavior, active vehicle requirement, MXN/USD behavior, void exclusion, and vehicle repair summaries.
- [x] 7.3 Add UI tests or manual verification for admin, capturista, and lectura roles across list, create, detail, lifecycle actions, completion, cancellation, and voiding.
- [x] 7.4 Verify list empty state, filtered no-results state, filters, reset behavior, active totals, voided inclusion, responsive list behavior, and vehicle detail repair section.
- [x] 7.5 Run project typecheck, lint, relevant automated tests, and OpenSpec validation for `add-repairs-module`.
