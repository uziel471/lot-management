## ADDED Requirements

### Requirement: Experiencia de administración de catálogos

El sistema SHALL ofrecer una experiencia de administración de catálogos alineada al sistema de diseño compartido, con navegación entre marcas, modelos, estatus de vehículo y proveedores; encabezado de página estándar; acción primaria acorde al catálogo seleccionado; búsqueda o filtros compactos; resumen de resultados; tabla escaneable; estados vacíos; estado sin resultados filtrados; y opción clara para restablecer filtros. La experiencia MUST preservar las reglas existentes de códigos emitidos por el sistema, unicidad normalizada, retiro sin borrado, reactivación, permisos y trazabilidad.

#### Scenario: Cambio de catálogo administrado

- **WHEN** un usuario autorizado abre Catalogos y cambia entre marcas, modelos, estatus de vehículo y proveedores
- **THEN** la pantalla conserva la composición estándar y actualiza título, acción primaria, filtros, columnas y estados al catálogo seleccionado

#### Scenario: Lista filtrada sin resultados

- **WHEN** un usuario aplica búsqueda o filtros que no coinciden con entradas del catálogo seleccionado
- **THEN** el sistema muestra un estado sin resultados filtrados y ofrece restablecer la lista al estado predeterminado

#### Scenario: Acciones visibles según rol

- **WHEN** un usuario abre la administración de catálogos
- **THEN** la interfaz muestra crear y editar solo a roles autorizados y muestra desactivar o reactivar solo a administradores, sin cambiar la verificación de permisos de la operación

### Requirement: Formularios enfocados de catálogo

El sistema SHALL presentar formularios de alta y edición adecuados al tipo de catálogo seleccionado, con campos obligatorios visibles, campos opcionales identificables, validación por campo, errores de formulario cuando aplique, acciones guardar/cancelar, estado pendiente de guardado y feedback de éxito o falla. Los formularios MUST NOT permitir capturar ni editar el `code` emitido por el sistema.

#### Scenario: Alta de entrada con validación visible

- **WHEN** un usuario intenta guardar una entrada de catálogo con datos inválidos
- **THEN** el sistema muestra los errores junto a los campos correspondientes y no consume ningún código nuevo

#### Scenario: Código no editable en el formulario

- **WHEN** un usuario crea o edita una entrada de catálogo
- **THEN** el formulario no ofrece un control editable para el `code` de la entrada

#### Scenario: Guardado pendiente

- **WHEN** un usuario envía un formulario de catálogo
- **THEN** la acción de guardado comunica el estado pendiente y evita envíos duplicados mientras la operación está en curso

### Requirement: Administración explícita de modelos por marca

La administración de modelos SHALL comunicar que cada modelo pertenece a una marca específica. La lista de modelos SHALL mostrar o filtrar por marca, el formulario de modelo SHALL exigir una marca activa, y la interfaz SHALL comunicar cuando no se puede crear o reasignar un modelo porque la marca está inactiva. La experiencia MUST NOT presentar los modelos como entradas globales independientes de marca.

#### Scenario: Lista de modelos con contexto de marca

- **WHEN** un usuario administra modelos
- **THEN** la pantalla muestra el contexto de marca de cada modelo o permite filtrar por marca sin ocultar la dependencia entre ambos catálogos

#### Scenario: Alta bloqueada por marca inactiva

- **WHEN** un usuario intenta crear un modelo bajo una marca inactiva desde la interfaz
- **THEN** el sistema comunica que la marca no está activa y no permite completar el alta

### Requirement: Estado activo e inactivo en administración

La administración de catálogos SHALL distinguir visualmente entradas activas e inactivas, SHALL permitir incluir o filtrar entradas inactivas cuando el usuario administra el catálogo, y SHALL presentar acciones de desactivar o reactivar con confirmación, feedback y visibilidad de metadatos acorde al rol del usuario. La interfaz MUST NOT ofrecer una acción de borrado para entradas de catálogo.

#### Scenario: Entrada inactiva visible en administración

- **WHEN** un administrador consulta un catálogo con entradas desactivadas
- **THEN** la tabla permite identificar cuáles entradas están inactivas y conserva visible la información necesaria para reactivarlas o entender su retiro

#### Scenario: Confirmación de desactivación

- **WHEN** un administrador solicita desactivar una entrada de catálogo
- **THEN** el sistema pide confirmación antes de ejecutar la operación y muestra feedback del resultado

#### Scenario: Sin acción de borrado

- **WHEN** cualquier usuario autorizado abre acciones sobre una entrada de catálogo
- **THEN** la interfaz no ofrece borrar la entrada

### Requirement: Presentación específica por tipo de catálogo

El sistema SHALL adaptar columnas de tabla, campos de formulario e información de resumen a cada tipo de catálogo: marcas SHALL enfatizar nombre, código, estado y contexto de modelos relacionados; modelos SHALL incluir contexto de marca; proveedores SHALL incluir teléfono, correo, ciudad y notas opcionales cuando existan; y estatus de vehículo SHALL incluir orden explícito y descripción opcional. La presentación del orden de estatus MUST permanecer independiente de la emisión de códigos y de la fecha de alta.

#### Scenario: Proveedor con contacto escaneable

- **WHEN** un usuario consulta proveedores
- **THEN** la lista o detalle presenta los datos opcionales de contacto disponibles sin exigir unicidad sobre teléfono, correo, ciudad o notas

#### Scenario: Estatus ordenados por orden explícito

- **WHEN** un usuario consulta estatus de vehículo
- **THEN** el listado presenta los estatus de acuerdo con su orden numérico explícito y desempate por nombre, no por `code` ni por fecha de alta

#### Scenario: Marca con contexto de modelos

- **WHEN** un usuario consulta marcas
- **THEN** la interfaz comunica el contexto relevante de modelos sin cambiar el estado individual de esos modelos
