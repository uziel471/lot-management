## MODIFIED Requirements

### Requirement: Cambio de contraseña
El sistema SHALL permitir a cada usuario cambiar su propia contraseña desde Cuenta confirmando la actual, y a un `admin` restablecer la contraseña de cualquier usuario desde Usuarios. Un cambio de contraseña SHALL revocar las demás sesiones activas de ese usuario.

#### Scenario: Cambio propio

- **WHEN** un usuario cambia su contraseña desde Cuenta indicando correctamente la actual
- **THEN** la contraseña se actualiza y sus otras sesiones quedan revocadas

#### Scenario: Contraseña actual incorrecta

- **WHEN** un usuario intenta cambiar su contraseña desde Cuenta indicando mal la actual
- **THEN** el sistema rechaza el cambio

#### Scenario: Restablecimiento por administrador

- **WHEN** un administrador restablece la contraseña de un capturista desde Usuarios
- **THEN** el capturista puede entrar con la nueva contraseña y sus sesiones anteriores quedan revocadas
## ADDED Requirements

### Requirement: Usuarios mantiene frontera con Cuenta
El modulo de Usuarios SHALL conservar la administracion de otros usuarios como una capacidad exclusiva de `admin`, mientras Cuenta SHALL manejar la experiencia de autoservicio del usuario autenticado. Usuarios MUST NOT duplicar la pantalla de perfil propio ni convertir el cambio propio de contrasena en una accion de administracion de usuarios.

#### Scenario: Administrador abre Usuarios
- **WHEN** un `admin` abre Usuarios
- **THEN** la pantalla ofrece administracion de otros usuarios sin presentar Cuenta como parte de la lista administrativa

#### Scenario: Usuario cambia su propia contrasena
- **WHEN** cualquier usuario autenticado necesita cambiar su propia contrasena
- **THEN** el camino de la interfaz lo lleva a Cuenta y no al restablecimiento administrado de Usuarios
