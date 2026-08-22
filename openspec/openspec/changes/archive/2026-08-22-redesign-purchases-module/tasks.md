## 1. Preparation

- [x] 1.1 Read the relevant local Next.js guidance under `node_modules/next/dist/docs/` before changing App Router pages or Server/Client Component boundaries.
- [x] 1.2 Review `docs/design-system/UI_GUIDELINES.md`, the current Purchases pages, the current Vehicles redesign patterns, and shared UI component APIs.
- [x] 1.3 Capture the current admin, capturista, and lectura Purchases flows so visual changes can be checked against existing behavior.

## 2. Shared UI Foundations

- [x] 2.1 Extend shared table, toolbar, empty-state, form-section, detail-section, status, confirmation, feedback, or money-display components only where Purchases needs reusable behavior.
- [x] 2.2 Keep shared component changes backward-compatible with Vehicles, Catalogs, Users, and existing Purchases usage.
- [x] 2.3 Replace prompt-based destructive reason collection with a reusable confirmation pattern that supports a required reason field.
- [x] 2.4 Add or adjust lightweight component tests or usage checks when shared component behavior changes.

## 3. Purchases List

- [x] 3.1 Redesign the Purchases index page composition with standard page header, role-aware primary action placement, compact toolbar, filters, result summary, and footer total.
- [x] 3.2 Update `PurchaseTable` to preserve search by purchase code, vehicle, and vendor plus filters for type, date range, vehicle, vendor, and voided inclusion where the page data supports them.
- [x] 3.3 Add clear active-filter reset behavior and distinct empty states for no purchases versus no filtered results.
- [x] 3.4 Ensure table columns, money alignment, monospaced identifiers, semantic active/voided status display, row actions, and responsive overflow follow the design guidelines.
- [x] 3.5 Verify voided purchases remain consultable, are visually distinguished, and do not contribute to the active footer total.
- [x] 3.6 Verify lectura users do not see create or void actions and admin/capturista users see only the actions allowed by existing permissions.

## 4. Purchase Form

- [x] 4.1 Redesign the new-purchase form as a full-page sectioned form for identification, currency, cost components, payment/references, and notes using shared form patterns.
- [x] 4.2 Make required fields visible and preserve active vehicle/vendor selection, future-date validation, purchase type behavior, correction target behavior, and field/form-level validation feedback.
- [x] 4.3 Preserve live original-currency and USD totals using existing money/domain helpers, including MXN exchange-rate handling and USD exchange-rate lock at `1`.
- [x] 4.4 Keep the submission token hidden field, pending save state, and duplicate-submission behavior intact.
- [x] 4.5 Add a cancel action that returns to the appropriate purchases list, vehicle context, or previous detail context without saving partial changes.
- [x] 4.6 Verify successful save, validation failure, future-date warning, duplicate reference error, missing amount error, invalid sign error, and correction-target error flows.

## 5. Purchase Detail And Voiding

- [x] 5.1 Redesign the purchase detail page into shared detail sections for identity/context, financial components, totals/conversion, references, correction relationships, notes, and voiding metadata.
- [x] 5.2 Preserve read-only behavior: no edit action, no delete action, and no UI path that implies purchase data can be modified after creation.
- [x] 5.3 Present active and voided purchases with semantic status, preserved original financial values, and clear text that voided purchases no longer count in acquisition cost.
- [x] 5.4 Replace browser-prompt voiding with destructive confirmation that requires a non-empty reason and preserves `voidPurchaseAction` behavior.
- [x] 5.5 Keep void action visibility role-aware and backed by existing server authorization.
- [x] 5.6 Standardize success, validation, permission, and destructive feedback through shared toast or feedback patterns.

## 6. Vehicle Acquisition Cost

- [x] 6.1 Redesign `VehicleAcquisitionCost` with shared section, table/list, status, empty-state, and money-display patterns.
- [x] 6.2 Preserve cross-feature composition in the vehicle detail page; `features/vehicles` must not import `features/purchases`.
- [x] 6.3 Keep the label as acquisition cost, not total vehicle cost, and preserve zero state for vehicles without purchases.
- [x] 6.4 Distinguish voided purchases in the vehicle acquisition-cost block and exclude them from the active total.
- [x] 6.5 Preserve the link to register a purchase for the current vehicle when the user's role permits it.

## 7. Verification

- [x] 7.1 Run the project typecheck, lint, and existing tests.
- [x] 7.2 Manually verify purchases list, filtered no-results, empty purchases, create, validation error, successful save, future-date warning, MXN conversion, USD exchange-rate lock, correction target, detail, void confirmation, voided detail, and acquisition-cost flows.
- [x] 7.3 Verify admin, capturista, and lectura role behavior for list actions, create access, detail access, and void action visibility.
- [x] 7.4 Verify responsive behavior for the purchases list, purchase form, purchase detail, and vehicle acquisition-cost block on desktop and narrow viewports.
- [x] 7.5 Run `openspec validate redesign-purchases-module --strict` and resolve any proposal/spec/task issues.
