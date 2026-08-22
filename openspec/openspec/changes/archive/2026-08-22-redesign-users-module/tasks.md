## 1. Preparation

- [x] 1.1 Read the relevant local Next.js guidance under `node_modules/next/dist/docs/` before changing App Router pages or Server/Client Component boundaries.
- [x] 1.2 Review `docs/design-system/UI_GUIDELINES.md`, the current Users routes/components/actions/queries, auth/session utilities, and shared UI component APIs.
- [x] 1.3 Capture the current admin, capturista, and lectura user-management flows so visual changes can be checked against existing behavior.

## 2. Shared UI Foundations

- [x] 2.1 Extend shared table, toolbar, empty-state, role/status badge, focused-form, confirmation, validation, or feedback components only where Users needs reusable access-management behavior.
- [x] 2.2 Keep shared component changes backward-compatible with Vehicles, Purchases, Catalogos, and existing Users usage.
- [x] 2.3 Add or refine a reusable guarded-confirmation pattern for access removal that can communicate session revocation and security restrictions.
- [x] 2.4 Add or adjust lightweight component tests or usage checks when shared component behavior changes.

## 3. Users List

- [x] 3.1 Redesign the Users page composition with standard page header, role-aware primary action placement, compact toolbar, search/filter controls, result summary, and reset behavior.
- [x] 3.2 Update the users table to show name, email, role, active/inactive state, and row actions in a scannable layout using shared table patterns.
- [x] 3.3 Add distinct empty states for no users versus no filtered results, with a clear way to return to the default list state.
- [x] 3.4 Ensure role labels, active/inactive labels, row actions, pending states, and responsive overflow follow the design guidelines.
- [x] 3.5 Verify capturista and lectura users do not see user-administration actions while admin users see only actions allowed by existing permissions.

## 4. User Create And Edit Forms

- [x] 4.1 Redesign create/edit user flows as focused admin forms with fields for name, email, role, and active state when applicable.
- [x] 4.2 Make required fields visible and preserve existing validation for missing data, invalid email, duplicate email, allowed roles, and admin-only access.
- [x] 4.3 Add field-level errors, form-level errors where appropriate, pending-safe save, cancel action, and success/failure feedback using shared patterns.
- [x] 4.4 Make role consequences visible in the form without adding roles or changing existing permission behavior.
- [x] 4.5 Verify the UI still offers no public registration or self-service user creation path.

## 5. Activation And Deactivation

- [x] 5.1 Redesign active/inactive presentation so inactive users remain identifiable and clearly marked as unable to sign in.
- [x] 5.2 Put deactivation behind a guarded confirmation that communicates access removal and session revocation before execution.
- [x] 5.3 Present reactivation with clear action feedback while preserving existing permission and session behavior.
- [x] 5.4 Surface last-active-admin and self-admin restrictions with clear disabled states or server-returned validation messages, without duplicating authority away from the server.
- [x] 5.5 Ensure no user list, form, menu, or action area exposes physical deletion.

## 6. Password Reset

- [x] 6.1 Redesign admin password reset as a separate protected flow from general user editing.
- [x] 6.2 Identify the affected user, communicate session revocation, and provide validation, pending, success, and failure states.
- [x] 6.3 Preserve existing password reset action behavior, password handling, authorization, and session revocation semantics.
- [x] 6.4 Verify each user's own password-change flow remains separate and still requires the current password.

## 7. Verification

- [x] 7.1 Run the project typecheck, lint, and existing tests.
- [ ] 7.2 Manually verify admin list, create, edit, deactivate, reactivate, password reset, duplicate email, invalid email, last-admin restriction, self-admin restriction, empty state, filtered no-results, and responsive layouts.
- [x] 7.3 Verify capturista and lectura role behavior for navigation visibility, action visibility, and direct operation enforcement.
- [ ] 7.4 Verify active users, inactive users, session-revocation messaging, author preservation expectations, and no-delete affordances.
- [x] 7.5 Run `openspec validate redesign-users-module --strict` and resolve any proposal/spec/task issues.
