## Why

Cuenta is the authenticated user's own access surface, but its behavior is currently implied across the shell, authentication, and users specs instead of being defined as a coherent module. This redesign makes profile, role visibility, password change, and sign-out flows explicit while keeping administrative user management separate.

## What Changes

- Introduce a Cuenta module for the signed-in user to review their own identity, email, role, account state, and session-oriented actions.
- Redesign the own-password change experience with visible current-password confirmation, validation, pending state, save/cancel behavior, session-revocation messaging, and success/failure feedback.
- Present account actions from the authenticated shell in a consistent way, including opening Cuenta and signing out without exposing user-administration actions to non-admin roles.
- Keep admin-only user administration in Usuarios, including creating users, editing roles, activating/deactivating users, and resetting another user's password.
- Preserve existing authentication and authorization behavior: private routes require a valid session, roles remain `admin`, `capturista`, and `lectura`, users cannot self-register, and server-side permission checks remain authoritative.

## Capabilities

### New Capabilities

- `account`: Defines the signed-in user's own Cuenta experience, including profile summary, role/account state visibility, own-password change, sign-out affordance, feedback, and responsive behavior.

### Modified Capabilities

- `users`: Clarifies that self-service password change belongs to Cuenta while administrator user management and administrator password resets remain in Usuarios.
- `ui-design-system`: Extends the shared redesign contract to the Cuenta module and reusable patterns for compact profile summaries, account actions, credential-change forms, and session-related feedback.

## Impact

- Affects authenticated account routes under `src/app/(app)/cuenta` or the equivalent current account route structure.
- Affects account UI components under `src/features/account` or the nearest existing feature boundary for current-user account screens.
- May affect the authenticated shell account menu or header controls used to reach Cuenta and sign out.
- May require backward-compatible shared UI additions for profile summary rows, compact account action groups, credential-change validation, and session-revocation messaging.
- Must follow `docs/design-system/UI_GUIDELINES.md`.
- Must not change user persistence, role definitions, authorization checks, login behavior, public registration absence, password hashing, session storage, or administrator user-management behavior.
