## 1. Preparation

- [x] 1.1 Read the relevant local Next.js guidance under `node_modules/next/dist/docs/` before changing App Router pages, Server Components, Client Components, or Server Actions.
- [x] 1.2 Review `docs/design-system/UI_GUIDELINES.md`, authenticated shell account controls, auth/session utilities, Users password-change/reset behavior, and shared UI component APIs.
- [x] 1.3 Identify the current source for signed-in user display data and confirm whether it already provides only name, email, role, and account state.

## 2. Account Data And Boundaries

- [x] 2.1 Add or reuse a narrow current-account query/DTO that returns only display-safe Cuenta fields and no password hashes, session tokens, or raw auth records.
- [x] 2.2 Keep Cuenta protected by the existing authenticated route/session guard so anonymous access redirects to login.
- [x] 2.3 Verify Cuenta does not expose user creation, role editing, activation/deactivation, physical deletion, or administrator password reset actions.
- [x] 2.4 Preserve existing Users administrator flows and update only labels, links, or copy needed to keep own-password change separate from administrator reset.

## 3. Shared UI Foundations

- [x] 3.1 Reuse existing shared page, form, validation, feedback, button, and action-group primitives for Cuenta.
- [x] 3.2 Add backward-compatible shared helpers only if Cuenta needs reusable compact profile summary, credential-change form, account action group, or session-feedback patterns that do not already exist.
- [x] 3.3 Verify any shared UI additions remain compatible with Vehicles, Purchases, Catalogos, Users, and other current module call sites.

## 4. Cuenta Route And Profile Summary

- [x] 4.1 Add the authenticated Cuenta route under `src/app/(app)/cuenta` or the current equivalent route structure.
- [x] 4.2 Build the Cuenta page composition with standard page anatomy and a compact profile summary showing name, email, role, and account state.
- [x] 4.3 Ensure `admin`, `capturista`, and `lectura` users all see their own account summary without seeing admin-only actions unless they navigate to authorized admin modules.
- [x] 4.4 Verify Cuenta renders correctly on desktop and narrow viewports without overlapping or hiding profile data or actions.

## 5. Own Password Change

- [x] 5.1 Implement the Cuenta own-password form with current password, new password, visible required fields, save/cancel actions, and pending-safe submit behavior.
- [x] 5.2 Wire the form to the existing trusted own-password change Server Action/domain behavior without duplicating password verification, hashing, or revocation logic.
- [x] 5.3 Show field-level or form-level validation for missing fields, invalid new password, and incorrect current password without exposing internal auth details.
- [x] 5.4 Show success/failure feedback and communicate that other active sessions are revoked after a successful own-password change.
- [x] 5.5 Verify the current session behavior after password change matches the existing authentication semantics.

## 6. Shell Account Actions And Sign Out

- [x] 6.1 Update the authenticated shell account entry so the user can open Cuenta from the expected account action location.
- [x] 6.2 Keep sign-out available from Cuenta or the shell account menu using the existing server-side session termination behavior.
- [x] 6.3 Verify sign-out ends the current session and redirects to login or the configured signed-out destination.
- [x] 6.4 Verify role-aware navigation remains consistent and does not expose restricted modules to unauthorized roles.

## 7. Verification

- [x] 7.1 Run the project typecheck, lint, and existing tests.
- [x] 7.2 Manually verify Cuenta for `admin`, `capturista`, and `lectura` users.
- [x] 7.3 Manually verify anonymous access redirects to login without exposing account data.
- [x] 7.4 Manually verify password-change success, incorrect current password, invalid form data, pending state, cancel behavior, and feedback.
- [x] 7.5 Manually verify Cuenta has no admin user-management actions, no role editing, no user deletion, and no administrator reset flow.
- [x] 7.6 Manually verify Users admin password reset remains separate and existing user administration still works.
- [x] 7.7 Manually verify desktop and narrow viewport layouts for profile summary, password form, sign-out, validation, and feedback.
- [x] 7.8 Run `openspec validate redesign-cuenta-module --strict` and resolve any proposal/spec/task issues.
