## Why

The application already has working operational modules, but UI patterns are still emerging module by module: navigation, page structure, filters, forms, detail sections, statuses, and feedback are not yet governed by a shared source of truth. A global UI/UX design system is needed now so future Vehicles, Purchases, Sales, Expenses, Catalogs, Users, dashboard, and reporting work evolves consistently without turning each module into an independent redesign.

## What Changes

- Define a professional, desktop-efficient design direction for an internal U.S. LLC vehicle lot / used car dealership management system.
- Create `docs/design-system/UI_GUIDELINES.md` as the source of truth for future UI/UX work.
- Establish standards for foundations, application shell, navigation, page anatomy, page headers, tables, filters, forms, statuses, feedback, responsive behavior, accessibility, and reuse.
- Define how future OpenSpec UI-related changes must reference and follow `docs/design-system/UI_GUIDELINES.md`.
- Define a shared component strategy for application-level components such as `AppShell`, `AppSidebar`, `AppHeader`, `PageContainer`, `PageHeader`, `PageToolbar`, `FilterBar`, `DataTable`, `DataTablePagination`, `EmptyState`, `StatusBadge`, `FormSection`, `DetailSection`, and `ConfirmDialog`.
- Define a safe incremental migration strategy: establish the design system first, validate it in Vehicles, adjust if needed, then gradually migrate Purchases, Sales, Expenses, Catalogs, Users, and future modules.
- Preserve existing working functionality during migration.
- Do not redesign individual modules as part of this change.
- Do not modify business logic, APIs, database schemas, permissions, or existing module behavior.
- Do not introduce another component library; continue using Next.js, TypeScript, Tailwind CSS, shadcn/ui, shadcn `base-nova`, Base UI primitives already present, and Lucide icons.

Current UI assessment:

- The app uses Next.js App Router with route groups for authenticated app routes and auth routes.
- The authenticated shell is a compact horizontal header in `src/app/(app)/layout.tsx` with links to Dashboard, Vehicles, Purchases, Catalogs, Users for admins, Account, and sign-out. It does not yet provide a scalable sidebar, collapsible navigation, breadcrumbs, route active state, or mobile navigation pattern.
- Global theming is in `src/app/globals.css` with Tailwind CSS 4, shadcn `base-nova`, CSS variables, neutral base colors, compact radius tokens, sidebar tokens, and dark-mode tokens.
- shadcn configuration in `components.json` uses `base-nova`, RSC, TypeScript, CSS variables, neutral base color, Lucide icons, and aliases for shared UI imports.
- Existing shadcn-style primitives are compact and operational: `Button`, `Input`, `Select`, `Textarea`, `Badge`, `Card`, `Dialog`, `Table`, `Label`, and `Toast`.
- Shared components already exist for `PageHeader`, `DataTable`, `EmptyState`, `ConfirmDialog`, `MoneyInput`, and `SubmitButton`.
- Tables are currently compact, horizontally scrollable, and use declarative columns. Current filtering is client-side and appropriate for existing data sizes, but table search/filter/pagination/sorting guidance is not yet standardized.
- Vehicles and Purchases use inline filter bars with small controls and reset behavior; Catalogs embeds visibility toggles and create actions into the table toolbar. These should be normalized into one filtering pattern.
- Long operational forms already avoid modals and use full-page grouped sections with two-column desktop grids. Catalog forms use dialogs because their forms are short. Users still use some raw inputs and custom row layouts, showing the need for reuse rules.
- Status badges exist but variants are applied ad hoc per module. A semantic status system is needed so inventory, transactions, documents, active/inactive states, and destructive states remain visually consistent.
- Feedback patterns exist through toasts, field errors, pending labels, warnings, empty states, and confirmation dialogs, but destructive confirmation UX is inconsistent in places and should be standardized.
- Responsive behavior is mostly based on flex wrapping and table horizontal overflow. A desktop-first but tablet/mobile-usable shell, table, form, filter, and action behavior needs to be documented.

## Capabilities

### New Capabilities

- `ui-design-system`: Defines the application-wide UI/UX standards, design documentation, shared component expectations, OpenSpec integration rules, and incremental migration requirements for UI work.

### Modified Capabilities

- None.

## Impact

- Affected files for implementation planning:
  - `docs/design-system/UI_GUIDELINES.md`
  - existing UI foundation files such as `src/app/globals.css`, `components.json`, `src/components/ui/*`, and `src/components/shared/*` only as needed to establish shared foundations in later implementation changes
  - future OpenSpec proposals that affect UI
- No business logic changes.
- No API changes.
- No database schema changes.
- No permission changes.
- No new UI framework or component library.
- Existing modules must continue working while migration proceeds incrementally.
