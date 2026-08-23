## 1. Preparation

- [x] 1.1 Confirm the apply phase is running from the application root (`/Users/uzielestrada/sites/Proyects/lote-management`) and inspect `git status --short`.
- [x] 1.2 Read `AGENTS.md` and the relevant local Next.js environment variables guide at `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`.
- [x] 1.3 Check for existing Supabase files, dependencies, and environment variables before adding new ones.

## 2. Dependencies and Generated Integration

- [x] 2.1 Install `@supabase/supabase-js` and `@supabase/ssr` with `pnpm add`.
- [x] 2.2 Run `pnpm dlx shadcn@latest add @supabase/supabase-client-nextjs` from the application root.
- [x] 2.3 Review generated Supabase files for expected `components.json` aliases, browser/server runtime separation, and missing-config behavior.

## 3. Environment Configuration

- [x] 3.1 Add `NEXT_PUBLIC_SUPABASE_URL=https://eiqkejytbwufzbghmrnq.supabase.co` to the app root `.env.local` if it is not already present.
- [x] 3.2 Add `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_2zSg-bcbjYTUr9d0xfw5jA_rYqw_aAq` to the app root `.env.local` if it is not already present.
- [x] 3.3 Confirm no service-role key, database password, or other privileged Supabase credential is introduced to browser-accessible configuration.

## 4. Verification

- [x] 4.1 Verify `package.json` and `pnpm-lock.yaml` reflect the Supabase dependencies without creating npm lockfile churn.
- [x] 4.2 Run the repository's relevant validation command, preferring `pnpm exec tsc --noEmit` or `pnpm build` if available and practical.
- [x] 4.3 Run `pnpm spec:validate` from the application root or validate the OpenSpec change directly from this workspace.
- [x] 4.4 Summarize generated files, environment changes, validation results, and any manual follow-up needed for deployment environment variables.
