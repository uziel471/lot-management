## 1. Preparation

- [x] 1.1 Read the local Next.js App Router guidance in `node_modules/next/dist/docs/` before changing routes or Server/Client Component boundaries.
- [x] 1.2 Review `docs/design-system/UI_GUIDELINES.md`, the current Catalogos pages, `CatalogTable`, `CatalogForm`, `registry.ts`, and shared UI components used by Vehicles and Purchases.
- [x] 1.3 Identify any shared UI component gaps needed for catalog navigation, filtered empty states, result summaries, short-form dialogs, row actions, or active/inactive status treatment.

## 2. Shared UI Foundations

- [x] 2.1 Extend shared components or conventions in a backward-compatible way for compact reference-data tables and filtered no-result states.
- [x] 2.2 Add or refine reusable status, row-action, confirmation, or short-form dialog patterns needed by Catalogos without introducing catalog-specific visual variants.
- [x] 2.3 Verify existing Vehicles and Purchases shared component call sites still compile and render with the updated shared APIs.

## 3. Catalog Page Composition

- [x] 3.1 Redesign the Catalogos index to use the standard page anatomy and a compact way to enter each catalog without duplicating primary app navigation.
- [x] 3.2 Redesign the dynamic catalog page to keep catalog selection visible, preserve the current route structure, and drive title, description, primary action, columns, filters, and empty states from the selected catalog metadata.
- [x] 3.3 Preserve role-derived `canWrite` and `canSetActive` behavior from existing permission checks while improving visible action placement.

## 4. Catalog Table

- [x] 4.1 Redesign `CatalogTable` with compact search/filter controls, result summary, reset behavior, active/inactive inclusion, and distinct true-empty versus filtered-no-results states.
- [x] 4.2 Present codes with monospaced treatment, active/inactive state with explicit semantic text or badges, numeric status order with numeric alignment, and row actions in a consistent rightmost action area.
- [x] 4.3 Adapt table columns and summaries for marcas, modelos, estatus de vehiculo, and proveedores using registry metadata without changing catalog query or DTO behavior.
- [x] 4.4 Keep client-side filtering semantics intact and ensure inactive entries remain available in administration when the user opts into viewing them.

## 5. Catalog Forms And Actions

- [x] 5.1 Redesign `CatalogForm` as a short focused dialog with visible required fields, optional-field treatment, field errors, form-level errors, pending-safe save, cancel action, and success/failure feedback.
- [x] 5.2 Ensure create and edit forms never expose an editable `code` control and continue to display system-issued code context for existing entries when useful.
- [x] 5.3 Make model forms communicate the active marca dependency and show a clear blocked state when no active marca can be selected.
- [x] 5.4 Keep deactivate and reactivate flows behind confirmation with clear active/inactive consequences, pending feedback, and no delete affordance.

## 6. Catalog-Specific Verification

- [x] 6.1 Verify marcas show code, name, active state, and relevant model context without changing model active states.
- [x] 6.2 Verify modelos show marca context, reject missing or inactive marca through existing validation, and do not appear as global independent records.
- [x] 6.3 Verify proveedores present optional phone, email, city, and notes cleanly and show email validation errors by field.
- [x] 6.4 Verify estatus de vehiculo display by explicit sort order and name tie-break, independent of code or creation date.
- [x] 6.5 Verify admin, capturista, and lectura states for create, edit, deactivate, reactivate, direct action enforcement, and visible navigation/actions.

## 7. Final Validation

- [x] 7.1 Run the project typecheck, lint, and relevant tests.
- [x] 7.2 Manually verify empty catalogs, filtered no-results, active-only view, inactive-inclusive view, create success, edit success, validation failure, deactivate confirmation, reactivate confirmation, and responsive layouts.
- [x] 7.3 Validate the OpenSpec change with `openspec validate redesign-catalogs-module --strict`.
