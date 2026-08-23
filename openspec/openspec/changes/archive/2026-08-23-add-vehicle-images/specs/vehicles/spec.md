## ADDED Requirements

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
