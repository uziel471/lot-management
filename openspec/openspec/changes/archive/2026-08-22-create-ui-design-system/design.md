## Context

See `proposal.md` for motivation and `specs/ui-design-system/spec.md` for the behavior contract.

The current app is a Next.js 16 App Router application with authenticated routes under `src/app/(app)` and auth routes under `src/app/(auth)`. The UI stack is TypeScript, Tailwind CSS 4, shadcn/ui with `base-nova`, Base UI primitives where already present, and Lucide icons. `components.json` is configured for RSC, CSS variables, neutral base color, and aliases for `@/components`, `@/components/ui`, and `@/lib/utils`.

Current UI state:

- `src/app/(app)/layout.tsx` provides a compact authenticated shell with a top horizontal header, links, account text, sign-out, and a global `Toaster`.
- `src/app/globals.css` defines shadcn/Tailwind CSS variables, neutral theme tokens, dark tokens, and sidebar tokens, but the app does not yet use a full sidebar shell.
- Shared components include `PageHeader`, `DataTable`, `EmptyState`, `ConfirmDialog`, `MoneyInput`, and `SubmitButton`.
- UI primitives include compact `Button`, `Input`, `Select`, `Textarea`, `Badge`, `Card`, `Dialog`, `Label`, `Table`, and `Toast`.
- Vehicles and Purchases show the most mature operational patterns: compact page headers, inline filters, searchable tables, status badges, full-page long forms, grouped form sections, detail screens, warnings, confirmations, and toasts.
- Catalogs uses dialog forms appropriately for short forms and row actions with confirm dialogs.
- Users still uses raw form controls and custom row layouts, which shows why reuse rules and migration guidance are needed.
- Responsive behavior is mostly natural wrapping plus horizontal table overflow. There is no documented mobile/tablet shell behavior.

Constraints:

- This change is planning and design-system definition only.
- Do not change business logic, APIs, database schemas, permissions, or working module behavior.
- Do not introduce another UI framework.
- The redesign must be evolutionary and compatible with current functionality.

## Goals / Non-Goals

**Goals:**

- Establish `docs/design-system/UI_GUIDELINES.md` as the durable UI source of truth.
- Standardize the visual and interaction direction for an operational dealership management platform.
- Define a scalable app shell direction that can support more modules than the current top-link header.
- Document reusable patterns for pages, tables, filters, forms, statuses, feedback, responsive behavior, accessibility, and reuse.
- Define shared application component candidates without forcing premature abstraction.
- Define how future OpenSpec UI proposals reference and follow the guidelines.
- Define an incremental migration sequence that starts with foundations and validates patterns in Vehicles before broader rollout.

**Non-Goals:**

- Redesign Vehicles, Purchases, Catalogs, Users, or any future module in this change.
- Replace shadcn/ui, shadcn `base-nova`, Tailwind CSS, or Lucide icons.
- Add a dashboard landing-page aesthetic.
- Add new business capabilities, schemas, APIs, or permissions.
- Solve final visual details for every future module before the first module migration validates the system.

## Decisions

### 1. Use a documentation-first design system

Create `docs/design-system/UI_GUIDELINES.md` first, then use later implementation changes to add or refine shared components.

Rationale:

- The project already has working UI and business flows. A documentation-first step lets future agents align without destabilizing current modules.
- The guidelines can capture current good patterns from Vehicles, Purchases, and Catalogs while naming inconsistencies to migrate later.
- It avoids creating abstractions before the real module migration proves them.

Alternatives considered:

- Build a component library immediately. Rejected because this proposal explicitly should not redesign modules yet, and premature component extraction would likely miss real module constraints.
- Redesign all modules at once. Rejected because it increases regression risk and conflicts with the requested evolutionary migration.

### 2. Keep shadcn `base-nova` and existing primitives as the foundation

The design system should build on the current shadcn `base-nova` setup, CSS variables, compact shadcn-style primitives, Tailwind utility classes, and Lucide icons.

Rationale:

- The current primitives already fit an operational density: `Button` heights are compact, `Table` cells are dense, and form controls are 32px high.
- The app already uses CSS variables and Tailwind 4; extending these tokens is lower risk than replacing them.
- A second UI framework would create inconsistent styling and increase bundle and maintenance cost.

Alternatives considered:

- Introduce a full admin template or UI framework. Rejected by project constraints and because it would likely force a rewrite.
- Hand-style every module independently. Rejected because the core problem is inconsistent module-level design.

### 3. Adopt a desktop-first operational shell with responsive fallback

The guidelines should define an authenticated shell that evolves from the current top-link header toward:

- desktop sidebar navigation with grouped modules,
- collapsible sidebar behavior,
- top header for breadcrumbs, page context, account menu, and secondary utility actions,
- main content container with predictable width and padding rules,
- responsive navigation for tablet and smaller screens,
- active route indication and role-aware visibility.

Rationale:

- The module list is expected to grow: inventory, purchases, sales, expenses, documents, customers, catalogs, users, reports, and dashboards.
- A horizontal link bar will not scale well.
- Dealership operators spend time in tables and forms; a stable shell supports repeated use and faster orientation.

Alternatives considered:

- Keep only a horizontal header. Acceptable for the current small module count, but weak for future growth.
- Use a marketing-style top navigation and large dashboard hero. Rejected because this is an internal work application.

### 4. Standardize page anatomy around existing successful patterns

The guidelines should define the default page structure:

`AppShell -> PageContainer -> Breadcrumbs -> PageHeader -> PageToolbar / FilterBar -> Main Content -> Pagination`

`PageHeader` should keep the current compact title/description/action structure and become the standard location for page-level primary and secondary actions when appropriate.

Rationale:

- Existing `PageHeader` is already used by Vehicles, Purchases, and Catalogs.
- Consistent page structure makes future AI-generated modules easier to align.
- Separating page header, toolbar/filter, and main content avoids oversized cards and landing-page composition.

Alternatives considered:

- Use cards as page section wrappers everywhere. Rejected because the app should be dense and cards should be reserved for repeated items, dialogs, and genuinely framed tools.

### 5. Treat tables and filters as first-class operational patterns

The guidelines should document:

- compact table density,
- left alignment for text and identifiers,
- right alignment for money and numeric columns,
- monospace for codes, VINs, stock numbers, and technical identifiers,
- consistent row action placement,
- search and filter placement,
- empty and loading states,
- server-side pagination/search threshold guidance,
- horizontal overflow or card/list alternatives for small screens.

Filters should be compact by default:

- inline for high-frequency, low-count filters,
- collapsible for medium-complexity filters,
- popover or sheet for secondary or advanced filters,
- resettable whenever any filter is active,
- persistable when the filtered view represents a user workflow that should survive navigation.

Rationale:

- Vehicles and Purchases already use compact inline filters, but the structure varies.
- Tables will dominate inventory, transaction, user, catalog, report, and document workflows.

Alternatives considered:

- Large filter panels above every table. Rejected because they consume vertical space and reduce table scanning.

### 6. Standardize long forms as full-page sectioned workflows

Long operational forms should remain full-page and be divided into logical sections. Short focused forms can use dialogs when the guidelines permit it.

Rationale:

- Vehicles and Purchases correctly avoid cramming long forms into modals.
- Catalog entries work well in dialogs because the forms are short and scoped.
- Operational users need clear validation, save/cancel placement, and predictable destructive action handling.

Alternatives considered:

- Multi-step wizards by default. Rejected because most data entry should remain fast and scannable; use steps only when the workflow has true staged decisions.
- Dialogs for all create/edit flows. Rejected for long forms.

### 7. Use semantic status mapping, not module-specific badge styling

The guidelines should define semantic status groups and map them to the existing component vocabulary. Examples:

- neutral/default: ordinary informational state,
- active/success: available, completed, active, title in hand,
- pending/warning: pending, in preparation, missing documentation, VIN warning,
- inactive/muted: inactive, not applicable, no title in hand,
- destructive: cancelled, voided, deleted-like irreversible states.

The exact color/token mapping belongs in `UI_GUIDELINES.md` and later component work, preferably through a shared `StatusBadge`.

Rationale:

- Current modules use `Badge` variants ad hoc.
- A semantic map keeps future Sales, Expenses, Documents, and Reports from inventing their own visual language.

Alternatives considered:

- Hard-code every module status separately. Rejected because it fragments the system.

### 8. Define shared component candidates but extract incrementally

Candidate components:

- `AppShell`
- `AppSidebar`
- `AppHeader`
- `PageContainer`
- `PageHeader`
- `PageToolbar`
- `FilterBar`
- `DataTable`
- `DataTablePagination`
- `EmptyState`
- `StatusBadge`
- `FormSection`
- `DetailSection`
- `ConfirmDialog`

Extraction rule:

- Create or expand a shared component when at least two modules need the pattern, or when one shared component prevents a high-risk inconsistency in shell, navigation, status, table, form, or destructive confirmation behavior.
- Do not abstract one-off module-specific logic.

Rationale:

- The app already has useful shared components.
- Some existing local helpers (`Section`, `Field`, `Info`, `Detail`) repeat enough to justify future shared patterns, but they should be validated during Vehicles migration.

Alternatives considered:

- Centralize everything immediately. Rejected because not all domain patterns are proven.
- Leave everything local. Rejected because future UI consistency depends on reusable primitives and documented composition rules.

### 9. Make OpenSpec UI compliance explicit

Future UI-related proposals should include language such as:

`The implementation MUST follow docs/design-system/UI_GUIDELINES.md.`

Rationale:

- The repo uses OpenSpec to guide AI and human implementation.
- Explicit references reduce drift when future changes are authored by different agents or over multiple sessions.

Alternatives considered:

- Rely on implicit team knowledge. Rejected because the design system is meant to be agent-readable and enforceable during review.

## UI_GUIDELINES.md Structure

The implementation should create `docs/design-system/UI_GUIDELINES.md` with this structure:

1. Design principles
2. Current technology foundation
3. Visual foundations
4. Application shell
5. Navigation
6. Page anatomy
7. Page headers
8. Tables
9. Filters and search
10. Forms
11. Detail views
12. Status system
13. Feedback and confirmation
14. Responsive behavior
15. Accessibility
16. Shared components and reuse rules
17. OpenSpec integration rules
18. Migration strategy
19. Correct and incorrect usage examples

The document should be detailed enough that another AI coding agent can implement a new module without inventing a new UI system.

## Migration Plan

1. Define the design system in `docs/design-system/UI_GUIDELINES.md`.
2. Review existing UI primitives and document any token/component gaps that future implementation should address.
3. Create shared UI foundations only where immediately reusable: likely `PageContainer`, `PageToolbar` or `FilterBar`, improved `DataTable` guidance, `StatusBadge`, `FormSection`, and `DetailSection`.
4. Redesign the Vehicles module in a later change to validate shell, page anatomy, table, filter, form, detail, status, and feedback patterns.
5. Adjust `UI_GUIDELINES.md` based on Vehicles validation.
6. Gradually migrate Purchases.
7. Migrate Sales when introduced or redesigned.
8. Migrate Expenses.
9. Migrate Catalogs.
10. Migrate Users.
11. Apply the same system to future modules, reports, and dashboards.

Rollback strategy:

- Because this change should initially add documentation and planning artifacts, rollback is simply reverting the documentation change.
- Later implementation changes should keep module migrations isolated so a single module can be reverted without affecting business logic or data.

## Risks / Trade-offs

- Guidelines become too abstract → Include concrete examples of correct and incorrect usage and reference current modules where useful.
- Guidelines become too rigid before validation → Treat Vehicles migration as the first real validation point and update the document afterward.
- Sidebar shell migration disrupts existing navigation → Introduce shell changes in a dedicated implementation change and keep role-aware links equivalent to current behavior.
- Shared components overfit one module → Extract only when reuse is proven or when consistency risk is high.
- Tables outgrow client-side filtering → Document the threshold for moving search, filters, sorting, and pagination server-side.
- Users on smaller screens struggle with dense tables → Define responsive table behavior and page action wrapping rules in the guidelines.
- Status colors drift by module → Introduce semantic status mapping and later a shared `StatusBadge`.
- AI agents ignore the design system → Require future UI OpenSpec proposals to explicitly reference `docs/design-system/UI_GUIDELINES.md`.

## Open Questions

- The final exact visual color mapping for each semantic status can be refined during implementation, as long as it remains compatible with the existing CSS-variable theme and the semantic groups defined here.
- The exact server-side pagination threshold can be tuned after real data volume is known; current guidance should document a conservative review point rather than force a premature backend change.
