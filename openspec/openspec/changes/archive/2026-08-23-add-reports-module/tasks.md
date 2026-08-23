## 1. Foundation

- [x] 1.1 Read the relevant Next.js 16 App Router documentation from `node_modules/next/dist/docs/` before editing app routes.
- [x] 1.2 Create `src/features/reports` with `domain.ts`, `registry.ts`, `queries.ts`, `types.ts`, and report builder modules.
- [x] 1.3 Define report ids, categories, role constants, availability states, filter types, report DTOs, column descriptors, summary descriptors, row action descriptors, and export descriptors.
- [x] 1.4 Implement shared period resolution, inclusive date range validation, current-state date-basis handling, and report-specific filter validation.
- [x] 1.5 Add a report registry covering financial, inventory, sales, payables/payments, expenses, operations, tax preparation, and audit categories.

## 2. Data Adapters and Formulas

- [x] 2.1 Audit existing vehicle, sale, purchase, repair, expense, and payment domain helpers to identify reusable formula functions.
- [x] 2.2 Implement report adapters that select only fields needed for report calculations while preserving existing active/non-voided semantics.
- [x] 2.3 Implement sold-vehicle profitability calculations from sale snapshot fields.
- [x] 2.4 Implement current unsold inventory cost calculations from active purchase, repair, and vehicle-related expense sources.
- [x] 2.5 Implement payable balance calculations from active source obligations minus active non-voided payment applications.
- [x] 2.6 Implement availability notes for missing or uncaptured fields such as sales tax, jurisdiction, exemption status, provider, category, and due date.

## 3. Report Builders

- [x] 3.1 Implement financial reports for profit and loss, sales profitability, gross margin by vehicle, inventory value, cost breakdown by vehicle, and cash activity.
- [x] 3.2 Implement inventory reports for current inventory, inventory aging, vehicles by status, vehicles without title in hand, inventory without list price, and missing identifiers.
- [x] 3.3 Implement payables and payments reports for accounts payable, payment history, unpaid obligations, partially paid obligations, paid obligations, provider balances, and payment applications.
- [x] 3.4 Implement expense reports for general expenses, vehicle-related expenses, expenses by category, expenses by provider, and deduction preparation.
- [x] 3.5 Implement LLC administration reports for sales register, sales tax preparation support, vendor payments, and administrative exceptions.
- [x] 3.6 Ensure each report returns normalized metadata, selected filters, summaries, columns, rows, row actions, formulas, and availability notes.

## 4. Server Access and Routes

- [x] 4.1 Implement authenticated `listReportCatalog()`, `getReportResult(reportId, filters)`, and export read functions with server-side role checks.
- [x] 4.2 Add `/reportes` catalog route with authorized access and unavailable-report handling.
- [x] 4.3 Add `/reportes/[reportId]` route that resolves search params, runs the report server-side, and renders the report result.
- [x] 4.4 Add Reports navigation for authorized roles in the existing authenticated shell pattern.
- [x] 4.5 Ensure unauthorized direct report and export access returns no report rows, totals, or files.

## 5. User Interface

- [x] 5.1 Build report catalog components grouped by category with report purpose, filters, export support, generated timestamp where applicable, and availability status.
- [x] 5.2 Build report filter controls that show only filters relevant to the selected report and preserve valid filter state in search params.
- [x] 5.3 Build report summary, table, formula note, availability note, and row drill-down components using existing shared UI patterns.
- [x] 5.4 Build loading, empty, filtered-empty, unavailable, and error states with stable layout dimensions.
- [x] 5.5 Verify report pages remain usable on desktop and narrow viewports without overlapping controls or losing critical identifiers/actions.

## 6. Exports

- [x] 6.1 Define CSV export formatting from normalized report DTOs with stable headers, filter metadata, generated timestamp, totals, and availability notes.
- [x] 6.2 Choose a server-compatible PDF generation approach that fits the current Next.js runtime and project dependency constraints.
- [x] 6.3 Define and enforce export row limits based on expected dataset size and hosting constraints.
- [x] 6.4 Implement print-ready PDF export from normalized report DTOs with title, period, filters, summaries, rows, page metadata, and generated timestamp.
- [x] 6.5 Ensure export totals and rows match the same filtered report data shown on screen, except where documented export limits apply.

## 7. Testing and Verification

- [x] 7.1 Add unit tests for period resolution, filter validation, formula helpers, availability notes, and report registry metadata.
- [x] 7.2 Add report builder tests for active/non-voided filtering, sale snapshot profitability, current inventory value, payable balances, expense grouping, and unavailable tax fields.
- [x] 7.3 Add authorization tests or coverage for report reads and exports for `admin`, `lectura`, `capturista`, and unauthenticated access.
- [x] 7.4 Add UI-level verification for catalog rendering, report filtering, drill-down links, empty/error states, and responsive layout.
- [x] 7.5 Run `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`, and `pnpm spec:validate`.
- [x] 7.6 Document any indexes identified by report query profiling before adding them.
