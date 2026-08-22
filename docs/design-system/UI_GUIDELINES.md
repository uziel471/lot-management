# UI Guidelines

This document is the source of truth for UI and UX work in the dealership management system. Future screens, module redesigns, shared components, and OpenSpec proposals that affect UI must follow these guidelines.

## 1. Design Principles

The product is an internal operational application for managing a U.S. LLC vehicle lot / used car dealership. It is not a marketing site, portfolio, landing page, or consumer shopping experience.

Use these principles in priority order:

1. Operational clarity: users must quickly understand inventory, purchases, sales, expenses, catalogs, users, documents, and administrative state.
2. Scanability: tables, statuses, money, dates, identifiers, and row actions must be easy to compare.
3. Desktop efficiency: primary workflows are repeated table and form work on desktop, with tablet and mobile fallbacks that remain usable.
4. Consistency: each module must feel like part of the same application. Do not create module-specific visual systems.
5. Trust: visual treatment should be quiet, precise, and predictable, especially around money, vehicle identity, account state, and destructive actions.
6. Evolutionary change: preserve existing working behavior while improving shared UI foundations incrementally.

Avoid:

- Marketing-style heroes, oversized dashboard banners, editorial layouts, and decorative feature sections.
- Decorative gradients, large ornamental backgrounds, floating visual effects, and unnecessary animation.
- Excessive whitespace that pushes operational data below the fold.
- Oversized controls on dense management pages.
- Rebuilding a page with a unique visual system because that module feels special.
- Redesigning business workflows as part of visual cleanup unless an OpenSpec change explicitly covers the behavior.

## 2. Current Technology Foundation

The app currently uses:

- Next.js App Router with authenticated routes under `src/app/(app)` and auth routes under `src/app/(auth)`.
- TypeScript, React Server Components where appropriate, and Server Actions.
- Tailwind CSS 4 with tokens in `src/app/globals.css`.
- shadcn/ui configured in `components.json` with `base-nova`, RSC, TypeScript, CSS variables, neutral base color, and Lucide icons.
- Base UI primitives where shadcn `base-nova` uses them.
- Import aliases for `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, and `@/hooks`.

Current app assessment:

- `src/app/(app)/layout.tsx` is the authenticated shell. It has a compact top header with links to Dashboard, Vehicles, Purchases, Catalogs, Users for admins, Account, account text, sign-out, and the global `Toaster`.
- The current shell does not yet provide sidebar navigation, collapsible state, breadcrumbs, active route indication, or a dedicated mobile navigation pattern.
- `src/app/globals.css` defines neutral CSS variables, dark-mode tokens, compact radius tokens, chart tokens, and sidebar tokens. The sidebar tokens are available even though a full sidebar shell is not implemented yet.
- Shared components already exist for `PageHeader`, `DataTable`, `EmptyState`, `ConfirmDialog`, `MoneyInput`, and `SubmitButton`.
- UI primitives already exist for `Button`, `Input`, `Select`, `Textarea`, `Badge`, `Card`, `Dialog`, `Label`, `Table`, and `Toast`.
- Vehicles and Purchases are the strongest current examples for operational pages: compact headers, inline filters, searchable tables, status badges, full-page forms, detail screens, warnings, confirmations, and toasts.
- Catalogs correctly uses dialog forms for short focused catalog entries and row-level activation controls.
- Users still uses raw heading markup, raw inputs in places, and custom row layouts. Treat it as a migration candidate, not as the pattern to copy.
- Current responsive behavior relies on flex wrapping and horizontal table overflow. Future work must standardize shell, filters, actions, forms, and tables for smaller screens.

## 3. Visual Foundations

### Typography

- Use the existing sans font from the app theme for all UI text.
- Use `font-mono` for codes, VINs, stock numbers, sequence identifiers, internal IDs, and other technical identifiers.
- Page titles should generally use `text-2xl font-semibold tracking-tight`.
- Section and card titles should generally use `text-base font-semibold` or the existing `CardTitle` scale.
- Table text, form text, filter labels, and helper copy should usually stay at `text-sm`.
- Secondary metadata, counts, footnotes, and compact filter labels may use `text-xs`.
- Do not use hero-scale type inside operational pages.
- Do not use negative letter spacing beyond established local utilities such as `tracking-tight` on page titles.

### Spacing And Layout

- Default page stack spacing: `gap-6` between page header and major content regions.
- Dense internal component spacing: `gap-2` or `gap-3`.
- Filter/toolbars: `rounded-lg border p-3`, wrapping controls as needed.
- Main content should use a predictable page container. The current shell uses `main className="flex-1 p-4"`; the target shell should move this into `PageContainer`.
- Avoid wrapping entire pages or page sections in decorative cards. Use cards for repeated catalog tiles, dialogs, and genuinely framed tools.

### Borders, Radius, Shadows, And Backgrounds

- Use `border`, `border-dashed`, and CSS-variable colors from the Tailwind/shadcn theme.
- Prefer `rounded-md` or `rounded-lg` for framed operational surfaces. Avoid unusually large radii for controls or management cards.
- Shadows should be minimal. Avoid elevated marketing cards, glass effects, and decorative depth.
- Backgrounds should remain neutral: `bg-background`, `bg-card`, `bg-muted`, `bg-accent`, and related CSS variables.

### Semantic Colors

Use existing semantic tokens first:

- `primary`: primary actions and high-emphasis active navigation.
- `secondary` and `muted`: low-emphasis surfaces, neutral states, supporting metadata.
- `accent`: hover and selected navigation backgrounds.
- `destructive`: destructive actions and irreversible negative states.
- `border`, `input`, and `ring`: component structure and focus.

Do not introduce a new color palette for a single module. Future color additions should be semantic tokens or shared component variants.

### Interaction And Focus States

- Interactive elements must have visible hover and focus states.
- The current global base layer applies `outline-ring/50`; preserve visible focus when composing controls.
- Disabled states must be visually muted and programmatically disabled.
- Pending states must prevent double submission, using patterns such as `SubmitButton` and disabled dialog actions.

## 4. Application Shell

The target authenticated shell is:

`AppShell -> AppSidebar + AppHeader -> PageContainer -> page content`

Desktop shell requirements:

- Sidebar navigation for primary modules: Dashboard, Vehicles, Purchases, Sales, Expenses, Catalogs, Users, Reports, and future document workflows as they exist.
- Role-aware visibility equivalent to current permission behavior. For example, admin-only links stay admin-only.
- Collapsible sidebar behavior that preserves icons and active state when collapsed.
- Top header for breadcrumbs, current page context, account menu, and secondary utility actions.
- Main content region with consistent padding and max-width rules.
- Global `Toaster` remains mounted at shell level.

Responsive shell requirements:

- Tablet and smaller viewports must provide usable navigation without each page inventing its own mobile nav.
- Sidebar may become an off-canvas sheet, drawer, or compact top control, but active module and account actions must remain discoverable.
- Page actions must wrap cleanly and remain reachable above the main table or form.

Do not implement shell changes inside an unrelated module redesign. A dedicated change should introduce `AppShell`, `AppSidebar`, `AppHeader`, and `PageContainer`.

## 5. Navigation

Navigation must answer four questions:

- Where am I?
- What module am I in?
- What can I access with my role?
- How do I move to adjacent work?

Rules:

- Show active module indication in the sidebar or current shell navigation.
- Use breadcrumbs in the top header or page container when the page is deeper than a module index, such as vehicle detail, vehicle edit, purchase detail, or catalog detail.
- Keep link labels concise and operational. Prefer `Vehiculos`, `Compras`, `Catalogos`, `Usuarios` for current Spanish UI labels.
- Preserve current role-aware behavior. If a role cannot access a module, omit or disable it according to existing permission rules.
- Do not duplicate primary navigation inside individual pages.

## 6. Page Anatomy

Default management page composition:

```text
AppShell
PageContainer
Breadcrumbs, when applicable
PageHeader
PageToolbar or FilterBar, when applicable
Main content
Pagination or result summary, when applicable
```

Page rules:

- Use one `PageHeader` per page.
- Put primary create/register actions in the page header or table toolbar, consistently by module type.
- Keep filters and search immediately above the table they affect.
- Put pagination, result count, totals, or summary rows directly after the table.
- Use detail sections for read-only record pages. Do not force detail pages into giant cards unless a section needs framing.
- Use empty states in the content area when no rows or no search results exist.

## 7. Page Headers

`PageHeader` is the current shared header pattern and should be used for management screens.

Header rules:

- Title: short noun or noun phrase, such as `Vehiculos`, `Compras`, `Catalogos`, or `Usuarios`.
- Description: one compact sentence that clarifies operational purpose or important behavior.
- Primary action: create/register action when it applies at page level.
- Secondary actions: navigation back to a parent list, export, or low-frequency support actions.
- Avoid paragraphs of explanatory text, marketing copy, hero headlines, and oversized header regions.
- Header actions must wrap without overlapping title or description.

## 8. Tables

Tables are first-class operational surfaces.

Density and structure:

- Use compact row height and `text-sm` by default.
- Keep table headers concise.
- Use `font-mono text-xs` for codes, VINs, stock numbers, and sequence IDs.
- Text and identifiers align left.
- Money, counts, durations, and numeric values align right.
- Dates should use a consistent short format for list views.
- Row actions belong in the rightmost column or the shared toolbar when action applies to multiple rows.

Search, sorting, and pagination:

- Existing `DataTable` uses client-side filtering intentionally for current data sizes.
- Review server-side search, filtering, sorting, and pagination once a list can grow beyond a few hundred rows, becomes slow, or must support multi-user reporting semantics.
- Sorting should be explicit and visible when introduced.
- Pagination should show current page, total or known count when available, and preserve filters.

Status and row state:

- Use semantic status badges, not module-specific color guesses.
- Muted/voided/inactive rows may use reduced opacity only when the status badge or text also communicates the state.
- Never communicate status by color alone.

Empty and loading states:

- Use `EmptyState` for true empty data and filtered no-result states.
- Empty states should say what is missing and, when permitted, provide the next action.
- Loading tables should use stable skeleton rows or stable table dimensions. Avoid layout jumps.

Responsive behavior:

- Horizontal overflow is acceptable for dense operational tables.
- For high-frequency mobile workflows, consider a compact list/card alternative in a dedicated change.
- Do not hide critical identifiers, status, or row actions on small screens without an accessible alternative.

## 9. Filters And Search

Filters must be compact by default.

Inline filters:

- Use for high-frequency filters with a small number of controls.
- Current examples: Vehicles status, make, received date range; Purchases transaction type and include-voided toggle.
- Use labels, explicit values, and a reset action when any filter is active.

Collapsible filters:

- Use when a list has enough filters to crowd the table but users still need them regularly.
- Collapsed state should indicate when filters are active.

Popover filters:

- Use for secondary filters that are not part of the core scanning workflow.
- Keep popover forms short and keyboard accessible.

Sheet filters:

- Use for advanced filters on smaller screens or when a filter set is too large for a popover.
- Sheet filters must support apply, cancel/close, and reset.

Persisted filters:

- Persist filters when the filtered view represents a durable workflow users return to, such as inventory review by status.
- Do not persist one-off filters unless product behavior calls for it.

Reset rules:

- When one or more filters are active, provide a clear reset control.
- Search input reset can be separate from filter reset only when both controls remain obvious.

## 10. Forms

Operational forms must be predictable, sectioned, and validation-forward.

Field layout:

- Use labels for every field. Placeholder text is not a label.
- Use help text only when it prevents data-entry mistakes.
- Required fields must be clear through label text, validation, or nearby copy.
- Use one-column layout on narrow screens.
- Use two-column desktop grids for related fields when it improves scanning.
- Keep money inputs tied to `MoneyInput` when the server expects cents.

Sections:

- Group long forms by business meaning: vehicle identity, purchase details, pricing, documents, contact information, administrative state.
- Section titles should be compact and functional.
- Avoid nested cards inside cards.

Validation:

- Show field-level errors near the field.
- Use form-level errors for cross-field or submission failures.
- Do not expose internal stack traces, database messages, or implementation details.
- Use `aria-invalid` and accessible descriptions when wiring custom validation UI.

Actions:

- Primary save/submit action should be visually clear and use pending state.
- Use `SubmitButton` for Server Action forms to prevent double submission.
- Cancel/back actions should be lower emphasis and consistently placed.
- Destructive actions should not sit beside save actions without confirmation and clear separation.

## 11. Long Forms And Dialog Forms

Long forms must be full-page.

Use full-page forms for:

- Vehicle create/edit.
- Purchase create/correction flows.
- Future sale, expense, document, repair, customer, or administrative records with many fields.
- Forms with multiple sections, dependent fields, money, dates, or destructive state.

Short focused forms may use dialogs when:

- The form has a small, focused set of fields.
- The user can complete it without referring to extensive page context.
- Validation errors fit comfortably inside the dialog.
- Closing the dialog does not risk losing a complex workflow.

Current acceptable dialog example:

- Catalog entry create/edit forms.

Do not put long vehicle, purchase, sale, expense, or user administration forms in dialogs.

## 12. Detail Views

Detail pages should support reading, checking, and deciding.

Rules:

- Use breadcrumbs or a compact parent navigation link.
- Use `PageHeader` with record identity and concise operational context.
- Group read-only fields into `DetailSection` candidates.
- Use `font-mono` for codes, VINs, stock numbers, and internal identifiers.
- Put record-level actions in the header or a consistent action area.
- Show warning or missing-document states near the relevant section.
- Keep history/timeline sections visually separate from current record data.

## 13. Status System

Use semantic status groups. A future shared `StatusBadge` should encode these mappings.

Suggested groups:

| Group | Use For | Treatment |
| --- | --- | --- |
| Neutral | ordinary informational state, draft, unknown, not applicable | default or outline badge |
| Active / Success | available, active, completed, title in hand, posted | positive or default high-confidence treatment |
| Pending / Warning | pending, in preparation, missing documentation, VIN warning, waiting on action | warning treatment compatible with current tokens |
| Inactive / Muted | inactive, no title in hand, archived-like non-destructive state | muted badge and muted supporting text |
| Destructive / Void | cancelled, voided, deleted-like irreversible state | destructive badge and confirmation language |
| Sold / Closed | sold, closed purchase/sale workflow, finalized transaction | completed treatment distinct from destructive state |

Rules:

- Do not assign badge colors ad hoc in each module.
- Status labels must remain text-visible.
- Color may reinforce status but must never be the only signal.
- Prefer one badge per primary status. Avoid stacking many badges unless each communicates a different operational fact.
- Use row opacity only as a secondary cue for voided/inactive rows.

Operational examples:

- Vehicle available: Active / Success.
- Vehicle in preparation: Pending / Warning.
- Purchase vigente: Active / Success or Neutral, depending on final `StatusBadge` variants.
- Purchase anulada: Destructive / Void.
- User inactive: Inactive / Muted.
- Missing documentation: Pending / Warning.

## 14. Feedback And Confirmation

Toasts:

- Use toasts for success and recoverable operation results after submit/action completion.
- Keep toast text short and user-facing.
- Do not use toasts as the only place for validation errors.

Validation errors:

- Show validation near fields and summarize only when useful.
- Keep language actionable and non-technical.

Loading:

- Disable pending submit and destructive buttons.
- Use stable labels such as `Guardando...`, `Aplicando...`, or module-appropriate Spanish copy.
- Use skeletons or stable placeholders for table/detail loading in client-rendered flows.

Empty states:

- Use `EmptyState` for empty lists.
- Include the next allowed action when the role permits it.
- Distinguish true empty data from no search/filter results.

Confirmation dialogs:

- Use `ConfirmDialog` for destructive or state-changing operations users should review twice.
- Dialog title should name the action.
- Description should explain the consequence, especially for void, deactivate, cancel, or irreversible operations.
- Confirm button variant should be `destructive` for destructive operations.
- Keep cancel as the lower-emphasis safe action.

Destructive confirmations:

- Required for voiding purchases, deactivating users/catalog entries when consequences matter, deleting-like actions, and any irreversible operation.
- Must prevent double submission and show a pending state.
- Must not rely on browser-native confirm dialogs for core workflows.

## 15. Responsive Behavior

Desktop is the primary optimization target, but smaller viewports must remain usable.

Rules:

- Header actions and filter controls must wrap without overlap.
- Tables may horizontally scroll. Preserve identifiers, statuses, and row actions.
- Forms become one-column on small screens.
- Dialogs must fit within viewport height and support scrolling content if needed.
- Mobile navigation belongs to the application shell, not individual pages.
- Avoid fixed widths that break Spanish labels or long vehicle data.
- Use stable dimensions for buttons, table controls, pagination, and filter bars so pending labels do not shift layout excessively.

## 16. Accessibility

Accessibility rules are implementation requirements, not polish.

- Keyboard users must be able to reach navigation, filters, table actions, dialogs, forms, and account actions.
- Focus must be visible.
- Inputs, selects, textareas, and custom controls need labels.
- Invalid fields should use `aria-invalid` and connect to error text when practical.
- Dialogs must trap focus, return focus on close, and provide title/description semantics through the existing dialog primitive.
- Tables must use proper table semantics, not div grids for tabular data.
- Status must not be communicated by color alone. Include text labels.
- Destructive buttons and confirmations must be understandable without color.
- Maintain contrast through CSS variables and avoid low-contrast custom colors.
- Icon-only controls need accessible labels or tooltips where the action is not obvious.

## 17. Shared Components And Reuse Rules

Current shared components:

- `PageHeader`: standard page title, description, and action area for management screens.
- `DataTable`: declarative compact table with optional client-side search, toolbar, row actions, empty state, and result count.
- `EmptyState`: centered empty/no-result message with optional action.
- `ConfirmDialog`: accessible confirmation dialog with pending state for state-changing actions.
- `MoneyInput`: decimal money entry that submits integer cents expected by server schemas.
- `SubmitButton`: Server Action submit button with pending state and double-submit protection.

Candidate application-level components for future implementation:

- `AppShell`: authenticated layout composition and global app-level concerns.
- `AppSidebar`: role-aware primary navigation and collapsed state.
- `AppHeader`: breadcrumbs, account menu, and page-level utility actions.
- `PageContainer`: consistent content width, padding, and responsive spacing.
- `PageToolbar`: page or list actions that are not part of the title block.
- `FilterBar`: reusable compact filter composition with active/reset behavior.
- `DataTablePagination`: shared pagination controls and counts.
- `StatusBadge`: semantic status mapping for all modules.
- `FormSection`: section title, description, and field grid for long forms.
- `DetailSection`: read-only field grouping for detail pages.

Reuse rules:

- Extract or expand a shared component when at least two modules need the pattern.
- Extract immediately when one shared component prevents high-risk inconsistency in shell, navigation, status, tables, forms, or destructive confirmation.
- Do not abstract one-off domain logic.
- Shared UI components must build on existing shadcn/ui, shadcn `base-nova`, Tailwind CSS variables, and Lucide icons.
- Do not add another UI framework or admin template.
- Prefer improving existing primitives and shared components before adding new dependencies.

## 18. OpenSpec Integration Rules

Future OpenSpec proposals that add or modify UI must reference this file.

Required proposal sentence:

```text
The implementation MUST follow docs/design-system/UI_GUIDELINES.md.
```

This applies to proposals that change:

- Screens, layouts, navigation, shell behavior, dashboards, or reports.
- Forms, tables, filters, search, pagination, detail views, dialogs, or toasts.
- Status badges, empty states, loading states, responsive behavior, or accessibility behavior.
- Shared UI components or module redesigns.

Future module redesigns must build on this global design system instead of defining a separate module-specific visual direction.

## 19. Migration Strategy

Migration order:

1. Define the design system in this document.
2. Create shared UI foundations where immediately reusable.
3. Redesign Vehicles in a later change to validate shell, page anatomy, table, filter, form, detail, status, and feedback patterns.
4. Adjust this document based on Vehicles validation.
5. Migrate Purchases.
6. Migrate Sales.
7. Migrate Expenses.
8. Migrate Catalogs.
9. Migrate Users.
10. Apply the same system to future modules, reports, dashboards, and document workflows.

Compatibility constraints:

- No business logic changes as part of this design-system establishment change.
- No API changes.
- No database schema changes.
- No permission changes.
- No removal of working functionality.
- No individual module redesigns as part of this change.
- Later module migrations should be isolated so one module can be reverted without affecting unrelated workflows.

Known future gaps to address:

- Build `AppShell`, `AppSidebar`, `AppHeader`, and `PageContainer`.
- Normalize filter bars across Vehicles, Purchases, and Catalogs.
- Introduce `StatusBadge` before broader module migration.
- Extract `FormSection` and `DetailSection` after Vehicles validates the pattern.
- Add pagination once real data size requires server-side table behavior.

## 20. Correct And Incorrect Usage Examples

### Page Headers

Correct:

- Use `PageHeader` with `title="Vehiculos"` and one compact sentence describing the inventory purpose.
- Put `Nuevo vehiculo` or `Registrar compra` in the header or table toolbar where the user expects the create action.

Incorrect:

- Add a large hero block with marketing copy above an inventory table.
- Use a different heading size, layout, and action placement for every module.

### Cards

Correct:

- Use cards for repeated catalog tiles on the Catalogs index.
- Use a card when a short form or framed tool benefits from visible grouping.

Incorrect:

- Put the whole page in a card, then put sections in nested cards inside it.
- Use decorative card grids for operational data that should be a table.

### Tables

Correct:

- Codes and VINs are monospace.
- Money and numeric columns align right.
- Row actions stay in the rightmost column.
- Empty table states use `EmptyState`.

Incorrect:

- Center-align every column.
- Hide status text and rely only on a colored dot.
- Create a custom table style for one module.

### Filters

Correct:

- Use inline filters for Vehicles status, make, and received dates.
- Show `Limpiar filtros` when any filter is active.
- Keep search near the affected table.

Incorrect:

- Use a tall always-open advanced filter panel for two common filters.
- Persist every temporary search term without a product reason.

### Long Forms

Correct:

- Use a full-page, sectioned form for vehicle and purchase create/edit flows.
- Use `SubmitButton` for Server Action submission.
- Keep cancel/back lower emphasis than save.

Incorrect:

- Put a vehicle create form in a modal dialog.
- Mix destructive actions directly beside save without confirmation.

### Dialogs

Correct:

- Use dialogs for short catalog entry forms.
- Use `ConfirmDialog` for void, deactivate, and irreversible state changes.

Incorrect:

- Use browser-native confirm dialogs for core workflows.
- Use a dialog for a multi-section purchase form.

### Status Badges

Correct:

- Map `available`, `pending`, `in preparation`, `sold`, `cancelled`, `completed`, `missing documentation`, `active`, `inactive`, and `voided` through semantic status groups.
- Show text labels in every badge.

Incorrect:

- Pick badge colors independently inside each module.
- Communicate missing documents only with a yellow color.

### Destructive Confirmations

Correct:

- Destructive dialog title names the action.
- Description states the consequence.
- Confirm button uses destructive treatment and pending state.

Incorrect:

- Let a destructive action run from a single unconfirmed row button.
- Use vague copy such as `Are you sure?` without naming the affected operation.

### Dashboard-Style Screens

Correct:

- Use compact metrics, tables, exceptions, aging lists, and action queues.
- Prioritize operational signals such as vehicles needing documents, purchases pending correction, or aged inventory.

Incorrect:

- Build a marketing landing page with a giant welcome hero.
- Add decorative gradients, oversized metric cards, or animations that reduce scanability.
