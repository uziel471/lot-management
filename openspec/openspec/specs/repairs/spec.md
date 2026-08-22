# repairs Specification

## Purpose
TBD: document the Repairs capability purpose after archive sync.

## Requirements

### Requirement: Repair payment visibility
The Repairs module SHALL expose payment status, active paid total, and pending balance for each payable repair using payments applied through the Payments module. Repair payment data SHALL be consultable from repair list, repair detail, and the vehicle repair section without changing the immutable repair financial values.

#### Scenario: Repair list shows payment status
- **WHEN** a user opens the repairs list after payments have been recorded
- **THEN** each payable repair row shows whether it is unpaid, partially paid, or paid, plus paid USD total and pending USD balance where space allows

#### Scenario: Repair detail shows payment applications
- **WHEN** a user opens a repair detail with active payment applications
- **THEN** the detail shows active paid total, pending balance, and links to the related payment records without presenting completed financial values as editable

#### Scenario: Cancelled or voided repair is not payable
- **WHEN** a repair is cancelled or voided
- **THEN** the repair does not appear as payable for new payment applications

#### Scenario: Voided payments excluded from repair balance
- **WHEN** a payment applied to a repair is voided
- **THEN** the repair payment status and pending balance are recalculated excluding that payment

### Requirement: Repair voiding and cancellation respect active payments
The system SHALL prevent voiding or cancelling a repair while it has active payment applications. The rejection SHALL identify the active payment records that must be voided or otherwise resolved before the repair can leave the payable lifecycle.

#### Scenario: Repair with active payment cannot be voided
- **WHEN** an admin attempts to void a repair that has active payment applications
- **THEN** the system rejects the void operation, leaves the repair active, and names the blocking payments

#### Scenario: Repair with active payment cannot be cancelled
- **WHEN** an authorized user attempts to cancel a repair that has active payment applications
- **THEN** the system rejects the cancellation, leaves the repair in its previous status, and names the blocking payments

#### Scenario: Repair can be voided after payments are resolved
- **WHEN** all active payment applications against a repair have been voided
- **THEN** an admin can void the repair if all other repair voiding rules are satisfied
