## 1. Preparation

- [x] 1.1 Read the relevant local Next.js 16 documentation under `node_modules/next/dist/docs/` before editing App Router layout or navigation code.
- [x] 1.2 Review `docs/design-system/UI_GUIDELINES.md`, the existing authenticated layout, and current shared components to confirm implementation constraints.
- [x] 1.3 Confirm the change does not require business logic, API, database schema, permission, or module workflow changes.

## 2. Application Shell Foundations

- [x] 2.1 Add app-shell component structure, likely under `src/components/app/`, for `AppShell`, `AppSidebar`, `AppHeader`, and any small active-navigation helper needed by the shell.
- [x] 2.2 Define the shared navigation item model and preserve the existing destinations: Dashboard, Vehiculos, Compras, Catalogos, Usuarios for admins, and Mi cuenta.
- [x] 2.3 Implement role-aware navigation rendering so admin-only navigation remains equivalent to the current layout behavior.
- [x] 2.4 Implement active module indication for current routes while keeping client-only pathname logic isolated to the smallest necessary component.
- [x] 2.5 Implement responsive navigation behavior for tablet and smaller screens without requiring individual pages to define their own mobile navigation.
- [x] 2.6 Keep global account display, sign-out behavior, and `Toaster` placement equivalent to the current authenticated layout.

## 3. Page Composition Foundations

- [x] 3.1 Add a shared `PageContainer` foundation for consistent authenticated page padding, max width, and vertical spacing.
- [x] 3.2 Add a shared `PageToolbar` or `FilterBar` foundation for compact search, filters, reset controls, secondary actions, and wrapping behavior.
- [x] 3.3 Review the existing `PageHeader` and adjust only as needed to align with the guidelines while preserving current call sites.
- [x] 3.4 Ensure page composition foundations support wrapping actions and compact operational copy without overlapping text at common desktop and mobile widths.

## 4. Operational Component Foundations

- [x] 4.1 Add a shared `StatusBadge` component with semantic variants such as neutral, success, warning, muted, and destructive.
- [x] 4.2 Add a shared `FormSection` component for long operational forms with title, optional description, grouped fields, and action placement support.
- [x] 4.3 Add a shared `DetailSection` component for read-only detail pages with grouped facts, identifiers, statuses, and empty or unavailable values.
- [x] 4.4 Keep new primitives domain-agnostic and built on the existing shadcn/ui, Tailwind CSS variables, and Lucide icon stack.

## 5. Layout Integration

- [x] 5.1 Update `src/app/(app)/layout.tsx` to use the shared app-shell foundations while preserving `verifySession()`, `dynamic = "force-dynamic"`, role checks, sign-out action, and authenticated-route behavior.
- [x] 5.2 Verify existing authenticated pages continue to render inside the new shell without changing their internal module workflows.
- [x] 5.3 Confirm non-admin users do not see admin-only navigation and admins retain access to the existing Usuarios navigation.

## 6. Verification

- [x] 6.1 Run project static checks such as linting and type checking, using the repository's available scripts.
- [ ] 6.2 Manually inspect the authenticated shell at desktop and smaller viewport widths if a dev server or browser check is available.
- [x] 6.3 Verify no business logic, API, database schema, permission, server action, or module workflow files changed outside the UI foundation scope.
- [x] 6.4 Run OpenSpec validation for `implement-shared-ui-foundation`.
