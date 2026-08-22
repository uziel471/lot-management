## Purpose

Define el registro de las unidades del lote: cómo se da de alta un vehículo, qué lo identifica de forma única, qué información de ficha y de título conserva, cómo avanza su estatus desde que se compra hasta que se entrega, y cómo se consulta el inventario. El vehículo es el eje al que se cuelgan compras, reparaciones, gastos y ventas.

## Requirements

### Requirement: Alta de vehículo

El sistema SHALL permitir a un usuario autorizado registrar un vehículo indicando marca, modelo, año, estatus y fecha de recepción. Esos cinco campos SHALL ser obligatorios; todos los demás datos del vehículo SHALL ser opcionales y capturables después. El sistema SHALL asignar un `code` con forma `VEH-####` al crearlo, y el usuario MUST NOT poder elegirlo ni editarlo.

#### Scenario: Alta con lo mínimo

- **WHEN** un capturista registra un vehículo indicando marca, modelo, año, estatus y fecha de recepción, y deja el resto en blanco
- **THEN** el vehículo queda creado con el siguiente código de la secuencia `VEH` y aparece en el inventario

#### Scenario: Campo obligatorio vacío

- **WHEN** un capturista envía el formulario sin año
- **THEN** el sistema rechaza el guardado, señala el campo faltante y no consume el código

#### Scenario: Modelo que no pertenece a la marca

- **WHEN** llega una operación con un modelo que no pertenece a la marca indicada
- **THEN** el sistema rechaza el guardado

#### Scenario: Catálogo inactivo en un alta nueva

- **WHEN** un capturista intenta registrar un vehículo con una marca, un modelo o un estatus desactivado
- **THEN** el sistema rechaza el guardado indicando cuál de ellos no está activo

#### Scenario: Año fuera de rango

- **WHEN** un capturista captura un año anterior a 1950 o posterior al año siguiente al actual
- **THEN** el sistema rechaza el guardado indicando el rango admitido

### Requirement: VIN único y validado

El VIN SHALL ser opcional al dar de alta y capturable después. Cuando se captura, el sistema SHALL normalizarlo a mayúsculas sin espacios, SHALL exigir 17 caracteres alfanuméricos que no incluyan las letras `I`, `O` ni `Q`, y SHALL garantizar que ningún otro vehículo lo tenga. El sistema SHALL advertir cuando el dígito verificador del VIN no corresponda, pero MUST NOT rechazar el guardado por ese motivo.

#### Scenario: VIN duplicado

- **WHEN** un capturista captura un VIN que ya existe en otro vehículo
- **THEN** el sistema rechaza el guardado indicando cuál es el vehículo que ya lo usa

#### Scenario: VIN con formato inválido

- **WHEN** un capturista captura un VIN de 15 caracteres, o uno que contiene la letra `O`
- **THEN** el sistema rechaza el guardado indicando el formato esperado

#### Scenario: VIN capturado en minúsculas y con espacios

- **WHEN** un capturista captura un VIN con espacios al inicio y letras minúsculas
- **THEN** el sistema lo guarda normalizado a mayúsculas y sin espacios

#### Scenario: Dígito verificador que no cuadra

- **WHEN** un capturista captura un VIN de formato válido cuyo dígito verificador no corresponde
- **THEN** el sistema guarda el vehículo y muestra una advertencia sugiriendo revisar el VIN

#### Scenario: Alta sin VIN

- **WHEN** un capturista registra un vehículo dejando el VIN vacío
- **THEN** el alta se completa, y el VIN puede capturarse después

#### Scenario: Dos vehículos sin VIN

- **WHEN** existen ya varios vehículos sin VIN y se registra otro sin VIN
- **THEN** el alta se acepta

### Requirement: Número de inventario del lote

El sistema SHALL permitir registrar un número de inventario propio del lote, independiente del `code`. SHALL ser opcional, y cuando se captura SHALL ser único entre todos los vehículos.

#### Scenario: Número de inventario duplicado

- **WHEN** un capturista captura un número de inventario que ya tiene otro vehículo
- **THEN** el sistema rechaza el guardado indicando cuál es el vehículo que ya lo usa

#### Scenario: Alta sin número de inventario

- **WHEN** un capturista registra un vehículo sin número de inventario
- **THEN** el alta se completa y el número puede asignarse después

### Requirement: Ficha técnica con listas cerradas

El sistema SHALL registrar como listas cerradas de valores predefinidos el estilo de carrocería, la transmisión, el tipo de combustible y la tracción, y SHALL rechazar cualquier valor fuera de la lista correspondiente. Estas listas MUST NOT ser administrables desde la interfaz. La versión o `trim` y los colores exterior e interior SHALL ser texto libre. Todos estos campos SHALL ser opcionales.

#### Scenario: Valor fuera de la lista

- **WHEN** llega una operación con un tipo de combustible que no está en la lista
- **THEN** el sistema rechaza el guardado

#### Scenario: Ficha incompleta

- **WHEN** un capturista registra un vehículo sin transmisión ni tracción
- **THEN** el alta se completa y esos campos quedan vacíos

#### Scenario: Sin administración desde la interfaz

- **WHEN** un administrador busca dónde agregar un estilo de carrocería nuevo
- **THEN** no encuentra esa opción en la interfaz, porque la lista vive en el código

### Requirement: Kilometraje con unidad explícita

El sistema SHALL registrar el kilometraje como un número entero no negativo acompañado de su unidad, millas o kilómetros. La unidad SHALL guardarse junto al valor y SHALL mostrarse siempre que se muestre el kilometraje. El sistema MUST NOT convertir entre unidades al guardar.

#### Scenario: Kilometraje en millas

- **WHEN** un capturista registra un vehículo con 84,000 millas
- **THEN** el inventario muestra "84,000 mi", no un número sin unidad

#### Scenario: Kilometraje negativo

- **WHEN** un capturista captura un kilometraje negativo
- **THEN** el sistema rechaza el guardado

#### Scenario: Sin kilometraje

- **WHEN** un capturista registra un vehículo sin kilometraje
- **THEN** el alta se completa

### Requirement: Situación del título

El sistema SHALL registrar la situación del título del vehículo mediante una lista cerrada, su número de título y si el título está físicamente en poder del lote. El indicador de título en mano SHALL ser falso por omisión.

#### Scenario: Título pendiente

- **WHEN** un capturista registra un vehículo sin indicar nada sobre el título
- **THEN** el vehículo queda con el título marcado como no recibido

#### Scenario: Recepción del título

- **WHEN** un capturista marca el título como recibido y captura su número
- **THEN** el vehículo refleja ambos datos y el cambio queda registrado con autor y fecha

#### Scenario: Inventario sin título en mano

- **WHEN** un usuario filtra el inventario por vehículos sin título en mano
- **THEN** el listado muestra solo esos vehículos

### Requirement: Estatus del vehículo e historial

Todo vehículo SHALL tener en todo momento exactamente un estatus tomado del catálogo de estatus, que SHALL estar activo al momento de asignarlo. El sistema SHALL registrar cada cambio de estatus con el estatus anterior, el nuevo, el autor y la marca de tiempo del servidor, y SHALL conservar ese historial completo. El orden del catálogo de estatus MUST NOT restringir qué estatus puede seguir a cuál: cualquier cambio SHALL estar permitido.

#### Scenario: Cambio de estatus

- **WHEN** un capturista cambia el estatus de un vehículo de "In Reconditioning" a "Ready for Sale"
- **THEN** el vehículo queda con el nuevo estatus y el cambio aparece en su historial con autor y fecha

#### Scenario: Retroceso de estatus

- **WHEN** un capturista cambia el estatus de un vehículo de "Sale Pending" de vuelta a "Listed" porque la venta se cayó
- **THEN** el sistema acepta el cambio y lo registra en el historial

#### Scenario: Historial visible

- **WHEN** un usuario abre el detalle de un vehículo
- **THEN** ve la secuencia completa de estatus por los que ha pasado, con quién y cuándo hizo cada cambio

#### Scenario: Estatus inicial en el historial

- **WHEN** se registra un vehículo nuevo
- **THEN** su historial arranca con una entrada que corresponde al estatus con el que se dio de alta

#### Scenario: Cambio al mismo estatus

- **WHEN** un capturista guarda el mismo estatus que el vehículo ya tenía
- **THEN** el sistema no agrega una entrada al historial

### Requirement: Precio de lista en dólares

El sistema SHALL registrar el precio de lista del vehículo en dólares estadounidenses, como importe opcional y no negativo. El precio de lista MUST NOT llevar tipo de cambio congelado, porque no es una transacción. El sistema SHALL registrar cada cambio de precio con autor y fecha.

#### Scenario: Vehículo sin precio

- **WHEN** un capturista registra un vehículo recién comprado, todavía sin precio de venta definido
- **THEN** el alta se completa y el inventario lo muestra sin precio

#### Scenario: Cambio de precio

- **WHEN** un usuario autorizado baja el precio de lista de un vehículo
- **THEN** el nuevo precio queda registrado junto con quién lo cambió y cuándo

#### Scenario: Precio negativo

- **WHEN** un capturista captura un precio de lista negativo
- **THEN** el sistema rechaza el guardado

### Requirement: Días en inventario

El sistema SHALL calcular los días en inventario de un vehículo como la diferencia entre su fecha de recepción y la fecha actual. Ese valor SHALL calcularse al consultar y MUST NOT almacenarse.

#### Scenario: Vehículo en inventario

- **WHEN** se consulta un vehículo recibido hace 30 días
- **THEN** el sistema muestra 30 días en inventario

#### Scenario: Valor no almacenado

- **WHEN** se consulta el mismo vehículo un día después sin que nadie lo haya editado
- **THEN** muestra 31 días en inventario

### Requirement: Edición y anulación de vehículos

El sistema SHALL permitir editar cualquier dato de un vehículo salvo su `code`, aplicando las mismas validaciones que en el alta y registrando quién hizo el cambio. El sistema SHALL permitir a un `admin` anular un vehículo registrando motivo, autor y fecha, y MUST NOT ofrecer su borrado. Un vehículo anulado MUST NOT aparecer en el inventario ni ofrecerse al capturar transacciones nuevas, y SHALL seguir siendo consultable.

#### Scenario: Edición de un dato de ficha

- **WHEN** un capturista corrige el color exterior de un vehículo
- **THEN** el cambio se guarda y el vehículo registra a ese usuario como quien lo modificó por última vez

#### Scenario: Anulación de un vehículo capturado por error

- **WHEN** un administrador anula un vehículo indicando el motivo
- **THEN** el vehículo desaparece del inventario, conserva su código y su motivo de anulación, y sigue siendo consultable

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

El sistema SHALL ofrecer un listado de vehículos filtrable por estatus, marca y rango de fecha de recepción, y buscable por `code`, VIN o número de inventario. El listado SHALL mostrar por cada vehículo su `code`, la descripción formada por año, marca y modelo, su estatus, sus días en inventario y su precio de lista. El sistema SHALL ofrecer además una vista de detalle con la ficha completa y el historial de estatus.

#### Scenario: Filtro por estatus

- **WHEN** un usuario filtra el inventario por el estatus "Ready for Sale"
- **THEN** el listado muestra solo los vehículos con ese estatus

### Requirement: Repair display in vehicle detail
The system SHALL present a vehicle repair section in vehicle detail using the same shared section, table, status, empty-state, and responsive patterns as the Repairs module. The section SHALL show active repair totals in USD, status counts or summary, related repair records, and shall clearly exclude voided repairs from active repair totals.

#### Scenario: Vehicle without repairs
- **WHEN** a user opens a vehicle detail with no repair records
- **THEN** the repair section shows a zero state that explains no repairs are registered for the vehicle

#### Scenario: Vehicle with active repairs
- **WHEN** a user opens a vehicle detail for a vehicle with active non-voided repairs
- **THEN** the repair section shows the active USD repair total, status summary, and a scannable list of related repairs

#### Scenario: Vehicle with completed repairs
- **WHEN** a vehicle has completed repairs
- **THEN** the repair section identifies completed work and keeps repair detail links available for consultation

#### Scenario: Vehicle with voided repairs
- **WHEN** a vehicle has voided repairs in its history
- **THEN** the repair section distinguishes voided repairs and excludes them from active repair totals

#### Scenario: Vehicle repair navigation
- **WHEN** a user follows a repair from the vehicle detail
- **THEN** the system opens the corresponding repair detail without losing the repair's relationship to the vehicle

### Requirement: Vehicle cost summary distinguishes repair cost
The system SHALL distinguish acquisition cost from repair cost wherever vehicle financial summaries include both concepts. Repair cost SHALL be presented as its own active USD total and MUST NOT be merged into acquisition cost unless a future explicit requirement defines a combined total.

#### Scenario: Acquisition and repair costs shown together
- **WHEN** a vehicle has active purchases and active repairs
- **THEN** the vehicle detail shows acquisition cost and repair cost as separate labeled totals

#### Scenario: Repair cost without purchases
- **WHEN** a vehicle has active repairs but no purchases
- **THEN** the vehicle detail shows repair cost without implying that it is acquisition cost

#### Scenario: Voided repair excluded from repair cost
- **WHEN** a repair is voided
- **THEN** the vehicle's active repair cost total no longer includes that repair while the historical repair remains consultable

### Requirement: Expense display in vehicle detail
The system SHALL present a vehicle expense section in vehicle detail using the same shared section, table, status, empty-state, and responsive patterns as the Expenses module. The section SHALL show active vehicle-related expense totals in USD, category summary, related expense records, and SHALL clearly exclude voided expenses from active vehicle expense totals.

#### Scenario: Vehicle without expenses
- **WHEN** a user opens a vehicle detail with no related expense records
- **THEN** the expense section shows a zero state that explains no expenses are registered for the vehicle

#### Scenario: Vehicle with active expenses
- **WHEN** a user opens a vehicle detail for a vehicle with active non-voided expenses
- **THEN** the expense section shows the active USD expense total, category summary, and a scannable list of related expenses

#### Scenario: General expenses excluded from vehicle detail
- **WHEN** general expenses exist without a vehicle association
- **THEN** those expenses do not appear in any vehicle detail expense section or vehicle expense total

#### Scenario: Vehicle with voided expenses
- **WHEN** a vehicle has voided expenses in its history
- **THEN** the expense section distinguishes voided expenses and excludes them from active vehicle expense totals

#### Scenario: Vehicle expense navigation
- **WHEN** a user follows an expense from the vehicle detail
- **THEN** the system opens the corresponding expense detail without losing the expense's relationship to the vehicle

### Requirement: Vehicle cost summary distinguishes expense cost
The system SHALL distinguish acquisition cost, repair cost, and expense cost wherever vehicle financial summaries include those concepts. Expense cost SHALL be presented as its own active USD total and MUST NOT be merged into acquisition cost or repair cost unless a future explicit requirement defines a combined total.

#### Scenario: Vehicle financial totals shown together
- **WHEN** a vehicle has active purchases, active repairs, and active expenses
- **THEN** the vehicle detail shows acquisition cost, repair cost, and expense cost as separate labeled totals

#### Scenario: Expense cost without purchases or repairs
- **WHEN** a vehicle has active expenses but no purchases or repairs
- **THEN** the vehicle detail shows expense cost without implying that it is acquisition cost or repair cost

#### Scenario: Voided expense excluded from expense cost
- **WHEN** an expense related to a vehicle is voided
- **THEN** the vehicle's active expense cost total no longer includes that expense while the historical expense remains consultable

#### Scenario: Búsqueda por VIN parcial

- **WHEN** un usuario busca los últimos seis caracteres de un VIN
- **THEN** el listado muestra el vehículo correspondiente

#### Scenario: Orden del filtro de estatus

- **WHEN** un usuario abre el filtro de estatus
- **THEN** los estatus aparecen en el orden definido en su catálogo, no en orden alfabético ni por código

#### Scenario: Vehículos anulados fuera del inventario

- **WHEN** un usuario abre el inventario
- **THEN** no ve los vehículos anulados, y puede llegar a ellos por su código o mediante un filtro explícito

### Requirement: Autorización de las operaciones de vehículo

El sistema SHALL permitir a los roles `admin` y `capturista` registrar y editar vehículos, incluido el cambio de estatus y de precio. El sistema SHALL reservar la anulación al rol `admin`. El rol `lectura` MUST NOT poder ejecutar ninguna operación de escritura sobre vehículos. La verificación SHALL ocurrir en la operación misma, no solo en la navegación.

#### Scenario: Capturista registra y edita

- **WHEN** un capturista registra un vehículo y luego cambia su estatus
- **THEN** ambas operaciones se completan correctamente

#### Scenario: Lectura intenta escribir

- **WHEN** un usuario con rol `lectura` invoca cualquier operación de escritura sobre un vehículo
- **THEN** el sistema la rechaza y no modifica ningún dato

#### Scenario: Interfaz acorde al rol

- **WHEN** un capturista abre el detalle de un vehículo
- **THEN** ve las acciones de editar y cambiar estatus, pero no la de anular

### Requirement: Experiencia operacional del inventario de vehiculos

El sistema SHALL presentar el inventario de vehiculos con una composicion operacional compacta que incluya encabezado estandar, accion principal de alta cuando el rol la permita, busqueda, filtros, resumen de resultados, tabla escaneable y estados vacios. La experiencia SHALL conservar la busqueda por `code`, VIN o numero de inventario, los filtros por estatus, marca y rango de fecha de recepcion, y las columnas requeridas para identificar, comparar y actuar sobre vehiculos.

#### Scenario: Inventario con filtros y busqueda

- **WHEN** un usuario abre el inventario de vehiculos
- **THEN** ve busqueda, filtros de estatus, marca y rango de fecha de recepcion, una forma clara de limpiar filtros activos, y una tabla con `code`, descripcion, estatus, dias en inventario, precio de lista y acciones disponibles

#### Scenario: Lista sin resultados por filtro

- **WHEN** un usuario aplica una busqueda o filtro que no coincide con ningun vehiculo
- **THEN** el sistema muestra un estado vacio diferenciado de una lista sin datos iniciales y ofrece volver al estado predeterminado de la lista

#### Scenario: Acciones visibles segun rol

- **WHEN** un usuario con rol `lectura` abre el inventario
- **THEN** no ve acciones de alta, edicion, cambio de estatus, cambio de precio ni anulacion, aunque pueda consultar los vehiculos permitidos

#### Scenario: Inventario en viewport reducido

- **WHEN** un usuario consulta el inventario en una pantalla estrecha
- **THEN** la busqueda, filtros, tabla o alternativa responsive, estados y acciones siguen siendo utilizables sin ocultar `code`, estatus ni acceso al detalle

### Requirement: Formulario seccionado de alta y edicion de vehiculos

El sistema SHALL presentar el alta y la edicion de vehiculos como un formulario completo organizado por secciones logicas para identidad, ficha tecnica, kilometraje, titulo, estatus y precio. El formulario SHALL hacer visibles los campos obligatorios, aplicar las validaciones existentes en el punto de captura, mostrar errores junto al campo correspondiente cuando sea posible, y mantener acciones consistentes de guardar, cancelar y estado pendiente.

#### Scenario: Alta muestra requeridos y secciones

- **WHEN** un capturista abre el alta de vehiculo
- **THEN** el formulario muestra marca, modelo, ano, estatus y fecha de recepcion como datos requeridos, agrupa el resto de datos opcionales por secciones, y no permite editar ni elegir el `code`

#### Scenario: Validacion visible en formulario

- **WHEN** un capturista intenta guardar un vehiculo con un campo requerido vacio o un VIN invalido
- **THEN** el sistema mantiene al usuario en el formulario, muestra el error junto al campo correspondiente o en el resumen del formulario, y no consume un nuevo codigo

#### Scenario: Guardado pendiente

- **WHEN** un usuario envia el formulario de alta o edicion
- **THEN** la accion de guardado indica estado pendiente y evita envios duplicados hasta que la operacion termine

#### Scenario: Cancelacion vuelve al contexto

- **WHEN** un usuario cancela el alta o la edicion de un vehiculo
- **THEN** el sistema lo devuelve al inventario o al detalle del vehiculo, segun el contexto desde el que inicio la operacion, sin guardar cambios parciales

### Requirement: Detalle escaneable de vehiculo

El sistema SHALL presentar el detalle de vehiculo con secciones escaneables para identidad, ficha tecnica, kilometraje, titulo, precio, estatus e historial. La vista SHALL mostrar acciones disponibles segun rol, conservar el historial completo de estatus, identificar claramente vehiculos anulados y permitir volver al inventario sin perder el contexto de consulta cuando aplique.

#### Scenario: Detalle con secciones

- **WHEN** un usuario abre el detalle de un vehiculo activo
- **THEN** ve su identidad, ficha tecnica, kilometraje con unidad, situacion de titulo, precio de lista, estatus actual e historial de estatus separados en secciones claras

#### Scenario: Vehiculo anulado en detalle

- **WHEN** un usuario abre el detalle de un vehiculo anulado
- **THEN** el sistema muestra que esta anulado, conserva su codigo, motivo de anulacion y datos historicos, y no ofrece acciones de escritura incompatibles con ese estado

#### Scenario: Confirmacion destructiva para anulacion

- **WHEN** un administrador inicia la anulacion de un vehiculo
- **THEN** el sistema solicita confirmacion destructiva con motivo obligatorio antes de ejecutar la operacion

#### Scenario: Feedback de operaciones

- **WHEN** una operacion de vehiculo se completa, falla por validacion o falla por permisos
- **THEN** el sistema informa el resultado con el patron de feedback compartido sin exponer detalles tecnicos internos
