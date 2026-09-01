## Context

See `proposal.md` for motivation. The app currently loads `Geist` and `Geist_Mono` from `next/font/google` in `src/app/layout.tsx`, exposes those variables on the root `<html>`, and applies the sans font globally through Tailwind's `font-sans` utility in `src/app/globals.css`. The design system guidance in `docs/design-system/UI_GUIDELINES.md` currently says to use the existing sans font rather than naming a required typeface.

This is a cross-cutting UI foundation change because it affects every screen that inherits the global sans font.

## Goals / Non-Goals

**Goals:**

- Make Montserrat the primary sans-serif UI font across the app.
- Preserve the current global font-loading pattern through Next.js font support.
- Preserve the mono font path for VINs, stock numbers, sequence identifiers, and internal IDs.
- Update the design-system documentation so future UI changes know Montserrat is required.
- Keep typography sizing, weights, spacing, component density, and layout unchanged unless a small adjustment is required to prevent obvious text overflow caused by the font swap.

**Non-Goals:**

- Redesign page layouts, tables, forms, navigation, or components.
- Change business workflows, API behavior, database schema, permissions, or routing.
- Replace the mono font or PDF report fonts.
- Introduce module-specific typography overrides.

## Decisions

1. Use Montserrat through `next/font/google`.

   Rationale: The app already uses `next/font/google`, so Montserrat should be introduced through the same framework-supported font pipeline instead of adding manual CSS imports or external runtime font requests.

   Alternative considered: Import Montserrat through a stylesheet or CDN. Rejected because it would bypass the existing Next.js font optimization pattern and add another loading path.

2. Replace the global sans variable, not individual component classes.

   Rationale: The app's UI text already flows through `font-sans` and the global base layer. Updating the root font variable keeps the change centralized and avoids broad, noisy component edits.

   Alternative considered: Add `font-montserrat` classes throughout layouts and components. Rejected because it increases duplication and creates risk of inconsistent typography.

3. Keep `Geist_Mono` for monospaced identifiers.

   Rationale: The spec requires technical identifiers to remain monospaced, and the current implementation already has a separate mono variable used by `font-mono`.

   Alternative considered: Replace both sans and mono families with Montserrat variants. Rejected because Montserrat is not appropriate for code-like identifiers and would reduce scanability of VINs, stock numbers, and sequence codes.

4. Update documentation with the same contract as the implementation.

   Rationale: `docs/design-system/UI_GUIDELINES.md` is the source of truth for UI work. If it still says "existing sans font," future changes could accidentally drift away from Montserrat.

   Alternative considered: Treat the change as implementation-only. Rejected because this change is a design-system rule, not just a local styling tweak.

## Risks / Trade-offs

- Montserrat metrics differ from Geist, so some tight buttons, table cells, or labels may wrap differently. -> Mitigation: keep the existing scale but visually check representative dense screens and adjust only clear overflow defects.
- Google font availability may depend on the exact Next.js font API in this project version. -> Mitigation: before implementation, read the local Next.js docs under `node_modules/next/dist/docs/` as required by `AGENTS.md`.
- A broad font change can affect visual regression baselines if they exist. -> Mitigation: run the normal build/test checks and review key screens rather than changing component structure.

## Migration Plan

1. Read the local Next.js font documentation required by `AGENTS.md`.
2. Replace the current sans font import/configuration with Montserrat in `src/app/layout.tsx`, keeping `Geist_Mono` for mono text.
3. Ensure `src/app/globals.css` maps Tailwind `font-sans` and heading font tokens to the Montserrat variable.
4. Update `docs/design-system/UI_GUIDELINES.md` typography guidance to name Montserrat as the required sans font.
5. Run build/tests and inspect representative authenticated, auth, table, form, and dialog screens for obvious typography regressions.

Rollback is straightforward: restore the previous sans font import and variable mapping, and revert the documentation line naming Montserrat.
