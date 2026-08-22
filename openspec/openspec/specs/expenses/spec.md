# expenses Specification

## Purpose
TBD: document the Expenses capability purpose after archive sync.

## Requirements

### Requirement: Expense payment visibility
The Expenses module SHALL expose payment status, active paid total, and pending balance for each active expense using payments applied through the Payments module. Expense payment data SHALL be consultable from expense list, expense detail, and vehicle-related expense summaries without changing the immutable expense financial values.

#### Scenario: Expense list shows payment status
- **WHEN** a user opens the expenses list after payments have been recorded
- **THEN** each active expense row shows whether it is unpaid, partially paid, or paid, plus paid USD total and pending USD balance where space allows

#### Scenario: Expense detail shows payment applications
- **WHEN** a user opens an expense detail with active payment applications
- **THEN** the detail shows active paid total, pending balance, and links to the related payment records without presenting the expense as editable

#### Scenario: General expense payment visibility
- **WHEN** a general expense without vehicle association has active payment applications
- **THEN** its detail and list expose payment status without implying that the payment contributes to a vehicle total

#### Scenario: Voided payments excluded from expense balance
- **WHEN** a payment applied to an expense is voided
- **THEN** the expense payment status and pending balance are recalculated excluding that payment

### Requirement: Expense voiding respects active payments
The system SHALL prevent voiding an active expense while it has active payment applications. The rejection SHALL identify the active payment records that must be voided or otherwise resolved before the expense can be voided.

#### Scenario: Expense with active payment cannot be voided
- **WHEN** an admin attempts to void an expense that has active payment applications
- **THEN** the system rejects the void operation, leaves the expense active, and names the blocking payments

#### Scenario: Expense can be voided after payments are resolved
- **WHEN** all active payment applications against an expense have been voided
- **THEN** an admin can void the expense if all other expense voiding rules are satisfied
