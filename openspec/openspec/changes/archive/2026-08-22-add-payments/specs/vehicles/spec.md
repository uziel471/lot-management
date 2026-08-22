## ADDED Requirements

### Requirement: Vehicle financial payment summary
The system SHALL show paid and pending USD totals for vehicle-related purchases, repairs, and expenses in vehicle detail. The payment summary SHALL keep acquisition cost, repair cost, and expense cost as separate concepts and SHALL NOT present their combined payment balance as total vehicle cost.

#### Scenario: Vehicle with paid and pending acquisition cost
- **WHEN** a user opens a vehicle detail whose purchases have active payment applications
- **THEN** the acquisition-cost section shows acquisition cost, paid amount, and pending balance as distinct labeled values

#### Scenario: Vehicle with paid and pending repair cost
- **WHEN** a user opens a vehicle detail whose repairs have active payment applications
- **THEN** the repair section shows repair cost, paid amount, and pending balance as distinct labeled values

#### Scenario: Vehicle with paid and pending expense cost
- **WHEN** a user opens a vehicle detail whose vehicle-related expenses have active payment applications
- **THEN** the expense section shows expense cost, paid amount, and pending balance as distinct labeled values

#### Scenario: General expenses excluded from vehicle payment summary
- **WHEN** a general expense without vehicle association has active payment applications
- **THEN** those payments do not appear in any vehicle detail payment summary

#### Scenario: Voided payments excluded from vehicle balances
- **WHEN** a payment related to a vehicle's purchase, repair, or expense is voided
- **THEN** the vehicle detail recalculates paid and pending values excluding that payment

### Requirement: Vehicle voiding respects active payments
The system SHALL prevent voiding a vehicle while any of its active purchases, repairs, or vehicle-related expenses have active payment applications. The rejection SHALL identify the blocking payment records and the source documents they pay.

#### Scenario: Vehicle with active payment cannot be voided
- **WHEN** an admin attempts to void a vehicle with active payment applications on its related financial records
- **THEN** the system rejects the void operation, leaves the vehicle active, and names the blocking payments and source documents

#### Scenario: Vehicle can be voided after related payments are resolved
- **WHEN** all active payment applications against the vehicle's related financial records have been voided and all other vehicle voiding rules are satisfied
- **THEN** an admin can void the vehicle
