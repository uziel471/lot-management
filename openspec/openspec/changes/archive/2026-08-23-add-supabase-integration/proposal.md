## Why

The application needs a supported Supabase integration foundation before features can use Supabase services such as auth helpers, realtime, storage, or database clients. Adding the official packages, generated shadcn Supabase client block, and required public environment variables gives future work a consistent integration point.

## What Changes

- Add the official Supabase JavaScript and SSR packages to the application dependencies.
- Add the shadcn Supabase client block for Next.js so the app has generated client helpers aligned with the existing component registry setup.
- Configure the public Supabase URL and publishable key in the local environment file.
- Keep the existing application authentication requirements unchanged unless a later change explicitly migrates auth behavior.
- Optionally install Supabase Agent Skills for future AI-assisted maintenance.

## Capabilities

### New Capabilities

- `supabase-integration`: Defines the application's ability to initialize Supabase clients from configured public environment values in Next.js runtime contexts.

### Modified Capabilities

- None.

## Impact

- Affected dependencies: `@supabase/supabase-js`, `@supabase/ssr`, and generated files from `npx shadcn@latest add @supabase/supabase-client-nextjs`.
- Affected configuration: `.env.local` receives `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Affected systems: Next.js server/client runtime configuration and future Supabase-backed features.
