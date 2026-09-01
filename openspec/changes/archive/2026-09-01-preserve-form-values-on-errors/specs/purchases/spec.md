## MODIFIED Requirements

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
