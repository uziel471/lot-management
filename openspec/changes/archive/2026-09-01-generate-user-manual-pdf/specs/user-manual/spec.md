## Purpose

Define la disponibilidad de un manual de usuario descargable en PDF para que el personal autorizado pueda consultar instrucciones operativas consistentes dentro y fuera de la aplicacion.

## ADDED Requirements

### Requirement: Manual PDF disponible para usuarios autorizados
The system SHALL provide an authenticated user manual download in PDF format. The manual SHALL be reachable from a visible help or navigation surface inside the application and SHALL download or open as a PDF file with an appropriate filename and content type.

#### Scenario: Usuario autorizado descarga el manual
- **WHEN** an authenticated authorized user requests the user manual PDF from the application
- **THEN** the system returns a PDF document with a user-facing filename, `application/pdf` content type, and no mutation to business records

#### Scenario: Usuario sin sesion solicita el manual
- **WHEN** a request without a valid session attempts to access the user manual PDF directly
- **THEN** the system rejects the request through the existing authentication flow and does not return the PDF content

### Requirement: Contenido operativo del manual
The user manual SHALL explain the primary workflows and concepts needed by an end user to operate the application. The content SHALL use clear user-facing language and SHALL cover sign-in, navigation, dashboard, vehicles, purchases, repairs, expenses, sales, payments, reports, catalogs, users, account management, common validation errors, and safe handling of voided or inactive records where those areas are available to the user's role.

#### Scenario: Manual cubre modulos principales
- **WHEN** an authorized user opens the generated manual
- **THEN** the manual includes sections for the primary modules and explains the purpose, common actions, and expected results for each covered module

#### Scenario: Manual explica errores recuperables
- **WHEN** an authorized user reads the help section for forms or operations
- **THEN** the manual explains that validation messages identify fields requiring correction and that recoverable forms preserve submitted values when the system can safely do so

### Requirement: Manual alineado con permisos y privacidad
The manual SHALL NOT expose secrets, internal stack traces, database implementation details, credentials, or operational information intended only for developers. The application SHALL make the manual available only to roles allowed to access the internal application, and user-facing links SHALL respect existing navigation visibility patterns.

#### Scenario: Contenido sin detalles internos
- **WHEN** the manual is generated
- **THEN** the PDF content excludes secrets, environment values, database connection details, stack traces, and developer-only implementation notes

#### Scenario: Navegacion respeta visibilidad
- **WHEN** a user with limited role access views the application navigation
- **THEN** the manual entry point is presented according to the same authenticated application visibility rules and does not grant access to restricted business data

### Requirement: Fuente mantenible y version identificable
The PDF SHALL be generated from a repository-maintained source of truth instead of manual binary editing. The generated manual SHALL include the application name, generated or published date, and a version or revision marker so users can identify whether they are using current instructions.

#### Scenario: PDF refleja fuente mantenible
- **WHEN** a developer updates the manual source and regenerates the PDF
- **THEN** the downloaded PDF reflects the updated content without requiring manual PDF editing

#### Scenario: Manual muestra fecha o version
- **WHEN** a user opens the manual PDF
- **THEN** the first page or document metadata identifies the application, publication date or generated date, and a version or revision marker
