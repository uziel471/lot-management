## ADDED Requirements

### Requirement: Purchase redesigns apply the shared system
Operational module redesigns SHALL apply `docs/design-system/UI_GUIDELINES.md` as an implementation constraint and MUST NOT introduce module-specific visual systems, navigation patterns, forms, tables, filters, states, or feedback patterns when an applicable shared pattern already exists. The Purchases module SHALL apply the shared operational patterns for financial lists, immutable record detail, sectioned creation forms, acquisition-cost display, destructive voiding, validation, feedback, and responsive behavior.

#### Scenario: Purchase redesign follows the guidelines
- **WHEN** the Purchases module redesign is implemented
- **THEN** its list, create, detail, void confirmation, and vehicle acquisition-cost experiences apply `docs/design-system/UI_GUIDELINES.md` and reuse the available shared patterns

#### Scenario: Financial pattern becomes shared
- **WHEN** the Purchases redesign needs a reusable pattern for money input, financial totals, immutable records, voided financial status, or acquisition-cost display that does not yet exist
- **THEN** that pattern is defined or adjusted as a shared component or convention before it is used as a module-specific solution

#### Scenario: No independent purchase visual system
- **WHEN** the Purchases redesign is reviewed
- **THEN** it does not contain colors, hierarchy, layouts, badges, empty states, forms, tables, filters, or controls that contradict or duplicate the shared design system
