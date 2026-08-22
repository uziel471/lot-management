## Why

Catalogos is the shared reference data surface behind vehicle capture, purchase capture, statuses, vendors, and future operational modules. Its UI needs to make active/inactive state, model-by-make dependencies, provider contact data, and role-sensitive actions clear and efficient while preserving the existing catalog business rules.

## What Changes

- Redesign the Catalogos landing/list experience as a compact operational administration screen with standard page header, catalog-type navigation, search/filter toolbar, result summary, table, empty states, reset behavior, and role-aware primary actions aligned to `docs/design-system/UI_GUIDELINES.md`.
- Redesign create and edit experiences for marcas, modelos, estatus de vehiculo, and proveedores using focused forms or dialogs where appropriate, clear required fields, field validation, pending-safe save/cancel actions, and catalog-specific fields.
- Improve inactive/reactivation workflows so active and inactive entries remain visible to administrators, inactive entries are clearly distinguished, and destructive-style deactivate/reactivate confirmations follow shared feedback and permission patterns.
- Make model administration explicitly dependent on marca, including active-make selection, clear blocked states for inactive marcas, and table/form context that prevents users from treating models as global records.
- Improve proveedor contact and estatus ordering presentation with scannable table columns, detail/edit fields, email validation feedback, optional-field handling, and ordering semantics that remain independent of code issuance.
- Preserve current catalog domain behavior: system-issued codes, normalized uniqueness, no deletion, retirement without historical data loss, model-by-make filtering, provider contact fields, status ordering, referential integrity, role permissions, and audit metadata.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `catalogs`: Changes the observable administration experience for listing, creating, editing, deactivating, reactivating, filtering, validating, and presenting catalog entries while preserving existing catalog rules.
- `ui-design-system`: Extends the shared redesign contract to catalog administration and clarifies reusable patterns for compact reference-data tables, short catalog forms, dependent catalogs, activation state, and role-aware actions.

## Impact

- Affects catalog routes under `src/app/(app)/catalogos` or the equivalent current Catalogos route structure.
- Affects catalog UI components under `src/features/catalogs/components` and adjacent catalog page composition.
- May require backward-compatible adjustments to shared components such as `PageHeader`, `PageToolbar`, `DataTable`, `EmptyState`, `StatusBadge`, `FormSection`, `DetailSection`, `ConfirmDialog`, `SubmitButton`, segmented catalog navigation, and compact form/dialog primitives.
- Must follow `docs/design-system/UI_GUIDELINES.md`.
- Must not change catalog models, persistence, code issuance sequences, normalized uniqueness rules, activation/reactivation semantics, referential integrity, Server Actions, permissions, or audit behavior.
