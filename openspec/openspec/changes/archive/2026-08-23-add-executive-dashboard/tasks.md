## 1. Data Contract And Domain

- [x] 1.1 Define dashboard DTO types for period, KPI values, inventory summary, chart series, action items, and unavailable metric notes.
- [x] 1.2 Implement period resolution for This Month, Last Month, Year to Date, Last 12 Months, and Custom Range.
- [x] 1.3 Implement chart grouping helpers for day, week, and month buckets, including zero-value buckets.
- [x] 1.4 Implement dashboard domain helpers for gross margin, averages, inventory aging buckets, elevated-cost detection, and low-margin sale detection.
- [x] 1.5 Add focused unit tests for period boundaries, grouping thresholds, margin division-by-zero behavior, aging buckets, and action item thresholds.

## 2. Server-Side Aggregation

- [x] 2.1 Add `DASHBOARD_READ_ROLES` using existing role-list conventions and authorize dashboard reads with `requireRole()`.
- [x] 2.2 Implement a single dashboard query that normalizes the selected period and returns one aggregate DTO.
- [x] 2.3 Query active non-voided sales by `saleDate` for period revenue, sold units, sold cost, gross profit, margin, average sale price, and time-series buckets using sale snapshot fields.
- [x] 2.4 Query current non-voided unsold vehicles and compute current days in inventory from `dateReceived`.
- [x] 2.5 Compute current inventory value by summing active acquisition, repair, and vehicle-related expense costs for current inventory vehicles without storing duplicate totals.
- [x] 2.6 Query active non-voided general expenses by `expenseDate` and `vehicleId === null` for the selected period.
- [x] 2.7 Build actionable lists for vehicles over 60/90 days, elevated-cost current inventory, and low-margin or loss period sales.
- [x] 2.8 Review query plans and add or document only necessary indexes for dashboard reads.

## 3. Dashboard UI

- [x] 3.1 Replace the dashboard placeholder page with a thin Server Component that calls the dashboard query using search params.
- [x] 3.2 Build period controls for presets and custom range while preserving server-rendered dashboard data.
- [x] 3.3 Build KPI cards with consistent currency, percentage, count, days, unavailable, loading, and error presentation.
- [x] 3.4 Build sales revenue, gross profit, vehicles sold, and inventory aging chart panels using shared visual tokens.
- [x] 3.5 Build current inventory summary with total available, value, average cost, average days, over-30, over-60, and over-90 metrics.
- [x] 3.6 Build the actionable section with links to vehicle detail and sale detail plus a standard empty state.
- [x] 3.7 Add concise metric explanations for current-state inventory, gross margin, average days, and general expenses.
- [x] 3.8 Verify responsive layout so period controls, KPI cards, charts, summary, and action items remain readable without overlap.

## 4. Security And States

- [x] 4.1 Ensure unauthenticated users remain blocked by the existing authenticated route protection.
- [x] 4.2 Ensure roles outside `DASHBOARD_READ_ROLES` cannot receive dashboard aggregate data from direct server invocation.
- [x] 4.3 Add dashboard loading and error states using existing shared UI patterns.
- [x] 4.4 Add empty states for no sales, no current inventory, no general expenses, and no actionable items.

## 5. Verification

- [x] 5.1 Add integration coverage for authorized and unauthorized dashboard reads.
- [x] 5.2 Add integration or query tests for period sales formulas, general expense totals, current inventory summary, and inventory aging.
- [x] 5.3 Run `pnpm exec vitest run` for affected unit and integration tests.
- [x] 5.4 Run `pnpm exec tsc --noEmit`.
- [x] 5.5 Run `pnpm build`.
- [x] 5.6 Run `openspec validate add-executive-dashboard --strict`.
