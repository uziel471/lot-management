## Context

See `proposal.md` for motivation. Users currently has an existing `users` capability that defines roles, admin-only user management, first-admin bootstrap, deactivation instead of deletion, active-admin safeguards, password changes, password reset, and session revocation behavior.

`docs/design-system/UI_GUIDELINES.md` is the UI source of truth. The previous Vehicles, Purchases, and Catalogos redesigns establish the intended operational direction: standard page headers, compact filters, scannable tables, semantic status and role badges, focused forms, guarded confirmations, clear validation and feedback, empty states, and responsive behavior. This redesign should apply those shared patterns to user administration without changing authorization, authentication, password, session, persistence, or audit behavior.

## Goals / Non-Goals

**Goals:**

- Make Users the reference implementation for access-management administration in the shared UI system.
- Keep the current App Router route structure, Server Actions, DTOs, domain validation, authorization checks, password handling, session revocation, and bootstrap procedure.
- Improve list scanability, active/inactive visibility, role display, filtered no-results, create/edit validation, deactivation/reactivation safeguards, password reset feedback, and responsive operation.
- Move reusable access-management presentation behavior into shared components only when it will serve Users and future administrative modules.
- Keep UI affordances role-aware while preserving server-side authorization as the authority.

**Non-Goals:**

- No database schema changes, migrations, new roles, public registration, self-service signup, deletion workflow, or new permission model.
- No change to the first-admin bootstrap process or requirement that it remains outside the interface.
- No change to password hashing, password policy, session storage, revocation semantics, or login behavior.
- No redesign of the authenticated app shell beyond using available shared page/header/navigation patterns.
- No user-specific visual theme or external UI framework.

## Decisions

### Use shared operational composition for user administration

Users pages should be composed from available shared primitives such as `PageHeader`, `PageToolbar`, `DataTable`, `EmptyState`, `StatusBadge` or badge variants, `ConfirmDialog`, `SubmitButton`, `Button`, `Dialog`, `Input`, `Select`, and `Label`. Local wrappers are acceptable for mapping user-specific data, but spacing, hierarchy, table density, empty states, validation, and feedback should come from shared patterns.

Alternative considered: polish the users screens locally with module-specific table and form markup. That would be faster, but it would leave access-management patterns unavailable to future admin surfaces and would contradict the shared design-system contract.

### Treat auth, user actions, and session behavior as compatibility boundaries

The redesign should treat existing user Server Actions, auth utilities, password logic, session revocation, role checks, and DTO shapes as behavior boundaries. UI can improve action placement, pending states, validation display, role visibility, and confirmation language, but the authoritative checks remain in the existing server/domain layers.

Alternative considered: reshape action results or authorization helpers for a cleaner UI API. That risks converting a UI redesign into a security behavior change. Presentation-only adapters are acceptable when derived from existing data.

### Make the users list compact and security-explicit

The list should use compact search/filter controls, result summary, reset behavior, monospaced or subdued email presentation where useful, semantic role and active-state treatment, and rightmost row actions. Default columns should prioritize name, email, role, active state, and available actions. Filtered no-results should differ from the initial no-data state.

Alternative considered: render users as profile cards. Cards reduce desktop scanability for administrative review and make role/status comparison slower. A narrow-viewport fallback can be responsive, but the primary desktop experience should remain table-based.

### Keep create and edit as focused admin forms

Create and edit flows should remain short focused forms, likely dialog-based if the current route structure supports it and the design guidelines allow it for short administrative forms. Fields should cover name, email, role, and active state when applicable. Required fields, duplicate-email errors, invalid email errors, pending-safe submit, cancel action, and form-level errors should follow shared validation patterns.

Alternative considered: move create/edit into full pages for consistency with longer operational forms. User forms are short and focused, so full pages would add navigation cost without improving data entry.

### Separate password reset from general user editing

Password reset should be a distinct protected action, not an incidental field inside general user editing. The UI should identify the affected user, show validation feedback, communicate session revocation, use pending-safe submission, and show success/failure feedback. This keeps password-sensitive operations auditable and harder to trigger accidentally.

Alternative considered: include password fields in the user edit form. That makes editing identity/role and resetting credentials feel like one operation, increasing accidental-change risk and weakening the mental model around session revocation.

### Model guarded access removal as destructive confirmation

Deactivation removes access and revokes sessions, so it should use a destructive or guarded confirmation pattern. Reactivation can use a lighter confirmation or direct action depending on current shared guidance, but both must display feedback. Last-active-admin and self-admin restrictions should appear as clear disabled states or server-returned validation messages, with the server remaining authoritative.

Alternative considered: rely on optimistic row actions and toast errors only. That is efficient but too subtle for security-sensitive access removal and makes important restrictions harder to understand.

## Risks / Trade-offs

- Shared component changes could affect Vehicles, Purchases, or Catalogos -> keep shared APIs backward-compatible and verify existing call sites.
- Role-aware UI could accidentally hide needed admin actions or expose unavailable actions -> source visibility from existing permission values and keep Server Actions as enforcement.
- Last-admin safeguards can be misrepresented if the UI computes them differently from the server -> use server-returned failures as the authority and keep any UI disabled state conservative.
- Password reset feedback can expose too much sensitive detail -> show user-facing validation and outcome messages without revealing internal auth/session implementation.
- Dialog forms can become cramped on small screens -> use responsive dialog sizing or a full-page fallback if the existing shared pattern requires it.

## Migration Plan

1. Read the local Next.js App Router guidance before changing routes or Server/Client Component boundaries.
2. Review `docs/design-system/UI_GUIDELINES.md`, the current Users routes/components/actions/queries, auth/session utilities, and shared UI components used by Vehicles, Purchases, and Catalogos.
3. Extend shared UI components or conventions in a backward-compatible way only where Users needs reusable role/status display, guarded confirmation, focused admin forms, filtered empty states, or access-management feedback.
4. Redesign the Users list with the shared header, toolbar, search/filter/reset behavior, result summary, table, role/status badges, row actions, empty states, and responsive behavior.
5. Redesign create/edit user flows with focused form layout, visible required fields, validation mapping, pending-safe save/cancel actions, and role-aware restrictions.
6. Redesign deactivation/reactivation with shared confirmation, active/inactive status treatment, last-admin restriction messaging, session-revocation communication, and feedback.
7. Redesign password reset as a separate protected flow with validation, pending state, session-revocation communication, and success/failure feedback.
8. Verify admin, capturista, lectura, active users, inactive users, no users beyond bootstrap assumptions, filtered no-results, duplicate email, invalid email, last-admin restriction, self-admin restriction, deactivation/reactivation, password reset, and responsive layouts.

Rollback is limited to reverting UI component and Users page/component changes because no persistence, auth, permission, password, session, or data migration is part of this change.
