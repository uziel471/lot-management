## ADDED Requirements

### Requirement: Account module follows the shared system
Operational module work for Cuenta SHALL apply `docs/design-system/UI_GUIDELINES.md` as an implementation constraint and MUST NOT introduce module-specific visual systems, navigation patterns, forms, states, or feedback patterns when an applicable shared pattern already exists. The Cuenta module SHALL apply shared operational patterns for compact profile summaries, account action groups, credential-change forms, validation, pending state, session-related feedback, sign-out affordances, and responsive behavior.

#### Scenario: Cuenta module follows the guidelines
- **WHEN** the Cuenta module redesign is implemented
- **THEN** its profile summary, account actions, own-password change form, sign-out flow, validation states, feedback, and responsive layouts apply `docs/design-system/UI_GUIDELINES.md` and reuse available shared patterns

#### Scenario: Account pattern becomes shared
- **WHEN** the Cuenta redesign needs a reusable pattern for compact profile summaries, credential-change forms, account action groups, or session-revocation feedback that does not yet exist
- **THEN** that pattern is defined or adjusted as a shared component or convention before it is used as a Cuenta-specific solution

#### Scenario: No independent account visual system
- **WHEN** the Cuenta redesign is reviewed
- **THEN** it does not contain colors, hierarchy, layouts, badges, forms, dialogs, feedback, or controls that contradict or duplicate the shared design system
