## MODIFIED Requirements

### Requirement: Edición y anulación de vehículos

El sistema SHALL permitir editar cualquier dato de un vehículo salvo su `code`, aplicando las mismas validaciones que en el alta y registrando quién hizo el cambio. El sistema SHALL permitir a un `admin` anular un vehículo registrando motivo, autor y fecha, y MUST NOT ofrecer su borrado. El sistema MUST NOT permitir anular un vehículo que tenga compras vigentes: primero SHALL anularse cada una de sus compras. Un vehículo anulado MUST NOT aparecer en el inventario ni ofrecerse al capturar transacciones nuevas, y SHALL seguir siendo consultable.

#### Scenario: Edición de un dato de ficha

- **WHEN** un capturista corrige el color exterior de un vehículo
- **THEN** el cambio se guarda y el vehículo registra a ese usuario como quien lo modificó por última vez

#### Scenario: Anulación de un vehículo capturado por error

- **WHEN** un administrador anula un vehículo sin compras registradas, indicando el motivo
- **THEN** el vehículo desaparece del inventario, conserva su código y su motivo de anulación, y sigue siendo consultable

#### Scenario: Anulación bloqueada por compras vigentes

- **WHEN** un administrador intenta anular un vehículo que tiene compras vigentes
- **THEN** el sistema rechaza la operación, nombra las compras que lo impiden y el vehículo queda intacto

#### Scenario: Anulación después de anular sus compras

- **WHEN** un administrador anula todas las compras de un vehículo y después anula el vehículo
- **THEN** la operación se completa y tanto el vehículo como sus compras siguen siendo consultables

#### Scenario: Capturista intenta anular

- **WHEN** un capturista intenta anular un vehículo
- **THEN** el sistema rechaza la operación y el vehículo queda intacto

#### Scenario: Intento de borrado

- **WHEN** un usuario busca cómo eliminar un vehículo
- **THEN** no existe ninguna operación de borrado en el sistema

#### Scenario: El código no se libera

- **WHEN** se registra un vehículo nuevo después de haber anulado otro
- **THEN** recibe el siguiente código de la secuencia, nunca el del anulado

### Requirement: Consulta de inventario

El sistema SHALL ofrecer un listado de vehículos filtrable por estatus, marca y rango de fecha de recepción, y buscable por `code`, VIN o número de inventario. El listado SHALL mostrar por cada vehículo su `code`, la descripción formada por año, marca y modelo, su estatus, sus días en inventario y su precio de lista. El sistema SHALL ofrecer además una vista de detalle con la ficha completa, el historial de estatus y el costo de adquisición acumulado del vehículo con sus compras vigentes.

#### Scenario: Filtro por estatus

- **WHEN** un usuario filtra el inventario por el estatus "Ready for Sale"
- **THEN** el listado muestra solo los vehículos con ese estatus

#### Scenario: Búsqueda por VIN parcial

- **WHEN** un usuario busca los últimos seis caracteres de un VIN
- **THEN** el listado muestra el vehículo correspondiente

#### Scenario: Orden del filtro de estatus

- **WHEN** un usuario abre el filtro de estatus
- **THEN** los estatus aparecen en el orden definido en su catálogo, no en orden alfabético ni por código

#### Scenario: Vehículos anulados fuera del inventario

- **WHEN** un usuario abre el inventario
- **THEN** no ve los vehículos anulados, y puede llegar a ellos por su código o mediante un filtro explícito

#### Scenario: Costo de adquisición en el detalle

- **WHEN** un usuario abre el detalle de un vehículo con compras registradas
- **THEN** ve su costo de adquisición acumulado en USD y la lista de sus compras vigentes, nombrado como costo de adquisición y no como costo total
