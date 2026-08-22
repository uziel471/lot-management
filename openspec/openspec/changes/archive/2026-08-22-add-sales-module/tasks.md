## 1. Data Model And Permissions

- [x] 1.1 Add `src/lib/db/models/sale.ts` with sale fields, financial snapshot fields, voiding metadata, timestamps, and indexes for code, active vehicle sale, submission token, sale date, and active filtering
- [x] 1.2 Add `SAL` support to `scripts/seed-counters.ts` and any counter prefix constants used by transactional modules
- [x] 1.3 Add sale permissions for `create`, `void`, and read behavior in `src/lib/auth/permissions.ts`
- [x] 1.4 Add navigation entry and route access for `/ventas` following the existing app shell permission pattern

## 2. Sales Domain

- [x] 2.1 Create `src/features/sales/` with `types.ts`, `schema.ts`, `enums.ts` if needed, `domain.ts`, `queries.ts`, `actions.ts`, and `components/`
- [x] 2.2 Implement sale form schema validation for vehicle, buyer data, sale date, positive USD sale price, references, notes, and submission token
- [x] 2.3 Implement pure domain functions for total cost, profit, ROI, ROI unavailable state, sale snapshot creation, and active/voided status formatting
- [x] 2.4 Add unit tests for profitable sale, loss sale, zero-cost sale, voided-cost exclusion assumptions, and ROI rounding/unavailable behavior

## 3. Cost Composition

- [x] 3.1 Expose or reuse public server-only queries from purchases, repairs, and expenses that return active vehicle USD totals and compact source counts
- [x] 3.2 Implement `getVehicleSaleCostPreview` in SALES to compose acquisition, repair, and vehicle expense summaries without querying source collections directly
- [x] 3.3 Implement batched cost summary support for the sales list so list totals do not perform one full cost query per row when avoidable
- [x] 3.4 Ensure general expenses and voided purchases, repairs, expenses, and sales are excluded from active sale calculations and summaries

## 4. Sales Queries And Actions

- [x] 4.1 Implement sale list query with search, filters for vehicle, buyer, sale date range, profit result, ROI range, voided inclusion, active totals, and responsive table DTOs
- [x] 4.2 Implement sale detail query that returns immutable snapshot values, source cost breakdown, vehicle context, role-aware actions, and voiding metadata
- [x] 4.3 Implement sale candidate vehicle query that excludes voided vehicles and vehicles with active sales
- [x] 4.4 Implement create sale action with role check, schema validation, active vehicle validation, active-sale check, snapshot generation, `SAL` code assignment, submission-token idempotency, and revalidation
- [x] 4.5 Implement void sale action with admin check, destructive reason validation, metadata preservation, active-sale release behavior, and revalidation
- [x] 4.6 Handle duplicate key races for active vehicle sale and submission token with user-safe `ActionResult` errors or idempotent success

## 5. Sales UI

- [x] 5.1 Build `/ventas` sales list page with page header, role-aware create action, filters, summary totals, table, voided treatment, empty states, loading states, and reduced-viewport behavior
- [x] 5.2 Build `/ventas/nuevo` sectioned sale creation form with vehicle selector, buyer data, sale data, references, notes, financial preview, validation feedback, pending state, and cancel behavior
- [x] 5.3 Build `/ventas/[code]` read-only sale detail with identity, vehicle, buyer, sale price, cost breakdown, profit, ROI, references, notes, author/timestamps, source navigation, and role-aware void action
- [x] 5.4 Build admin-only sale void confirmation with required reason and shared destructive feedback behavior
- [x] 5.5 Ensure all SALES screens apply `docs/design-system/UI_GUIDELINES.md` and existing shared components for operational tables, forms, money display, empty states, and feedback

## 6. Vehicle Integration

- [x] 6.1 Add SALES-owned vehicle sale summary component for vehicle detail that shows no-sale, active-sale, and voided-sale states
- [x] 6.2 Compose sale summary into `app/(app)/vehiculos/[code]/page.tsx` from the app layer without importing SALES from `features/vehicles`
- [x] 6.3 Update vehicle annulment validation to reject vehicles with active sales and identify the blocking sale
- [x] 6.4 Ensure sold vehicles remain consultable from inventory, vehicle search, and sale detail navigation

## 7. Integration Tests

- [x] 7.1 Add integration tests for sale creation, required fields, positive price validation, code assignment, active vehicle validation, and role enforcement
- [x] 7.2 Add integration tests for one active sale per vehicle, duplicate submission token behavior, voiding, and replacement sale after voiding
- [x] 7.3 Add integration tests for profit and ROI snapshots across active purchases, repairs, vehicle expenses, voided records, and zero-cost vehicles
- [x] 7.4 Add integration tests for vehicle annulment blocked by active sale and released after sale voiding when no other blockers apply
- [x] 7.5 Add query/UI-level tests for sales list filters, totals, voided inclusion behavior, detail DTOs, and sale candidate vehicle options

## 8. Validation

- [x] 8.1 Run `pnpm exec vitest run` for affected unit and integration tests
- [x] 8.2 Run `pnpm exec tsc --noEmit`
- [x] 8.3 Run `pnpm build`
- [x] 8.4 Run `openspec validate add-sales-module --strict`
