# purchases Specification

## Purpose
TBD: document the Purchases capability purpose after archive sync.

## Requirements

### Requirement: Purchase payment visibility
The Purchases module SHALL expose payment status, active paid total, and pending balance for each active purchase using payments applied through the Payments module. Purchase payment data SHALL be consultable from purchase list, purchase detail, and the vehicle acquisition-cost block without changing the immutable purchase financial values.

#### Scenario: Purchase list shows payment status
- **WHEN** a user opens the purchases list after payments have been recorded
- **THEN** each active purchase row shows whether it is unpaid, partially paid, or paid, plus paid USD total and pending USD balance where space allows

#### Scenario: Purchase detail shows payment applications
- **WHEN** a user opens a purchase detail with active payment applications
- **THEN** the detail shows active paid total, pending balance, and links to the related payment records without presenting the purchase as editable

#### Scenario: Voided payments excluded from purchase balance
- **WHEN** a payment applied to a purchase is voided
- **THEN** the purchase payment status and pending balance are recalculated excluding that payment

### Requirement: Purchase voiding respects active payments
The system SHALL prevent voiding an active purchase while it has active payment applications. The rejection SHALL identify the active payment records that must be voided or otherwise resolved before the purchase can be voided.

#### Scenario: Purchase with active payment cannot be voided
- **WHEN** an admin attempts to void a purchase that has active payment applications
- **THEN** the system rejects the void operation, leaves the purchase active, and names the blocking payments

#### Scenario: Purchase can be voided after payments are resolved
- **WHEN** all active payment applications against a purchase have been voided
- **THEN** an admin can void the purchase if all other purchase voiding rules are satisfied
