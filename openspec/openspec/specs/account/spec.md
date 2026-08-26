# account Specification

## Purpose

Define the signed-in user's own Cuenta module for reviewing account identity, understanding access context, changing their own password, and ending the current session without entering administrator user management.

## Requirements

### Requirement: Cuenta profile summary
The system SHALL provide a Cuenta screen for every authenticated active user that displays the user's own name, email, role, and account state using the shared operational page composition. The screen MUST NOT expose administrative user-management actions such as creating users, editing roles, activating or deactivating users, deleting users, or resetting another user's password.

#### Scenario: User opens Cuenta
- **WHEN** an authenticated active user opens Cuenta
- **THEN** the screen shows that user's own name, email, role, account state, and available account actions

#### Scenario: Non-admin views Cuenta
- **WHEN** a `capturista` or `lectura` user opens Cuenta
- **THEN** the screen does not offer actions to administer other users or change their own role

#### Scenario: Anonymous visitor opens Cuenta
- **WHEN** a person without a valid session opens Cuenta
- **THEN** the system redirects the person to login without exposing account data

### Requirement: Own password change in Cuenta
The Cuenta module SHALL allow an authenticated active user to change their own password by entering the current password and the new password. The form SHALL show required fields, validation errors, pending state, save and cancel actions, and success or failure feedback. A successful password change SHALL preserve the current session as allowed by the existing authentication behavior and SHALL communicate that the user's other active sessions are revoked.

#### Scenario: Password change succeeds
- **WHEN** an authenticated user submits the correct current password and a valid new password
- **THEN** the system updates the password, shows success feedback, and communicates that other active sessions were revoked

#### Scenario: Current password is incorrect
- **WHEN** an authenticated user submits an incorrect current password
- **THEN** the system rejects the change, keeps the user in the Cuenta password form, and shows a validation message without changing the password

#### Scenario: Password form is invalid
- **WHEN** an authenticated user submits the password form with missing or invalid fields
- **THEN** the system shows field-level or form-level validation feedback and does not change the password

### Requirement: Cuenta session actions
The Cuenta module SHALL provide a clear sign-out action for the current user. Signing out SHALL use the existing server-side session termination behavior and SHALL not expose session tokens, password hashes, or internal authentication records to the browser.

#### Scenario: User signs out from Cuenta
- **WHEN** an authenticated user activates sign out from Cuenta
- **THEN** the system ends the current session and redirects the user to login or the configured signed-out destination

#### Scenario: Account data remains protected
- **WHEN** Cuenta renders profile or session actions
- **THEN** the client receives only the account fields needed by the view and no password hashes, session tokens, or internal authentication records

### Requirement: Cuenta follows shared operational UI
The Cuenta module SHALL apply `docs/design-system/UI_GUIDELINES.md` and shared patterns for page anatomy, compact profile summaries, action groups, forms, validation, pending state, feedback, responsive behavior, and accessibility. Cuenta MUST NOT introduce a module-specific visual system when an applicable shared pattern exists.

#### Scenario: Cuenta redesign follows guidelines
- **WHEN** the Cuenta module redesign is implemented
- **THEN** its profile summary, password form, sign-out action, validation states, feedback, and responsive layouts apply the shared design guidelines and reusable patterns

#### Scenario: Cuenta on narrow viewport
- **WHEN** an authenticated user opens Cuenta on a narrow viewport
- **THEN** the profile summary, password form, and account actions remain readable and operable without overlapping or hiding critical content
