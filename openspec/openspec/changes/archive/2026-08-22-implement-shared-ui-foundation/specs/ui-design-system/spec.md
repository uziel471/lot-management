## ADDED Requirements

### Requirement: Shared application shell foundations
The system SHALL provide shared authenticated application shell foundations that operational pages can reuse for navigation, account access, active module indication, responsive navigation behavior, and consistent page content placement. The shell foundations MUST preserve existing role-aware navigation visibility and existing authenticated-route access behavior.

#### Scenario: Authenticated page uses shared shell foundations
- **WHEN** an authenticated management page is rendered after the shared UI foundation is implemented
- **THEN** the page is displayed inside a consistent shell with shared navigation, account actions, active location indication, and content spacing

#### Scenario: Role-aware navigation behavior is preserved
- **WHEN** an authenticated user has a role that does not permit access to a module
- **THEN** the shared shell omits or disables that module consistently with the existing permission behavior

#### Scenario: Smaller viewport navigation remains usable
- **WHEN** the shared shell is viewed on tablet or smaller screen sizes
- **THEN** the user can still access permitted navigation items and account actions without individual pages implementing their own navigation pattern

### Requirement: Shared page composition foundations
The system SHALL provide shared page composition foundations for operational management screens, including consistent page containers, page headers, page toolbars or filters, main content placement, and pagination or result summaries where applicable. These foundations MUST follow `docs/design-system/UI_GUIDELINES.md` and preserve existing module workflows when adopted incrementally.

#### Scenario: Operational page adopts shared page composition
- **WHEN** a management page is migrated to the shared page composition foundations
- **THEN** it uses the standard page container, header, toolbar or filter placement, main content region, and pagination or result summary placement defined by the design system

#### Scenario: Existing workflows remain unchanged during adoption
- **WHEN** a page adopts shared page composition foundations
- **THEN** existing create, edit, search, filter, list, detail, submit, and destructive confirmation workflows continue to behave as before unless a separate OpenSpec change explicitly changes them

### Requirement: Shared operational component foundations
The system SHALL provide shared operational component foundations for recurring table, filter, status, form-section, detail-section, empty-state, loading-state, and confirmation patterns. Modules MUST reuse these foundations when they match the module need instead of inventing module-specific visual patterns.

#### Scenario: Statuses use semantic shared treatment
- **WHEN** a module displays a record status after adopting the shared foundations
- **THEN** the status uses the shared semantic status treatment for equivalent operational states rather than a module-specific visual style

#### Scenario: Long forms use shared section foundations
- **WHEN** a migrated operational form contains multiple logical groups of fields
- **THEN** the form uses shared section foundations for group titles, descriptions, field layout, validation placement, and actions

#### Scenario: Detail screens use shared section foundations
- **WHEN** a migrated detail page displays read-only record information
- **THEN** the page uses shared detail-section foundations for grouped facts, identifiers, statuses, supporting actions, and empty or unavailable values

### Requirement: Shared foundation compatibility
The shared UI foundations SHALL be compatible with the existing Next.js App Router application, Tailwind CSS 4 tokens, shadcn/ui `base-nova` primitives, existing CSS variables, and Lucide icon usage. The foundations MUST NOT introduce a separate UI framework, change business logic, change APIs, change database schemas, change permission rules, or remove working module functionality.

#### Scenario: Foundation implementation preserves business behavior
- **WHEN** shared UI foundations are implemented
- **THEN** application business logic, server actions, API behavior, database schemas, authentication, authorization, and module workflows remain unchanged

#### Scenario: Foundation implementation keeps the current UI stack
- **WHEN** shared UI foundations are implemented
- **THEN** they build on the existing UI stack and do not add another UI framework
