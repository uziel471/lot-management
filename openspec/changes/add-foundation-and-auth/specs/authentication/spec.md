## Purpose

Define cómo una persona demuestra su identidad ante el sistema, cómo se mantiene y termina su sesión, y qué garantías de acceso tienen las rutas y los datos. El sistema es privado: no existe contenido operativo accesible sin sesión válida.

## ADDED Requirements

### Requirement: Acceso restringido a usuarios con sesión válida

El sistema SHALL exigir una sesión válida para toda ruta, consulta y operación de escritura que no sea el propio inicio de sesión. Una petición sin sesión válida SHALL ser redirigida a la pantalla de inicio de sesión sin revelar la existencia ni el contenido del recurso solicitado.

#### Scenario: Visitante anónimo

- **WHEN** una persona sin sesión abre `/dashboard`
- **THEN** el sistema la redirige a `/login` y no ejecuta ninguna consulta a la base de datos

#### Scenario: Retorno a la ruta solicitada

- **WHEN** una persona sin sesión abre una ruta privada y luego inicia sesión correctamente
- **THEN** el sistema la lleva a la ruta que había solicitado

#### Scenario: Cookie manipulada

- **WHEN** llega una petición con una cookie de sesión inválida o expirada
- **THEN** el sistema la trata como anónima y la redirige a `/login`

### Requirement: Inicio de sesión con credenciales

El sistema SHALL permitir iniciar sesión con correo electrónico y contraseña. Ante credenciales incorrectas, el sistema SHALL responder con un mensaje genérico que no distinga entre correo inexistente y contraseña equivocada. El sistema SHALL almacenar las contraseñas únicamente como hash con sal, y MUST NOT registrarlas en logs ni devolverlas en ninguna respuesta.

#### Scenario: Credenciales correctas

- **WHEN** un usuario activo envía su correo y contraseña correctos
- **THEN** el sistema crea una sesión y lo lleva al panel

#### Scenario: Contraseña incorrecta

- **WHEN** un usuario envía una contraseña incorrecta
- **THEN** el sistema responde "Correo o contraseña incorrectos" sin indicar cuál de los dos falló

#### Scenario: Correo no registrado

- **WHEN** alguien envía un correo que no existe en el sistema
- **THEN** el sistema responde el mismo mensaje genérico y en un tiempo comparable al del caso anterior

#### Scenario: Usuario desactivado

- **WHEN** un usuario desactivado envía credenciales correctas
- **THEN** el sistema rechaza el inicio de sesión

### Requirement: Sesión revocable del lado del servidor

El sistema SHALL persistir las sesiones activas en la base de datos, de forma que un administrador pueda revocarlas. Una sesión revocada SHALL dejar de ser válida en la siguiente petición del usuario, sin esperar a su expiración natural.

#### Scenario: Revocación inmediata

- **WHEN** un administrador revoca la sesión de un capturista que está trabajando
- **THEN** la siguiente acción de ese capturista es rechazada y se le redirige a `/login`

#### Scenario: Cierre de sesión

- **WHEN** un usuario cierra sesión
- **THEN** el sistema elimina la sesión del servidor y borra la cookie del navegador

#### Scenario: Expiración

- **WHEN** una sesión supera su tiempo de vida configurado sin actividad
- **THEN** deja de ser válida y el usuario debe autenticarse de nuevo

### Requirement: Autorización verificada junto a los datos

El sistema SHALL verificar los permisos del usuario en la capa que accede a los datos, inmediatamente antes de leer o escribir. Los controles ejecutados en la capa de ruteo SHALL considerarse únicamente una optimización de la experiencia de usuario y MUST NOT ser la única barrera que protege un recurso.

#### Scenario: Acceso directo a una operación protegida

- **WHEN** un usuario con rol `lectura` invoca directamente una operación de escritura, evitando la interfaz
- **THEN** la operación es rechazada por falta de permisos y no modifica ningún dato

#### Scenario: Sesión válida sin el rol requerido

- **WHEN** un capturista abre la pantalla de administración de usuarios
- **THEN** el sistema responde que no tiene autorización y no expone ningún dato de otros usuarios

### Requirement: Protección de datos hacia el cliente

Las consultas SHALL devolver únicamente los campos necesarios para la vista solicitada. El sistema MUST NOT enviar al navegador hashes de contraseña, tokens de sesión ni documentos internos completos de la base de datos.

#### Scenario: Datos del usuario en el encabezado

- **WHEN** se renderiza el encabezado con el usuario en sesión
- **THEN** el cliente recibe solo su nombre, correo y rol
