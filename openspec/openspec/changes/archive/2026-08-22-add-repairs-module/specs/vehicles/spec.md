## ADDED Requirements

### Requirement: Repair display in vehicle detail
The system SHALL present a vehicle repair section in vehicle detail using the same shared section, table, status, empty-state, and responsive patterns as the Repairs module. The section SHALL show active repair totals in USD, status counts or summary, related repair records, and shall clearly exclude voided repairs from active repair totals.

#### Scenario: Vehicle without repairs
- **WHEN** a user opens a vehicle detail with no repair records
- **THEN** the repair section shows a zero state that explains no repairs are registered for the vehicle

#### Scenario: Vehicle with active repairs
- **WHEN** a user opens a vehicle detail for a vehicle with active non-voided repairs
- **THEN** the repair section shows the active USD repair total, status summary, and a scannable list of related repairs

#### Scenario: Vehicle with completed repairs
- **WHEN** a vehicle has completed repairs
- **THEN** the repair section identifies completed work and keeps repair detail links available for consultation

#### Scenario: Vehicle with voided repairs
- **WHEN** a vehicle has voided repairs in its history
- **THEN** the repair section distinguishes voided repairs and excludes them from active repair totals

#### Scenario: Vehicle repair navigation
- **WHEN** a user follows a repair from the vehicle detail
- **THEN** the system opens the corresponding repair detail without losing the repair's relationship to the vehicle

### Requirement: Vehicle cost summary distinguishes repair cost
The system SHALL distinguish acquisition cost from repair cost wherever vehicle financial summaries include both concepts. Repair cost SHALL be presented as its own active USD total and MUST NOT be merged into acquisition cost unless a future explicit requirement defines a combined total.

#### Scenario: Acquisition and repair costs shown together
- **WHEN** a vehicle has active purchases and active repairs
- **THEN** the vehicle detail shows acquisition cost and repair cost as separate labeled totals

#### Scenario: Repair cost without purchases
- **WHEN** a vehicle has active repairs but no purchases
- **THEN** the vehicle detail shows repair cost without implying that it is acquisition cost

#### Scenario: Voided repair excluded from repair cost
- **WHEN** a repair is voided
- **THEN** the vehicle's active repair cost total no longer includes that repair while the historical repair remains consultable
