## Context

See `proposal.md` for motivation. Catalogos currently uses App Router pages under `src/app/(app)/catalogos`, a generic feature registry in `src/features/catalogs/registry.ts`, Server Actions in `src/features/catalogs/actions.ts`, queries in `src/features/catalogs/queries.ts`, validation in `schema.ts`, and domain rules in `domain.ts`.

`docs/design-system/UI_GUIDELINES.md` is the UI source of truth. The current module already has an index page, one dynamic catalog route, registry-driven metadata, a client-side `CatalogTable`, dialog-based `CatalogForm`, active/inactive filtering, row-level activate/deactivate controls, toasts, and confirmation dialogs. This redesign should improve composition, scanability, validation, and shared reuse without changing catalog persistence, code issuance, uniqueness, activation semantics, permissions, or audit behavior.

Vehicles and Purchases already establish the intended operational direction: standard page headers, compact filters, searchable tables, semantic status badges, focused confirmations, clear empty states, and responsive table behavior. Catalogos should fit those patterns while preserving its intentionally generic implementation.

## Goals / Non-Goals

**Goals:**

- Make Catalogos the reference implementation for compact reference-data administration in the shared UI system.
- Preserve the registry-driven architecture for the four current catalog types: marcas, modelos, estatus de vehiculo, and proveedores.
- Keep the current App Router routes, Server Actions, DTOs, domain validation, query behavior, and permission checks.
- Improve catalog selection, table density, active/inactive visibility, filtered no-results, short form validation, model-by-make context, provider contact presentation, and status ordering presentation.
- Move reusable reference-data, short-form, row-action, or active/inactive presentation behavior into shared components only when it will serve Catalogos and future modules.

**Non-Goals:**

- No database schema changes, migrations, new catalog types, new roles, or new catalog lifecycle rules.
- No changes to code prefixes or issuance timing.
- No changes to normalized uniqueness, referential integrity, model-by-make filtering for vehicle capture, provider contact validation, status ordering rules, or audit metadata.
- No redesign of the authenticated app shell beyond using available shared page/header/toolbar patterns.
- No new external UI framework or catalog-specific visual theme.

## Decisions

### Keep Catalogos registry-driven

The existing registry already centralizes labels, route keys, table columns, fields, validation schema, model binding, and default sort. The redesign should extend that metadata only where presentation needs more declarative information, such as summary labels, field help, column priority, empty-state copy, or catalog-specific disabled states.

Alternative considered: split each catalog into separate pages and components. That would make one-off presentation easier, but it would duplicate behavior that is deliberately common across catalog types and increase the chance that activation, validation, and permission UX diverge.

### Use shared operational composition for catalog pages

Catalog pages should be composed from existing shared primitives such as `PageHeader`, `DataTable`, `EmptyState`, `StatusBadge` or badge variants, `ConfirmDialog`, `SubmitButton`, `Button`, `Dialog`, `Input`, `Select`, `Textarea`, and `Label`. If the catalog index needs navigation beyond tiles, use a shared or reusable segmented navigation pattern rather than a catalog-only control.

Alternative considered: locally style the current `CatalogTable` and `CatalogForm` until they look better. That would be fast, but it would miss the design-system requirement that reusable reference-data patterns become shared before future modules copy them.

### Treat actions, queries, schema, and domain functions as behavior boundaries

The redesign should treat `actions.ts`, `queries.ts`, `schema.ts`, `domain.ts`, `registry.ts` model bindings, and DTO shapes as compatibility boundaries. UI may improve how errors, pending states, inactive warnings, role visibility, and confirmation feedback appear, but validation and authorization remain in the existing server and domain layers.

Alternative considered: reshape action results or query DTOs to make the UI cleaner. That risks turning a UI redesign into a behavior change. Add presentation-only fields only if they are derived from existing data and do not change contracts relied on by actions.

### Make catalog selection compact and persistent

The Catalogos index and individual catalog pages should help users move between the four catalogs without duplicating primary app navigation. Use compact catalog navigation near the page header or toolbar, preserve the current route structure, and keep the current catalog visibly selected. The selected catalog should drive title, description, primary action, table columns, filters, empty states, and form fields.

Alternative considered: keep the index as the only catalog switcher and rely on a back link from each catalog. That works, but it adds friction for repeated reference-data maintenance where users often move between marcas and modelos.

### Improve the table without changing filter semantics

The catalog table should keep client-side search/filtering for current data sizes. Add or refine result summary, reset behavior, active-filter empty states, inactive inclusion, status treatment, numeric alignment for status order, monospaced codes, and rightmost row actions. Inactive rows can remain muted, but the status label must carry the meaning.

Alternative considered: introduce server-side filtering and pagination now. Catalog lists are expected to remain small enough for client-side behavior, and changing query semantics adds unnecessary risk for this redesign.

### Keep catalog forms short and dialog-based

Catalog create/edit flows are short focused forms and should remain dialogs unless a future catalog type becomes substantially longer. Use shared validation treatment, required field indicators, help text, pending-safe submit, cancel action, and form-level error display. The code remains system-assigned and may be displayed as read-only text for existing entries, but it should never become an editable field.

Alternative considered: move create/edit into full pages for consistency with Vehicles and Purchases. That would add navigation cost for small reference-data edits and conflict with the design-system guidance that short focused catalog entries may use dialogs.

### Make dependent catalog state explicit

Models should visibly belong to marcas. The table and form should keep marca context prominent, and creating a model should require an active marca option. If no active marcas are available, the create model flow should explain the blocking condition and direct the user to create or reactivate a marca first, while relying on server validation as the authority.

Alternative considered: let the select simply be empty when no active marcas exist. That is technically accurate but confusing and makes the dependency feel like missing data rather than a domain rule.

## Risks / Trade-offs

- Shared component changes could affect Vehicles, Purchases, or Users -> keep shared props backward-compatible and verify existing call sites.
- The generic registry can become too flexible if every visual exception is added to it -> add only declarative metadata that multiple catalogs or future reference-data screens can use.
- Role-sensitive UI can accidentally hide needed actions or expose unavailable actions -> source visibility from existing permission values and keep Server Actions as the enforcement layer.
- Inactive state can be under-communicated if row opacity does too much work -> always pair muted rows with explicit status text or badge.
- Dialog forms can become cramped on small screens -> use responsive dialog sizing, stable field spacing, and avoid adding long explanatory copy inside the form.

## Migration Plan

1. Read the local Next.js App Router guidance before changing routes or Server/Client Component boundaries.
2. Review `docs/design-system/UI_GUIDELINES.md`, current Catalogos pages, `CatalogTable`, `CatalogForm`, `registry.ts`, and the shared UI components already used by Vehicles and Purchases.
3. Extend shared UI components or conventions in a backward-compatible way only where Catalogos needs reusable reference-data, filtered empty-state, short-form, row-action, or active/inactive behavior.
4. Redesign the Catalogos index and catalog detail pages to use compact catalog navigation, standard header/action placement, and consistent page anatomy.
5. Redesign `CatalogTable` with result summary, reset behavior, active/inactive visibility, catalog-specific columns, clear empty states, semantic statuses, and responsive table behavior.
6. Redesign `CatalogForm` with shared short-form dialog patterns, visible required fields, field and form errors, pending-safe submit, catalog-specific help text, and clearer model-by-make blocking states.
7. Verify provider contact fields, vehicle status ordering display, model-by-make context, role-aware create/edit/deactivate/reactivate actions, inactive inclusion, successful save, validation failure, confirmation feedback, and responsive layouts.

Rollback is limited to reverting UI component and Catalogos page/component changes because no persistence, domain, permission, or data migration is part of this change.
