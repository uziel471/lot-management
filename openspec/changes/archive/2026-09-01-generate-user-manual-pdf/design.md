## Context

See `proposal.md` for motivation. The app is a Next.js App Router project with authenticated application routes under `src/app/(app)`, shared navigation components, and server-side permission checks already used by operational modules. Report exports already return downloadable files, but the user manual is documentation rather than report data, so it should be modeled as its own capability.

The manual must be easy to update as screens and workflows evolve. A binary PDF committed as the only source would make reviews and maintenance difficult.

## Goals / Non-Goals

**Goals:**

- Keep the canonical manual content in a text-based source file that can be reviewed in diffs.
- Generate or serve a PDF with stable branding, title, date or version marker, table of contents, page numbers, and readable print layout.
- Add an authenticated entry point from the app shell or account/help surface.
- Reuse existing auth/navigation patterns and avoid exposing internal implementation details in the document.

**Non-Goals:**

- Do not add interactive in-app guided tours or contextual help overlays.
- Do not create per-role custom PDF variants in this change.
- Do not translate the manual into multiple languages unless requested later.
- Do not change business workflows, permissions, or validation behavior.

## Decisions

1. Maintain the manual as repository text plus generated PDF output.

   Use a text source such as `docs/user-manual/manual.md` or a small typed content module as the canonical content. Generate the PDF from that source during development/build or on demand. This keeps content reviewable and avoids editing a binary PDF directly.

   Alternative considered: commit only a hand-authored PDF. That is simpler initially, but it makes content changes opaque and harder to validate.

2. Serve the manual through a protected app route or route handler.

   Add a user-facing link inside the authenticated app shell, account page, or help action that points to a protected endpoint such as `/manual/usuario.pdf`. The route handler should verify the existing session before returning the file and use `Content-Type: application/pdf` plus a descriptive `Content-Disposition` filename.

   Alternative considered: place the PDF under `public/`. That would simplify static serving, but it would expose internal user documentation without authentication.

3. Prefer deterministic PDF generation over browser print instructions.

   Use a deterministic PDF generation path that can be tested from Node/Next, for example a PDF rendering library or an HTML-to-PDF build step. The chosen implementation should support headings, tables, page breaks, page numbers, and a table of contents well enough for operational documentation.

   Alternative considered: provide an HTML page and ask users to print to PDF. That does not satisfy a direct PDF download and produces inconsistent output across browsers.

4. Keep the manual content operational and user-facing.

   Organize the manual by workflows: acceso, navegacion, dashboard, vehiculos, compras, reparaciones, gastos, ventas, pagos, reportes, catalogos, usuarios, cuenta, errores comunes, anulaciones/inactivos, and support/escalation guidance. Avoid database names, stack traces, credentials, environment variables, and developer-only troubleshooting.

   Alternative considered: generate the manual automatically from code or specs. That risks producing developer-oriented text and would still need editorial review for end users.

## Risks / Trade-offs

- PDF generation library increases dependency surface -> Mitigate by choosing a maintained package already compatible with the project's Next.js and React versions, and keep the PDF rendering isolated behind a small module.
- Manual content may drift from the UI -> Mitigate by storing the manual source near project docs and adding a task to review major modules during changes that alter workflows.
- PDF generation can be slow if done per request -> Mitigate by generating a static artifact at build time or caching generated output when content has not changed.
- Screens or labels may change before implementation finishes -> Mitigate by writing the manual in workflow language and validating final text against the current UI during implementation.

## Migration Plan

1. Add the manual source and generation path without changing business data.
2. Add the protected route or endpoint and authenticated navigation entry point.
3. Validate the PDF response, content, and denied unauthenticated access.
4. Roll back by removing the manual link and route; no data migration is required.
