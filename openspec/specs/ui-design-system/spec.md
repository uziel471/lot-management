# ui-design-system Specification

## Purpose

Defines the application-wide UI/UX contract for the dealership management system so every current and future operational module follows one professional, efficient, accessible, and reusable interface system.

## Requirements

### Requirement: Design system source of truth

The system SHALL maintain `docs/design-system/UI_GUIDELINES.md` as the source of truth for UI/UX work. The document SHALL cover design principles, visual foundations, application shell, navigation, page anatomy, component patterns, table patterns, form patterns, filter patterns, status patterns, feedback patterns, responsive rules, accessibility rules, reuse rules, and examples of correct and incorrect usage.

#### Scenario: Guidelines document exists

- **WHEN** a developer or AI coding agent needs to implement UI work
- **THEN** `docs/design-system/UI_GUIDELINES.md` provides the governing design rules for that work

#### Scenario: Guidelines cover operational patterns

- **WHEN** a new page, table, form, filter, status, dialog, empty state, or responsive behavior is planned
- **THEN** the guidelines describe the expected pattern or the decision rule for choosing the pattern

### Requirement: Professional operational design direction

The design system SHALL define a modern, professional, clean, trustworthy, efficient, and consistent visual direction for an internal vehicle lot / used car dealership management application. The UI MUST prioritize information density, repeated operational use, scanability, and ease of learning over marketing-style presentation.

#### Scenario: Operational screen design

- **WHEN** a module displays inventory, purchases, sales, expenses, catalogs, users, documents, or administrative operations
- **THEN** the screen uses compact operational composition, restrained typography, clear hierarchy, and efficient desktop space usage

#### Scenario: Marketing patterns avoided

- **WHEN** a UI-related change proposes large hero sections, decorative gradients, excessive whitespace, oversized controls, unnecessary animation, or module-specific visual systems
- **THEN** the change is considered incompatible with the design system unless the guidelines explicitly permit that pattern for the specific context

### Requirement: Consistent application shell and navigation

The design system SHALL define a scalable authenticated application shell with desktop navigation, responsive navigation behavior, clear active module indication, top-level account access, and a page content region that can support current and future modules. Navigation SHALL scale to additional modules without requiring each module to invent its own shell.

#### Scenario: Authenticated module navigation

- **WHEN** an authenticated user opens a management module
- **THEN** the user can identify the current module, move to other available modules, access account actions, and understand where the page sits in the application structure

#### Scenario: Role-aware navigation remains consistent

- **WHEN** a role does not have access to a module
- **THEN** the navigation omits or disables that module according to existing permission behavior while preserving the same shell structure

#### Scenario: Smaller viewport navigation

- **WHEN** the application is used on a tablet or smaller screen
- **THEN** navigation remains usable without requiring each page to create its own mobile navigation pattern

### Requirement: Standard page anatomy

The design system SHALL define a standard page composition for management screens: application shell, page container, breadcrumbs when applicable, page header, toolbar or filters, main content, and pagination when applicable. Page headers SHALL consistently support title, description, primary action, and secondary actions.

#### Scenario: New management page

- **WHEN** a new operational page is implemented
- **THEN** it follows the standard page anatomy unless the guidelines identify a more appropriate variant

#### Scenario: Page action placement

- **WHEN** a page has a primary action such as creating a vehicle, purchase, catalog entry, or user
- **THEN** the action appears in the standard page header or toolbar location defined by the guidelines

### Requirement: Standard table and filter behavior

The design system SHALL define reusable patterns for data tables, including column alignment, row density, sorting, search, filters, pagination, row actions, status representation, empty states, loading states, and responsive behavior. Filters SHALL be compact by default and SHALL define when controls are inline, collapsible, inside a popover or sheet, persisted, and resettable.

#### Scenario: Table-heavy module

- **WHEN** a module lists vehicles, purchases, sales, expenses, catalogs, users, documents, or reports
- **THEN** its table follows the shared density, alignment, search, filter, row action, status, empty, loading, pagination, and responsive rules

#### Scenario: Compact filters

- **WHEN** a list requires filtering
- **THEN** the filters use the compact pattern that matches the number and importance of filters rather than consuming excessive vertical space

#### Scenario: Resettable filters

- **WHEN** a user applies one or more filters
- **THEN** the interface provides a clear way to return to the default list state

### Requirement: Standard form behavior

The design system SHALL define patterns for operational forms, including field layout, labels, help text, required fields, validation, form sections, multi-column layouts, long forms, save and cancel actions, and destructive actions. Long forms SHALL be divided into logical sections and SHALL remain full-page unless the guidelines identify the form as short enough for a dialog.

#### Scenario: Long operational form

- **WHEN** a form captures many fields for a vehicle, purchase, sale, expense, document, or administrative record
- **THEN** the form is divided into logical sections and uses the standard full-page layout

#### Scenario: Short focused form

- **WHEN** a form contains a small focused set of fields such as a catalog entry
- **THEN** the guidelines determine whether a dialog form is appropriate and how validation and actions appear

#### Scenario: Validation feedback

- **WHEN** a form submission fails validation
- **THEN** field errors and form-level errors are displayed using the standard validation pattern without exposing internal technical details

### Requirement: Semantic status and feedback system

The design system SHALL define a semantic status system and feedback patterns using the application's existing component vocabulary. Statuses such as available, pending, in preparation, sold, cancelled, completed, missing documentation, active, inactive, voided, and destructive states SHALL map to consistent visual treatments rather than module-specific visual languages.

#### Scenario: Status badge reuse

- **WHEN** a module displays a status
- **THEN** it uses the shared semantic status rules rather than inventing a module-specific badge style

#### Scenario: Operation feedback

- **WHEN** an operation succeeds, fails validation, is loading, has no results, or requires destructive confirmation
- **THEN** the UI uses the standard toast, validation, loading, skeleton, empty state, confirmation, or destructive confirmation pattern

### Requirement: OpenSpec UI integration

Future OpenSpec changes that add or modify UI SHALL explicitly reference `docs/design-system/UI_GUIDELINES.md` and SHALL state that implementation MUST follow it. Future module redesigns MUST NOT invent independent visual systems.

#### Scenario: UI-related proposal

- **WHEN** a future OpenSpec proposal changes screens, layouts, navigation, forms, tables, filters, statuses, dialogs, feedback, or responsive behavior
- **THEN** the proposal references `docs/design-system/UI_GUIDELINES.md` as a required implementation constraint

#### Scenario: Module redesign proposal

- **WHEN** a future module redesign is proposed
- **THEN** it builds on the global design system instead of defining a separate module-specific visual direction

### Requirement: Incremental compatible migration

The design system SHALL define a migration strategy that keeps existing modules working while UI foundations and modules are improved incrementally. The migration order SHALL begin with the design system and shared foundations, then validate the patterns in Vehicles, adjust if necessary, and gradually migrate Purchases, Sales, Expenses, Catalogs, Users, and future modules.

#### Scenario: Existing functionality during migration

- **WHEN** shared UI foundations or one module are migrated
- **THEN** existing modules continue to work and no business logic, API, database schema, or permission behavior changes as part of the UI design system work

#### Scenario: Pattern validation in Vehicles

- **WHEN** the first module redesign is planned after the design system is established
- **THEN** Vehicles is used to validate table, filter, form, detail, status, and feedback patterns before broader migration

### Requirement: Vehicle redesigns apply the shared system

Operational module redesigns SHALL apply `docs/design-system/UI_GUIDELINES.md` as an implementation constraint and MUST NOT introduce module-specific visual systems, navigation patterns, forms, tables, filters, states, or feedback patterns when an applicable shared pattern already exists. The Vehicles module SHALL serve as the initial validation of shared listing, filters, forms, detail, status, confirmation, feedback, and responsive behavior patterns.

#### Scenario: Vehicle redesign follows the guidelines

- **WHEN** the Vehicles module redesign is implemented
- **THEN** its inventory, create, edit, and detail screens apply `docs/design-system/UI_GUIDELINES.md` and reuse the available shared patterns

#### Scenario: Missing pattern becomes shared

- **WHEN** the Vehicles redesign needs a reusable pattern that does not yet exist
- **THEN** that pattern is defined or adjusted as a shared component or convention before it is used as a module-specific solution

#### Scenario: No independent module visual system

- **WHEN** the Vehicles redesign is reviewed
- **THEN** it does not contain colors, hierarchy, layouts, badges, empty states, forms, or controls that contradict or duplicate the shared design system

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
