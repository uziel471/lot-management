# payments Specification

## Purpose
Defines the Payments module for recording outbound payments against operational obligations, tracking allocations, balances, evidence, permissions, and voiding without editing the source financial records.

## Requirements

### Requirement: Operational payments list
The system SHALL present payments in a compact operational list that includes a standard page header, role-aware create action, search, filters, result summary, scannable table, active USD total, empty states, and filter reset behavior. The list SHALL support filtering by payment date range, provider, source document type, payment method, currency, payment status, and voided inclusion behavior.

#### Scenario: Payments list with filters
- **WHEN** an authorized user opens the payments module
- **THEN** the user sees search or filter controls for provider, source document type, method, currency, date range, status, and voided inclusion, plus a table with payment code, date, provider when present, method, original total, USD total, status, application count, and available actions

#### Scenario: Active payment total in list
- **WHEN** a user applies filters to the payments list
- **THEN** the footer or summary total reflects the USD total of active, non-voided payments in the current result set

#### Scenario: Filtered payments no-results state
- **WHEN** a user's active search or filters match no payments
- **THEN** the system shows a filtered empty state distinct from the initial no-data state and provides a clear way to return to the default list

#### Scenario: Voided payments in list
- **WHEN** the user includes voided payments in the list
- **THEN** voided rows remain consultable, are visually distinguished, and do not contribute to active payment totals

#### Scenario: Payments list in reduced viewport
- **WHEN** a user opens the payments list on a narrow viewport
- **THEN** payment code, date, USD total, status, detail access, and applicable filters remain usable without requiring horizontal precision that prevents operation

### Requirement: Sectioned payment creation form
The system SHALL present payment creation as a full-page sectioned form for payment identity, provider context, currency, payment amount, applications to source documents, payment references, evidence, and notes. The form SHALL require payment date, currency, valid exchange rate when applicable, method, positive payment amount, and at least one valid application before saving.

#### Scenario: Payment form sections
- **WHEN** an admin or capturista opens the new payment page
- **THEN** the form groups fields into clear sections for payment data, provider context, currency and amount, applications, references, evidence, and notes, with required fields visibly identified

#### Scenario: USD exchange-rate behavior
- **WHEN** the user selects USD as the payment currency
- **THEN** the exchange rate is shown as `1`, cannot be edited, and remains consistent with the value that will be submitted

#### Scenario: MXN exchange-rate validation
- **WHEN** the user selects MXN as the payment currency and submits an empty, zero, negative, or invalid exchange rate
- **THEN** the system rejects the save with validation feedback and does not create a payment

#### Scenario: Payment total greater than zero
- **WHEN** a user submits a payment with an empty, zero, or negative amount
- **THEN** the system rejects the save and explains that a positive payment amount is required

#### Scenario: Payment save pending state
- **WHEN** the user submits a valid payment
- **THEN** the save action indicates pending state and prevents accidental duplicate interaction while server-side submission-token protection remains the authoritative duplicate defense

### Requirement: Payment applications
The system SHALL allow a payment to apply its amount to one or more active purchase, expense, or repair obligations. Each application SHALL identify exactly one source document, store the applied amount in the payment currency and locked USD equivalent, and contribute to the paid total and pending balance of that source document.

#### Scenario: Single-document payment
- **WHEN** a user creates a payment whose application targets one active purchase
- **THEN** the payment is saved with one application and the purchase shows its paid total and pending balance updated by the applied amount

#### Scenario: Multi-document payment
- **WHEN** a user creates a payment with applications to multiple active obligations
- **THEN** the system saves all applications atomically and each source document reflects only the amount applied to it

#### Scenario: Application total must match payment amount
- **WHEN** a user submits payment applications whose sum does not equal the payment amount
- **THEN** the system rejects the save, identifies the mismatch, and does not create a payment code

#### Scenario: Application to inactive source document
- **WHEN** a user applies a payment to a voided, cancelled, nonexistent, or otherwise non-payable source document
- **THEN** the system rejects the save and leaves all source document balances unchanged

#### Scenario: Unsupported source document type
- **WHEN** a user submits an application for a source document type other than purchase, expense, or repair
- **THEN** the system rejects the save and identifies the unsupported type

### Requirement: Balance and overpayment rules
The system SHALL calculate paid totals and pending balances from active payment applications. The system MUST NOT allow active applications to exceed the active USD total of a source document, and voided payments SHALL no longer contribute to paid totals or reduce pending balances.

#### Scenario: Partial payment
- **WHEN** a user applies less than the source document's pending balance
- **THEN** the source document remains payable and shows the remaining pending balance

#### Scenario: Full payment
- **WHEN** a user applies exactly the source document's pending balance
- **THEN** the source document shows paid status and no longer appears as payable for new payment applications

#### Scenario: Overpayment rejected
- **WHEN** a user attempts to apply more than the source document's pending balance
- **THEN** the system rejects the payment and explains which source document would be overpaid

#### Scenario: Voided payment releases balance
- **WHEN** a payment is voided
- **THEN** its applications stop contributing to paid totals and the affected source documents become payable again for the released balances

#### Scenario: Locked historical exchange rate
- **WHEN** exchange rates change after a payment has been saved
- **THEN** the saved payment and its applications continue to show the original exchange rate and USD equivalents captured for that payment

### Requirement: Read-only payment detail
The system SHALL present each payment detail as a consultable financial record with sections for identity, provider context, date, currency, exchange rate, method, amount, source applications, references, evidence, notes, and voiding metadata. The detail SHALL expose only role-appropriate actions and SHALL NOT offer edit or hard delete.

#### Scenario: Active payment detail
- **WHEN** a user opens the detail for an active payment
- **THEN** the user sees payment code, date, provider when present, method, original amount, USD amount, exchange rate, applications with source document links, references, evidence when present, notes when present, and role-appropriate actions

#### Scenario: Multi-application detail
- **WHEN** a payment has applications to more than one source document
- **THEN** the detail lists each application with source type, source code, applied original amount, applied USD amount, and resulting source balance

#### Scenario: Voided payment detail
- **WHEN** a user opens the detail for a voided payment
- **THEN** the detail clearly identifies the payment as voided, shows void reason, author, date, original financial values, and states that it no longer contributes to paid totals

#### Scenario: Role-aware payment actions
- **WHEN** a lectura user opens any payment detail
- **THEN** the user can consult the record but does not see create, void, or other write actions, while the server remains responsible for rejecting unauthorized attempts

### Requirement: Payment voiding
The system SHALL allow only admins to void payment records through a destructive confirmation that requires a non-empty reason. Voiding SHALL preserve the original payment code, financial values, applications, evidence references, provider relationship, and source document relationships, and SHALL exclude the payment from active paid totals and source balances.

#### Scenario: Admin voids payment
- **WHEN** an admin voids a payment with a reason
- **THEN** the payment is marked voided, the reason, author, and timestamp are recorded, and the payment remains consultable

#### Scenario: Voiding without reason
- **WHEN** an admin confirms voiding without a reason
- **THEN** the system rejects the operation and keeps the payment active

#### Scenario: Capturista attempts to void payment
- **WHEN** a capturista attempts to void a payment
- **THEN** the system rejects the operation and the payment remains unchanged

### Requirement: Payment permissions and audit
The system SHALL allow roles `admin` and `capturista` to create payments. The system SHALL reserve payment voiding to `admin`. The role `lectura` MUST NOT execute payment write operations. Every payment creation and voiding operation SHALL record the acting user and server timestamp, and permission checks SHALL occur in the operation itself, not only in navigation.

#### Scenario: Capturista creates payment
- **WHEN** a capturista creates a valid payment
- **THEN** the payment is saved with the capturista as author and a server timestamp

#### Scenario: Lectura attempts payment write
- **WHEN** a lectura user invokes any payment write operation directly
- **THEN** the system rejects the operation and does not modify payment or source document balance data

#### Scenario: Interface follows payment permissions
- **WHEN** a user opens the payments module
- **THEN** the interface shows create and void actions only when the user's role permits those operations

### Requirement: Payment evidence
The system SHALL allow a payment to reference evidence such as receipt, transfer proof, check image metadata, invoice, or external document metadata when evidence support is available. Evidence SHALL be consultable from payment detail and SHALL remain associated with the payment after voiding.

#### Scenario: Payment with evidence
- **WHEN** a user saves a payment with supported evidence metadata
- **THEN** the payment detail exposes the evidence in a consultable way without changing the financial total

#### Scenario: Payment without evidence
- **WHEN** a user saves a payment without evidence
- **THEN** the payment can be saved if all required data is valid and the detail clearly shows no evidence is attached

#### Scenario: Voided payment preserves evidence
- **WHEN** a payment with evidence is voided
- **THEN** the evidence remains consultable from the voided payment detail

### Requirement: Payment UI follows shared operational patterns
The Payments module SHALL apply `docs/design-system/UI_GUIDELINES.md` and shared UI patterns for page composition, tables, filters, forms, details, statuses, financial totals, evidence, destructive confirmations, feedback, loading states, empty states, and responsive behavior. The module MUST NOT introduce a payment-specific visual system when a shared pattern applies.

#### Scenario: Shared design system applied
- **WHEN** the Payments module is implemented
- **THEN** list, create, detail, void confirmation, payment application, loading, empty, validation, and feedback states apply the shared design guidelines

#### Scenario: Missing payment pattern becomes shared
- **WHEN** the Payments module needs a reusable allocation, balance, evidence, or immutable-record pattern that is not yet available
- **THEN** the pattern is defined or adjusted as shared UI behavior before being used as a payment-only solution
