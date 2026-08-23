# supabase-integration Specification

## Purpose

Define how the application exposes a configured Supabase integration foundation for browser and server runtime code without weakening existing authentication or data protection guarantees.

## Requirements

### Requirement: Supabase clients use configured public project values

The system SHALL initialize Supabase browser and server clients from the configured public Supabase project URL and publishable key. The client configuration SHALL be available to runtime code that needs Supabase-backed features without duplicating project constants in feature modules.

#### Scenario: Runtime creates a Supabase client

- **WHEN** application code requests a Supabase client in a supported Next.js runtime context
- **THEN** the system creates the client using the configured Supabase URL and publishable key

#### Scenario: Feature code reuses the configured integration

- **WHEN** a feature needs to access Supabase services
- **THEN** it can use the shared Supabase integration instead of defining its own project URL or publishable key

### Requirement: Missing Supabase configuration fails safely

The system SHALL detect missing required public Supabase configuration before a Supabase-backed operation proceeds. The resulting failure SHALL identify the missing configuration to developers without exposing secret values to the browser or to user-facing error messages.

#### Scenario: URL is not configured

- **WHEN** runtime code requests a Supabase client and the public Supabase URL is absent
- **THEN** the system fails before making a Supabase request and reports that the URL configuration is missing

#### Scenario: Publishable key is not configured

- **WHEN** runtime code requests a Supabase client and the public Supabase publishable key is absent
- **THEN** the system fails before making a Supabase request and reports that the publishable key configuration is missing

### Requirement: Supabase integration does not expose privileged credentials

The system MUST NOT expose Supabase service-role keys, database passwords, or other privileged Supabase credentials to browser runtime code. Public browser-accessible configuration SHALL be limited to values intended for client use.

#### Scenario: Browser bundle uses Supabase configuration

- **WHEN** browser code initializes the Supabase integration
- **THEN** the only Supabase credential available to that code is the configured publishable key

#### Scenario: Server-only credential is needed later

- **WHEN** a future server-only feature requires privileged Supabase access
- **THEN** that feature must add separate server-only configuration and MUST NOT reuse browser-exposed environment variables for privileged access
