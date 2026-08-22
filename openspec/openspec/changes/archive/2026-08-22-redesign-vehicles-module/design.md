## Context

See `proposal.md` for motivation. Vehicles currently uses App Router pages under `src/app/(app)/vehiculos`, feature components under `src/features/vehicles/components`, Server Actions in `src/features/vehicles/actions.ts`, and domain validation in `src/features/vehicles/domain.ts` and `schema.ts`.

`docs/design-system/UI_GUIDELINES.md` is the UI source of truth. The existing module already has a client-side `VehicleTable`, full-page `VehicleForm`, `VehicleDetail`, status history, shared `DataTable`, shared toolbar pieces, toasts, and confirmation dialogs. This change should improve composition and reuse without changing vehicle persistence, validation, permissions, or transaction rules.

## Goals / Non-Goals

**Goals:**

- Make Vehicles the reference implementation for shared operational list, filter, form, detail, status, confirmation, empty-state, and responsive patterns.
- Keep the current App Router, Server Actions, DTOs, domain validation, catalog dependencies, and permission checks.
- Move reusable presentation behavior into shared components only when it will serve more than Vehicles.
- Preserve client-side filtering for current data sizes while making the transition point to server-side filtering explicit.

**Non-Goals:**

- No database schema changes, migrations, new roles, new vehicle lifecycle rules, or new financial behavior.
- No redesign of the authenticated app shell unless a small page-container/header adjustment is already supported by existing shared components.
- No new external UI framework or module-specific theme.
- No conversion of long vehicle forms into dialogs or multi-step flows.

## Decisions

### Use shared operational composition instead of vehicle-specific layout

Vehicles pages should be composed from `PageHeader`, `PageToolbar`, `DataTable`, `EmptyState`, `FormSection`, `DetailSection`, `StatusBadge`, `ConfirmDialog`, `SubmitButton`, and existing UI primitives. If a needed variant is missing, extend the shared component narrowly rather than styling a one-off inside Vehicles.

Alternative considered: keep all polish local to `VehicleTable`, `VehicleForm`, and `VehicleDetail`. That is faster but fails the design-system requirement that Vehicles validate reusable patterns before broader module migration.

### Keep business behavior in existing feature actions and domain modules

The redesign should treat `actions.ts`, `domain.ts`, `schema.ts`, `queries.ts`, and DTO shapes as compatibility boundaries. UI components can improve how errors, pending states, role visibility, and warnings are displayed, but the authoritative validation and authorization remain in the Server Actions and domain functions.

Alternative considered: reshape DTOs or action results to match a new component API. That increases blast radius and risks changing behavior that the existing vehicle spec already covers.

### Make the inventory table denser and more explicit

The list should keep compact filters above the table, a visible reset path, result summary, monospaced identifiers, semantic status treatment, right-aligned numeric and money columns, and visible row actions. `DataTable` may need small shared additions for active-filter empty states, reset affordance, row actions, and responsive overflow.

Alternative considered: replace the table with cards for all viewports. That would reduce desktop scanability and conflict with the operational table guidance.

### Keep the vehicle form full-page and sectioned

Alta and edicion remain full-page forms. Sections should be stable, readable, and validation-forward: identity and required fields first, then ficha tecnica, kilometraje, titulo, inventario/ubicacion, precio, and notas. Use shared `FormSection` rather than raw local section markup where possible. Add cancel navigation and keep `SubmitButton` pending behavior.

Alternative considered: use collapsible `<details>` for most sections by default. Collapsing can hide validation context and make long data entry less predictable; reserve disclosure only if the shared guidelines explicitly call for it.

### Structure detail as readable sections with focused actions

The detail page should prioritize identity, status, title, price, missing data, voided state, and history. Frequent edits such as status and price can stay focused, but they should use consistent section framing, field errors, pending states, and feedback. Destructive voiding must remain behind a confirmation with required reason and role-aware visibility.

Alternative considered: split status/price changes into separate pages. That adds navigation friction for high-frequency operations without changing business rules.

## Risks / Trade-offs

- Shared component changes could affect Purchases, Catalogs, or Users -> keep props backward-compatible and verify existing pages still render.
- Client-side filtering may become slow if inventory grows substantially -> keep current approach for this redesign, but isolate filter state so server-side search/pagination can replace it later.
- Visual cleanup could accidentally change permissions by hiding or showing actions incorrectly -> keep role decisions sourced from existing page/action permission checks and cover `lectura`, `capturista`, and `admin` states in manual or automated verification.
- Sectioned forms can become too long on mobile -> use responsive one-column layout, stable action placement, and field-level errors without converting the workflow into a modal.

## Migration Plan

1. Update or extend shared UI components in a backward-compatible way.
2. Redesign the Vehicles inventory page and table using the shared toolbar/table/empty-state patterns.
3. Redesign the alta and edicion form using shared form sections, visible required fields, field errors, cancel action, and pending state.
4. Redesign the detail page using shared detail sections, semantic badges, focused status/price actions, status history, voided state, and destructive confirmation.
5. Run typecheck/lint/tests and manually verify admin, capturista, lectura, empty inventory, filtered no-results, mobile viewport, validation error, successful save, VIN warning, and void confirmation flows.

Rollback is limited to reverting UI component and Vehicles page/component changes because no persistence or domain migration is part of this change.
