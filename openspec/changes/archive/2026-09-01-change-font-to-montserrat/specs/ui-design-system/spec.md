## ADDED Requirements

### Requirement: Application sans typography uses Montserrat
The design system SHALL require Montserrat as the application-wide sans-serif typeface for all standard UI text. The system MUST preserve the existing operational type scale, density, hierarchy, and mono-font treatment for technical identifiers.

#### Scenario: Standard UI renders with Montserrat
- **WHEN** an authenticated management screen, auth screen, shared component, form, table, dialog, toast, empty state, or navigation element renders standard UI text
- **THEN** the text uses Montserrat as the primary sans-serif font

#### Scenario: Technical identifiers remain monospaced
- **WHEN** the UI renders VINs, stock numbers, sequence codes, internal IDs, or similar technical identifiers
- **THEN** those identifiers continue to use the standard mono font treatment instead of Montserrat

#### Scenario: Typography scale stays operational
- **WHEN** pages, tables, forms, filters, cards, and dialogs are reviewed after the font change
- **THEN** they retain the existing compact typography scale, weights, and hierarchy required by the operational design system
