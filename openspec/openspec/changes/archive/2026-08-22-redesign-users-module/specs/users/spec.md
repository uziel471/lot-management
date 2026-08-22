## ADDED Requirements

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
