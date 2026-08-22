## ADDED Requirements

### Requirement: User administration redesigns apply the shared system

Operational module redesigns SHALL apply `docs/design-system/UI_GUIDELINES.md` as an implementation constraint and MUST NOT introduce module-specific visual systems, navigation patterns, forms, tables, filters, states, or feedback patterns when an applicable shared pattern already exists. The Users module SHALL apply shared operational patterns for access-management tables, role and status display, focused admin forms, activation and deactivation safeguards, password reset feedback, role-aware actions, validation, confirmation, and responsive behavior.

#### Scenario: User redesign follows the guidelines

- **WHEN** the Users module redesign is implemented
- **THEN** its list, create/edit forms, activation workflows, deactivation confirmations, password reset experiences, validation states, empty states, and responsive layouts apply `docs/design-system/UI_GUIDELINES.md` and reuse available shared patterns

#### Scenario: Access-management pattern becomes shared

- **WHEN** the Users redesign needs a reusable pattern for role display, active/inactive user state, guarded access removal, last-admin protection messaging, or password reset feedback that does not yet exist
- **THEN** that pattern is defined or adjusted as a shared component or convention before it is used as a user-specific solution

#### Scenario: No independent user visual system

- **WHEN** the Users redesign is reviewed
- **THEN** it does not contain colors, hierarchy, layouts, badges, empty states, forms, tables, filters, dialogs, or controls that contradict or duplicate the shared design system
