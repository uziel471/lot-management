## ADDED Requirements

### Requirement: Catalog redesigns apply the shared system

Operational module redesigns SHALL apply `docs/design-system/UI_GUIDELINES.md` as an implementation constraint and MUST NOT introduce module-specific visual systems, navigation patterns, forms, tables, filters, states, or feedback patterns when an applicable shared pattern already exists. The Catalogos module SHALL apply shared operational patterns for reference-data tables, compact catalog navigation, short focused forms, active/inactive state, dependent catalog relationships, role-aware actions, validation, confirmation, feedback, and responsive behavior.

#### Scenario: Catalog redesign follows the guidelines

- **WHEN** the Catalogos module redesign is implemented
- **THEN** its catalog selection, lists, create/edit experiences, activation workflows, validation states, empty states, and responsive layouts apply `docs/design-system/UI_GUIDELINES.md` and reuse available shared patterns

#### Scenario: Reference-data pattern becomes shared

- **WHEN** the Catalogos redesign needs a reusable pattern for compact reference-data tables, segmented catalog selection, short catalog forms, dependent catalog context, active/inactive state, or role-aware row actions that does not yet exist
- **THEN** that pattern is defined or adjusted as a shared component or convention before it is used as a catalog-specific solution

#### Scenario: No independent catalog visual system

- **WHEN** the Catalogos redesign is reviewed
- **THEN** it does not contain colors, hierarchy, layouts, badges, empty states, forms, tables, filters, dialogs, or controls that contradict or duplicate the shared design system
