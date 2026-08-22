## Context

See `proposal.md` for motivation and `specs/ui-design-system/spec.md` for the behavior contract.

The app is a Next.js 16 App Router application with authenticated pages under `src/app/(app)`. The current authenticated layout verifies the session once, renders a compact top header, preserves admin-only navigation for `Usuarios`, mounts the global `Toaster`, and renders page content inside `main className="flex-1 p-4"`.

The existing UI foundation includes shadcn/ui `base-nova`, Tailwind CSS 4 variables in `src/app/globals.css`, Lucide icons, and shared components for `PageHeader`, `DataTable`, `EmptyState`, `ConfirmDialog`, `MoneyInput`, and `SubmitButton`. `docs/design-system/UI_GUIDELINES.md` is the governing UI source of truth.

Because the local `AGENTS.md` states this is not a familiar Next.js version, implementation must read the relevant local Next.js docs from `node_modules/next/dist/docs/` before changing App Router files.

## Goals / Non-Goals

**Goals:**

- Introduce reusable shell and page-composition foundations that future module work can adopt.
- Preserve current authentication, role-aware navigation visibility, sign-out behavior, and page routing.
- Add shared operational foundations for recurring filter, status, form-section, and detail-section patterns.
- Keep components small, composable, and compatible with React Server Components unless a component needs client-side state.
- Create foundations that can be validated in a later Vehicles migration without redesigning Vehicles in this change.

**Non-Goals:**

- Redesign Vehicles, Purchases, Catalogs, Users, Dashboard, or Account screens.
- Change business logic, server actions, API behavior, database schema, permissions, or data loading.
- Add a new UI framework, admin template, animation system, or design-token scheme.
- Solve final module-specific responsive table alternatives before module migrations validate them.

## Decisions

### 1. Split app shell primitives from generic shared page primitives

Create application-shell components in an app-specific shared area, likely `src/components/app/`, and generic operational primitives in `src/components/shared/`.

Expected app-shell components:

- `AppShell`: authenticated shell frame that accepts current user context, navigation items, and children.
- `AppSidebar`: desktop navigation with active item treatment and role-filtered items supplied by the caller or helper.
- `AppHeader`: top region for account actions, compact page context, and mobile navigation trigger when needed.
- `PageContainer`: consistent page width, padding, and vertical stack spacing.

Rationale:

- Shell components know about application navigation and account placement.
- Page primitives are reusable by any operational screen and should not depend on auth/session details.

Alternatives considered:

- Keep all foundations in `src/components/shared/`. Rejected because app shell components carry application-specific navigation semantics.
- Embed shell markup directly in `src/app/(app)/layout.tsx`. Rejected because future shell changes would keep concentrating complexity in the route layout.

### 2. Keep the first shell implementation compatible with existing routes

Replace the current top-header markup with shared shell components, but keep the same authenticated-route boundary, `verifySession()` call, `dynamic = "force-dynamic"`, role-aware `Usuarios` visibility, sign-out action, and `Toaster` placement.

The shell may introduce sidebar-style desktop navigation and responsive fallback, but it must not require individual pages to provide their own navigation. If active-route detection needs client-side pathname state, keep that behavior isolated in a small client component rather than turning the full layout into a client component.

Rationale:

- The current layout already contains the correct auth boundary.
- A shell migration can be verified independently from domain modules.

Alternatives considered:

- Leave the header unchanged and only add unused components. Rejected because the spec requires authenticated pages to render inside the shared foundations after implementation.
- Move auth verification into the shell component. Rejected because session verification is a server concern currently owned by the route layout.

### 3. Add operational primitives before migrating modules

Add the primitives needed by upcoming module migrations:

- `PageToolbar` or `FilterBar` for compact search/filter/action composition.
- `StatusBadge` for semantic operational statuses.
- `FormSection` for titled field groups in long forms.
- `DetailSection` for read-only grouped facts.

These components should use existing shadcn/ui primitives, Tailwind utility classes, CSS variables, and Lucide icons. They should expose simple props and composition slots rather than domain-specific status names or business logic.

Rationale:

- Vehicles, Purchases, Catalogs, and Users already repeat these patterns in different ways.
- Shared primitives give the next Vehicles migration concrete targets without changing Vehicles in this change.

Alternatives considered:

- Extract every repeated component immediately. Rejected because domain details should be validated during module migration.
- Make these components domain-aware. Rejected because foundations should not encode vehicle, purchase, catalog, or user business rules.

### 4. Define semantic status mapping centrally

Introduce `StatusBadge` around a small semantic vocabulary such as `neutral`, `success`, `warning`, `muted`, and `destructive`. Domain modules can map their statuses to these semantics during migration.

Rationale:

- The design-system spec requires semantic status treatment.
- A compact semantic layer prevents status colors from drifting by module.

Alternatives considered:

- Add one visual variant per domain status. Rejected because it couples the shared component to module data models.
- Continue using raw `Badge` variants everywhere. Rejected because it leaves the design-system requirement unenforced.

### 5. Keep adoption incremental

This change should create and wire foundations only where required for the shell. Existing modules should continue to render with their current page internals. Module-level adoption belongs to follow-up changes, starting with Vehicles.

Rationale:

- It keeps the blast radius narrow.
- It produces reusable components without mixing foundation work with domain screen redesign.

Alternatives considered:

- Migrate Vehicles in the same change. Rejected because Vehicles is the validation step after foundations exist.

## Risks / Trade-offs

- Shell active-state logic can force unnecessary client rendering -> Isolate pathname-dependent logic in the smallest possible client component.
- Sidebar/responsive shell can disrupt existing navigation density -> Preserve all current destinations and verify desktop and small viewport behavior manually.
- Shared primitives can become too generic to be useful -> Keep props concrete around the documented operational patterns and refine during Vehicles migration.
- Status semantics may not cover every future domain status -> Provide a fallback neutral treatment and extend the semantic map only when future specs require it.
- Component extraction can accidentally change module workflows -> Do not migrate page internals in this change except where the shell wraps all authenticated pages.

## Migration Plan

1. Read the relevant local Next.js 16 docs before changing App Router layout code.
2. Add app-shell components and keep `src/app/(app)/layout.tsx` responsible for session verification and authenticated boundary behavior.
3. Add shared operational primitives for page container, toolbar/filter composition, status badges, form sections, and detail sections.
4. Wire the authenticated layout to the shared shell while preserving existing links, admin-only visibility, account display, sign-out, and `Toaster`.
5. Run static checks and manually inspect the shell at desktop and small viewport widths if a dev server/browser check is available.
6. Leave domain page migrations for follow-up OpenSpec changes, beginning with Vehicles.

Rollback strategy:

- Revert the new shell/shared foundation components and restore the previous `src/app/(app)/layout.tsx` markup. Because this change does not alter business data or APIs, rollback is code-only.

## Open Questions

- The exact mobile navigation mechanism can be selected during implementation from available local primitives, as long as it satisfies the spec and does not add a new UI framework.
- The exact semantic status labels can be expanded during module migrations when real domain statuses require additional mapping.
