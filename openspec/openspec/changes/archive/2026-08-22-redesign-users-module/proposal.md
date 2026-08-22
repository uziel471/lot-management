## Why

Usuarios controls access to every operational module, so its administration experience must make roles, active state, password resets, and admin safeguards clear without changing the existing security model. This redesign brings the users module in line with the shared operational UI system already applied to Vehicles, Purchases, and Catalogos.

## What Changes

- Redesign the Users list as a compact administrative screen with standard page header, primary create action, search/filter toolbar, result summary, table, status/role treatment, empty states, reset behavior, and row actions aligned to `docs/design-system/UI_GUIDELINES.md`.
- Redesign create and edit experiences for users with focused fields for name, email, role, active state, validation feedback, save/cancel actions, and role-aware restrictions.
- Improve activation, deactivation, and password reset flows with clear confirmations, pending-safe actions, feedback, and visible safeguards for the last active administrator and self-admin restrictions.
- Make role and permission consequences visible in the UI without adding roles or changing the underlying authorization rules.
- Preserve current user domain behavior: exactly three roles, admin-only user administration, no public registration, first-admin bootstrap outside the UI, deactivation instead of deletion, guaranteed active administrator existence, password-change semantics, session revocation, and existing permission enforcement.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `users`: Changes the observable administration experience for listing, creating, editing, activating, deactivating, resetting passwords, validating, and presenting users while preserving existing user and permission rules.
- `ui-design-system`: Extends the shared redesign contract to user administration and clarifies reusable patterns for access-management tables, role/status display, focused admin forms, guarded destructive actions, and password reset feedback.

## Impact

- Affects user administration routes under `src/app/(app)/usuarios` or the equivalent current Users route structure.
- Affects user UI components under `src/features/users/components` and adjacent user page composition.
- May require backward-compatible adjustments to shared components such as `PageHeader`, `PageToolbar`, `DataTable`, `EmptyState`, `StatusBadge`, `FormSection`, `ConfirmDialog`, `SubmitButton`, role/status badges, and focused form/dialog primitives.
- Must follow `docs/design-system/UI_GUIDELINES.md`.
- Must not change user models, persistence, roles, authorization checks, first-admin bootstrap behavior, public registration absence, session revocation semantics, password hashing, Server Actions, or audit/author preservation behavior.
