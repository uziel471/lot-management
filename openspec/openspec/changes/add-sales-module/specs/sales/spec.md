## Purpose

Defines the SALES module for recording vehicle sales and exposing the financial result of each unit by combining sale price with active acquisition, repair, and vehicle-related expense costs.

## ADDED Requirements

### Requirement: Operational sales list
The system SHALL present sales in a compact operational list that includes a standard page header, role-aware create action, search, filters, result summary, scannable table, active totals, empty states, and filter reset behavior. The list SHALL support filtering by vehicle, buyer, sale date range, profit result, ROI range, and voided inclusion behavior.

#### Scenario: Sales list with financial columns
- **WHEN** an authorized user opens the SALES module
- **THEN** the user sees search or filter controls plus a table with sale code, vehicle, buyer, sale date, sale price, total cost, profit, ROI, status, and available actions

#### Scenario: Active sales totals in list
- **WHEN** a user applies filters to the sales list
- **THEN** the summary totals reflect active non-voided sales in the current result set, including sale revenue, total cost, total profit, and aggregate ROI where cost is greater than zero

#### Scenario: Filtered sales no-results state
- **WHEN** a user's active search or filters match no sales
- **THEN** the system shows a filtered empty state distinct from the initial no-data state and provides a clear way to return to the default list

#### Scenario: Voided sales in list
- **WHEN** the user includes voided sales in the list
- **THEN** voided rows remain consultable, are visually distinguished, and do not contribute to active sales totals, profit totals, or ROI summaries

#### Scenario: Sales list in reduced viewport
- **WHEN** a user opens the sales list on a narrow viewport
- **THEN** sale code, vehicle, sale price, profit, ROI, status, detail access, and applicable filters remain usable without requiring horizontal precision that prevents operation

### Requirement: Sectioned sale creation form
The system SHALL present sale creation as a full-page sectioned form for vehicle selection, buyer information, sale date, sale price, terms, references, notes, and financial preview. The form SHALL require an active non-voided vehicle without an active sale, a sale date, and a positive USD sale price before saving.

#### Scenario: Sale form sections
- **WHEN** an admin or capturista opens the new sale page
- **THEN** the form groups fields into clear sections for vehicle, buyer, sale data, references, notes, and financial preview, with required fields visibly identified

#### Scenario: Active vehicle without sale required
- **WHEN** a user tries to create a sale for a voided vehicle, nonexistent vehicle, or vehicle that already has an active sale
- **THEN** the system rejects the save, identifies the vehicle problem, and does not create a sale code

#### Scenario: Positive sale price required
- **WHEN** a user submits a sale with an empty, zero, or negative sale price
- **THEN** the system rejects the save, explains that the USD sale price must be positive, and does not create a sale

#### Scenario: Sale financial preview
- **WHEN** the user selects a vehicle and edits the sale price
- **THEN** the form shows active acquisition cost, repair cost, vehicle-related expense cost, total cost, projected profit, and projected ROI before saving

#### Scenario: Sale save pending state
- **WHEN** the user submits a valid sale
- **THEN** the save action indicates pending state and prevents accidental duplicate interaction while server-side submission-token protection remains the authoritative duplicate defense

### Requirement: Sale financial result
The system SHALL calculate each sale's financial result in USD from active non-voided vehicle costs and the captured sale price. Total cost SHALL equal active acquisition cost plus active repair cost plus active vehicle-related expense cost. Profit SHALL equal sale price minus total cost. ROI SHALL equal profit divided by total cost when total cost is greater than zero; when total cost is zero, ROI SHALL be shown as not available rather than infinity or zero.

#### Scenario: Profitable sale
- **WHEN** a vehicle with USD 10,000 total cost is sold for USD 12,500
- **THEN** the sale detail shows USD 2,500 profit and 25% ROI

#### Scenario: Loss sale
- **WHEN** a vehicle with USD 10,000 total cost is sold for USD 8,000
- **THEN** the sale detail shows negative USD 2,000 profit and negative 20% ROI

#### Scenario: Zero cost sale
- **WHEN** a vehicle with no active cost records is sold for a positive price
- **THEN** the sale detail shows profit equal to the sale price and ROI as not available

#### Scenario: Voided costs excluded from result
- **WHEN** a vehicle has voided purchases, repairs, or vehicle-related expenses
- **THEN** those voided records remain consultable in their modules but are excluded from the sale's active total cost, profit, and ROI calculations

#### Scenario: General expenses excluded from result
- **WHEN** general expenses exist without vehicle association
- **THEN** those expenses do not contribute to any sale's total cost, profit, or ROI

### Requirement: Read-only sale detail
The system SHALL present each sale detail as a consultable financial record with sections for identity, vehicle, buyer, sale date, sale price, cost breakdown, profit, ROI, references, notes, author, timestamps, and voiding metadata. The detail SHALL expose only role-appropriate actions and SHALL NOT offer hard delete.

#### Scenario: Active sale detail
- **WHEN** a user opens the detail for an active sale
- **THEN** the user sees sale code, vehicle, buyer, sale date, sale price, acquisition cost, repair cost, vehicle expense cost, total cost, profit, ROI, references when present, notes when present, and available role-appropriate actions

#### Scenario: Sale detail exposes source cost links
- **WHEN** a user reviews the cost breakdown in a sale detail
- **THEN** the system provides consultable navigation to the vehicle cost sections or source records that make up acquisition, repair, and expense totals

#### Scenario: Voided sale detail
- **WHEN** a user opens the detail for a voided sale
- **THEN** the detail clearly identifies the sale as voided, shows void reason, author, date, original financial values, and states that it no longer contributes to active sales totals

#### Scenario: Role-aware sale actions
- **WHEN** a lectura user opens any sale detail
- **THEN** the user can consult the record but does not see create, void, or other write actions, while the server remains responsible for rejecting unauthorized attempts

### Requirement: Sale voiding
The system SHALL allow only admins to void sale records through a destructive confirmation that requires a non-empty reason. Voiding SHALL preserve the original sale code, sale price, vehicle relationship, buyer information, financial values, references, notes, author, and timestamps, and SHALL exclude the sale from active sales totals and active vehicle sale summaries.

#### Scenario: Admin voids sale
- **WHEN** an admin voids a sale with a reason
- **THEN** the sale is marked voided, the reason, author, and timestamp are recorded, and the sale remains consultable

#### Scenario: Voiding without reason
- **WHEN** an admin confirms voiding without a reason
- **THEN** the system rejects the operation and keeps the sale active

#### Scenario: Capturista attempts to void sale
- **WHEN** a capturista attempts to void a sale
- **THEN** the system rejects the operation and the sale remains unchanged

### Requirement: Sale permissions and audit
The system SHALL allow roles `admin` and `capturista` to create sales. The system SHALL reserve sale voiding to `admin`. The role `lectura` MUST NOT execute sale write operations. Every sale creation and voiding operation SHALL record the acting user and server timestamp, and permission checks SHALL occur in the operation itself, not only in navigation.

#### Scenario: Capturista creates sale
- **WHEN** a capturista creates a valid sale
- **THEN** the sale is saved with the capturista as author and a server timestamp

#### Scenario: Lectura attempts sale write
- **WHEN** a lectura user invokes any sale write operation directly
- **THEN** the system rejects the operation and does not modify sale data

#### Scenario: Interface follows sale role permissions
- **WHEN** a user opens the SALES module
- **THEN** the interface shows create and void actions only when the user's role permits those operations

### Requirement: Sale UI follows shared operational patterns
The SALES module SHALL apply `docs/design-system/UI_GUIDELINES.md` and shared UI patterns for page composition, tables, filters, forms, details, statuses, financial totals, destructive confirmations, feedback, loading states, empty states, and responsive behavior. The module MUST NOT introduce a sale-specific visual system when a shared pattern applies.

#### Scenario: Shared design system applied
- **WHEN** the SALES module is implemented
- **THEN** list, create, detail, void confirmation, vehicle sale summary, loading, empty, validation, and feedback states apply the shared design guidelines

#### Scenario: Missing sales pattern becomes shared
- **WHEN** the SALES module needs a reusable profit, ROI, immutable-record, or financial-summary pattern that is not yet available
- **THEN** the pattern is defined or adjusted as shared UI behavior before being used as a sale-only solution
