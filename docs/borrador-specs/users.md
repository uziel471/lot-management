# Users Specification

## Purpose

Define quiénes pueden operar el sistema, con qué rol, y cómo un administrador da de alta, ajusta y retira el acceso de las personas que trabajan en el lote. El objetivo operativo es que un capturista pueda registrar toda la operación diaria sin poder alterar historia ni ver la administración del sistema.

## Requirements

### Requirement: Tres roles con permisos delimitados

El sistema SHALL definir exactamente tres roles: `admin`, `capturista` y `lectura`. Cada usuario SHALL tener exactamente un rol. Los permisos SHALL ser: `admin` administra usuarios, catálogos, altas y anulaciones; `capturista` crea vehículos, compras y entradas de catálogo pero MUST NOT anular ni administrar usuarios; `lectura` consulta y exporta pero MUST NOT escribir nada.

#### Scenario: Capturista intenta anular

- **WHEN** un capturista intenta anular una compra
- **THEN** el sistema rechaza la operación por falta de permisos y la compra queda intacta

#### Scenario: Lectura intenta crear

- **WHEN** un usuario con rol `lectura` envía el formulario de alta de vehículo
- **THEN** el sistema rechaza la operación y no crea ningún registro

#### Scenario: Capturista opera con normalidad

- **WHEN** un capturista da de alta un vendor, un vehículo y una compra que lo referencia
- **THEN** las tres operaciones se completan correctamente

### Requirement: Alta de usuarios por administrador

El sistema SHALL permitir únicamente a un `admin` crear usuarios, indicando nombre, correo electrónico y rol. El correo electrónico SHALL ser único. El sistema MUST NOT ofrecer registro público ni autoservicio.

#### Scenario: Alta correcta

- **WHEN** un administrador crea un usuario con un correo no registrado
- **THEN** el usuario queda creado con el rol indicado y en estado activo

#### Scenario: Correo duplicado

- **WHEN** un administrador intenta crear un usuario con un correo que ya existe
- **THEN** el sistema rechaza el alta indicando que el correo ya está en uso

#### Scenario: Intento de registro público

- **WHEN** una persona sin sesión intenta acceder a una ruta de registro
- **THEN** el sistema responde que la ruta no existe

### Requirement: Desactivación en lugar de borrado

El sistema SHALL permitir a un `admin` desactivar un usuario. Un usuario desactivado MUST NOT poder iniciar sesión y sus sesiones activas SHALL ser revocadas. El sistema SHALL conservar el registro del usuario para preservar la autoría de los datos que creó, y MUST NOT ofrecer su borrado físico.

#### Scenario: Desactivación de un capturista

- **WHEN** un administrador desactiva a un capturista
- **THEN** sus sesiones se revocan, no puede volver a entrar, y los registros que creó siguen mostrando su nombre como autor

#### Scenario: Reactivación

- **WHEN** un administrador reactiva a un usuario previamente desactivado
- **THEN** el usuario puede iniciar sesión de nuevo con su mismo rol

### Requirement: Existencia garantizada de un administrador

El sistema SHALL impedir que quede sin ningún usuario `admin` activo. Un administrador MUST NOT poder desactivar su propia cuenta ni degradar su propio rol si es el último `admin` activo.

#### Scenario: Último administrador intenta degradarse

- **WHEN** el único `admin` activo intenta cambiar su rol a `capturista`
- **THEN** el sistema rechaza el cambio e indica que debe existir al menos un administrador activo

#### Scenario: Cambio válido con dos administradores

- **WHEN** existen dos administradores activos y uno cambia su rol a `capturista`
- **THEN** el cambio se aplica

### Requirement: Cambio de contraseña

El sistema SHALL permitir a cada usuario cambiar su propia contraseña confirmando la actual, y a un `admin` restablecer la contraseña de cualquier usuario. Un cambio de contraseña SHALL revocar las demás sesiones activas de ese usuario.

#### Scenario: Cambio propio

- **WHEN** un usuario cambia su contraseña indicando correctamente la actual
- **THEN** la contraseña se actualiza y sus otras sesiones quedan revocadas

#### Scenario: Contraseña actual incorrecta

- **WHEN** un usuario intenta cambiar su contraseña indicando mal la actual
- **THEN** el sistema rechaza el cambio
