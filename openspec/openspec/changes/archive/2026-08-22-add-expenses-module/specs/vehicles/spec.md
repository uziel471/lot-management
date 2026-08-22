## ADDED Requirements

### Requirement: Expense display in vehicle detail
The system SHALL present a vehicle expense section in vehicle detail using the same shared section, table, status, empty-state, and responsive patterns as the Expenses module. The section SHALL show active vehicle-related expense totals in USD, category summary, related expense records, and SHALL clearly exclude voided expenses from active vehicle expense totals.

#### Scenario: Vehicle without expenses
- **WHEN** a user opens a vehicle detail with no related expense records
- **THEN** the expense section shows a zero state that explains no expenses are registered for the vehicle

#### Scenario: Vehicle with active expenses
- **WHEN** a user opens a vehicle detail for a vehicle with active non-voided expenses
- **THEN** the expense section shows the active USD expense total, category summary, and a scannable list of related expenses

#### Scenario: General expenses excluded from vehicle detail
- **WHEN** general expenses exist without a vehicle association
- **THEN** those expenses do not appear in any vehicle detail expense section or vehicle expense total

#### Scenario: Vehicle with voided expenses
- **WHEN** a vehicle has voided expenses in its history
- **THEN** the expense section distinguishes voided expenses and excludes them from active vehicle expense totals

#### Scenario: Vehicle expense navigation
- **WHEN** a user follows an expense from the vehicle detail
- **THEN** the system opens the corresponding expense detail without losing the expense's relationship to the vehicle

### Requirement: Vehicle cost summary distinguishes expense cost
The system SHALL distinguish acquisition cost, repair cost, and expense cost wherever vehicle financial summaries include those concepts. Expense cost SHALL be presented as its own active USD total and MUST NOT be merged into acquisition cost or repair cost unless a future explicit requirement defines a combined total.

#### Scenario: Vehicle financial totals shown together
- **WHEN** a vehicle has active purchases, active repairs, and active expenses
- **THEN** the vehicle detail shows acquisition cost, repair cost, and expense cost as separate labeled totals

#### Scenario: Expense cost without purchases or repairs
- **WHEN** a vehicle has active expenses but no purchases or repairs
- **THEN** the vehicle detail shows expense cost without implying that it is acquisition cost or repair cost

#### Scenario: Voided expense excluded from expense cost
- **WHEN** an expense related to a vehicle is voided
- **THEN** the vehicle's active expense cost total no longer includes that expense while the historical expense remains consultable
