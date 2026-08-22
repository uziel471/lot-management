## ADDED Requirements

### Requirement: Sale display in vehicle detail
The system SHALL present a vehicle sale section in vehicle detail using the same shared section, table, status, empty-state, and responsive patterns as the SALES module. The section SHALL show active sale price, acquisition cost, repair cost, vehicle-related expense cost, total cost, profit, ROI, sale metadata, and related sale records, and SHALL clearly exclude voided sales from the active sale summary.

#### Scenario: Vehicle without sale
- **WHEN** a user opens a vehicle detail with no active sale
- **THEN** the sale section shows a zero state that explains no sale is registered for the vehicle

#### Scenario: Vehicle with active sale
- **WHEN** a user opens a vehicle detail for a vehicle with an active sale
- **THEN** the sale section shows sale price, total cost, profit, ROI, sale date, buyer when present, and a link to the sale detail

#### Scenario: Vehicle with voided sale
- **WHEN** a vehicle has a voided sale in its history but no active sale
- **THEN** the sale section distinguishes the voided sale, keeps it consultable, and does not present it as the active financial result

#### Scenario: Vehicle sale navigation
- **WHEN** a user follows a sale from the vehicle detail
- **THEN** the system opens the corresponding sale detail without losing the sale's relationship to the vehicle

### Requirement: Vehicle financial summary includes sale result
The system SHALL distinguish acquisition cost, repair cost, expense cost, sale price, profit, and ROI wherever vehicle financial summaries include the sale result. Profit SHALL NOT be shown as a stored or manually edited vehicle field; it SHALL be derived from the active sale and active vehicle costs.

#### Scenario: Sold vehicle financial totals shown together
- **WHEN** a vehicle has active costs and an active sale
- **THEN** the vehicle detail shows acquisition cost, repair cost, vehicle-related expense cost, total cost, sale price, profit, and ROI as separately labeled values

#### Scenario: Unsold vehicle financial summary
- **WHEN** a vehicle has active costs but no active sale
- **THEN** the vehicle detail shows cost totals without implying profit or ROI exists yet

#### Scenario: Voided sale excluded from vehicle result
- **WHEN** a sale is voided
- **THEN** the vehicle's active sale price, profit, and ROI summary no longer include that sale while the historical sale remains consultable

### Requirement: Vehicle operations respect active sale
The system SHALL prevent vehicle operations that would contradict an active sale record. A vehicle with an active sale SHALL NOT be offered for new sales and SHALL NOT allow operational edits that would rewrite the sold unit's financial identity, while historical consultation remains available.

#### Scenario: Sold vehicle unavailable for new sale
- **WHEN** a user opens the sale vehicle selector
- **THEN** vehicles with an active sale are not offered as selectable sale candidates

#### Scenario: Active sale blocks vehicle annulment
- **WHEN** an admin attempts to annul a vehicle with an active sale
- **THEN** the system rejects the operation, identifies the active sale that blocks it, and leaves the vehicle unchanged

#### Scenario: Sold vehicle remains consultable
- **WHEN** a user opens a sold vehicle from inventory, search, or sale detail navigation
- **THEN** the system keeps the vehicle detail consultable with its historical identity, status, costs, and active sale summary
