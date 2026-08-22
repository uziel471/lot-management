## Why

The design-system guidelines now define the target operational UI, but the app still lacks several shared foundation components that future module work needs to reuse consistently. Implementing those foundations now reduces drift before Vehicles and later modules are redesigned.

## What Changes

- Add shared application-shell foundations for authenticated pages, including reusable shell, sidebar, header, navigation, and page container composition.
- Add reusable operational page foundations for toolbars, filters, status badges, form sections, and detail sections.
- Align existing shared components with `docs/design-system/UI_GUIDELINES.md` where needed while preserving current module behavior.
- Keep the migration compatible: no business logic, API, database schema, permission, or module workflow changes.
- Prepare the UI foundation for the next module-level validation change, expected to start with Vehicles.

## Capabilities

### New Capabilities

### Modified Capabilities

- `ui-design-system`: Adds implementation requirements for shared UI foundation components that operational modules must reuse when their screens are migrated.

## Impact

- Affected code: `src/app/(app)/layout.tsx`, `src/app/globals.css` as needed, `src/components/shared/*`, and possible new files under `src/components/app/*` or `src/components/shared/*`.
- Affected docs/specs: `docs/design-system/UI_GUIDELINES.md` only if implementation reveals a needed clarification.
- No expected changes to APIs, database models, authentication, authorization, server actions, or existing business workflows.
- No new UI framework; implementation must continue using Next.js App Router, TypeScript, Tailwind CSS 4, shadcn/ui `base-nova`, existing CSS variables, and Lucide icons.
