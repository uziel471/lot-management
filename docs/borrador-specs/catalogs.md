# Catalogs Specification

## Purpose

Define el comportamiento común de las listas de referencia del sistema —marcas, modelos, estatus de vehículo y proveedores— que alimentan los desplegables de captura. Su regla central es que una entrada de catálogo nunca desaparece: se retira, para que los registros históricos que la referencian sigan siendo legibles.

## Requirements

### Requirement: Catálogos administrados por el sistema

El sistema SHALL administrar cuatro catálogos: marcas (`MAKE`), modelos (`MODEL`), estatus de vehículo (`STATUS`) y proveedores (`VEND`). Cada entrada SHALL tener un `code` legible único, un nombre y un estado activo/inactivo. Los nombres SHALL ser únicos dentro de su catálogo, sin distinguir mayúsculas ni espacios sobrantes.

#### Scenario: Alta de marca

- **WHEN** un usuario autorizado da de alta la marca "Toyota"
- **THEN** la marca queda creada con `code = "MAKE-0012"` y en estado activo

#### Scenario: Nombre duplicado

- **WHEN** un usuario intenta dar de alta la marca "  toyota " existiendo ya "Toyota"
- **THEN** el sistema rechaza el alta indicando que esa marca ya existe

### Requirement: Retiro sin borrado

El sistema SHALL permitir desactivar una entrada de catálogo, y MUST NOT ofrecer su borrado. Una entrada desactivada MUST NOT aparecer en los desplegables de captura de registros nuevos, y SHALL seguir mostrándose correctamente en los registros históricos que la referencian.

#### Scenario: Proveedor retirado

- **WHEN** un administrador desactiva el proveedor `VEND-0004`
- **THEN** ese proveedor ya no aparece al capturar una compra nueva, pero las compras anteriores siguen mostrando su nombre

#### Scenario: Reactivación

- **WHEN** un administrador reactiva una entrada de catálogo desactivada
- **THEN** vuelve a aparecer en los desplegables de captura

#### Scenario: Código no reutilizable

- **WHEN** se da de alta una entrada nueva después de haber desactivado otra
- **THEN** la nueva recibe el siguiente código de la secuencia, nunca el de la desactivada

### Requirement: Modelo dependiente de marca

Cada modelo SHALL pertenecer a exactamente una marca. El sistema SHALL ofrecer, al capturar un vehículo, únicamente los modelos activos de la marca seleccionada. El sistema MUST NOT permitir crear un modelo sin marca ni asociado a una marca inactiva.

#### Scenario: Desplegable dependiente

- **WHEN** el usuario selecciona la marca "Toyota" en el formulario de vehículo
- **THEN** el desplegable de modelo muestra solo los modelos activos de Toyota

#### Scenario: Cambio de marca en el formulario

- **WHEN** el usuario cambia la marca después de haber elegido un modelo
- **THEN** el modelo seleccionado se limpia y el desplegable se recarga con los modelos de la nueva marca

#### Scenario: Modelo bajo marca inactiva

- **WHEN** un usuario intenta crear un modelo bajo una marca desactivada
- **THEN** el sistema rechaza el alta

### Requirement: Integridad referencial de los catálogos

El sistema SHALL rechazar cualquier registro que referencie una entrada de catálogo inexistente. Al crear un registro nuevo, el sistema SHALL exigir además que la entrada referenciada esté activa.

#### Scenario: Referencia inexistente

- **WHEN** llega una operación que referencia un proveedor que no existe
- **THEN** el sistema rechaza la operación sin escribir nada

#### Scenario: Referencia a entrada inactiva en alta nueva

- **WHEN** un usuario intenta registrar una compra con un proveedor desactivado
- **THEN** el sistema rechaza el guardado indicando que el proveedor no está activo
