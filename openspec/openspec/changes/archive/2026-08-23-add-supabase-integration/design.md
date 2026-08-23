## Context

See `proposal.md` for motivation. The application is a Next.js 16 App Router project under the repository parent of this OpenSpec workspace, uses `pnpm@8.15.0`, and already has `components.json` configured for shadcn. The local `AGENTS.md` requires reading relevant Next.js docs before code changes; for this change the relevant guide is `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`.

The existing authentication spec remains based on the current private-session behavior. This change only adds a Supabase integration foundation and does not define a migration to Supabase Auth.

## Goals / Non-Goals

**Goals:**

- Add official Supabase dependencies using the repository package manager.
- Generate the shadcn Supabase client block for Next.js.
- Configure the provided public Supabase project URL and publishable key in the app root `.env.local`.
- Ensure generated Supabase helpers fail clearly when required public configuration is missing.
- Keep browser-exposed configuration limited to public Supabase values.

**Non-Goals:**

- Do not replace Better Auth or change login/session behavior.
- Do not add Supabase service-role credentials or server-only privileged access.
- Do not migrate existing MongoDB-backed data access to Supabase.
- Do not implement Supabase-backed product features beyond the shared integration foundation.

## Decisions

1. Use `pnpm` for dependency installation, despite the provided `npm install` example.

   Rationale: `package.json` declares `packageManager: pnpm@8.15.0` and the repository has `pnpm-lock.yaml`. Keeping the package manager consistent avoids lockfile churn and mixed dependency resolution.

   Alternative considered: Run the exact `npm install` command. Rejected because it would introduce or update npm lockfile state in a pnpm-managed project.

2. Use the shadcn registry command as the source of generated Supabase client helpers.

   Rationale: The requested block is maintained through the Supabase shadcn registry and should produce files aligned with the app's existing `components.json` aliases.

   Alternative considered: Hand-write Supabase client helpers. Rejected because the requested registry block is more likely to stay aligned with Supabase SSR conventions.

3. Store only the provided public Supabase values in `.env.local`.

   Rationale: Next.js exposes `NEXT_PUBLIC_` values to browser code and inlines them into client bundles at build time. The provided publishable key is intended for that exposure; privileged keys are explicitly out of scope.

   Alternative considered: Add server-only Supabase environment variables now. Rejected because no service-role or privileged server feature is specified.

4. Treat Supabase integration as additive.

   Rationale: Existing specs require private authenticated access, server-revocable sessions, and data-layer authorization. The supplied setup commands do not define a behavior change for those contracts.

   Alternative considered: Modify the authentication capability to use Supabase Auth. Rejected because that would materially change scope and acceptance criteria.

## Risks / Trade-offs

- Registry output may depend on the current shadcn package version and network availability -> Apply phase should inspect generated files before accepting them and keep edits scoped.
- Public env variables are build-time inlined for browser bundles -> Deployment environments must set the correct values before building.
- `.env.local` is normally ignored and local-only -> Apply phase should update the local file but avoid treating it as a committed production secret source.
- Generated Supabase helper names or paths may conflict with existing files -> Apply phase should check for collisions before running the registry command and preserve unrelated user changes.

## Migration Plan

1. Install `@supabase/supabase-js` and `@supabase/ssr` with `pnpm`.
2. Run the shadcn Supabase client block install from the app root.
3. Add the provided `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` values to app root `.env.local`.
4. Review generated files for expected aliases, missing-config behavior, and absence of privileged credentials in browser code.
5. Run typecheck/build or the repository's closest available validation command.

Rollback: remove the generated Supabase files, remove the two Supabase dependencies from `package.json`/lockfile, and remove the Supabase public values from `.env.local`.
