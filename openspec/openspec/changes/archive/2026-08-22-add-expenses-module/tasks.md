## 1. Discovery And Setup

- [x] 1.1 Read the relevant Next.js guide in `node_modules/next/dist/docs/` before editing app routes or server actions.
- [x] 1.2 Inspect current Purchases and Repairs implementations for model, domain, schema, action, query, UI, and test patterns to reuse.
- [x] 1.3 Decide the initial expense category enum values and labels from the design defaults unless product direction provides a different closed list.
- [x] 1.4 Inspect whether shared evidence or document upload support exists; scope evidence to metadata/link fields if no shared upload support exists.

## 2. Data Model And Permissions

- [x] 2.1 Add expense enums for categories, monetary component keys, payment methods if not reusable, status labels, and UI labels.
- [x] 2.2 Add the Mongoose `Expense` model with `EXP-####` code support, optional `vehicleId`, optional `vendorId`, category, date, currency, Decimal128 exchange rate, monetary components, payment/reference fields, evidence metadata, submission token, notes, auditable fields, timestamps, and indexes.
- [x] 2.3 Add expense permissions to `src/lib/auth/permissions.ts`, including read, write, and admin-only void role lists.
- [x] 2.4 Ensure counters can issue `EXP-####` codes without changing existing code sequences.

## 3. Domain, Validation, And Server Operations

- [x] 3.1 Implement pure expense domain functions for original total, USD total, positive-total validation, active-total accumulation, and vehicle expense summary aggregation.
- [x] 3.2 Add Zod schemas for expense creation and voiding, including currency, exchange-rate, date, category, optional vehicle, optional provider, evidence metadata, monetary components, and submission token validation.
- [x] 3.3 Implement expense queries for list DTOs, detail DTOs by code, active options needed by forms, and vehicle expense summary/detail rows.
- [x] 3.4 Implement `createExpense` with role checks, active category validation, optional active vehicle validation, optional active provider validation, duplicate submission-token protection, `EXP` code emission, and path revalidation.
- [x] 3.5 Implement `voidExpense` with admin role checks, non-empty reason validation, immutable historical values, vehicle path revalidation when applicable, and repeated-void handling.

## 4. Expenses UI

- [x] 4.1 Add authenticated app routes `/gastos`, `/gastos/nuevo`, and `/gastos/[code]`.
- [x] 4.2 Add Expenses navigation entry using the existing application shell pattern and role-aware visibility.
- [x] 4.3 Build the expenses list with shared page anatomy, compact filters, search, result summary, table, active USD total, voided inclusion, reset behavior, empty states, and responsive behavior.
- [x] 4.4 Build the sectioned expense creation form with live financial totals, USD exchange-rate locking, MXN exchange-rate validation, optional vehicle/provider controls, evidence fields, pending submit state, cancel behavior, and validation feedback.
- [x] 4.5 Build the read-only expense detail with identity, category, vehicle/provider context, financial breakdown, payment/reference data, evidence, notes, audit metadata, voided metadata, and role-aware void action.
- [x] 4.6 Build the destructive void confirmation using the shared confirmation and feedback pattern.

## 5. Vehicle Integration

- [x] 5.1 Add a vehicle expense summary component that shows active USD total, category summary, related expenses, zero state, voided treatment, and detail navigation.
- [x] 5.2 Integrate the expense summary into vehicle detail without merging expense cost into acquisition or repair totals.
- [x] 5.3 Ensure general expenses never appear in vehicle expense summaries or vehicle financial totals.
- [x] 5.4 Revalidate vehicle detail when vehicle-related expenses are created or voided.

## 6. Tests And Verification

- [x] 6.1 Add domain tests for expense totals, exchange-rate conversion, positive-total validation, discounts/adjustments, active accumulation, and voided exclusion.
- [x] 6.2 Add schema tests for required fields, optional vehicle/provider behavior, currency/exchange-rate rules, category validation, evidence metadata, and invalid monetary values.
- [x] 6.3 Add integration tests for create, duplicate submission token, optional general expense, inactive/voided vehicle rejection, inactive provider rejection, permissions, voiding, and vehicle summary totals.
- [ ] 6.4 Add UI or component coverage for list filtering, active totals, empty states, create form totals/validation, detail rendering, and role-aware actions where the existing test stack supports it.
- [ ] 6.5 Run `pnpm test` and `pnpm exec tsc --noEmit`.
- [x] 6.6 Run `openspec validate add-expenses-module --strict` and resolve any planning or spec validation failures.
- [x] 6.7 Perform manual acceptance in the browser for `/gastos`, `/gastos/nuevo`, `/gastos/[code]`, admin voiding, lectura visibility, and vehicle detail expense summary.
