## Purpose

Defines the Repairs module for tracking vehicle repair and reconditioning work, including operational lifecycle, financial totals, providers, evidence, voiding, and vehicle-level visibility.

## Requirements

### Requirement: Operational repairs list
The system SHALL present repairs in a compact operational list that includes a standard page header, role-aware create action, search, filters, result summary, scannable table, repair status treatment, active USD total, empty states, and filter reset behavior. The list SHALL support filtering by vehicle, provider, status, repair category, date range, currency, and voided inclusion behavior.

#### Scenario: Repairs list with filters
- **WHEN** an authorized user opens the repairs module
- **THEN** the user sees search or filter controls for vehicle, provider, status, category, date range, currency, and voided inclusion, plus a table with repair code, vehicle, provider, category, status, opened date, completed date when present, USD total, and available actions

#### Scenario: Active repair total in list
- **WHEN** a user applies filters to the repairs list
- **THEN** the footer or summary total reflects the USD total of active, non-voided repairs in the current result set

#### Scenario: Filtered repairs no-results state
- **WHEN** a user's active search or filters match no repairs
- **THEN** the system shows a filtered empty state distinct from the initial no-data state and provides a clear way to return to the default list

#### Scenario: Voided repairs in list
- **WHEN** the user includes voided repairs in the list
- **THEN** voided rows remain consultable, are visually distinguished, and do not contribute to active repair totals

#### Scenario: Repairs list in reduced viewport
- **WHEN** a user opens the repairs list on a narrow viewport
- **THEN** repair code, vehicle, status, USD total, detail access, and applicable filters remain usable without requiring horizontal precision that prevents operation

### Requirement: Sectioned repair creation form
The system SHALL present repair creation as a full-page sectioned form for vehicle identification, provider, service classification, dates, currency, cost components, work description, references, and notes. The form SHALL require an active non-voided vehicle, repair category, opened date, currency, valid exchange rate when applicable, and at least one positive cost component or line item before saving.

#### Scenario: Repair form sections
- **WHEN** an admin or capturista opens the new repair page
- **THEN** the form groups fields into clear sections for vehicle and provider, repair classification, schedule, financial data, work details, references, and notes, with required fields visibly identified

#### Scenario: Active vehicle requirement
- **WHEN** a user tries to create a repair for a voided vehicle or without selecting a vehicle
- **THEN** the system rejects the save, identifies the vehicle problem, and does not create a repair code

#### Scenario: Optional provider
- **WHEN** a user records an internal repair without selecting a provider
- **THEN** the repair can be saved if all other required data is valid and the detail identifies the provider as internal or unspecified according to the captured value

#### Scenario: Live repair financial totals
- **WHEN** the user edits currency, exchange rate, labor, parts, tax, outside service, or other cost amounts
- **THEN** the form updates the original-currency total and USD equivalent before saving, using the same monetary rules as the saved repair

#### Scenario: USD exchange-rate behavior
- **WHEN** the user selects USD as the repair currency
- **THEN** the exchange rate is shown as `1`, cannot be edited, and remains consistent with the value that will be submitted

#### Scenario: MXN exchange-rate validation
- **WHEN** the user selects MXN as the repair currency and submits an empty, zero, negative, or invalid exchange rate
- **THEN** the system rejects the save with validation feedback and does not create a repair

#### Scenario: Repair save pending state
- **WHEN** the user submits a valid repair
- **THEN** the save action indicates pending state and prevents accidental duplicate interaction while server-side submission-token protection remains the authoritative duplicate defense

### Requirement: Repair lifecycle management
The system SHALL manage repair status as a controlled lifecycle that supports at least requested, quoted, in progress, completed, cancelled, and voided states. The system SHALL record each status transition with previous status, new status, author, timestamp, and optional note, and SHALL prevent lifecycle changes that would contradict completed, cancelled, or voided repair records.

#### Scenario: Status transition recorded
- **WHEN** an authorized user changes a repair from requested to in progress
- **THEN** the repair reflects the new status and the transition appears in its history with author, timestamp, previous status, new status, and note when present

#### Scenario: Completion requires completion date
- **WHEN** a user marks a repair as completed
- **THEN** the system requires a completion date, records completion metadata, and keeps final financial values consultable

#### Scenario: Completion date before opened date
- **WHEN** a user tries to complete a repair with a completion date before the opened date
- **THEN** the system rejects the status change and explains the date constraint

#### Scenario: Cancelled repair
- **WHEN** an authorized user cancels a non-completed repair with a reason
- **THEN** the repair remains consultable as cancelled, records the reason and author, and does not count as completed work

#### Scenario: Completed repair cannot be edited as open work
- **WHEN** a user opens a completed repair
- **THEN** the system does not offer open-work editing actions that would change the completed financial record

### Requirement: Read-only repair detail
The system SHALL present each repair detail as a consultable operational record with sections for identity, vehicle, provider, category, status, dates, financial breakdown, totals, work description, references, notes, lifecycle history, completion metadata, and voiding metadata. The detail SHALL expose only role-appropriate lifecycle actions and SHALL NOT offer hard delete.

#### Scenario: Active repair detail
- **WHEN** a user opens the detail for an active repair
- **THEN** the user sees repair code, vehicle, provider or internal marker, category, status, opened date, financial breakdown, original total, USD total, work description, notes when present, status history, and available role-appropriate actions

#### Scenario: Completed repair detail
- **WHEN** a user opens the detail for a completed repair
- **THEN** the user sees completion date, completion author, final financial values, and no editing action that would alter the completed financial record

#### Scenario: Voided repair detail
- **WHEN** a user opens the detail for a voided repair
- **THEN** the detail clearly identifies the repair as voided, shows void reason, author, date, original financial values, and states that it no longer contributes to active repair totals

#### Scenario: Role-aware repair actions
- **WHEN** a lectura user opens any repair detail
- **THEN** the user can consult the record but does not see create, edit, lifecycle change, cancel, complete, or void actions, while the server remains responsible for rejecting unauthorized attempts

### Requirement: Repair voiding
The system SHALL allow only admins to void repair records through a destructive confirmation that requires a non-empty reason. Voiding SHALL preserve the original repair code, financial values, lifecycle history, and vehicle relationship, and SHALL exclude the repair from active repair totals and active vehicle repair cost summaries.

#### Scenario: Admin voids repair
- **WHEN** an admin voids a repair with a reason
- **THEN** the repair is marked voided, the reason, author, and timestamp are recorded, and the repair remains consultable

#### Scenario: Voiding without reason
- **WHEN** an admin confirms voiding without a reason
- **THEN** the system rejects the operation and keeps the repair active

#### Scenario: Capturista attempts to void repair
- **WHEN** a capturista attempts to void a repair
- **THEN** the system rejects the operation and the repair remains unchanged

### Requirement: Repair financial rules
The system SHALL store repair monetary amounts in the selected original currency and calculate a locked USD total using the exchange rate captured at the time of save. Repair amounts SHALL be non-negative, the total SHALL be greater than zero for saved repairs, and voided repairs SHALL retain their historical financial values without contributing to active totals.

#### Scenario: Repair total greater than zero
- **WHEN** a user submits a repair with all monetary components empty or zero
- **THEN** the system rejects the save and explains that at least one positive cost amount is required

#### Scenario: Negative repair amount
- **WHEN** a user enters a negative labor, parts, tax, outside service, or other amount
- **THEN** the system rejects the save and identifies the invalid amount

#### Scenario: Locked historical exchange rate
- **WHEN** the exchange rate changes after a repair has been saved
- **THEN** the saved repair continues to show the original exchange rate and USD total captured for that repair

### Requirement: Repair UI follows shared operational patterns
The Repairs module SHALL apply `docs/design-system/UI_GUIDELINES.md` and shared UI patterns for page composition, tables, filters, forms, details, statuses, financial totals, destructive confirmations, feedback, loading states, empty states, and responsive behavior. The module MUST NOT introduce a repair-specific visual system when a shared pattern applies.

#### Scenario: Shared design system applied
- **WHEN** the Repairs module is implemented
- **THEN** list, create, detail, lifecycle action, completion, cancellation, void confirmation, loading, empty, validation, and feedback states apply the shared design guidelines

#### Scenario: Missing repair pattern becomes shared
- **WHEN** the Repairs module needs a reusable service-work, lifecycle, or financial pattern that is not yet available
- **THEN** the pattern is defined or adjusted as shared UI behavior before being used as a repair-only solution
