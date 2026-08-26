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

### Requirement: Usuarios mantiene frontera con Cuenta
El modulo de Usuarios SHALL conservar la administracion de otros usuarios como una capacidad exclusiva de `admin`, mientras Cuenta SHALL manejar la experiencia de autoservicio del usuario autenticado. Usuarios MUST NOT duplicar la pantalla de perfil propio ni convertir el cambio propio de contrasena en una accion de administracion de usuarios.

#### Scenario: Administrador abre Usuarios
- **WHEN** un `admin` abre Usuarios
- **THEN** la pantalla ofrece administracion de otros usuarios sin presentar Cuenta como parte de la lista administrativa

#### Scenario: Usuario cambia su propia contrasena
- **WHEN** cualquier usuario autenticado necesita cambiar su propia contrasena
- **THEN** el camino de la interfaz lo lleva a Cuenta y no al restablecimiento administrado de Usuarios

### Requirement: Experiencia operacional de administracion de usuarios

El sistema SHALL presentar la administracion de usuarios como una pantalla compacta alineada al sistema de diseno compartido, con encabezado de pagina estandar, accion primaria para crear usuario visible solo a roles autorizados, busqueda o filtros compactos, resumen de resultados, tabla escaneable, estado activo/inactivo, rol, acciones por fila, estados vacios, estado sin resultados filtrados y opcion clara para restablecer filtros. La experiencia MUST preservar las reglas existentes de roles, permisos, unicidad de correo, desactivacion sin borrado y ausencia de registro publico.

#### Scenario: Administrador consulta usuarios

- **WHEN** un administrador abre la administracion de usuarios
- **THEN** la pantalla muestra una lista escaneable con nombre, correo, rol, estado, acciones autorizadas y controles compactos para buscar o filtrar usuarios

#### Scenario: Lista filtrada sin resultados

- **WHEN** un administrador aplica busqueda o filtros que no coinciden con ningun usuario
- **THEN** el sistema muestra un estado sin resultados filtrados y ofrece restablecer la lista al estado predeterminado

#### Scenario: Acciones visibles segun rol

- **WHEN** un usuario abre una pantalla relacionada con usuarios
- **THEN** la interfaz muestra acciones de administracion solo a `admin`, sin cambiar la verificacion de permisos de la operacion

#### Scenario: Usuarios en viewport reducido

- **WHEN** un administrador abre la lista de usuarios en un viewport estrecho
- **THEN** nombre, correo, rol, estado y acciones principales siguen siendo consultables y operables sin perder el contexto de seguridad

### Requirement: Formularios enfocados de usuario

El sistema SHALL presentar formularios de alta y edicion de usuarios con campos claros para nombre, correo electronico, rol y estado cuando aplique, con campos obligatorios visibles, validacion por campo, errores de formulario cuando aplique, acciones guardar/cancelar, estado pendiente de guardado y feedback de exito o falla. Los formularios MUST NOT ofrecer registro publico ni autoservicio de alta, y MUST preserve que solo un `admin` puede crear o administrar usuarios.

#### Scenario: Alta de usuario con validacion visible

- **WHEN** un administrador intenta crear un usuario con datos faltantes, correo invalido o correo duplicado
- **THEN** el sistema muestra errores junto a los campos correspondientes, no crea el usuario y conserva al administrador en el formulario

#### Scenario: Alta pendiente

- **WHEN** un administrador envia un formulario valido de alta de usuario
- **THEN** la accion de guardado comunica el estado pendiente y evita interacciones duplicadas mientras la operacion esta en curso

#### Scenario: Edicion de rol con consecuencia visible

- **WHEN** un administrador edita el rol de un usuario
- **THEN** la interfaz identifica el rol seleccionado y comunica su efecto operativo sin agregar roles ni modificar permisos existentes

#### Scenario: Registro publico ausente

- **WHEN** una persona sin sesion busca una accion de registro o alta publica
- **THEN** la interfaz no ofrece un camino de registro publico

### Requirement: Flujos protegidos de activacion y desactivacion

El sistema SHALL presentar la desactivacion, reactivacion y cambio de estado de usuarios con tratamiento visual de estado, confirmacion cuando la accion retire acceso, feedback del resultado y mensajes claros para restricciones de seguridad. La interfaz MUST NOT ofrecer borrado fisico de usuarios y MUST preserve las reglas que revocan sesiones al desactivar, conservan autoria historica e impiden dejar el sistema sin un `admin` activo.

#### Scenario: Usuario inactivo distinguible

- **WHEN** un administrador consulta usuarios inactivos
- **THEN** la tabla distingue visualmente su estado, conserva visible su identidad y permite entender que no puede iniciar sesion mientras este inactivo

#### Scenario: Confirmacion de desactivacion

- **WHEN** un administrador solicita desactivar un usuario activo
- **THEN** el sistema pide confirmacion antes de ejecutar la operacion y comunica que el usuario perdera acceso

#### Scenario: Restriccion del ultimo administrador

- **WHEN** un administrador intenta desactivar o degradar al ultimo `admin` activo desde la interfaz
- **THEN** el sistema bloquea o rechaza la accion con un mensaje claro de que debe existir al menos un administrador activo

#### Scenario: Sin accion de borrado

- **WHEN** cualquier usuario autorizado abre acciones sobre un usuario
- **THEN** la interfaz no ofrece borrar fisicamente el usuario

### Requirement: Restablecimiento de contrasena administrado

El sistema SHALL presentar el restablecimiento de contrasena por administrador como una accion protegida y claramente separada de la edicion general del usuario, con confirmacion o formulario enfocado, validacion visible, estado pendiente, feedback del resultado y comunicacion de que las sesiones anteriores del usuario seran revocadas. La experiencia MUST preserve que cada usuario solo cambia su propia contrasena confirmando la actual y que un `admin` puede restablecer la de cualquier usuario.

#### Scenario: Administrador restablece contrasena

- **WHEN** un administrador abre el restablecimiento de contrasena para un usuario
- **THEN** la interfaz presenta una accion enfocada que identifica al usuario afectado y comunica que las sesiones previas se revocaran

#### Scenario: Restablecimiento con validacion visible

- **WHEN** un administrador intenta restablecer una contrasena con datos invalidos
- **THEN** el sistema muestra errores de validacion y no cambia la contrasena

#### Scenario: Restablecimiento completado

- **WHEN** un administrador completa correctamente el restablecimiento de contrasena
- **THEN** el sistema muestra feedback de exito y el usuario afectado puede iniciar sesion con la nueva contrasena mientras sus sesiones anteriores quedan revocadas

### Requirement: Usuarios sigue patrones compartidos

El modulo de Usuarios SHALL aplicar `docs/design-system/UI_GUIDELINES.md` y patrones compartidos para composicion de pagina, tablas, filtros, formularios, estados, acciones protegidas, confirmaciones, validacion, loading, empty states, feedback y comportamiento responsive. El modulo MUST NOT introducir un sistema visual especifico de usuarios cuando exista un patron compartido aplicable.

#### Scenario: Sistema de diseno aplicado

- **WHEN** se implementa el rediseno del modulo de Usuarios
- **THEN** sus listas, formularios, acciones de estado, restablecimiento de contrasena, validacion, empty states, loading states y feedback aplican las guias compartidas

#### Scenario: Patron faltante se vuelve compartido

- **WHEN** el rediseno de Usuarios necesita un patron reusable de administracion de acceso que aun no existe
- **THEN** el patron se define o ajusta como comportamiento compartido antes de usarse como solucion exclusiva de usuarios
