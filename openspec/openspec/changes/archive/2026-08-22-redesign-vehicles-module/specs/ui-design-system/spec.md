## ADDED Requirements

### Requirement: Redisenos de modulos aplican el sistema compartido

Los redisenos de modulos operacionales SHALL aplicar `docs/design-system/UI_GUIDELINES.md` como restriccion de implementacion y MUST NOT introducir sistemas visuales, patrones de navegacion, formularios, tablas, filtros, estados o feedback especificos de un modulo cuando exista un patron compartido aplicable. El modulo de vehiculos SHALL servir como validacion inicial de los patrones compartidos de listado, filtros, formularios, detalle, estados, confirmaciones, feedback y comportamiento responsive.

#### Scenario: Rediseno de vehiculos sigue las guias

- **WHEN** se implementa el rediseno del modulo de vehiculos
- **THEN** las pantallas de inventario, alta, edicion y detalle aplican `docs/design-system/UI_GUIDELINES.md` y reutilizan los patrones compartidos disponibles

#### Scenario: Patron faltante se resuelve como compartido

- **WHEN** el rediseno de vehiculos necesita un patron reusable que no existe todavia
- **THEN** el patron se define o ajusta como componente o convencion compartida antes de usarlo como solucion especifica del modulo

#### Scenario: Sin sistema visual propio del modulo

- **WHEN** se revisa el rediseno de vehiculos
- **THEN** no contiene colores, jerarquias, layouts, badges, estados vacios, formularios ni controles visuales que contradigan o dupliquen el sistema de diseno compartido
