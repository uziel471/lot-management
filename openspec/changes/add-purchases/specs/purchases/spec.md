## Purpose

Define el registro del costo de adquisición de un vehículo: el desglose por componentes, el manejo bimoneda, el cálculo de los totales, las reglas de tipo, signo, anulación y corrección, y el costo de adquisición acumulado de cada unidad. Una compra es la única vía por la que entra al sistema el costo de adquirir un vehículo, y es la frontera con reparaciones y gastos.

## ADDED Requirements

### Requirement: Registro de compra

El sistema SHALL permitir a un usuario autorizado registrar una compra indicando vehículo, proveedor, fecha de compra, origen, moneda, tipo de cambio, los componentes del costo de adquisición, forma de pago y tipo de compra. Vehículo, proveedor, fecha de compra, moneda, tipo de cambio y tipo de compra SHALL ser obligatorios. El vehículo y el proveedor SHALL estar vigentes al momento de capturar. El sistema SHALL asignar un `code` con forma `PUR-####` al crearla, y MUST NOT consumirlo si la operación no llega a persistirse.

#### Scenario: Primera compra del sistema

- **WHEN** un capturista registra la primera compra del sistema en USD con todos los campos obligatorios
- **THEN** la compra queda creada con `code = "PUR-0001"` y tipo de cambio `1`

#### Scenario: Campo obligatorio vacío

- **WHEN** un capturista envía el formulario sin proveedor
- **THEN** el sistema rechaza el guardado, señala el campo faltante, no crea la compra y no consume el código

#### Scenario: Códigos consecutivos

- **WHEN** se registran tres compras válidas seguidas
- **THEN** sus códigos son `PUR-0001`, `PUR-0002` y `PUR-0003`, sin saltos

#### Scenario: Vehículo anulado

- **WHEN** un capturista intenta registrar una compra de un vehículo anulado
- **THEN** el sistema rechaza el guardado y el vehículo anulado no aparece en el desplegable

#### Scenario: Proveedor retirado

- **WHEN** un capturista intenta registrar una compra con un proveedor desactivado
- **THEN** el sistema rechaza el guardado indicando que el proveedor no está vigente

#### Scenario: Fecha de compra futura

- **WHEN** un capturista captura una fecha de compra posterior a hoy
- **THEN** el sistema rechaza el guardado y señala el campo de fecha

#### Scenario: Compra anterior a la recepción del vehículo

- **WHEN** un capturista registra una compra con fecha posterior a la fecha de recepción del vehículo
- **THEN** el sistema guarda la compra y advierte de la inconsistencia de fechas, sin bloquearla

### Requirement: Desglose del costo de adquisición

El sistema SHALL registrar el costo de adquisición desglosado en ocho componentes independientes, cada uno con su propio importe en la moneda de la compra: precio del vehículo, comisiones de subasta, transporte de adquisición, trámites y documentación de título, impuesto de compra, aranceles de importación, honorarios del agente aduanal y otros costos de adquisición. Un componente sin valor SHALL tratarse como cero. El total original SHALL ser la suma de los ocho y el total en USD SHALL derivarse del total original y el tipo de cambio congelado de la compra. El sistema MUST NOT almacenar ninguno de los dos totales.

#### Scenario: Total en vivo durante la captura

- **WHEN** el capturista va llenando los componentes de costo en el formulario
- **THEN** el formulario muestra el total en la moneda original y su equivalente en USD antes de guardar

#### Scenario: Componentes vacíos

- **WHEN** el capturista captura solo el precio del vehículo y deja los demás componentes en blanco
- **THEN** el total equivale al precio del vehículo y los siete componentes restantes valen cero

#### Scenario: Totales no almacenados

- **WHEN** se consulta una compra
- **THEN** sus totales se calculan a partir de los componentes guardados y del tipo de cambio de la compra, no de un total persistido

#### Scenario: Suma exacta de los ocho componentes

- **WHEN** se registran ocho componentes cuya suma decimal produciría error de punto flotante
- **THEN** el total es exacto al centavo

#### Scenario: Compra sin ningún importe

- **WHEN** un capturista intenta guardar una compra con los ocho componentes vacíos o en cero
- **THEN** el sistema rechaza el guardado indicando que la compra debe tener al menos un importe distinto de cero

### Requirement: Moneda y tipo de cambio de la compra

Cada compra SHALL registrarse en una sola moneda, `USD` o `MXN`, con el tipo de cambio vigente al capturarla expresado como MXN por 1 USD y congelado en la compra. Cuando la moneda es `USD` el tipo de cambio SHALL ser exactamente `1` y el sistema SHALL impedir capturar otro valor. El sistema SHALL rechazar un tipo de cambio menor o igual a cero. Un cambio posterior del tipo de cambio del mercado MUST NOT alterar el equivalente en USD de una compra ya registrada. Una adquisición pagada en dos monedas SHALL registrarse como varias compras del mismo vehículo, nunca como una compra con importes mezclados.

#### Scenario: Compra en MXN

- **WHEN** un capturista registra una compra en MXN por `370,000.00` con tipo de cambio `18.50`
- **THEN** el sistema guarda el total original en MXN y expone el equivalente `20,000.00 USD`

#### Scenario: Tipo de cambio fijado en compras en dólares

- **WHEN** el capturista selecciona la moneda `USD` en el formulario
- **THEN** el tipo de cambio se fija en `1` y queda bloqueado para edición

#### Scenario: Tipo de cambio inválido

- **WHEN** un capturista intenta guardar una compra en MXN con tipo de cambio `0`
- **THEN** el sistema rechaza el guardado y señala el campo de tipo de cambio

#### Scenario: El tipo de cambio no se recalcula

- **WHEN** se consulta una compra en MXN registrada con un tipo de cambio distinto al actual
- **THEN** su equivalente en USD sigue siendo el que resultó del tipo de cambio congelado en ella

#### Scenario: Adquisición pagada en dos monedas

- **WHEN** una unidad se paga en parte en dólares y en parte en pesos
- **THEN** se registran dos compras del mismo vehículo, cada una monomoneda, y el costo acumulado del vehículo suma ambas en USD

### Requirement: Control de signo por tipo de compra

El sistema SHALL admitir cuatro tipos de compra: `Initial`, `Adjustment`, `Correction` y `Related`. El sistema SHALL aceptar componentes de costo negativos únicamente cuando el tipo es `Adjustment`; en los otros tres SHALL rechazar cualquier componente negativo.

#### Scenario: Inicial con componente negativo

- **WHEN** un capturista intenta guardar una compra `Initial` con un componente en `-500`
- **THEN** el sistema rechaza el guardado, señala el componente inválido y no consume el código

#### Scenario: Ajuste negativo

- **WHEN** un capturista registra una compra `Adjustment` con un componente en `-500`
- **THEN** el sistema la acepta y el costo de adquisición acumulado del vehículo baja en ese importe

#### Scenario: Corrección con componente negativo

- **WHEN** un capturista intenta guardar una compra `Correction` con un componente negativo
- **THEN** el sistema rechaza el guardado

### Requirement: Compra inicial única por vehículo

Cada vehículo SHALL tener a lo sumo una compra `Initial` vigente. El sistema SHALL rechazar una segunda compra `Initial` del mismo vehículo mientras la primera no esté anulada, y la restricción SHALL estar respaldada por la base de datos, no solo por la validación de la aplicación. Los tipos `Adjustment` y `Related` SHALL exigir que el vehículo ya tenga al menos una compra vigente. El tipo `Correction` SHALL exigir que se señale la compra anulada del mismo vehículo que corrige.

#### Scenario: Segunda compra inicial

- **WHEN** un capturista intenta registrar una segunda compra `Initial` de un vehículo que ya tiene una vigente
- **THEN** el sistema rechaza el guardado, nombra la compra existente y no consume el código

#### Scenario: Ajuste sin compra base

- **WHEN** un capturista intenta registrar un `Adjustment` de un vehículo sin ninguna compra vigente
- **THEN** el sistema rechaza el guardado indicando que primero debe registrarse la compra inicial

#### Scenario: Inicial liberada por anulación

- **WHEN** un administrador anula la compra `Initial` de un vehículo
- **THEN** el sistema acepta registrar una compra `Correction` que la sustituya y esa corrección pasa a ser el costo base del vehículo

#### Scenario: Corrección sin compra señalada

- **WHEN** un capturista intenta registrar una `Correction` sin indicar qué compra corrige
- **THEN** el sistema rechaza el guardado

#### Scenario: Corrección de una compra vigente

- **WHEN** un capturista intenta registrar una `Correction` señalando una compra que no está anulada
- **THEN** el sistema rechaza el guardado e indica que primero debe anularse la compra original

### Requirement: Inmutabilidad de las compras

El sistema MUST NOT permitir modificar ningún dato de una compra ya registrada —ni sus importes, ni su moneda, ni su tipo de cambio, ni su vehículo, ni sus notas—. La única operación posterior admitida sobre una compra SHALL ser su anulación. Corregir un dato equivocado SHALL hacerse anulando la compra y registrando una compra `Correction` con los datos correctos.

#### Scenario: Edición de importes bloqueada

- **WHEN** alguien intenta modificar los componentes de costo de una compra existente
- **THEN** el sistema rechaza la operación e indica que debe anularse y corregirse

#### Scenario: Interfaz sin edición

- **WHEN** un usuario abre el detalle de una compra
- **THEN** no encuentra ninguna acción de editar, solo la de anular si su rol se lo permite

### Requirement: Anulación y corrección de compras

El sistema SHALL permitir a un `admin` anular una compra registrando motivo, autor y fecha. Una compra anulada SHALL contar como cero en el costo de adquisición acumulado del vehículo, SHALL seguir siendo consultable y MUST NOT poder anularse dos veces. El sistema MUST NOT ofrecer el borrado de una compra en ningún nivel, y MUST NOT reemitir el código de una compra anulada.

#### Scenario: Anulación

- **WHEN** un administrador anula `PUR-0002` con motivo "capturada al vehículo equivocado"
- **THEN** la compra aparece marcada como anulada con ese motivo, autor y fecha, y el costo de adquisición del vehículo se reduce en su importe

#### Scenario: Corrección

- **WHEN** un administrador anula una compra cuyo importe se capturó mal y registra una compra `Correction` con el importe correcto
- **THEN** ambas quedan en el historial del vehículo y solo la vigente cuenta en el costo acumulado

#### Scenario: Capturista intenta anular

- **WHEN** un capturista intenta anular una compra
- **THEN** el sistema rechaza la operación y la compra queda intacta

#### Scenario: Anulación sin motivo

- **WHEN** un administrador intenta anular una compra sin indicar motivo
- **THEN** el sistema rechaza la operación

#### Scenario: Doble anulación

- **WHEN** un administrador intenta anular una compra que ya está anulada
- **THEN** el sistema rechaza la operación y conserva el motivo, autor y fecha de la anulación original

#### Scenario: El código no se libera

- **WHEN** se registra una compra nueva después de haber anulado otra
- **THEN** recibe el siguiente código de la secuencia, nunca el de la anulada

### Requirement: Unicidad del comprobante dentro de compras

El sistema MUST NOT permitir dos compras vigentes del mismo proveedor con el mismo número de referencia. La comparación SHALL hacerse sobre una forma normalizada de la referencia —recortada, con espacios internos colapsados, sin acentos y en mayúsculas—, de modo que dos capturas que solo difieren en espacios o mayúsculas se traten como la misma. La referencia SHALL ser opcional: varias compras sin referencia SHALL poder coexistir.

#### Scenario: Comprobante repetido

- **WHEN** un capturista registra una compra con un proveedor y un número de referencia que ya tiene una compra vigente
- **THEN** el sistema rechaza el guardado y nombra la compra que ya usa esa referencia

#### Scenario: Referencia con diferencias de captura

- **WHEN** un capturista captura la referencia ` fac-1023 ` para un proveedor que ya tiene una compra vigente con `FAC-1023`
- **THEN** el sistema la trata como la misma referencia y rechaza el guardado

#### Scenario: Mismo folio de proveedores distintos

- **WHEN** dos proveedores distintos emiten comprobantes con el mismo número
- **THEN** ambas compras se registran sin conflicto

#### Scenario: Compras sin referencia

- **WHEN** se registran tres compras del mismo proveedor sin número de referencia
- **THEN** las tres se registran sin conflicto

#### Scenario: Referencia liberada por anulación

- **WHEN** se anula la compra que usaba una referencia y se registra otra con la misma referencia y proveedor
- **THEN** el sistema la acepta

### Requirement: Protección contra guardado doble

El sistema SHALL impedir que un mismo envío del formulario cree más de una compra, aun cuando el usuario active el guardado varias veces. La protección SHALL residir en el servidor y no depender únicamente de deshabilitar el botón en el navegador.

#### Scenario: Doble clic en guardar

- **WHEN** un capturista hace doble clic sobre el botón de guardar
- **THEN** se crea exactamente una compra y la segunda pulsación devuelve esa misma compra, no una nueva

#### Scenario: Reenvío del mismo formulario

- **WHEN** el mismo envío llega dos veces al servidor por un reintento de red
- **THEN** el sistema reconoce el envío repetido y devuelve la compra ya creada

#### Scenario: Dos capturas legítimas iguales

- **WHEN** un capturista registra dos compras distintas con los mismos importes y el mismo vehículo, llenando el formulario dos veces
- **THEN** el sistema crea las dos, porque son envíos distintos

### Requirement: Consulta de compras

El sistema SHALL ofrecer un listado de compras filtrable por vehículo, proveedor, tipo de compra y rango de fechas, que muestre por cada una su `code`, vehículo, proveedor, fecha, tipo, total original con su moneda, total en USD y si está anulada. Las compras anuladas SHALL distinguirse visualmente y SHALL poder excluirse del listado. El pie del listado SHALL mostrar el total en USD de las compras vigentes incluidas en el filtro aplicado. El sistema SHALL ofrecer además una vista de detalle con los ocho componentes, la conversión aplicada y los datos de anulación cuando existan.

#### Scenario: Filtro por vehículo

- **WHEN** un usuario filtra las compras del vehículo `VEH-0003`
- **THEN** el listado muestra solo las compras de ese vehículo, incluidas las anuladas, marcadas como tales

#### Scenario: Exclusión de anuladas

- **WHEN** el usuario activa el filtro que oculta las compras anuladas
- **THEN** el listado muestra solo las vigentes y el total del pie coincide con el costo de adquisición acumulado del filtro

#### Scenario: Detalle de una compra

- **WHEN** un usuario abre el detalle de una compra en MXN
- **THEN** ve los ocho componentes en pesos, el tipo de cambio congelado y el total equivalente en dólares

#### Scenario: Detalle de una compra anulada

- **WHEN** un usuario abre el detalle de una compra anulada
- **THEN** ve sus importes originales junto al motivo, autor y fecha de la anulación, y la indicación de que no cuenta en el costo del vehículo

### Requirement: Costo de adquisición acumulado por vehículo

El sistema SHALL calcular para cada vehículo su costo de adquisición acumulado como la suma en USD de sus compras vigentes, y SHALL ofrecer el desglose por cada uno de los ocho componentes. Las compras anuladas SHALL contar como cero. El costo acumulado MUST NOT almacenarse en el vehículo. La interfaz SHALL nombrarlo costo de *adquisición*, y MUST NOT presentarlo como costo total del vehículo mientras existan categorías de costo no implementadas.

#### Scenario: Vehículo sin compras

- **WHEN** se consulta un vehículo recién dado de alta
- **THEN** su costo de adquisición acumulado es cero y la ficha indica que aún no tiene compras registradas

#### Scenario: Suma de compras en monedas distintas

- **WHEN** un vehículo tiene una compra en USD y otra en MXN
- **THEN** su costo acumulado es la suma de los equivalentes en USD de ambas, cada una con su propio tipo de cambio congelado

#### Scenario: Efecto de un ajuste negativo

- **WHEN** se registra un `Adjustment` negativo sobre un vehículo
- **THEN** su costo acumulado baja en ese importe

#### Scenario: Efecto de una anulación

- **WHEN** se anula una de las compras de un vehículo
- **THEN** su costo acumulado se recalcula sin ella, sin editar el vehículo

#### Scenario: Desglose por componente

- **WHEN** un usuario consulta el costo de adquisición de un vehículo con varias compras
- **THEN** ve el total y el desglose por los ocho componentes, sumados en USD a través de todas sus compras vigentes

### Requirement: Frontera con reparaciones y gastos

El sistema SHALL aceptar en una compra únicamente costos de adquisición de la unidad —precio, comisiones de la operación, traslado al lote, trámites de título e importación—. Los costos de reacondicionamiento previo a la venta SHALL registrarse como reparaciones y el resto como gastos. La interfaz de captura SHALL enunciar esta frontera donde el capturista decide.

#### Scenario: Ayuda en la captura

- **WHEN** un capturista abre el formulario de compra
- **THEN** la sección de componentes indica qué pertenece a una compra y qué debe registrarse como reparación o gasto

### Requirement: Autorización de las operaciones de compra

El sistema SHALL permitir a los roles `admin` y `capturista` registrar compras, y SHALL reservar la anulación al rol `admin`. El rol `lectura` MUST NOT poder ejecutar ninguna operación de escritura sobre compras. La verificación SHALL ocurrir en la operación misma, no solo en la navegación, y la ocultación de una acción en la interfaz MUST NOT ser su única defensa.

#### Scenario: Capturista registra

- **WHEN** un capturista registra una compra válida
- **THEN** la operación se completa y la compra queda a su nombre

#### Scenario: Lectura intenta escribir

- **WHEN** un usuario con rol `lectura` invoca cualquier operación de escritura sobre compras
- **THEN** el sistema la rechaza y no modifica ningún dato

#### Scenario: Escritura sin sesión

- **WHEN** llega una operación de compra sin sesión válida
- **THEN** es rechazada y no se crea ninguna compra sin autoría

#### Scenario: Interfaz acorde al rol

- **WHEN** un capturista abre el detalle de una compra
- **THEN** no ve la acción de anular, y si la invoca de todos modos el servidor la rechaza
