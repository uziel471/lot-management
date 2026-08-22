## Purpose

Defines the Expenses module for tracking general and vehicle-related operating expenses with financial totals, provider context, evidence, voiding, permissions, and vehicle-level visibility.

## ADDED Requirements

### Requirement: Operational expenses list
The system SHALL present expenses in a compact operational list that includes a standard page header, role-aware create action, search, filters, result summary, scannable table, active USD total, empty states, and filter reset behavior. The list SHALL support filtering by vehicle association, provider, expense category, date range, currency, payment method, and voided inclusion behavior.

#### Scenario: Expenses list with filters
- **WHEN** an authorized user opens the expenses module
- **THEN** the user sees search or filter controls for vehicle, provider, category, date range, currency, payment method, and voided inclusion, plus a table with expense code, date, category, vehicle when present, provider when present, original total, USD total, status, and available actions

#### Scenario: Active expense total in list
- **WHEN** a user applies filters to the expenses list
- **THEN** the footer or summary total reflects the USD total of active, non-voided expenses in the current result set

#### Scenario: Filtered expenses no-results state
- **WHEN** a user's active search or filters match no expenses
- **THEN** the system shows a filtered empty state distinct from the initial no-data state and provides a clear way to return to the default list

#### Scenario: Voided expenses in list
- **WHEN** the user includes voided expenses in the list
- **THEN** voided rows remain consultable, are visually distinguished, and do not contribute to active expense totals

#### Scenario: Expenses list in reduced viewport
- **WHEN** a user opens the expenses list on a narrow viewport
- **THEN** expense code, date, category, USD total, status, detail access, and applicable filters remain usable without requiring horizontal precision that prevents operation

### Requirement: Sectioned expense creation form
The system SHALL present expense creation as a full-page sectioned form for classification, optional vehicle association, optional provider, date, currency, financial amounts, payment data, references, evidence, and notes. The form SHALL require an active expense category, expense date, currency, valid exchange rate when applicable, and a positive expense amount before saving.

#### Scenario: Expense form sections
- **WHEN** an admin or capturista opens the new expense page
- **THEN** the form groups fields into clear sections for classification, vehicle and provider context, financial data, payment and references, evidence, and notes, with required fields visibly identified

#### Scenario: Optional vehicle association
- **WHEN** a user records a general operating expense without selecting a vehicle
- **THEN** the expense can be saved if all other required data is valid and the detail identifies it as a general expense

#### Scenario: Active vehicle requirement
- **WHEN** a user tries to create a vehicle-related expense for a voided vehicle or with a nonexistent vehicle
- **THEN** the system rejects the save, identifies the vehicle problem, and does not create an expense code

#### Scenario: Optional provider
- **WHEN** a user records an expense without selecting a provider
- **THEN** the expense can be saved if all other required data is valid and the detail identifies the provider as internal, unspecified, or not applicable according to the captured value

#### Scenario: Live expense financial totals
- **WHEN** the user edits currency, exchange rate, amount, tax, fees, discount, or adjustment fields
- **THEN** the form updates the original-currency total and USD equivalent before saving, using the same monetary rules as the saved expense

#### Scenario: USD exchange-rate behavior
- **WHEN** the user selects USD as the expense currency
- **THEN** the exchange rate is shown as `1`, cannot be edited, and remains consistent with the value that will be submitted

#### Scenario: MXN exchange-rate validation
- **WHEN** the user selects MXN as the expense currency and submits an empty, zero, negative, or invalid exchange rate
- **THEN** the system rejects the save with validation feedback and does not create an expense

#### Scenario: Expense total greater than zero
- **WHEN** a user submits an expense with all monetary components empty or zero
- **THEN** the system rejects the save and explains that a positive expense amount is required

#### Scenario: Expense save pending state
- **WHEN** the user submits a valid expense
- **THEN** the save action indicates pending state and prevents accidental duplicate interaction while server-side submission-token protection remains the authoritative duplicate defense

### Requirement: Expense categories and classification
The system SHALL classify every expense under a controlled category so expenses can be filtered and reported consistently. Categories SHALL be active when used for new expenses, while historical expenses SHALL remain legible if their category later becomes inactive or unavailable for new capture.

#### Scenario: Active category required
- **WHEN** a user creates an expense
- **THEN** the category control offers active expense categories and the save operation rejects nonexistent or inactive categories

#### Scenario: Historical category remains legible
- **WHEN** an expense references a category that is later made inactive
- **THEN** the expense detail and list continue to show the historical category name without requiring the user to reclassify the record

#### Scenario: Category filter
- **WHEN** a user filters the expenses list by category
- **THEN** the list shows only expenses in the selected category while preserving active total behavior

### Requirement: Read-only expense detail
The system SHALL present each expense detail as a consultable financial record with sections for identity, category, vehicle relationship, provider, date, currency, exchange rate, financial breakdown, totals, payment/reference data, evidence, notes, and voiding metadata. The detail SHALL expose only role-appropriate actions and SHALL NOT offer hard delete.

#### Scenario: Active expense detail
- **WHEN** a user opens the detail for an active expense
- **THEN** the user sees expense code, date, category, vehicle when present, provider when present, original total, USD total, exchange rate, payment/reference data, evidence links when present, notes when present, and available role-appropriate actions

#### Scenario: General expense detail
- **WHEN** a user opens a general expense that is not associated with a vehicle
- **THEN** the detail clearly identifies the expense as general and does not imply it contributes to a vehicle cost total

#### Scenario: Vehicle-related expense detail
- **WHEN** a user opens an expense associated with a vehicle
- **THEN** the detail exposes the vehicle relationship in a consultable way and allows navigation to the vehicle detail

#### Scenario: Voided expense detail
- **WHEN** a user opens the detail for a voided expense
- **THEN** the detail clearly identifies the expense as voided, shows void reason, author, date, original financial values, and states that it no longer contributes to active expense totals

#### Scenario: Role-aware expense actions
- **WHEN** a lectura user opens any expense detail
- **THEN** the user can consult the record but does not see create, edit, void, or other write actions, while the server remains responsible for rejecting unauthorized attempts

### Requirement: Expense voiding
The system SHALL allow only admins to void expense records through a destructive confirmation that requires a non-empty reason. Voiding SHALL preserve the original expense code, financial values, evidence references, vehicle relationship, provider relationship, and category, and SHALL exclude the expense from active expense totals and active vehicle expense summaries.

#### Scenario: Admin voids expense
- **WHEN** an admin voids an expense with a reason
- **THEN** the expense is marked voided, the reason, author, and timestamp are recorded, and the expense remains consultable

#### Scenario: Voiding without reason
- **WHEN** an admin confirms voiding without a reason
- **THEN** the system rejects the operation and keeps the expense active

#### Scenario: Capturista attempts to void expense
- **WHEN** a capturista attempts to void an expense
- **THEN** the system rejects the operation and the expense remains unchanged

### Requirement: Expense financial rules
The system SHALL store expense monetary amounts in the selected original currency and calculate a locked USD total using the exchange rate captured at the time of save. Expense amounts SHALL be non-negative, discounts or adjustments SHALL NOT reduce the saved total below zero, the active total SHALL be greater than zero for saved expenses, and voided expenses SHALL retain their historical financial values without contributing to active totals.

#### Scenario: Negative expense amount
- **WHEN** a user enters a negative base amount, tax, fee, or other cost component
- **THEN** the system rejects the save and identifies the invalid amount

#### Scenario: Adjustment makes total non-positive
- **WHEN** a user enters a discount or adjustment that makes the expense total zero or negative
- **THEN** the system rejects the save and explains that the final expense total must be positive

#### Scenario: Locked historical exchange rate
- **WHEN** the exchange rate changes after an expense has been saved
- **THEN** the saved expense continues to show the original exchange rate and USD total captured for that expense

#### Scenario: Voided expense excluded from totals
- **WHEN** an expense is voided
- **THEN** active expense totals no longer include that expense while the historical values remain consultable in detail and filtered lists that include voided records

### Requirement: Expense permissions and audit
The system SHALL allow roles `admin` and `capturista` to create expenses. The system SHALL reserve expense voiding to `admin`. The role `lectura` MUST NOT execute expense write operations. Every expense creation and voiding operation SHALL record the acting user and server timestamp, and permission checks SHALL occur in the operation itself, not only in navigation.

#### Scenario: Capturista creates expense
- **WHEN** a capturista creates a valid expense
- **THEN** the expense is saved with the capturista as author and a server timestamp

#### Scenario: Lectura attempts expense write
- **WHEN** a lectura user invokes any expense write operation directly
- **THEN** the system rejects the operation and does not modify expense data

#### Scenario: Interface follows role permissions
- **WHEN** a user opens the expenses module
- **THEN** the interface shows create and void actions only when the user's role permits those operations

### Requirement: Expense evidence
The system SHALL allow an expense to reference evidence such as receipt, invoice, payment proof, or external document metadata when evidence support is available. Evidence SHALL be consultable from expense detail and SHALL remain associated with the expense after voiding.

#### Scenario: Expense with evidence
- **WHEN** a user saves an expense with supported evidence metadata
- **THEN** the expense detail exposes the evidence in a consultable way without changing the financial total

#### Scenario: Expense without evidence
- **WHEN** a user saves an expense without evidence
- **THEN** the expense can be saved if all required data is valid and the detail clearly shows no evidence is attached

#### Scenario: Voided expense preserves evidence
- **WHEN** an expense with evidence is voided
- **THEN** the evidence remains consultable from the voided expense detail

### Requirement: Expense UI follows shared operational patterns
The Expenses module SHALL apply `docs/design-system/UI_GUIDELINES.md` and shared UI patterns for page composition, tables, filters, forms, details, statuses, financial totals, destructive confirmations, feedback, loading states, empty states, and responsive behavior. The module MUST NOT introduce an expense-specific visual system when a shared pattern applies.

#### Scenario: Shared design system applied
- **WHEN** the Expenses module is implemented
- **THEN** list, create, detail, void confirmation, vehicle expense summary, loading, empty, validation, and feedback states apply the shared design guidelines

#### Scenario: Missing expense pattern becomes shared
- **WHEN** the Expenses module needs a reusable financial, evidence, category, or immutable-record pattern that is not yet available
- **THEN** the pattern is defined or adjusted as shared UI behavior before being used as an expense-only solution
