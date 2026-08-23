## Context

See `proposal.md` for motivation. The current app is a Next.js App Router system with thin routes under `src/app/(app)`, feature-owned DAL files in `src/features/*/queries.ts`, server actions for writes, Mongoose models in `src/lib/db/models`, and role checks through `requireRole()`.

Relevant existing sources:

- `Vehicle`: current vehicle identity, `dateReceived`, current `statusId`, `voidedAt`, and current listing data.
- `Sale`: active sale records with frozen financial snapshots: `salePriceUsd`, `acquisitionCostUsd`, `repairCostUsd`, `vehicleExpenseCostUsd`, `totalCostUsd`, `profitUsd`, and counts.
- `Purchase`: acquisition cost components: `purchasePrice`, `auctionFees`, `acquisitionTransportCost`, `titleDocFees`, `purchaseTax`, `importDuties`, `customsBrokerFees`, and `otherAcquisitionCosts`.
- `Repair`: repair/reconditioning cost components: `laborCost`, `partsCost`, `taxCost`, `outsideServiceCost`, and `otherCost`.
- `Expense`: general and vehicle-related expense components: `amount`, `tax`, `fees`, `discount`, and `adjustment`.
- Existing domain helpers already calculate USD totals and exclude voided purchase, repair, and expense records for vehicle cost previews.
- `src/app/(app)/dashboard/page.tsx` currently only confirms the session and displays basic account text.
- UI work is governed by `docs/design-system/UI_GUIDELINES.md`; existing shared components include page headers, tables, cards, empty states, status badges, dialogs, and shadcn/ui primitives.

Important data constraints:

- Inventory can be calculated only as current state. There is no historical inventory snapshot, sold-at inventory snapshot, or status-effective inventory reconstruction.
- Sold vehicle cost should use the sale snapshot, not recompute historical costs from mutable source records after the sale.
- Current inventory value should be recomputed from active source records because unsold vehicles do not have a stored total-cost snapshot.
- General expenses can be separated reliably by `Expense.vehicleId === null`.

## Goals / Non-Goals

**Goals:**

- Add a dashboard read model that returns all dashboard data in one server-side response for a selected period.
- Keep financial formulas traceable to existing model fields and domain helpers.
- Avoid loading full collections in Client Components for local aggregation.
- Preserve existing app architecture: `app/` routes stay thin; domain math and DTO shaping live under `features/dashboard`.
- Make unavailable metrics explicit when the data model cannot support them.
- Use existing shadcn/ui and shared operational patterns without creating a dashboard-specific visual system.

**Non-Goals:**

- Do not add a general Reports module.
- Do not add exports, accounting reports, P&L, AR/AP, tax reports, or detailed purchase/sale reports.
- Do not add new financial source fields only to make a dashboard metric possible.
- Do not reconstruct historical inventory values from current records.
- Do not introduce a new permissions model.

## Decisions

### 1. Add `features/dashboard` as a read-only feature

Create a new dashboard feature with:

- `src/features/dashboard/domain.ts` for period resolution, grouping rules, aging buckets, margin math, and availability helpers.
- `src/features/dashboard/queries.ts` for the single authenticated dashboard read.
- `src/features/dashboard/types.ts` for DTOs.
- `src/features/dashboard/components/*` for dashboard-specific composition using shared primitives.

Rationale: the dashboard crosses vehicles, sales, purchases, repairs, and expenses. Putting the aggregate logic in one feature avoids forcing any source module to depend on the dashboard and keeps `app/(app)/dashboard/page.tsx` thin.

Alternative considered: extend `sales/queries.ts`, `vehicles/queries.ts`, and `expenses/queries.ts` with dashboard-specific queries. Rejected because the page would become a coordinator of multiple modules and would invite multiple requests or collection-sized DTOs.

### 2. Use a single server-side dashboard query

Expose one read function such as `getExecutiveDashboard(periodInput)` returning:

- `period`: normalized preset, start date, end date, and chart grouping.
- `kpis`: all primary metric values and availability notes.
- `inventory`: current inventory summary and aging distribution.
- `charts`: sales revenue series, gross profit series, sold unit series, and current aging buckets.
- `actionItems`: aged vehicles, elevated-cost vehicles, and low-margin/loss sales.

The route page should call this server function directly from the Server Component. Custom range changes can be represented by search params so the server component re-renders with the selected range.

Rationale: one response keeps authorization, period resolution, formula consistency, and performance decisions centralized.

Alternative considered: separate API endpoints per card/chart. Rejected because it multiplies authorization and date handling paths for a dashboard that is naturally consumed as one aggregate.

### 3. Use sale snapshots for sold-period financial KPIs

Period sales metrics use active non-voided `Sale` documents with `saleDate` inside the selected range:

- `vehiclesSold = count(sales)`
- `salesRevenueUsd = sum(salePriceUsd)`
- `soldVehicleCostUsd = sum(totalCostUsd)`
- `grossProfitUsd = sum(profitUsd)`
- `averageGrossMargin = grossProfitUsd / salesRevenueUsd` when revenue is greater than zero; otherwise unavailable.
- `averageSalePriceUsd = salesRevenueUsd / vehiclesSold` when vehicles sold is greater than zero; otherwise unavailable.

Rationale: `Sale` already stores the financial snapshot captured when the sale was created. That is the correct source for sold-period profitability because later voids or additions to purchases, repairs, or expenses should not silently rewrite a historical sale result.

Alternative considered: recompute sale costs from current purchase, repair, and expense records. Rejected because it can change historical profit after the sale and conflicts with the Sales module snapshot model.

### 4. Recompute current inventory value from active cost sources

Current inventory is defined as non-voided vehicles without an active non-voided sale.

For each current inventory vehicle:

- `currentVehicleCostUsd = acquisitionCostUsd + repairCostUsd + vehicleExpenseCostUsd`
- acquisition uses active non-voided purchase components.
- repair uses active repair cost preview semantics already used by sales cost preview.
- vehicle expense uses active non-voided expenses with `vehicleId` set to the vehicle.

Inventory formulas:

- `inventoryVehicleCount = count(current inventory vehicles)`
- `inventoryValueUsd = sum(currentVehicleCostUsd)`
- `averageInventoryCostUsd = inventoryValueUsd / inventoryVehicleCount` when count is greater than zero; otherwise unavailable.
- `daysInInventory = difference between current date and Vehicle.dateReceived`
- `averageDaysInInventory = sum(daysInInventory) / inventoryVehicleCount` when count is greater than zero; otherwise unavailable.
- `over30Count`, `over60Count`, `over90Count` use days in inventory thresholds.
- aging buckets: `0-30`, `31-60`, `61-90`, `>90`.

Rationale: unsold inventory has no stored cost snapshot, and source records are the current source of truth. This also avoids adding duplicate financial fields to vehicles.

Alternative considered: store `inventoryCostUsd` on `Vehicle`. Rejected because it duplicates financial totals and would need ongoing synchronization.

### 5. Treat inventory historical metrics as unavailable

The dashboard will not show historical inventory value for a selected past period. Inventory metrics are labeled current-state and remain stable when period changes.

Rationale: the system has current vehicle state and transaction records, but no complete historical inventory snapshot or status effective-dating model that can reconstruct inventory at an arbitrary past date.

Minimum future change if historical inventory is required: introduce explicit inventory snapshots or a complete event/effective-date model for sale state, vehicle status, and cost state. That belongs in a separate proposal.

### 6. Sum general expenses from existing expenses

`generalExpensesUsd` uses active non-voided `Expense` records with `vehicleId === null` and `expenseDate` inside the selected period. Vehicle-related expenses remain part of vehicle cost and are excluded from general expense KPI to avoid double counting.

Rationale: the existing expense model distinguishes general operating expenses from vehicle-related expenses by optional vehicle association.

### 7. Chart grouping rule

Use deterministic grouping:

- 31 days or less: day.
- More than 31 and up to 180 days: week.
- More than 180 days: month.

Series should include zero-value buckets so chart spacing is stable and users can distinguish no sales from missing data.

Rationale: these thresholds keep charts readable across built-in presets and custom ranges without introducing user-configurable chart settings.

### 8. Actionable section thresholds

Use simple deterministic thresholds:

- Aged inventory: include current vehicles over 60 days, visually emphasize over 90 days.
- Elevated current cost: include current vehicles whose current cost is at least 125% of average current inventory cost, only when average cost is available and greater than zero.
- Low-margin sale: include active period sales with negative gross profit or gross margin below 10%.

Rationale: this is enough to surface operational concerns without creating an alerting engine or configurable rules.

Alternative considered: user-configurable alerts. Rejected as out of scope and unnecessary for the first dashboard.

### 9. Permissions

Add dashboard read roles using the existing role-list pattern:

- `DASHBOARD_READ_ROLES = ["admin", "lectura"]`

Exclude `capturista` from the executive dashboard even though capturistas can read many operational modules today. The dashboard is an owner/admin financial summary, while capturistas primarily create operational records.

Rationale: this respects existing roles without creating new permissions. `lectura` is the natural read-only role for a non-writing owner, accountant, or advisor; `admin` is the full administrator role.

Alternative considered: admin only. Rejected because the existing system already has a read-only role and the requested viewer includes owner/administrator personas, not only system administrators.

### 10. UI composition

The dashboard page should use:

- `PageHeader` with title `Dashboard Ejecutivo`, concise description, and period controls.
- Compact KPI grid using existing `Card` primitives.
- Tooltips or concise help affordances for gross margin, inventory value, average days, and general expenses.
- Chart panels using the project's existing dependency if one exists at implementation time; otherwise use a lightweight chart approach consistent with shadcn/base-nova and Tailwind tokens.
- Inventory summary as a compact summary band plus aging chart.
- Actionable section as a compact table/list with links to vehicle and sale detail.
- Standard loading, empty, and error treatment.

The page must follow `docs/design-system/UI_GUIDELINES.md`: compact operational layout, no marketing hero, no decorative dashboard theme, no independent palette, no oversized cards, and responsive wrapping without overlap.

## Risks / Trade-offs

- [Risk] Current inventory cost requires joining current vehicles with active purchase, repair, and expense costs. -> Mitigation: compute on the server, select only fields needed for dashboard calculations, and reuse existing cost helper semantics.
- [Risk] Existing preview helpers fetch cost documents and group in JavaScript; this may be acceptable initially but could degrade with large data. -> Mitigation: implement dashboard-specific projections first, then add Mongo aggregation or indexes only where profiling shows need.
- [Risk] Sales list currently filters some fields after loading rows. -> Mitigation: dashboard sales period aggregation should query `Sale` directly by `voidedAt` and `saleDate`, not call `listSales()`.
- [Risk] Repair active-cost semantics may be confusing because existing previews count requested, quoted, and in-progress repairs as active. -> Mitigation: document the metric help text and reuse the same semantics as the Sales financial preview for consistency.
- [Risk] Users may expect inventory value to change with historical periods. -> Mitigation: label inventory metrics as current-state and include tooltip text explaining that historical inventory reconstruction is unavailable.
- [Risk] Mongoose Decimal128 exchange rates are not convenient inside Mongo aggregation. -> Mitigation: use existing domain conversion helpers in server-side TypeScript unless performance requires a carefully tested aggregation pipeline.

## Migration Plan

1. Add the read-only dashboard feature and tests without changing existing transactional models.
2. Replace the current dashboard placeholder page with the Executive Dashboard UI.
3. Add `DASHBOARD_READ_ROLES` to existing permissions and use `requireRole()` in dashboard queries.
4. Verify that unauthorized users do not receive dashboard aggregates.
5. If rollback is required, restore the dashboard placeholder route and remove the new dashboard feature files; no data migration is involved.
