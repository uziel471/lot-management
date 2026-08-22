## ADDED Requirements

### Requirement: Expense module follows the shared system
Operational module work for Expenses SHALL apply `docs/design-system/UI_GUIDELINES.md` as an implementation constraint and MUST NOT introduce module-specific visual systems, navigation patterns, forms, tables, filters, states, or feedback patterns when an applicable shared pattern already exists. The Expenses module SHALL apply shared operational patterns for financial lists, sectioned financial forms, immutable expense records, evidence display, expense totals, destructive voiding, validation, feedback, and responsive behavior.

#### Scenario: Expense module follows the guidelines
- **WHEN** the Expenses module is implemented
- **THEN** its list, create, detail, void confirmation, vehicle expense summary, validation states, empty states, loading states, and responsive layouts apply `docs/design-system/UI_GUIDELINES.md` and reuse available shared patterns

#### Scenario: Expense pattern becomes shared
- **WHEN** the Expenses module needs a reusable pattern for expense categories, evidence display, financial expense totals, voided financial records, or vehicle expense summaries that does not yet exist
- **THEN** that pattern is defined or adjusted as a shared component or convention before it is used as an expense-specific solution

#### Scenario: No independent expense visual system
- **WHEN** the Expenses module is reviewed
- **THEN** it does not contain colors, hierarchy, layouts, badges, empty states, forms, tables, filters, dialogs, or controls that contradict or duplicate the shared design system
