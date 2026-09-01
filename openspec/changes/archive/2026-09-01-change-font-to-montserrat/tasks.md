## 1. Preparation

- [x] 1.1 Read the local Next.js font documentation under `node_modules/next/dist/docs/` before editing app code.
- [x] 1.2 Confirm the current global font wiring in `src/app/layout.tsx` and `src/app/globals.css`.

## 2. Typography Implementation

- [x] 2.1 Replace the current global sans font with Montserrat using the app's existing Next.js font-loading pattern.
- [x] 2.2 Keep the existing mono font configuration for `font-mono` usage.
- [x] 2.3 Ensure global Tailwind font tokens route standard UI text and heading text through Montserrat.

## 3. Design System Documentation

- [x] 3.1 Update `docs/design-system/UI_GUIDELINES.md` so the Typography section names Montserrat as the required app sans font.
- [x] 3.2 Confirm the guidelines still preserve `font-mono` for VINs, stock numbers, sequence identifiers, internal IDs, and similar technical identifiers.

## 4. Verification

- [x] 4.1 Run the project build and relevant tests.
- [x] 4.2 Inspect representative auth, authenticated shell, table, form, dialog, and dense operational screens for obvious font-related wrapping or overflow regressions.
- [x] 4.3 Verify standard UI text uses Montserrat while technical identifiers still use the mono font treatment.
