## 1. Preparation

- [x] 1.1 Read the relevant local Next.js guidance under `node_modules/next/dist/docs/` before changing App Router pages or Server/Client Component boundaries.
- [x] 1.2 Review `docs/design-system/UI_GUIDELINES.md`, the current Vehicles pages, and shared UI component APIs to confirm reusable patterns and compatibility boundaries.
- [x] 1.3 Capture the current admin, capturista, and lectura Vehicles flows so visual changes can be checked against existing behavior.

## 2. Shared UI Foundations

- [x] 2.1 Extend shared table, toolbar, empty-state, form-section, detail-section, status, confirmation, or feedback components only where Vehicles needs reusable behavior.
- [x] 2.2 Keep shared component changes backward-compatible with Purchases, Catalogs, Users, and existing page usage.
- [x] 2.3 Add or adjust lightweight component tests or usage checks when shared component behavior changes.

## 3. Vehicles Inventory

- [x] 3.1 Redesign the Vehicles index page composition with standard page header, primary action placement, compact toolbar, filters, and result summary.
- [x] 3.2 Update `VehicleTable` to preserve search by `code`, VIN, and stock number plus filters for status, make, and received-date range.
- [x] 3.3 Add clear active-filter reset behavior and distinct empty states for no vehicles versus no filtered results.
- [x] 3.4 Ensure table columns, numeric alignment, monospaced identifiers, semantic status display, row actions, and responsive overflow follow the design guidelines.
- [x] 3.5 Verify lectura users do not see write actions and admin/capturista users see only the actions allowed by existing permissions.

## 4. Vehicles Form

- [x] 4.1 Redesign the create and edit form as a full-page sectioned form for identity, technical data, mileage, title, inventory/location, price, and notes.
- [x] 4.2 Make required fields visible, keep `code` non-editable, and preserve existing catalog, VIN, year, mileage, title, status, and price validation behavior.
- [x] 4.3 Show field-level and form-level validation feedback consistently without exposing internal technical details.
- [x] 4.4 Add a cancel action that returns to the correct list or detail context without saving partial changes.
- [x] 4.5 Verify pending save state prevents duplicate submissions and successful saves preserve existing toast and VIN warning behavior.

## 5. Vehicle Detail And Actions

- [x] 5.1 Redesign the detail page into scannable sections for identity, status, title, price, technical data, mileage, notes, and status history.
- [x] 5.2 Present voided vehicles with clear status, preserved historical data, void reason, and no incompatible write actions.
- [x] 5.3 Keep status and price changes focused, role-aware, pending-safe, and backed by the existing Server Actions.
- [x] 5.4 Keep vehicle voiding behind destructive confirmation with mandatory reason and existing admin-only authorization.
- [x] 5.5 Standardize success, validation, permission, VIN warning, and destructive feedback through shared feedback patterns.

## 6. Verification

- [ ] 6.1 Run the project typecheck, lint, and existing tests.
- [ ] 6.2 Manually verify inventory, filtered no-results, empty inventory, create, edit, validation error, successful save, VIN warning, detail, status change, price change, void confirmation, and voided-detail flows.
- [ ] 6.3 Verify responsive behavior for inventory, form, and detail on desktop and narrow viewports.
- [x] 6.4 Run `openspec validate redesign-vehicles-module --strict` and resolve any proposal/spec/task issues.
