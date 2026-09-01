## 1. Manual Content Source

- [x] 1.1 Create the repository-maintained user manual source with sections for access, navigation, dashboard, vehicles, purchases, repairs, expenses, sales, payments, reports, catalogs, users, account, validation errors, and voided or inactive records.
- [x] 1.2 Review the manual text against the current UI labels and workflows so the instructions use user-facing language and avoid developer-only details.
- [x] 1.3 Add publication date or revision metadata to the manual source.

## 2. PDF Generation

- [x] 2.1 Select and add a deterministic PDF generation approach compatible with the project's Next.js and React versions.
- [x] 2.2 Implement a small isolated manual PDF renderer or build step that reads the canonical source and produces a PDF with title, table of contents, readable sections, page numbers, and metadata.
- [x] 2.3 Ensure regenerated PDF output reflects source content changes without manual binary editing.

## 3. Authenticated Delivery

- [x] 3.1 Add a protected route or route handler that returns the manual as `application/pdf` with a descriptive filename.
- [x] 3.2 Reuse the existing session and authorization patterns so unauthenticated direct requests do not receive PDF content.
- [x] 3.3 Add a visible authenticated entry point from the app shell, account page, or help surface.

## 4. Verification

- [x] 4.1 Add automated coverage or route-level checks for authorized PDF access, unauthenticated denial, content type, and content disposition.
- [x] 4.2 Validate that the generated PDF contains the required module sections, date or version marker, and excludes secrets or implementation details.
- [x] 4.3 Run the relevant test suite and production build checks.
- [x] 4.4 Run `openspec validate generate-user-manual-pdf --strict`.
