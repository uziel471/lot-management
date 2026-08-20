## Purpose

Define quiénes pueden operar el sistema, con qué rol, y cómo un administrador da de alta, ajusta y retira el acceso de las personas que trabajan en el lote. El objetivo operativo es que un capturista pueda registrar toda la operación diaria sin poder alterar historia ni ver la administración del sistema.

## Requirements

### Requirement: Tres roles con permisos delimitados

El sistema SHALL definir exactamente tres roles: `admin`, `capturista` y `lectura`. Cada usuario SHALL tener exactamente un rol. Los permisos SHALL ser: `admin` administra usuarios, catálogos, altas y anulaciones; `capturista` crea registros de operación pero MUST NOT anular ni administrar usuarios; `lectura` consulta y exporta pero MUST NOT escribir nada.

#### Scenario: Capturista intenta una operación de administrador

- **WHEN** un capturista invoca una operación reservada a `admin`
- **THEN** el sistema la rechaza por falta de permisos y no modifica ningún dato

#### Scenario: Lectura intenta escribir

- **WHEN** un usuario con rol `lectura` invoca cualquier operación de escritura
- **THEN** el sistema la rechaza y no crea ningún registro

#### Scenario: Capturista opera con normalidad

- **WHEN** un capturista invoca una operación de alta permitida a su rol
- **THEN** la operación se completa correctamente

#### Scenario: Navegación acorde al rol

- **WHEN** un capturista abre el panel
- **THEN** el menú no ofrece las secciones reservadas a `admin`

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

### Requirement: Primer administrador del sistema

El sistema SHALL ofrecer un procedimiento fuera de la interfaz para crear el primer usuario `admin` sobre una base de datos vacía. Ese procedimiento SHALL ser idempotente y MUST NOT crear un segundo administrador si ya existe alguno.

#### Scenario: Base de datos vacía

- **WHEN** se ejecuta el procedimiento de alta inicial sobre una base sin usuarios
- **THEN** queda creado un usuario `admin` activo que puede iniciar sesión

#### Scenario: Ejecución repetida

- **WHEN** se ejecuta el procedimiento de alta inicial una segunda vez
- **THEN** no se crea ningún usuario nuevo y se informa que ya existe un administrador

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

#### Scenario: Restablecimiento por administrador

- **WHEN** un administrador restablece la contraseña de un capturista que la olvidó
- **THEN** el capturista puede entrar con la nueva contraseña y sus sesiones anteriores quedan revocadas
