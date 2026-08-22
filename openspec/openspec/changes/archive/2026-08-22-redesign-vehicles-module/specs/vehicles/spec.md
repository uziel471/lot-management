## ADDED Requirements

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
