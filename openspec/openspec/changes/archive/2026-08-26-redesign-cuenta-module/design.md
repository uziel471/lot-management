## Context

See `proposal.md` for motivation. The project already defines private authenticated routes, server-side authorization, three fixed roles, user administration, own-password change behavior, administrator password reset behavior, and shared UI guidelines.

Cuenta should become the signed-in user's self-service account surface. It overlaps conceptually with authentication and Users, so the implementation must keep clear boundaries: authentication owns session validity and sign-out, Users owns administrator management of other users, and Cuenta owns the current user's profile summary and own-password change experience.

## Goals / Non-Goals

**Goals:**

- Add a coherent Cuenta route reachable from the authenticated shell account entry.
- Present only current-user account data needed by the view: name, email, role, and active/account state.
- Reuse existing authentication/session and user password-change behavior instead of introducing a second credential model.
- Make own-password change visible, validated, pending-safe, and distinct from administrator password reset.
- Apply `docs/design-system/UI_GUIDELINES.md` and shared operational UI patterns.
- Keep server-side authorization and session handling as the authority.

**Non-Goals:**

- No database schema changes, migrations, new roles, role editing from Cuenta, public registration, or self-service user creation.
- No change to password hashing, session persistence, session expiry, sign-out semantics, or Better Auth integration.
- No change to administrator user-management flows except clarifying that own-password change is reached from Cuenta.
- No new account settings beyond profile summary, own-password change, and sign-out.
- No independent Cuenta visual theme or new UI framework.

## Decisions

### Build Cuenta as a separate authenticated feature

Cuenta should live under the authenticated app area, such as `src/app/(app)/cuenta`, with feature code under `src/features/account` if no current account feature exists. This makes the self-service account route discoverable and keeps current-user concerns out of the admin-only Users module.

Alternative considered: add a "my profile" mode inside Usuarios. That blurs the permission boundary because Usuarios is already the admin user-management surface and should remain unavailable to non-admin roles.

### Source displayed data from the active session/current-user query

Cuenta should use the existing current-session/current-user mechanism used by the authenticated shell or a narrow server query that returns only display-safe account fields. The DTO should avoid internal auth records, password hashes, session tokens, and raw database documents.

Alternative considered: reuse the full user detail query from Usuarios. That risks sending administrative fields to a self-service screen and couples Cuenta to admin-specific DTOs.

### Reuse existing own-password change behavior

The password form should call or wrap the existing own-password change Server Action/domain function. The UI can improve field layout, validation mapping, pending state, and feedback, but password verification, hashing, and session revocation remain in the existing trusted layer.

Alternative considered: implement a new account-specific password update path. That duplicates security-sensitive logic and creates a second place where password and revocation behavior can diverge.

### Keep administrator reset separate

Cuenta must not expose resetting another user's password, editing roles, activation, deactivation, or creating users. Administrator reset remains in Usuarios and own-password change remains in Cuenta, even when the signed-in user is an `admin`.

Alternative considered: show all user-related actions to admins in Cuenta. That would make Cuenta a mixed self-service/admin surface and make permission review harder.

### Use shared operational UI primitives

Cuenta should compose shared page/header, summary, form, validation, feedback, button, and confirmation patterns. If a compact profile summary, credential-change form, or session feedback pattern is missing, add it as a backward-compatible shared pattern rather than styling Cuenta locally.

Alternative considered: create bespoke account panels. That would be quick, but future account/session surfaces would not inherit the same behavior and the result could drift from the shared design system.

## Risks / Trade-offs

- Account menu routing could conflict with the existing shell layout -> keep shell changes limited to adding or standardizing the Cuenta entry and verify existing navigation by role.
- Password-change UI could miscommunicate revocation semantics -> source wording from the existing behavior and verify session behavior before final copy is treated as final.
- Reusing admin user DTOs could expose unnecessary fields -> create or use a narrow current-account DTO.
- Shared component changes can affect other modules -> keep shared APIs backward-compatible and verify existing module call sites.
- Responsive account forms can become cramped -> follow the design-system form rules and test narrow viewports.

## Migration Plan

1. Read the relevant local Next.js guidance under `node_modules/next/dist/docs/` before changing App Router routes, Server Components, Client Components, or Server Actions.
2. Review `docs/design-system/UI_GUIDELINES.md`, the authenticated shell account controls, auth/session utilities, Users password-change/reset behavior, and shared UI primitives.
3. Add or refine a narrow current-account query/DTO if the existing shell data is insufficient for Cuenta.
4. Add the Cuenta authenticated route and page composition with profile summary, role/account state, own-password change, and sign-out action.
5. Wire own-password change to the existing trusted server behavior with field-level/form-level validation, pending state, success/failure feedback, and session-revocation messaging.
6. Update the shell account entry to open Cuenta and keep sign-out behavior available in the expected account action location.
7. Keep Usuarios admin flows intact and adjust links/copy only where needed to clarify that own-password change lives in Cuenta.
8. Verify admin, capturista, lectura, anonymous access, password success/failure, sign-out, no admin actions in Cuenta, no raw auth fields in responses, and responsive layouts.

Rollback is limited to reverting Cuenta route/component additions, account menu wiring, and any backward-compatible shared UI helpers because this change does not require persistence or auth migrations.
