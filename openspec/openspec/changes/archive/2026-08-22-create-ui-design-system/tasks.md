## 1. Design System Documentation

- [x] 1.1 Create `docs/design-system/` if it does not exist.
- [x] 1.2 Create `docs/design-system/UI_GUIDELINES.md` with sections for design principles, technology foundation, visual foundations, application shell, navigation, page anatomy, page headers, tables, filters and search, forms, detail views, status system, feedback, responsive behavior, accessibility, shared components, OpenSpec integration, migration strategy, and usage examples.
- [x] 1.3 Document the current repository assessment in the guidelines, including existing App Router structure, authenticated layout, shared components, shadcn `base-nova` setup, Tailwind CSS variables, current tables, filters, forms, empty states, dialogs, toasts, and responsive behavior.
- [x] 1.4 Define the professional operational design direction for the dealership management system, including explicit guidance to avoid marketing-style layouts, decorative gradients, excessive whitespace, oversized controls, unnecessary animation, and inconsistent module-specific visual systems.
- [x] 1.5 Add examples of correct and incorrect usage for page headers, cards, tables, filters, long forms, dialogs, status badges, destructive confirmations, and dashboard-style screens.

## 2. Foundations And Shell Standards

- [x] 2.1 Document typography, font sizes, font weights, spacing, container widths, borders, radius, shadows, backgrounds, semantic colors, interaction states, and focus states using the existing Tailwind CSS and shadcn CSS-variable foundation.
- [x] 2.2 Document the target authenticated application shell, including desktop sidebar navigation, collapsible sidebar behavior, top header, breadcrumbs, account menu, main content container, responsive navigation, and active module indication.
- [x] 2.3 Define the standard page composition: `AppShell`, `PageContainer`, breadcrumbs, `PageHeader`, toolbar or filters, main content, and pagination when applicable.
- [x] 2.4 Define page header rules for title, description, primary action, secondary actions, and compact operational copy.

## 3. Component Pattern Standards

- [x] 3.1 Document table standards for density, column alignment, row actions, sorting, search, filters, pagination, status representation, empty states, loading states, and responsive behavior.
- [x] 3.2 Document reusable filter rules for inline, collapsible, popover, sheet, persisted, and resettable filters.
- [x] 3.3 Document form standards for field layout, labels, help text, required fields, validation, sections, multi-column layouts, long forms, save/cancel actions, and destructive actions.
- [x] 3.4 Document when long forms must be full-page and when short focused forms may use dialogs.
- [x] 3.5 Define the semantic status system for operational states such as available, pending, in preparation, sold, cancelled, completed, missing documentation, active, inactive, and voided.
- [x] 3.6 Document feedback patterns for toasts, validation errors, loading, skeletons, empty states, confirmation dialogs, and destructive confirmations.
- [x] 3.7 Document accessibility rules for keyboard navigation, visible focus, labels, aria-invalid, dialog behavior, color contrast, table semantics, and non-color-only status communication.

## 4. Shared Component Strategy

- [x] 4.1 Identify current shared components and document their intended use: `PageHeader`, `DataTable`, `EmptyState`, `ConfirmDialog`, `MoneyInput`, and `SubmitButton`.
- [x] 4.2 Document candidate application-level components for future implementation: `AppShell`, `AppSidebar`, `AppHeader`, `PageContainer`, `PageToolbar`, `FilterBar`, `DataTablePagination`, `StatusBadge`, `FormSection`, and `DetailSection`.
- [x] 4.3 Define reuse rules that prevent premature abstractions while requiring shared components for shell, navigation, status, table, form, and destructive confirmation patterns when reuse is clear.
- [x] 4.4 Document that future shared components must build on existing shadcn/ui, shadcn `base-nova`, Tailwind CSS, and Lucide icons, with no additional UI framework.

## 5. OpenSpec And Migration Guidance

- [x] 5.1 Add an OpenSpec integration section stating that future UI-related proposals MUST reference `docs/design-system/UI_GUIDELINES.md`.
- [x] 5.2 Include the exact recommended proposal sentence: “The implementation MUST follow docs/design-system/UI_GUIDELINES.md.”
- [x] 5.3 Document the incremental migration strategy: define the design system, create shared UI foundations, redesign Vehicles, validate patterns, adjust the design system, migrate Purchases, migrate Sales, migrate Expenses, migrate Catalogs, migrate Users, and apply the system to future modules.
- [x] 5.4 Document compatibility constraints: no business logic changes, no API changes, no database schema changes, no permission changes, no removal of working functionality, and no individual module redesigns as part of this design-system establishment change.

## 6. Verification

- [x] 6.1 Review `docs/design-system/UI_GUIDELINES.md` against `proposal.md`, `design.md`, and `specs/ui-design-system/spec.md` to ensure all required topics are covered.
- [x] 6.2 Verify the guidelines are detailed enough for another AI coding agent to implement a new module consistently.
- [x] 6.3 Run OpenSpec validation for `create-ui-design-system`.
- [x] 6.4 Confirm no application business logic, APIs, database schemas, permissions, or module redesign files were changed by this implementation.
