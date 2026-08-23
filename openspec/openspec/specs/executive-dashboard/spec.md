# executive-dashboard Specification

## Purpose

Define la vista ejecutiva del negocio para que administradores del lote consulten KPIs, tendencias, inventario actual e informacion accionable usando solamente datos operativos y financieros existentes.

## Requirements

### Requirement: Period-selectable executive dashboard
The system SHALL provide an authenticated Executive Dashboard with period controls for This Month, Last Month, Year to Date, Last 12 Months, and Custom Range. Period-based metrics SHALL use the selected range, while current-state inventory metrics SHALL represent current inventory and MUST NOT imply historical reconstruction.

#### Scenario: This Month period
- **WHEN** an authorized user selects This Month
- **THEN** sales, gross profit, margin, average sale price, units sold, sales charts, profit charts, unit charts, and general expenses use the first day of the current month through the current day

#### Scenario: Last Month period
- **WHEN** an authorized user selects Last Month
- **THEN** period metrics use the first through last calendar day of the previous month

#### Scenario: Year to Date period
- **WHEN** an authorized user selects Year to Date
- **THEN** period metrics use January 1 of the current year through the current day

#### Scenario: Last 12 Months period
- **WHEN** an authorized user selects Last 12 Months
- **THEN** period metrics use the rolling 12-month range ending on the current day

#### Scenario: Custom Range period
- **WHEN** an authorized user selects Custom Range with valid start and end dates
- **THEN** period metrics use the inclusive custom date range

#### Scenario: Current inventory remains current
- **WHEN** an authorized user changes the selected period
- **THEN** current inventory count, current inventory value, current average cost, current days in inventory, current inventory aging, and current aged-vehicle counts continue to represent the current non-voided unsold inventory

### Requirement: Executive KPI cards
The system SHALL display KPI cards for current vehicles in inventory, current inventory value, vehicles sold in the selected period, total sales revenue in the selected period, total cost of vehicles sold in the selected period, gross profit in the selected period, average gross margin in the selected period, average sale price in the selected period, average days in inventory, and general expenses in the selected period.

#### Scenario: KPI cards with data
- **WHEN** an authorized user opens the dashboard for a period with active sales, active inventory, and active general expenses
- **THEN** the dashboard shows each KPI formatted consistently as counts, USD currency, percentages, or days

#### Scenario: KPI cards with no period sales
- **WHEN** the selected period has no active non-voided sales
- **THEN** sales revenue, sold units, total sold cost, gross profit, average gross margin, and average sale price show zero or not available according to the metric formula without inventing sales data

#### Scenario: Missing or unavailable KPI source
- **WHEN** a KPI cannot be calculated from existing stored data
- **THEN** the dashboard identifies the metric as unavailable and explains the missing source instead of fabricating values or requiring new financial fields

### Requirement: Dashboard financial formulas
The system SHALL calculate dashboard financial metrics in USD cents using existing stored monetary values and existing cost rules. Active non-voided records SHALL be included; voided records SHALL be excluded from active totals.

#### Scenario: Period sales formulas
- **WHEN** the dashboard calculates period sales metrics
- **THEN** vehicles sold equals the count of active non-voided sales with `saleDate` inside the selected range, sales revenue equals sum of `salePriceUsd`, total sold cost equals sum of `totalCostUsd`, gross profit equals sum of `profitUsd`, average gross margin equals gross profit divided by sales revenue when revenue is greater than zero, and average sale price equals sales revenue divided by sold vehicles when sold vehicles is greater than zero

#### Scenario: Vehicle gross profit formula
- **WHEN** the dashboard evaluates a sold vehicle
- **THEN** the vehicle gross profit conceptually equals sale price minus total vehicle cost, where total vehicle cost is the sale snapshot total cost composed from acquisition cost, repair cost, and vehicle-related expense cost

#### Scenario: Current inventory value formula
- **WHEN** the dashboard calculates current inventory value
- **THEN** it uses non-voided vehicles without an active non-voided sale and sums active acquisition cost, active repair cost, and active vehicle-related expense cost for those vehicles

#### Scenario: General expenses formula
- **WHEN** the dashboard calculates general expenses for the selected period
- **THEN** it sums active non-voided expenses with no vehicle association and `expenseDate` inside the selected range

#### Scenario: Cost categories are existing categories only
- **WHEN** the dashboard explains total vehicle cost
- **THEN** it includes only existing cost sources and components: purchase components for acquisition, repair components for repairs, and vehicle-related expense components for expenses

### Requirement: Current inventory summary
The system SHALL show a current inventory summary with total available vehicles, current inventory value, average current cost per vehicle, average days in inventory, vehicles over 30 days, vehicles over 60 days, vehicles over 90 days, and current aging bucket distribution.

#### Scenario: Current inventory summary calculation
- **WHEN** the dashboard loads inventory summary
- **THEN** it counts non-voided vehicles without an active non-voided sale and uses each vehicle's existing date received to calculate days in inventory

#### Scenario: Average current cost
- **WHEN** current inventory has one or more vehicles
- **THEN** average current cost per vehicle equals current inventory value divided by current inventory vehicle count

#### Scenario: Empty inventory summary
- **WHEN** no current vehicles are in inventory
- **THEN** all inventory counts and value totals show zero, averages show not available where division by zero would occur, and the inventory section uses the standard empty-state pattern

### Requirement: Executive dashboard charts
The system SHALL include charts for sales revenue over time, gross profit over time, vehicles sold over time, and current inventory aging. Time-series charts SHALL group by day, week, or month according to the selected range length.

#### Scenario: Short date range grouping
- **WHEN** the selected range is 31 days or less
- **THEN** sales revenue, gross profit, and vehicles sold are grouped by day

#### Scenario: Medium date range grouping
- **WHEN** the selected range is more than 31 days and no more than 180 days
- **THEN** sales revenue, gross profit, and vehicles sold are grouped by week

#### Scenario: Long date range grouping
- **WHEN** the selected range is more than 180 days
- **THEN** sales revenue, gross profit, and vehicles sold are grouped by month

#### Scenario: Inventory aging buckets
- **WHEN** the dashboard renders inventory aging
- **THEN** it shows current unsold non-voided vehicles in 0-30, 31-60, 61-90, and over 90 day buckets

### Requirement: Actionable executive activity
The system SHALL show a compact actionable section derived from dashboard queries without introducing a separate alerting system. The section SHALL include vehicles over 60 or 90 days in inventory, vehicles with elevated current cost, and active period sales with low margin or loss when the data exists.

#### Scenario: Aged vehicles action items
- **WHEN** current inventory contains vehicles over 60 days or over 90 days in inventory
- **THEN** the actionable section lists those vehicles with code, vehicle description, days in inventory, current cost, and navigation to the vehicle detail

#### Scenario: Elevated cost action items
- **WHEN** current inventory contains vehicles whose current total cost is elevated relative to the current inventory average
- **THEN** the actionable section lists those vehicles with code, vehicle description, current cost, and the reason they were included

#### Scenario: Low-margin or loss sale action items
- **WHEN** the selected period contains active non-voided sales with negative gross profit or margin below the dashboard threshold
- **THEN** the actionable section lists those sales with sale code, vehicle, sale date, sale price, total cost, gross profit, margin, and navigation to sale detail

#### Scenario: No action items
- **WHEN** no actionable conditions are found
- **THEN** the actionable section shows the standard empty state without implying that an alerting system exists

### Requirement: Dashboard UI states and presentation
The system SHALL present the dashboard as a professional operational management interface using the shared design system and existing shadcn/ui components. The dashboard SHALL provide loading, empty, error, and explanatory states for ambiguous metrics.

#### Scenario: Loading state
- **WHEN** dashboard data is loading
- **THEN** the page preserves stable KPI, chart, and table dimensions with standard loading treatment

#### Scenario: Error state
- **WHEN** dashboard data cannot be loaded
- **THEN** the page shows a recoverable error state without exposing internal implementation details

#### Scenario: Metric explanation
- **WHEN** a metric could be ambiguous, such as inventory value, gross margin, average days in inventory, or general expenses
- **THEN** the interface provides concise tooltip or help text explaining the formula and whether the metric is period-based or current-state

#### Scenario: Responsive dashboard
- **WHEN** the dashboard is viewed on smaller screens
- **THEN** KPI cards, period controls, charts, inventory summary, and actionable items remain readable and usable without overlapping content

### Requirement: Dashboard access control
The system SHALL protect the Executive Dashboard with the existing authentication and authorization system. Roles allowed to view financial dashboard data SHALL be explicitly defined using existing role patterns, and unauthorized users SHALL NOT receive dashboard data from the server.

#### Scenario: Authorized dashboard read
- **WHEN** a user with a dashboard-authorized role opens the dashboard
- **THEN** the server returns the aggregated dashboard response and the page renders financial KPIs

#### Scenario: Unauthorized dashboard read
- **WHEN** a user without a dashboard-authorized role attempts to access dashboard data directly
- **THEN** the server rejects the read and does not return financial aggregates

#### Scenario: Unauthenticated dashboard access
- **WHEN** an unauthenticated visitor attempts to access the dashboard route
- **THEN** the existing authenticated route protection prevents access

### Requirement: Dashboard performance contract
The system SHALL compute dashboard aggregates on the server and return a single dashboard response for the selected period. The client MUST NOT load complete operational collections to calculate dashboard totals.

#### Scenario: Aggregated dashboard response
- **WHEN** the dashboard page loads for a selected period
- **THEN** it obtains KPIs, charts, inventory summary, and actionable items from an aggregated server-side read model

#### Scenario: No client-side collection aggregation
- **WHEN** dashboard totals are calculated
- **THEN** the client receives already-computed DTO values and does not fetch all vehicles, sales, purchases, repairs, or expenses for local aggregation

#### Scenario: Index needs are documented
- **WHEN** implementation determines an existing query lacks an index needed for dashboard period or current inventory reads
- **THEN** the design and implementation document the specific index need before adding it
