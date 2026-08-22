## ADDED Requirements

### Requirement: Repair module redesigns apply the shared system
Operational module work for Repairs SHALL apply `docs/design-system/UI_GUIDELINES.md` as an implementation constraint and MUST NOT introduce module-specific visual systems, navigation patterns, forms, tables, filters, states, or feedback patterns when an applicable shared pattern already exists. The Repairs module SHALL apply shared operational patterns for service-work lists, lifecycle statuses, sectioned financial forms, immutable completed records, repair totals, destructive voiding, validation, feedback, and responsive behavior.

#### Scenario: Repair module follows the guidelines
- **WHEN** the Repairs module is implemented
- **THEN** its list, create, detail, lifecycle actions, completion, cancellation, void confirmation, vehicle repair summary, validation states, empty states, and responsive layouts apply `docs/design-system/UI_GUIDELINES.md` and reuse available shared patterns

#### Scenario: Service-work pattern becomes shared
- **WHEN** the Repairs module needs a reusable pattern for repair lifecycle status, service-work history, completion metadata, financial repair totals, or vehicle repair summaries that does not yet exist
- **THEN** that pattern is defined or adjusted as a shared component or convention before it is used as a repair-specific solution

#### Scenario: No independent repair visual system
- **WHEN** the Repairs module is reviewed
- **THEN** it does not contain colors, hierarchy, layouts, badges, empty states, forms, tables, filters, dialogs, or controls that contradict or duplicate the shared design system
