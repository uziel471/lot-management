# Purchases Specification

## Purpose

Define el registro del costo de adquisición de un vehículo: el desglose por componentes, el manejo bimoneda, el cálculo del total y las reglas de anulación y corrección. Una compra es la única vía por la que entra al sistema el costo de adquirir la unidad, y es la frontera con reparaciones y gastos.

## Requirements

### Requirement: Registro de compra

El sistema SHALL permitir a un usuario autorizado registrar una compra indicando vehículo, proveedor, fecha de compra, origen, moneda, tipo de cambio, los componentes del costo de adquisición, forma de pago y tipo de transacción. Vehículo, proveedor, fecha, moneda y tipo de transacción SHALL ser obligatorios. El sistema SHALL asignar un `code` con forma `PUR-####` al crearla.

#### Scenario: Compra en USD

- **WHEN** un capturista registra la primera compra del sistema en USD con todos los campos obligatorios
- **THEN** la compra queda creada con `code = "PUR-0001"` y tipo de cambio `1`

#### Scenario: Compra en MXN

- **WHEN** un capturista registra una compra en MXN por `370,000.00` con tipo de cambio `18.50`
- **THEN** el sistema guarda el total original en MXN y expone el equivalente `20,000.00 USD`

#### Scenario: Campo obligatorio vacío

- **WHEN** un capturista envía el formulario sin proveedor
- **THEN** el sistema rechaza el guardado, señala el campo faltante, no crea la compra y no consume el código

#### Scenario: Códigos consecutivos

- **WHEN** se registran tres compras válidas seguidas
- **THEN** sus códigos son `PUR-0001`, `PUR-0002` y `PUR-0003`, sin saltos

### Requirement: Desglose del costo de adquisición

El sistema SHALL registrar el costo de adquisición desglosado en componentes independientes, cada uno con su propio importe en la moneda de la compra. Un componente sin valor SHALL tratarse como cero. El total original SHALL ser la suma de los componentes, y el total en USD SHALL derivarse dividiendo el total original entre el tipo de cambio de la compra.

#### Scenario: Total en vivo durante la captura

- **WHEN** el capturista va llenando los componentes de costo en el formulario
- **THEN** el formulario muestra el total en la moneda original y su equivalente en USD antes de guardar

#### Scenario: Componentes vacíos

- **WHEN** el capturista captura solo el precio del vehículo y deja los demás componentes en blanco
- **THEN** el total equivale al precio del vehículo

#### Scenario: Totales no almacenados

- **WHEN** se consulta una compra
- **THEN** sus totales se calculan a partir de los componentes guardados, no de un total persistido

### Requirement: Control de signo por tipo de compra

El sistema SHALL aceptar componentes de costo negativos únicamente cuando el tipo de compra es `Adjustment`. En los tipos `Initial`, `Correction` y `Related`, el sistema SHALL rechazar cualquier componente negativo.

#### Scenario: Inicial con componente negativo

- **WHEN** un capturista intenta guardar una compra `Initial` con un componente en `-500`
- **THEN** el sistema rechaza el guardado, señala el componente inválido y no consume el código

#### Scenario: Ajuste negativo

- **WHEN** un capturista registra una compra `Adjustment` con un componente en `-500`
- **THEN** el sistema la acepta y el costo acumulado del vehículo baja en ese importe

### Requirement: Anulación y corrección de compras

El sistema SHALL permitir a un `admin` anular una compra registrando motivo, autor y fecha. Una compra anulada SHALL contar como cero en el costo acumulado del vehículo y SHALL seguir siendo consultable. Para corregir un dato equivocado, el sistema SHALL anular la compra original y crear una compra nueva de tipo `Correction`; MUST NOT modificar los importes de una compra ya registrada.

#### Scenario: Anulación

- **WHEN** un administrador anula `PUR-0002` con motivo "capturada al vehículo equivocado"
- **THEN** la compra aparece marcada como anulada con ese motivo y el costo del vehículo se reduce en su importe

#### Scenario: Corrección

- **WHEN** un administrador corrige una compra cuyo importe se capturó mal
- **THEN** el sistema anula la original y crea una compra `Correction` con el importe correcto, quedando ambas en el historial del vehículo

#### Scenario: Capturista intenta anular

- **WHEN** un capturista intenta anular una compra
- **THEN** el sistema rechaza la operación y la compra queda intacta

#### Scenario: Edición de importes bloqueada

- **WHEN** alguien intenta modificar los componentes de costo de una compra existente
- **THEN** el sistema rechaza la operación e indica que debe anularse y corregirse

### Requirement: Frontera con reparaciones y gastos

El sistema SHALL aceptar en una compra únicamente costos de adquisición de la unidad —precio, traslado al lote, trámites de título e importación—. Los costos de reacondicionamiento previo a la venta SHALL registrarse como reparaciones y el resto como gastos. El sistema MUST NOT permitir registrar el mismo comprobante como compra y como reparación o gasto del mismo vehículo.

#### Scenario: Comprobante ya registrado

- **WHEN** un capturista intenta registrar como compra un comprobante ya capturado como reparación del mismo vehículo
- **THEN** el sistema advierte del duplicado y rechaza el guardado

### Requirement: Protección contra guardado doble

El sistema SHALL impedir que un mismo envío del formulario cree más de una compra, aun cuando el usuario active el guardado varias veces.

#### Scenario: Doble clic en guardar

- **WHEN** un capturista hace doble clic sobre el botón de guardar
- **THEN** se crea exactamente una compra y se consume exactamente un código

### Requirement: Consulta de compras

El sistema SHALL ofrecer un listado de compras filtrable por vehículo, proveedor y rango de fechas, que muestre por cada una su `code`, vehículo, proveedor, fecha, total original con su moneda, total en USD y si está anulada. Las compras anuladas SHALL distinguirse visualmente y SHALL poder excluirse del listado.

#### Scenario: Filtro por vehículo

- **WHEN** un usuario filtra las compras del vehículo `VEH-0003`
- **THEN** el listado muestra solo las compras de ese vehículo, incluidas las anuladas, marcadas como tales

#### Scenario: Exclusión de anuladas

- **WHEN** el usuario activa el filtro que oculta las compras anuladas
- **THEN** el listado muestra solo las vigentes y el total del pie coincide con el costo de adquisición acumulado
