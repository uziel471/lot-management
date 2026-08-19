# Vehicles Specification

## Purpose

Define el registro de las unidades del lote: cómo se da de alta un vehículo, qué lo identifica de forma única, cómo avanza su estatus desde que entra al inventario hasta que se vende, y qué información de costo acumulado expone. El vehículo es el eje al que se cuelgan compras, reparaciones, gastos y ventas.

## Requirements

### Requirement: Alta de vehículo

El sistema SHALL permitir a un usuario autorizado registrar un vehículo indicando marca, modelo, año, VIN, estatus inicial y fecha de ingreso al inventario. El sistema SHALL asignar un `code` con forma `VEH-####` al crearlo. Marca, modelo, año y estatus SHALL ser obligatorios.

#### Scenario: Alta completa

- **WHEN** un capturista registra un vehículo con todos los campos obligatorios
- **THEN** el vehículo queda creado con `code = "VEH-0001"` y aparece en el inventario

#### Scenario: Campo obligatorio vacío

- **WHEN** un capturista envía el formulario sin año
- **THEN** el sistema rechaza el guardado, señala el campo faltante y no consume el código

#### Scenario: Modelo que no pertenece a la marca

- **WHEN** llega una operación con un modelo que no pertenece a la marca indicada
- **THEN** el sistema rechaza el guardado

### Requirement: VIN único cuando se captura

El VIN SHALL ser opcional al dar de alta, pero cuando se captura SHALL ser único en todo el inventario y SHALL normalizarse a mayúsculas sin espacios. El sistema SHALL validar que tenga 17 caracteres alfanuméricos, excluyendo las letras I, O y Q.

#### Scenario: VIN duplicado

- **WHEN** un capturista registra un vehículo con un VIN que ya existe en otro vehículo
- **THEN** el sistema rechaza el guardado indicando cuál es el vehículo que ya usa ese VIN

#### Scenario: VIN con formato inválido

- **WHEN** un capturista captura un VIN de 15 caracteres
- **THEN** el sistema rechaza el guardado indicando el formato esperado

#### Scenario: Alta sin VIN

- **WHEN** un capturista registra un vehículo dejando el VIN vacío
- **THEN** el alta se completa y el VIN puede capturarse después

### Requirement: Estatus del vehículo

Todo vehículo SHALL tener en todo momento exactamente un estatus tomado del catálogo de estatus. El sistema SHALL registrar cada cambio de estatus con autor y fecha, y SHALL conservar ese historial.

#### Scenario: Cambio de estatus

- **WHEN** un capturista cambia el estatus de un vehículo de "En reacondicionamiento" a "Disponible"
- **THEN** el vehículo queda con el nuevo estatus y el cambio aparece en su historial con autor y fecha

#### Scenario: Historial visible

- **WHEN** un usuario abre el detalle de un vehículo
- **THEN** puede ver la secuencia de estatus por los que ha pasado

### Requirement: Días en inventario

El sistema SHALL calcular los días en inventario de un vehículo como la diferencia entre su fecha de ingreso y la fecha actual, o su fecha de venta si ya fue vendido. Ese valor SHALL calcularse al consultar y MUST NOT almacenarse.

#### Scenario: Vehículo en inventario

- **WHEN** se consulta un vehículo ingresado hace 30 días y aún no vendido
- **THEN** el sistema muestra 30 días en inventario

#### Scenario: Vehículo vendido

- **WHEN** se consulta un vehículo que ingresó el día 1 y se vendió el día 45
- **THEN** el sistema muestra 45 días en inventario y ese valor deja de crecer

### Requirement: Costo acumulado por vehículo

El sistema SHALL exponer, para cada vehículo, el costo acumulado en USD como la suma de sus compras, reparaciones y gastos no anulados. El desglose SHALL mostrarse por categoría, y SHALL calcularse a partir de las transacciones, sin depender de ningún total almacenado.

#### Scenario: Desglose de costo

- **WHEN** un usuario abre el detalle de un vehículo con dos compras y una reparación
- **THEN** ve el total en USD y su desglose en adquisición, reacondicionamiento y gastos

#### Scenario: Efecto de una anulación

- **WHEN** se anula una de las compras de ese vehículo
- **THEN** el costo acumulado se recalcula sin ella la próxima vez que se consulta

#### Scenario: Transacciones en dos monedas

- **WHEN** un vehículo tiene una compra en USD y una reparación en MXN
- **THEN** el total en USD suma la compra tal cual y la reparación convertida con el tipo de cambio congelado en ella

### Requirement: Consulta de inventario

El sistema SHALL ofrecer un listado de vehículos filtrable por estatus, marca y rango de fecha de ingreso, y buscable por `code` o VIN. El listado SHALL mostrar por cada vehículo su `code`, descripción, estatus, días en inventario y costo acumulado.

#### Scenario: Filtro por estatus

- **WHEN** un usuario filtra el inventario por estatus "Disponible"
- **THEN** el listado muestra solo los vehículos con ese estatus

#### Scenario: Búsqueda por VIN parcial

- **WHEN** un usuario busca los últimos seis caracteres de un VIN
- **THEN** el listado muestra el vehículo correspondiente
