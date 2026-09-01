# purchases Specification

## Purpose

Defines the observable purchase module experience for capturing, consulting, filtering, voiding, and reviewing immutable acquisition-cost records in a shared operational interface.

## Requirements

### Requirement: Operational purchases list
The system SHALL present purchases in a compact operational list that includes a standard page header, role-aware create action, search and filters, result summary, scannable table, voided-state treatment, footer total in USD, empty states, and filter reset behavior. The list SHALL preserve filtering by vehicle, vendor, purchase type, date range, and voided inclusion behavior.

#### Scenario: Purchases list with filters
- **WHEN** an authorized user opens the purchases module
- **THEN** the user sees search or filter controls for vehicle, vendor, type, date range, and voided inclusion, plus a table with purchase code, vehicle, vendor, date, type, original total, USD total, status, and available actions

#### Scenario: Filtered purchases total
- **WHEN** a user applies filters to the purchases list
- **THEN** the footer total reflects the USD total of the active, non-voided purchases included in the current result set

#### Scenario: Filtered no-results state
- **WHEN** a user's active search or filters match no purchases
- **THEN** the system shows a filtered empty state distinct from the initial no-data state and provides a clear way to return to the default list

#### Scenario: Voided purchases in the list
- **WHEN** the user includes voided purchases in the list
- **THEN** voided rows remain consultable, are visually distinguished, and do not contribute to the active footer total

#### Scenario: Purchases list in reduced viewport
- **WHEN** a user opens the purchases list on a narrow viewport
- **THEN** purchase code, status, USD total, detail access, and applicable filters remain usable without requiring horizontal precision that prevents operation

### Requirement: Sectioned purchase creation form
The system SHALL present purchase creation as a full-page sectioned form for identification, currency, acquisition cost components, payment and references, and notes. The form SHALL preserve current business behavior for required fields, active vehicle and vendor selection, live totals, USD exchange-rate locking, MXN exchange-rate validation, type-based negative amount rules, correction target selection, future-date validation, duplicate submission protection, save/cancel actions, and preservation of user-entered values after recoverable save errors.

#### Scenario: Purchase form sections
- **WHEN** an admin or capturista opens the new purchase page
- **THEN** the form groups fields into clear sections for identification, currency, cost components, payment and references, and notes, with required fields visibly identified

#### Scenario: Live financial totals
- **WHEN** the user edits currency, exchange rate, or any acquisition cost component
- **THEN** the form updates the original-currency total and USD equivalent before saving, using the same monetary rules as the saved purchase

#### Scenario: USD exchange-rate behavior
- **WHEN** the user selects USD as the purchase currency
- **THEN** the exchange rate is shown as `1`, cannot be edited, is submitted as `1`, and remains consistent with the value that will be submitted

#### Scenario: Correction target visibility
- **WHEN** the user selects purchase type `Correction`
- **THEN** the form shows the correction target control and communicates that a voided purchase from the same vehicle must be selected

#### Scenario: Validation feedback on save
- **WHEN** the user submits a purchase with missing required data, invalid exchange rate, invalid sign, duplicate reference, invalid correction target, or missing amount
- **THEN** the system keeps the user in the form, shows field-level or form-level feedback using the shared validation pattern, preserves the values the user already captured, does not create a purchase, and does not consume a purchase code for validation failures

#### Scenario: USD purchase error preserves defaults and values
- **WHEN** a user submits a new purchase in USD and the save is rejected for another field
- **THEN** the form still shows currency `USD`, exchange rate `1`, captured cost components, selected vehicle, selected vendor, purchase date, source, purchase type, references and notes

#### Scenario: MXN purchase error preserves exchange rate
- **WHEN** a user submits a new purchase in MXN and the save is rejected
- **THEN** the form still shows currency `MXN`, the captured exchange rate value, captured cost components, selected options, references and notes

#### Scenario: Purchase save pending state
- **WHEN** the user submits a valid purchase
- **THEN** the save action indicates pending state and prevents accidental duplicate interaction while server-side submission-token protection remains the authoritative duplicate defense

### Requirement: Read-only purchase detail
The system SHALL present each purchase detail as a read-only financial record with scannable sections for identity, vehicle, vendor, date, type, source, currency, exchange rate, cost components, totals, payment/reference data, correction relationships, notes, and voiding metadata. The detail SHALL NOT expose edit or delete actions.

#### Scenario: Active purchase detail
- **WHEN** a user opens the detail for an active purchase
- **THEN** the user sees the purchase code, vehicle, vendor, date, type, eight cost components, original total, USD total, exchange rate, payment/reference data, notes when present, and no edit or delete action

#### Scenario: Voided purchase detail
- **WHEN** a user opens the detail for a voided purchase
- **THEN** the detail clearly identifies the purchase as voided, shows the void reason, author, date, original financial values, and states that it no longer contributes to the vehicle acquisition cost

#### Scenario: Correction relationship detail
- **WHEN** a purchase corrects another purchase or has been corrected by another purchase
- **THEN** the detail exposes the related purchase relationship in a consultable way without implying that either record can be edited

#### Scenario: Role-aware void action
- **WHEN** a capturista or lectura user opens purchase detail
- **THEN** the user does not see the void action, while the server remains responsible for rejecting unauthorized void attempts

#### Scenario: Destructive void confirmation
- **WHEN** an admin starts voiding an active purchase
- **THEN** the system requires a destructive confirmation with a non-empty reason before executing the operation

### Requirement: Acquisition-cost display in vehicle detail
The system SHALL present the vehicle acquisition-cost block using the same shared section, table, status, empty-state, and responsive patterns as the Purchases module. The block SHALL name the value as acquisition cost, show the USD total and component breakdown, list related purchases, and clearly exclude voided purchases from the active total.

#### Scenario: Vehicle without purchases
- **WHEN** a user opens a vehicle detail with no purchases
- **THEN** the acquisition-cost section shows a zero state that explains no purchases are registered yet without presenting acquisition cost as total vehicle cost

#### Scenario: Vehicle with active purchases
- **WHEN** a user opens a vehicle detail with active purchases
- **THEN** the acquisition-cost section shows the USD acquisition-cost total, component breakdown, and purchase list in a scannable layout

#### Scenario: Vehicle with voided purchases
- **WHEN** a vehicle has voided purchases in its history
- **THEN** the acquisition-cost section distinguishes voided purchases and excludes them from the active acquisition-cost total

### Requirement: Purchase UI follows shared operational patterns
The Purchases module SHALL apply `docs/design-system/UI_GUIDELINES.md` and shared UI patterns for page composition, tables, filters, forms, details, statuses, destructive confirmations, feedback, loading states, empty states, and responsive behavior. The module MUST NOT introduce a purchase-specific visual system when a shared pattern applies.

#### Scenario: Shared design system applied
- **WHEN** the Purchases module redesign is implemented
- **THEN** list, create, detail, void confirmation, acquisition-cost, loading, empty, validation, and feedback states apply the shared design guidelines

#### Scenario: Missing purchase pattern becomes shared
- **WHEN** the Purchases redesign needs a reusable financial or immutable-record pattern that is not yet available
- **THEN** the pattern is defined or adjusted as shared UI behavior before being used as a purchase-only solution
