# Project Specification

## Purpose

Define las reglas transversales que gobiernan todo el sistema de administración del lote: cómo se identifican los registros, cómo se representa y convierte el dinero entre USD y MXN, cómo se anula una transacción sin perder historia, y qué frontera separa los tres tipos de costo de un vehículo. Cualquier capacidad nueva hereda estas reglas sin volver a declararlas.

## Requirements

### Requirement: Código legible por registro

Todo registro transaccional y de catálogo SHALL exponer un identificador legible `code` con la forma `<PREFIJO>-<NNNN>`, único dentro de su colección, independiente de la clave técnica interna. El sistema SHALL asignar ese código dentro de la misma operación atómica que crea el registro, y SHALL rechazar cualquier intento de reutilizar un código ya emitido.

#### Scenario: Código consecutivo al crear

- **WHEN** un usuario autorizado crea la primera compra del sistema
- **THEN** el registro queda con `code = "PUR-0001"` y el contador de compras avanza a 1

#### Scenario: Validación fallida no consume código

- **WHEN** un usuario envía un formulario de compra que no pasa la validación del servidor
- **THEN** el sistema no crea ningún registro, no incrementa ningún contador, y la siguiente compra válida recibe el código que le tocaba

#### Scenario: Dos altas simultáneas

- **WHEN** dos usuarios guardan una compra en el mismo instante
- **THEN** cada uno recibe un código distinto y consecutivo, sin huecos ni duplicados

### Requirement: Representación exacta del dinero

El sistema SHALL almacenar todo importe monetario como un número entero de unidades menores (centavos) acompañado de su moneda, y SHALL realizar toda suma, resta y conversión sobre enteros. El sistema MUST NOT almacenar importes como número de punto flotante decimal.

#### Scenario: Suma de componentes sin error de redondeo

- **WHEN** se suman ocho componentes de costo cuyos valores decimales producirían error de punto flotante
- **THEN** el total resultante es exacto al centavo

#### Scenario: Importe recibido del formulario

- **WHEN** el usuario captura `12,345.67` en un campo de importe
- **THEN** el sistema lo persiste como `1234567` junto con el código de moneda

### Requirement: Transacción monomoneda con tipo de cambio congelado

Cada transacción SHALL registrarse en una sola moneda (`USD` o `MXN`) y SHALL guardar el `exchangeRate` vigente al momento de la captura, expresado como MXN por 1 USD. Cuando la moneda es `USD`, el `exchangeRate` SHALL ser exactamente `1`. Un cambio posterior del tipo de cambio del mercado MUST NOT alterar transacciones ya registradas.

#### Scenario: Transacción en USD

- **WHEN** el usuario elige moneda `USD`
- **THEN** el campo de tipo de cambio queda fijo en `1` y no es editable

#### Scenario: Transacción en MXN

- **WHEN** el usuario elige moneda `MXN` y captura un tipo de cambio de `18.50`
- **THEN** el sistema guarda el importe original en MXN y calcula el equivalente en USD dividiendo entre `18.50`

#### Scenario: Tipo de cambio inválido

- **WHEN** el usuario intenta guardar una transacción en MXN con tipo de cambio `0` o negativo
- **THEN** el sistema rechaza el guardado e indica que el tipo de cambio debe ser mayor que cero

#### Scenario: Operación con dos monedas

- **WHEN** una misma adquisición involucra pagos en USD y en MXN
- **THEN** se registran como transacciones separadas del mismo vehículo, cada una monomoneda

### Requirement: Anulación en lugar de borrado

El sistema SHALL conservar de forma permanente todo registro transaccional creado. Para revertir una transacción, el sistema SHALL marcarla como anulada registrando fecha, autor y motivo; una transacción anulada SHALL contar como cero en todo cálculo agregado y SHALL seguir siendo consultable. El sistema MUST NOT ofrecer borrado físico de registros transaccionales.

#### Scenario: Anulación de una compra

- **WHEN** un administrador anula la compra `PUR-0007` indicando un motivo
- **THEN** la compra sigue apareciendo en la consulta marcada como anulada, con su motivo y autor, y el costo acumulado del vehículo se reduce en el importe de esa compra

#### Scenario: Corrección de una transacción

- **WHEN** un administrador corrige una compra capturada con un importe equivocado
- **THEN** el sistema anula la compra original y crea una nueva de tipo `Correction`, quedando ambas en el historial

#### Scenario: Anulación sin motivo

- **WHEN** un administrador intenta anular una transacción sin indicar motivo
- **THEN** el sistema rechaza la operación

### Requirement: Tipo de transacción y control de signo

Toda transacción SHALL declarar un tipo entre `Initial`, `Adjustment`, `Correction` y `Related`. El sistema SHALL aceptar importes negativos únicamente cuando el tipo es `Adjustment`, y SHALL rechazar importes negativos en los demás tipos.

#### Scenario: Ajuste negativo aceptado

- **WHEN** un usuario registra una transacción de tipo `Adjustment` con importe negativo
- **THEN** el sistema la acepta

#### Scenario: Inicial negativa rechazada

- **WHEN** un usuario registra una transacción de tipo `Initial` con un componente de costo negativo
- **THEN** el sistema rechaza el guardado e indica qué campo es inválido

### Requirement: Frontera de costos

El sistema SHALL clasificar cada costo asociado a un vehículo en exactamente una de tres categorías: adquisición (compras), reacondicionamiento previo a la venta (reparaciones) y todo lo demás (gastos). El sistema MUST NOT permitir que el mismo comprobante quede registrado en más de una categoría.

#### Scenario: Comprobante duplicado entre categorías

- **WHEN** un usuario intenta registrar como gasto un comprobante ya registrado como reparación del mismo vehículo
- **THEN** el sistema advierte del duplicado y rechaza el guardado

#### Scenario: Costo acumulado de un vehículo

- **WHEN** se consulta el costo acumulado de un vehículo
- **THEN** el resultado es la suma en USD de sus compras, reparaciones y gastos no anulados, sin duplicar ningún importe

### Requirement: Trazabilidad de las escrituras

Toda creación, modificación y anulación SHALL quedar registrada con el usuario que la ejecutó y la marca de tiempo del servidor. El sistema SHALL conservar ese registro aunque el usuario responsable sea posteriormente desactivado.

#### Scenario: Autoría de una alta

- **WHEN** un capturista da de alta un vehículo
- **THEN** el registro guarda quién lo creó y cuándo, con la hora del servidor

#### Scenario: Usuario desactivado

- **WHEN** se desactiva la cuenta del capturista que creó un registro
- **THEN** el registro sigue mostrando su autoría
