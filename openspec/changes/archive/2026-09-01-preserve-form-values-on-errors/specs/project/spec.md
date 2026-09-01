## MODIFIED Requirements

### Requirement: Resultado explicito de las operaciones de escritura

Toda operacion de escritura SHALL devolver un resultado explicito que indique exito o error. Un error de validacion SHALL identificar los campos afectados con un mensaje comprensible para el usuario. Cuando el error provenga de un formulario recuperable, el resultado SHALL incluir los valores enviados necesarios para que la interfaz preserve la captura del usuario. El sistema MUST NOT enviar al navegador trazas de excepcion, mensajes del motor de base de datos ni ningun otro detalle interno.

#### Scenario: Error de validacion

- **WHEN** una operacion de escritura recibe datos que no cumplen su esquema
- **THEN** devuelve un error que senala que campos fallaron y por que, conserva los valores enviados del formulario recuperable, y no escribe nada

#### Scenario: Falla inesperada del servidor

- **WHEN** una operacion de escritura falla por un problema de infraestructura
- **THEN** el usuario recibe un mensaje generico de error, el detalle tecnico queda solo en el registro del servidor, y no se escribe nada parcialmente

#### Scenario: Operacion exitosa

- **WHEN** una operacion de escritura se completa
- **THEN** devuelve un resultado de exito con los datos que la vista necesita, y la vista afectada refleja el cambio sin recargar la pagina manualmente

#### Scenario: Formulario preserva captura tras error

- **WHEN** un usuario envia un formulario de escritura y la operacion devuelve un error recuperable
- **THEN** la interfaz mantiene visibles los textos, fechas, selects, checkboxes, moneda, tipo de cambio, importes y filas dinamicas que el usuario habia capturado antes del envio

#### Scenario: Defaults de negocio despues de error

- **WHEN** un formulario recuperable no recibe un valor capturado para un campo con default de negocio
- **THEN** la interfaz restaura el default definido para ese formulario sin sobrescribir otros valores que el usuario si envio

#### Scenario: Campo deshabilitado requerido

- **WHEN** un formulario muestra un campo requerido como no editable por una regla de negocio
- **THEN** el valor canonico requerido viaja en el envio y se conserva tras errores recuperables
