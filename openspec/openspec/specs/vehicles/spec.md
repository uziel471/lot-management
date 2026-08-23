# vehicles Specification

## Purpose
TBD: document the Vehicles capability purpose after archive sync.

## Requirements

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

### Requirement: Vehicle image management
The system SHALL allow authorized users to attach image files to an active vehicle, consult those images from vehicle detail, and delete images that should no longer appear. Vehicle images SHALL be associated with exactly one vehicle and SHALL keep metadata for original file name, MIME type, byte size, upload author, upload timestamp, and storage reference. Deleting an image SHALL remove it from normal vehicle image views and SHALL NOT delete, void, or otherwise modify the vehicle or its financial records.

#### Scenario: Upload vehicle image
- **WHEN** an authorized user uploads a supported image file for an active vehicle
- **THEN** the image becomes associated with that vehicle and appears in the vehicle detail gallery with its metadata

#### Scenario: View vehicle images
- **WHEN** a user opens a vehicle detail that has active images
- **THEN** the system shows a gallery of those images and allows the user to open an image for larger viewing

#### Scenario: Vehicle without images
- **WHEN** a user opens a vehicle detail that has no active images
- **THEN** the image section shows an empty state indicating that no images are registered for the vehicle

#### Scenario: Unsupported image rejected
- **WHEN** an authorized user attempts to upload a file whose type or size is not supported by the vehicle image rules
- **THEN** the system rejects the upload, explains the validation problem, and does not create image metadata

#### Scenario: Image count limit enforced
- **WHEN** an authorized user attempts to upload images beyond the configured maximum number of active images for a vehicle
- **THEN** the system rejects the upload and leaves the existing vehicle images unchanged

#### Scenario: Delete vehicle image
- **WHEN** an authorized user deletes an image from a vehicle
- **THEN** the image no longer appears in normal vehicle image galleries and the vehicle remains consultable with its existing data and transactions intact

#### Scenario: Deleted image excluded from gallery
- **WHEN** a vehicle has an image that was previously deleted
- **THEN** the vehicle detail gallery excludes that deleted image from the active image list

#### Scenario: Upload blocked for voided vehicle
- **WHEN** an authorized user attempts to upload an image for a voided vehicle
- **THEN** the system rejects the upload and does not create image metadata

#### Scenario: Unauthorized image mutation rejected
- **WHEN** a user without vehicle image write permission attempts to upload or delete a vehicle image
- **THEN** the system rejects the operation and leaves the vehicle image list unchanged
