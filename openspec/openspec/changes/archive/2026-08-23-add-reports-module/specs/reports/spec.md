## Purpose

Define el modulo de reportes para que una LLC de lote de carros consulte, filtre, exporte y audite informacion operativa, financiera y administrativa usando los registros existentes como fuente de verdad.

## ADDED Requirements

### Requirement: Report catalog and navigation
The system SHALL provide a Reports module with a catalog grouped by Financial, Inventory, Sales, Payables and Payments, Expenses, Operations, Tax Preparation, and Audit categories. Each report SHALL show its name, purpose, supported filters, available exports, last generated timestamp when applicable, and whether the report is available from existing data.

#### Scenario: User opens report catalog
- **WHEN** an authorized user opens the Reports module
- **THEN** the system shows the report catalog grouped by category with direct access to each available report

#### Scenario: Report source unavailable
- **WHEN** a report depends on data not currently captured by the system
- **THEN** the catalog marks the report as unavailable or partially available and explains the missing source without fabricating values

#### Scenario: Report navigation on narrow viewport
- **WHEN** a user opens the report catalog on a reduced viewport
- **THEN** categories, report names, availability, and report access remain usable without horizontal scrolling that prevents operation

### Requirement: Report execution controls
The system SHALL allow users to run reports with consistent controls for period preset, custom date range, vehicle, vehicle status, provider, buyer, payment method, category, report status, voided inclusion, and search where each filter is relevant to that report. Period filters SHALL be inclusive of the selected start and end dates and SHALL identify which source date field drives each report.

#### Scenario: Run report with period preset
- **WHEN** a user runs a sales profitability report for Year to Date
- **THEN** the report uses active non-voided sales whose sale date falls from January 1 of the current year through the current day

#### Scenario: Run report with custom date range
- **WHEN** a user runs a payments report with valid custom start and end dates
- **THEN** the report includes active payments whose payment date falls inside the inclusive range

#### Scenario: Invalid report date range
- **WHEN** a user submits a custom report range where the start date is after the end date
- **THEN** the system rejects the run, identifies the invalid range, and keeps the previous valid report result visible when one exists

#### Scenario: Report-specific filters
- **WHEN** a user opens an inventory aging report
- **THEN** the system offers inventory-relevant filters and does not show unrelated filters such as payment method or buyer

### Requirement: Financial summary reports
The system SHALL provide financial reports for profit and loss, sales profitability, gross margin by vehicle, inventory value, cost breakdown by vehicle, and cash activity. Reports SHALL calculate monetary values in USD cents, include only active non-voided records by default, and expose voided records only when the report explicitly supports a voided inclusion filter.

#### Scenario: Profit and loss report
- **WHEN** a user runs the profit and loss report for a period
- **THEN** the system shows sales revenue, sold vehicle cost, gross profit, general expenses, net operating result before taxes, unit count, average sale price, gross margin, and links to contributing source reports

#### Scenario: Sales profitability report
- **WHEN** a user runs the sales profitability report
- **THEN** each row shows sale code, sale date, vehicle, buyer when present, sale price, acquisition cost, repair cost, vehicle-related expense cost, total cost, gross profit, gross margin, ROI, and sale status

#### Scenario: Sold vehicle financial source
- **WHEN** a report calculates profitability for a sold vehicle
- **THEN** it uses the sale's frozen financial snapshot values rather than recomputing historical costs from current purchase, repair, or expense records

#### Scenario: Current inventory value report
- **WHEN** a user runs the inventory value report
- **THEN** the system includes current non-voided unsold vehicles and sums active acquisition cost, active repair cost, and active vehicle-related expense cost for each vehicle

#### Scenario: General expenses excluded from vehicle cost
- **WHEN** a report calculates vehicle cost or inventory value
- **THEN** general expenses without vehicle association are excluded from vehicle cost and remain available in expense and profit-and-loss reports

### Requirement: Inventory and title reports
The system SHALL provide reports for current inventory, inventory aging, vehicles by status, inventory without title in hand, inventory without list price, and vehicles missing key identifiers. Inventory reports SHALL represent current inventory state unless the report explicitly uses transaction dates and SHALL NOT imply historical inventory reconstruction.

#### Scenario: Inventory aging report
- **WHEN** a user runs the inventory aging report
- **THEN** the system groups current non-voided unsold vehicles into 0-30, 31-60, 61-90, and over 90 day buckets using each vehicle's date received

#### Scenario: Vehicles without title report
- **WHEN** a user runs the vehicles without title report
- **THEN** the system lists current non-voided vehicles whose title is not marked as physically received, including code, description, date received, days in inventory, title status, and title number when present

#### Scenario: Missing identifier report
- **WHEN** a user runs the missing identifiers report
- **THEN** the system lists active vehicles missing VIN, lot inventory number, title number, list price, or other supported key fields selected by the user

#### Scenario: Historical inventory limitation
- **WHEN** a user selects a past period for a current-state inventory report
- **THEN** the system labels the inventory result as current-state and does not reconstruct inventory as of the past date

### Requirement: Payables and payment reports
The system SHALL provide reports for accounts payable, payment history, unpaid obligations, partially paid obligations, paid obligations, provider balances, and payment applications. Payables SHALL be calculated from active purchase, repair, and expense source documents minus active non-voided payment applications.

#### Scenario: Accounts payable report
- **WHEN** a user runs the accounts payable report
- **THEN** the system lists payable source documents with source type, source code, provider when present, vehicle when applicable, original USD total, active paid USD total, pending USD balance, payment status, and due date when available

#### Scenario: Payment history report
- **WHEN** a user runs the payment history report
- **THEN** each row shows payment code, payment date, provider when present, method, currency, original amount, exchange rate, USD amount, application count, voided status, and links to source documents

#### Scenario: Voided payments excluded from balances
- **WHEN** a payment has been voided
- **THEN** reports exclude its applications from paid totals and pending-balance calculations while keeping the voided payment consultable when voided records are included

#### Scenario: Provider balance report
- **WHEN** a user runs a provider balance report
- **THEN** the system groups active payable obligations and active payments by provider where provider data exists and marks records without provider separately

### Requirement: Expense and deduction preparation reports
The system SHALL provide expense reports for general expenses, vehicle-related expenses, expenses by category, expenses by provider, and deductible expense preparation. These reports SHALL preserve the distinction between general operating expenses and vehicle-related costs to prevent double counting.

#### Scenario: Expenses by category report
- **WHEN** a user runs the expenses by category report
- **THEN** the system groups active non-voided expenses by category and shows original total, tax, fees, discounts, adjustments, USD total, paid amount, pending balance, and source record count

#### Scenario: Vehicle-related expense report
- **WHEN** a user runs the vehicle-related expense report
- **THEN** the system lists expenses associated with vehicles and provides vehicle code, expense code, category, provider, expense date, USD total, payment status, and pending balance

#### Scenario: Deduction preparation report
- **WHEN** a user runs the deduction preparation report for a tax period
- **THEN** the system groups general expenses and business-relevant cost categories from existing records, marks vehicle-capitalized costs separately, and does not state that any category is tax-deductible unless the stored category explicitly supports that classification

### Requirement: Sales, tax, and LLC administration reports
The system SHALL provide sales register, sales tax preparation, title/status exceptions, vendor payment, and owner/admin summary reports for LLC administration. Reports SHALL show available source fields and SHALL clearly mark tax fields or regulatory fields as unavailable when the system does not capture them.

#### Scenario: Sales register report
- **WHEN** a user runs the sales register report
- **THEN** the system lists sale code, sale date, vehicle, buyer, sale price, cost basis, gross profit, payment status where supported, references, and voided status

#### Scenario: Sales tax preparation report
- **WHEN** a user runs the sales tax preparation report
- **THEN** the system lists taxable sales support fields available in the sale records and marks sales tax collected, taxable jurisdiction, exemption status, or filing treatment as unavailable when those fields are not captured

#### Scenario: Vendor payment report
- **WHEN** a user runs the vendor payment report for a period
- **THEN** the system lists payments and obligations by provider using existing provider data, payment methods, payment dates, USD totals, pending balances, and source document links

#### Scenario: Administrative exception report
- **WHEN** a user runs the administrative exceptions report
- **THEN** the system lists records that need attention, including missing title, missing VIN, unpaid obligations, partially paid obligations, negative margin sales, old inventory, and records missing provider or category data where applicable

### Requirement: Report exports
The system SHALL allow authorized users to export report results to CSV and print-ready PDF where the report supports export. Exports SHALL preserve selected filters, period, generated timestamp, report name, currency labels, totals, and a data disclaimer for unavailable fields.

#### Scenario: CSV export
- **WHEN** a user exports a report to CSV
- **THEN** the downloaded file includes the visible report rows, stable column headers, selected filter metadata, generated timestamp, and totals where applicable

#### Scenario: PDF export
- **WHEN** a user exports a report to PDF
- **THEN** the generated document includes the report title, period, filters, summary totals, table data, page numbers where supported, and generated timestamp

#### Scenario: Export respects permissions
- **WHEN** a user without permission to view financial reports attempts to export a financial report directly
- **THEN** the system rejects the export and does not return report data

#### Scenario: Large export handling
- **WHEN** a report result exceeds the interactive table page size
- **THEN** export includes the full filtered result set subject to system export limits and clearly reports when a limit truncates the export

### Requirement: Report drill-down and traceability
The system SHALL provide drill-down navigation from report rows to source records where the user has permission to view those records. Report totals SHALL be traceable to source rows, and each report SHALL identify its formula or source basis for ambiguous metrics.

#### Scenario: Drill down to sale detail
- **WHEN** a user opens a sales profitability row
- **THEN** the system offers navigation to the sale detail and vehicle detail when the user's role permits those reads

#### Scenario: Drill down to payable source
- **WHEN** a user opens an accounts payable row
- **THEN** the system offers navigation to the purchase, repair, expense, and payment records that make up the balance when available

#### Scenario: Formula explanation
- **WHEN** a report shows gross margin, ROI, inventory value, pending balance, or net operating result
- **THEN** the interface provides concise formula text identifying included and excluded source records

### Requirement: Report permissions and audit
The system SHALL protect report reads and exports with the existing authentication and authorization system. Financial and export-capable reports SHALL be available only to roles explicitly allowed for report access, while unauthorized users SHALL NOT receive report data from server-side report operations.

#### Scenario: Authorized financial report read
- **WHEN** a user with a report-authorized role opens a financial report
- **THEN** the server returns the report result and records no source data mutation

#### Scenario: Unauthorized report read
- **WHEN** a user without report permission invokes a report operation directly
- **THEN** the system rejects the request and does not return report rows, totals, or export files

#### Scenario: Report export audit metadata
- **WHEN** a user exports a report
- **THEN** the system records or embeds report name, selected filters, generated timestamp, and requesting user identity according to the app's existing audit patterns

### Requirement: Report UI states and performance
The Reports module SHALL apply shared operational UI patterns for page composition, tables, filters, loading, empty, error, destructive-free read-only views, responsive behavior, and dense financial summaries. Reports SHALL compute aggregates on the server and MUST NOT require the client to load complete operational collections to calculate totals.

#### Scenario: Report loading state
- **WHEN** a report is loading
- **THEN** the page preserves stable filter, summary, and table dimensions with standard loading treatment

#### Scenario: Empty report result
- **WHEN** filters match no source records
- **THEN** the system shows a filtered empty state distinct from an unavailable report and provides a clear way to reset filters

#### Scenario: Report error state
- **WHEN** report data cannot be loaded
- **THEN** the system shows a recoverable error state without exposing internal implementation details

#### Scenario: Server-side aggregation
- **WHEN** a report calculates totals, balances, or grouped values
- **THEN** the client receives already-computed report DTO values and does not fetch all vehicles, sales, purchases, repairs, expenses, or payments for local aggregation
