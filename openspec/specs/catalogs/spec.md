## Purpose

Define el comportamiento común de las listas de referencia del sistema —marcas, modelos, estatus de vehículo y proveedores— que alimentan los desplegables de captura de todos los módulos de operación. Su regla central es que una entrada de catálogo nunca desaparece: se retira, para que los registros históricos que la referencian sigan siendo legibles.

## Requirements

### Requirement: Catálogos administrados por el sistema

El sistema SHALL administrar cuatro catálogos: marcas (`MAKE`), modelos (`MODEL`), estatus de vehículo (`STATUS`) y proveedores (`VEND`). Cada entrada SHALL tener un `code` legible único emitido por el sistema, un nombre y un estado activo o inactivo. Toda entrada nueva SHALL quedar en estado activo. El usuario MUST NOT poder elegir ni editar el `code` de una entrada.

#### Scenario: Alta de marca

- **WHEN** un usuario autorizado da de alta la marca "Toyota"
- **THEN** la marca queda creada con el siguiente código de la secuencia `MAKE` y en estado activo

#### Scenario: Código asignado por el sistema

- **WHEN** un usuario intenta enviar un `code` propio al dar de alta una entrada de catálogo
- **THEN** el sistema ignora ese valor y emite el código que corresponde a la secuencia

#### Scenario: El código no se consume si el alta falla

- **WHEN** un alta de catálogo es rechazada por validación
- **THEN** no se emite ningún código y la siguiente alta válida recibe el que le tocaba

### Requirement: Unicidad de nombre normalizada

Dentro de un mismo catálogo, dos entradas MUST NOT tener el mismo nombre una vez normalizado. La normalización SHALL eliminar los espacios al inicio y al final, colapsar los espacios internos consecutivos en uno solo, e ignorar las diferencias de mayúsculas y de acentos. El nombre SHALL conservarse y mostrarse tal como el usuario lo capturó; la forma normalizada SHALL usarse únicamente para decidir la unicidad. Para los modelos, la unicidad SHALL evaluarse dentro de su marca, no en todo el catálogo.

#### Scenario: Nombre duplicado con espacios y mayúsculas

- **WHEN** un usuario intenta dar de alta la marca "  toyota " existiendo ya "Toyota"
- **THEN** el sistema rechaza el alta indicando qué entrada existente ocupa ese nombre

#### Scenario: Nombre duplicado con acentos

- **WHEN** un usuario intenta dar de alta el proveedor "Garcia Autos" existiendo ya "García Autos"
- **THEN** el sistema rechaza el alta indicando qué entrada existente ocupa ese nombre

#### Scenario: El nombre se conserva como se capturó

- **WHEN** un usuario da de alta la marca "Land Rover"
- **THEN** la entrada se muestra en pantalla como "Land Rover", no en la forma normalizada

#### Scenario: Mismo nombre de modelo en marcas distintas

- **WHEN** un usuario da de alta el modelo "Sonata" bajo una marca que no lo tiene, existiendo ya "Sonata" bajo otra marca
- **THEN** el alta se acepta

#### Scenario: Nombre duplicado al editar

- **WHEN** un usuario renombra una entrada al nombre normalizado de otra entrada del mismo catálogo
- **THEN** el sistema rechaza el cambio y conserva el nombre anterior

#### Scenario: Colisión con una entrada inactiva

- **WHEN** un usuario intenta dar de alta una entrada cuyo nombre normalizado coincide con el de una entrada desactivada
- **THEN** el sistema rechaza el alta e indica que existe una entrada desactivada con ese nombre, que puede reactivarse

### Requirement: Retiro sin borrado

El sistema SHALL permitir desactivar una entrada de catálogo, y MUST NOT ofrecer ninguna operación de borrado. Una entrada desactivada MUST NOT aparecer en los desplegables de captura de registros nuevos, y SHALL seguir mostrándose correctamente en los registros históricos que la referencian y en la vista de administración del catálogo. El sistema SHALL registrar quién desactivó una entrada y cuándo, y SHALL permitir reactivarla.

#### Scenario: Proveedor retirado

- **WHEN** un administrador desactiva un proveedor
- **THEN** ese proveedor ya no aparece al capturar una compra nueva, pero las compras anteriores siguen mostrando su nombre

#### Scenario: Autoría del retiro

- **WHEN** un administrador desactiva una entrada de catálogo
- **THEN** la entrada conserva el usuario que la desactivó y la marca de tiempo del servidor

#### Scenario: Reactivación

- **WHEN** un administrador reactiva una entrada de catálogo desactivada
- **THEN** vuelve a aparecer en los desplegables de captura y su registro de desactivación se limpia

#### Scenario: Código no reutilizable

- **WHEN** se da de alta una entrada nueva después de haber desactivado otra
- **THEN** la nueva recibe el siguiente código de la secuencia, nunca el de la desactivada

#### Scenario: Entradas inactivas visibles para quien administra

- **WHEN** un administrador abre la vista de un catálogo
- **THEN** puede ver también las entradas desactivadas, distinguidas de las activas

### Requirement: Modelo dependiente de marca

Cada modelo SHALL pertenecer a exactamente una marca. El sistema SHALL ofrecer, al capturar un vehículo, únicamente los modelos activos de la marca seleccionada. El sistema MUST NOT permitir crear un modelo sin marca ni asociado a una marca inactiva, ni reasignar un modelo existente a una marca inactiva.

#### Scenario: Desplegable dependiente

- **WHEN** el usuario selecciona una marca en un formulario que pide modelo
- **THEN** el desplegable de modelo muestra solo los modelos activos de esa marca

#### Scenario: Cambio de marca en el formulario

- **WHEN** el usuario cambia la marca después de haber elegido un modelo
- **THEN** el modelo seleccionado se limpia y el desplegable se recarga con los modelos de la nueva marca

#### Scenario: Modelo sin marca

- **WHEN** un usuario intenta crear un modelo sin indicar marca
- **THEN** el sistema rechaza el alta señalando que la marca es obligatoria

#### Scenario: Modelo bajo marca inactiva

- **WHEN** un usuario intenta crear un modelo bajo una marca desactivada
- **THEN** el sistema rechaza el alta

### Requirement: Efecto de desactivar una marca

Al desactivar una marca, sus modelos MUST NOT quedar desactivados en la base de datos, y SHALL dejar de ofrecerse en los desplegables de captura mientras su marca esté inactiva. Al reactivar la marca, sus modelos SHALL volver a ofrecerse exactamente con el estado activo o inactivo que cada uno tenía.

#### Scenario: Modelos de una marca desactivada

- **WHEN** un administrador desactiva una marca que tiene modelos activos
- **THEN** ninguno de esos modelos aparece al capturar un vehículo, y los vehículos ya registrados siguen mostrando su marca y su modelo

#### Scenario: Reactivación de la marca

- **WHEN** un administrador reactiva esa marca
- **THEN** vuelven a ofrecerse los modelos que estaban activos, y siguen sin ofrecerse los que estaban desactivados individualmente

#### Scenario: Alta de modelo bloqueada mientras la marca está inactiva

- **WHEN** un usuario intenta agregar un modelo a una marca desactivada
- **THEN** el sistema rechaza el alta e indica que la marca no está activa

### Requirement: Datos de contacto de los proveedores

Además del código, el nombre y el estado, un proveedor SHALL poder registrar teléfono, correo electrónico, ciudad y notas. Todos estos campos SHALL ser opcionales. El sistema SHALL validar el formato del correo electrónico cuando se proporcione, y MUST NOT exigir unicidad sobre ninguno de ellos.

#### Scenario: Proveedor con contacto

- **WHEN** un usuario da de alta un proveedor con teléfono y ciudad, sin correo
- **THEN** el proveedor queda creado con los datos indicados y sin correo

#### Scenario: Correo con formato inválido

- **WHEN** un usuario captura un correo con formato inválido en un proveedor
- **THEN** el sistema rechaza el guardado señalando el campo de correo

#### Scenario: Dos proveedores con el mismo teléfono

- **WHEN** un usuario da de alta un proveedor con un teléfono ya registrado en otro proveedor
- **THEN** el alta se acepta

### Requirement: Orden y descripción de los estatus de vehículo

Cada estatus de vehículo SHALL tener un orden numérico explícito que determina cómo se presenta en listados y desplegables, independiente de su `code` y de su fecha de alta. Dos estatus MAY compartir el mismo orden, y en ese caso SHALL desempatarse por nombre. Cada estatus SHALL poder llevar además una descripción opcional que explique cuándo aplicarlo. Este orden MUST NOT restringir por sí mismo los cambios de estatus de un vehículo.

#### Scenario: El orden no depende del código

- **WHEN** se da de alta un estatus con un código posterior a todos los existentes pero con un orden intermedio
- **THEN** aparece en los listados y desplegables en la posición que le da su orden, no al final

#### Scenario: Orden intercalado

- **WHEN** un administrador necesita insertar un estatus entre dos existentes
- **THEN** puede hacerlo asignándole un orden comprendido entre los de ambos, sin renumerar los demás

#### Scenario: Descripción opcional

- **WHEN** un usuario da de alta un estatus sin descripción
- **THEN** el alta se acepta y el estatus se muestra solo con su nombre

### Requirement: Integridad referencial de los catálogos

El sistema SHALL rechazar cualquier registro que referencie una entrada de catálogo inexistente. Al crear un registro nuevo, el sistema SHALL exigir además que la entrada referenciada esté activa. Un registro ya existente que referencia una entrada posteriormente desactivada SHALL seguir siendo legible y editable sin obligar a cambiar esa referencia.

#### Scenario: Referencia inexistente

- **WHEN** llega una operación que referencia un proveedor que no existe
- **THEN** el sistema rechaza la operación sin escribir nada

#### Scenario: Referencia a entrada inactiva en alta nueva

- **WHEN** un usuario intenta registrar una compra con un proveedor desactivado
- **THEN** el sistema rechaza el guardado indicando que el proveedor no está activo

#### Scenario: Registro histórico con referencia inactiva

- **WHEN** se consulta un registro que referencia una entrada de catálogo desactivada después de su captura
- **THEN** el registro se muestra completo, con el nombre de la entrada, y su edición no obliga a reemplazar esa referencia

### Requirement: Autorización de las operaciones de catálogo

El sistema SHALL permitir a los roles `admin` y `capturista` crear y editar entradas de catálogo. El sistema SHALL reservar la desactivación y la reactivación al rol `admin`. El rol `lectura` MUST NOT poder ejecutar ninguna operación de escritura sobre los catálogos. La verificación SHALL ocurrir en la operación misma, no solo en la navegación.

#### Scenario: Capturista da de alta

- **WHEN** un capturista da de alta una marca
- **THEN** la operación se completa correctamente

#### Scenario: Capturista intenta desactivar

- **WHEN** un capturista intenta desactivar una entrada de catálogo
- **THEN** el sistema rechaza la operación por falta de permisos y la entrada sigue activa

#### Scenario: Lectura intenta escribir

- **WHEN** un usuario con rol `lectura` invoca cualquier operación de escritura sobre un catálogo
- **THEN** el sistema la rechaza y no modifica ningún dato

#### Scenario: Interfaz acorde al rol

- **WHEN** un capturista abre la vista de un catálogo
- **THEN** ve el botón de alta pero no las acciones de desactivar y reactivar

### Requirement: Trazabilidad de las escrituras de catálogo

Toda alta y toda modificación de una entrada de catálogo SHALL registrar el usuario que la ejecutó y la marca de tiempo del servidor. La autoría SHALL conservarse aunque el usuario responsable sea posteriormente desactivado.

#### Scenario: Autoría del alta

- **WHEN** un usuario con sesión válida da de alta una entrada de catálogo
- **THEN** la entrada guarda su identificador de usuario y la hora del servidor

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

#### Scenario: Autoría de la edición

- **WHEN** un usuario distinto edita esa entrada
- **THEN** la entrada conserva al autor original y registra al segundo usuario como quien la modificó por última vez

#### Scenario: Escritura sin sesión

- **WHEN** llega una operación de escritura sobre un catálogo sin sesión válida
- **THEN** es rechazada y no se crea ninguna entrada sin autoría
