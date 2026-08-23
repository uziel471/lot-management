## Context

See `proposal.md` for motivation and `specs/reports/spec.md` for behavior.

The app is a Next.js App Router system with thin authenticated routes under `src/app/(app)`, feature-owned domain/query files under `src/features/*`, Mongoose models under `src/lib/db/models`, role checks through existing auth helpers, and shared operational UI guidance in `docs/design-system/UI_GUIDELINES.md`.

Relevant existing sources:

- `Vehicle`: inventory identity, title fields, status, date received, list price, voiding state, and current vehicle metadata.
- `Sale`: sold vehicle records with frozen USD financial snapshots for sale price, acquisition cost, repair cost, vehicle expense cost, total cost, profit, and ROI inputs.
- `Purchase`, `Repair`, and `Expense`: active operational obligations and cost components that feed current vehicle cost, payables, and expenses.
- `Payment`: outbound payment records and applications to purchases, repairs, and expenses.
- Existing feature domain helpers already define financial totals, payment balances, active/non-voided behavior, and source-document concepts.
- The Executive Dashboard already introduced a server-side aggregate feature pattern for cross-module financial reads.

Important constraints:

- Reports are read-only. They must not mutate source documents or create alternate financial truth.
- Sold vehicle profitability must use sale snapshots because sales preserve historical financial values.
- Unsold current inventory value must be recomputed from active current purchase, repair, and vehicle-related expense sources.
- General expenses are separate from vehicle-related expenses to prevent double counting.
- Historical inventory reconstruction is not supported by the current data model and must be labeled unavailable or current-state.
- Tax reports can only expose preparation data from fields the system actually captures; they are not tax filing logic.

## Goals / Non-Goals

**Goals:**

- Add a report framework that can support a catalog of report definitions without scattering cross-module aggregation across pages.
- Keep formulas traceable, testable, and shared with existing domain semantics.
- Support interactive report viewing and exports from the same server-side result model.
- Keep report pages dense, operational, and consistent with current Spanish management UI patterns.
- Make unavailable or partial tax/accounting fields explicit instead of inventing business facts.
- Give implementation a phased path so the highest-value reports can ship first without blocking the whole catalog.

**Non-Goals:**

- Do not add accounting ledgers, journal entries, bank reconciliation, payroll, depreciation schedules, or formal tax filing workflows.
- Do not add new sales tax, jurisdiction, exemption, due-date, or deductible-classification fields as part of this change.
- Do not redesign the authenticated shell beyond adding Reports navigation where the current shell pattern supports it.
- Do not replace source module list/detail pages with reports.
- Do not introduce a new permissions model.

## Decisions

### 1. Create a read-only `features/reports` feature

Add a feature with:

- `domain.ts` for report ids, period resolution, formulas, availability states, report metadata, CSV/PDF-safe formatting decisions, and shared filter validation.
- `registry.ts` for the report catalog and per-report capability metadata.
- `queries.ts` for authenticated report execution and export data reads.
- `types.ts` for report DTOs, filters, columns, summaries, rows, export descriptors, and availability notes.
- `components/*` for catalog, filters, summary strips, report tables, export controls, and formula/availability hints.

Rationale: reports cross almost every operational module. A dedicated read-only feature keeps source modules independent and avoids making individual pages coordinate collection-sized data.

Alternative considered: add report functions to each source feature. Rejected because exports, filters, permissions, and cross-module totals would become inconsistent across modules.

### 2. Use a report registry as the contract between UI and queries

Each report definition should describe:

- id, category, title, description, default sort, supported filters, supported exports, and required role group.
- date field basis, such as `saleDate`, `paymentDate`, `expenseDate`, or `current-state`.
- columns and summary metrics that can be rendered generically.
- availability notes for partial reports, especially tax preparation fields.

Rationale: a registry lets the catalog, route params, filter UI, export controls, and server validation use the same definitions.

Alternative considered: hard-code every page separately. Rejected because the first release already includes many reports with similar controls and export behavior.

### 3. Execute reports on the server and return typed report DTOs

Expose server reads such as:

- `listReportCatalog()`
- `getReportResult(reportId, filters)`
- `getReportExport(reportId, filters, format)`

The route should pass search params into the server read. The client can manage form interactions, but totals and grouped data must come back precomputed.

Rationale: authorization, formula consistency, and performance are report concerns that belong server-side. This also aligns with the dashboard performance contract.

Alternative considered: fetch operational collections and aggregate in client components. Rejected because it leaks financial data, duplicates formulas, and will not scale.

### 4. Split implementation into report builders

Use internal builder modules by report family:

- `financial-reports.ts`: profit and loss, sales profitability, gross margin, inventory value, cost breakdown, cash activity.
- `inventory-reports.ts`: current inventory, aging, status, title exceptions, missing identifiers.
- `payables-reports.ts`: accounts payable, unpaid/partial/paid obligations, provider balances, payment applications.
- `expense-reports.ts`: general expenses, vehicle expenses, category/provider summaries, deduction preparation.
- `admin-reports.ts`: sales register, sales tax preparation, vendor payments, administrative exceptions.

Each builder returns a normalized report result: metadata, filters, summaries, columns, rows, row actions, and availability notes.

Rationale: the registry stays declarative while builders keep domain-specific aggregation readable and testable.

Alternative considered: one large `queries.ts`. Rejected because the module would become difficult to test and change.

### 5. Reuse source domain formulas and define report-only adapters

Reports should reuse existing domain helpers for:

- active/non-voided filtering semantics.
- purchase, repair, expense, and payment totals.
- paid and pending balance calculations.
- sale profit, margin, and ROI semantics.

Where existing helpers are UI-specific or fetch too much data, create report adapters that preserve the same formulas but select only report-required fields.

Rationale: reports must match source modules but also need efficient projections.

Alternative considered: recompute formulas from scratch inside report builders. Rejected because small formula drift would make reports untrustworthy.

### 6. Use sale snapshots for sold reports and current sources for current inventory

Sold-period reports use `Sale` snapshot fields. Current inventory reports use current active source records for unsold vehicles.

Rationale: this matches existing Sales and Dashboard specs. It prevents later operational edits from silently changing historical sale profitability while still showing current cost for unsold inventory.

Alternative considered: recompute all vehicle costs from current source records. Rejected for sold reports because it conflicts with immutable sale results.

### 7. Treat tax reports as preparation support, not tax filing

Tax-related reports should expose:

- sales register data.
- expense and provider payment support.
- unavailable markers for uncaptured fields such as sales tax collected, taxable jurisdiction, exemptions, or filing treatment.
- generated timestamp, filters, and source links for accountant review.

Rationale: the current system does not contain enough regulatory fields to calculate formal tax filings. The report should be useful for preparation without overstating compliance.

Alternative considered: add tax fields now. Rejected because that changes sale/expense data capture and needs its own business decisions.

### 8. Implement exports from report DTOs

CSV and PDF exports should consume the same normalized result used by the page, with export-specific formatting:

- CSV uses stable machine-readable headers and raw-ish formatted values suitable for spreadsheets.
- PDF uses print-friendly title, period, filters, summaries, table rows, generated timestamp, and availability notes.
- Large exports may bypass the interactive page size but must enforce a documented maximum.

Rationale: one report execution path keeps exported totals identical to screen totals.

Alternative considered: browser-only export of visible DOM. Rejected because it would miss full filtered results and duplicate formatting logic.

### 9. Permissions

Use existing roles and source module read behavior. Define:

- `REPORT_READ_ROLES = ["admin", "lectura"]`
- `REPORT_EXPORT_ROLES = ["admin", "lectura"]`

Exclude `capturista` from financial report access unless an existing role policy later changes. Server-side report and export reads remain authoritative.

Rationale: reports are owner/accountant/administrator reads. The existing read-only `lectura` role is the natural non-writing role.

Alternative considered: admin-only reports. Rejected because LLC reporting commonly needs accountant/advisor read access without mutation rights.

### 10. UI composition

Routes:

- `/reportes`: catalog grouped by category, with availability and quick actions.
- `/reportes/[reportId]`: report runner with header, filter bar, summary, table, formula notes, source links, and export controls.

The UI should use existing shared components and shadcn/base-nova primitives:

- `PageHeader` with concise Spanish labels.
- compact filter toolbar above results.
- summary strip for totals.
- dense report table with right-aligned money and numeric values.
- `font-mono` for codes.
- standard loading, empty, and error states.
- no marketing hero, decorative theme, or report-specific visual system.

Rationale: reports are operational screens. Dense scanability matters more than presentation flourishes.

Alternative considered: separate dashboard-style cards for every report. Rejected because many report rows need comparison, filtering, and export.

## Risks / Trade-offs

- [Risk] Cross-module report queries can become expensive as data grows. -> Mitigation: select only needed fields, aggregate on the server, add indexes based on actual report query shapes, and cap exports.
- [Risk] Formulas may drift from source modules. -> Mitigation: share domain helpers where possible and add tests for report formulas against source module examples.
- [Risk] Tax preparation reports may be mistaken for filed tax calculations. -> Mitigation: label unavailable regulatory fields and include report disclaimers/availability notes.
- [Risk] A complete report catalog is large for one implementation pass. -> Mitigation: implement the registry and core framework first, then ship report families in priority order while keeping unavailable reports visible when useful.
- [Risk] PDF generation can add dependency and runtime complexity. -> Mitigation: prefer a minimal server-compatible PDF approach already acceptable to the stack; if none exists, implement CSV first and gate PDF behind a focused task.
- [Risk] Existing source models may not expose provider, due date, tax, or category data consistently. -> Mitigation: mark missing fields as unavailable or uncategorized and avoid schema changes in this proposal.

## Migration Plan

1. Add the Reports feature and routes without changing source document schemas.
2. Add Reports navigation for authorized roles in the existing authenticated shell.
3. Implement report registry, filter validation, and catalog availability.
4. Implement report builders and tests in family order: financial, inventory, payables/payments, expenses, administration/tax preparation.
5. Add CSV export after screen DTOs are stable.
6. Add print-ready PDF export using the same DTO path.
7. Profile report queries and add indexes only where needed.

Rollback is low-risk because the module is read-only: remove the Reports navigation entry and route access while leaving source records untouched.

## Open Questions

- Exact PDF generation library can be selected during implementation after checking current project constraints and bundle/server compatibility.
- Export row limits should be set during implementation based on expected dataset size and hosting constraints.
