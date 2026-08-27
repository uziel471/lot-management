## Purpose

Define las reglas transversales que gobiernan todo el sistema de administración del lote: cómo se emiten los identificadores legibles, cómo se representa y convierte el dinero entre USD y MXN, qué garantiza el resultado de una operación de escritura, y cómo queda registrada la autoría de cada cambio. Cualquier capacidad nueva hereda estas reglas sin volver a declararlas.

## Requirements

### Requirement: Emisión de códigos legibles

El sistema SHALL emitir para cada registro un identificador legible con la forma `<PREFIJO>-<NNNN>`, único dentro de su colección e independiente de la clave técnica interna. La emisión SHALL ser atómica: dos solicitudes simultáneas del mismo prefijo SHALL recibir códigos distintos y consecutivos. El sistema MUST NOT reemitir un código ya entregado, aunque el registro que lo recibió haya sido anulado o desactivado.

#### Scenario: Primer código de una secuencia

- **WHEN** se solicita el primer código del prefijo `PUR`
- **THEN** se entrega `PUR-0001` y el contador de ese prefijo queda en 1

#### Scenario: Solicitudes simultáneas

- **WHEN** se solicitan cien códigos del mismo prefijo de forma concurrente
- **THEN** se entregan cien códigos distintos y consecutivos, sin huecos ni repeticiones

#### Scenario: Secuencias independientes

- **WHEN** se solicita un código del prefijo `VEH` después de haber emitido tres del prefijo `PUR`
- **THEN** se entrega `VEH-0001`, sin verse afectado por la otra secuencia

#### Scenario: El código se consume solo al persistir

- **WHEN** una operación de escritura falla su validación antes de llegar a la base de datos
- **THEN** no se solicita ningún código y la siguiente operación válida recibe el que le tocaba

### Requirement: Representación exacta del dinero

El sistema SHALL representar todo importe monetario como un número entero de unidades menores acompañado de su código de moneda, y SHALL realizar toda suma, resta y conversión sobre enteros. El sistema MUST NOT almacenar ni acumular importes como número de punto flotante decimal.

#### Scenario: Importe capturado por el usuario

- **WHEN** se recibe el importe `12,345.67` en moneda `USD`
- **THEN** se representa como `1234567` unidades menores con moneda `USD`

#### Scenario: Suma sin error de redondeo

- **WHEN** se suman ocho importes cuyos valores decimales producirían error de punto flotante al sumarse como decimales
- **THEN** el total es exacto al centavo

#### Scenario: Suma de monedas distintas

- **WHEN** se intenta sumar directamente un importe en `USD` con uno en `MXN`
- **THEN** la operación es rechazada por el sistema

### Requirement: Conversión bimoneda con tipo de cambio congelado

Todo importe SHALL registrarse en una sola moneda, `USD` o `MXN`, acompañado del tipo de cambio vigente al capturarlo, expresado como MXN por 1 USD y almacenado como decimal exacto. Cuando la moneda es `USD`, el tipo de cambio SHALL ser exactamente `1`. Un cambio posterior del tipo de cambio del mercado MUST NOT alterar ningún importe ya registrado. El sistema SHALL rechazar un tipo de cambio menor o igual a cero.

#### Scenario: Importe en USD

- **WHEN** se registra un importe en `USD`
- **THEN** el tipo de cambio queda en `1` y el equivalente en USD es igual al importe original

#### Scenario: Conversión desde MXN

- **WHEN** se registra `370,000.00 MXN` con tipo de cambio `18.50`
- **THEN** el equivalente en USD es `20,000.00`

#### Scenario: Tipo de cambio inválido

- **WHEN** se intenta registrar un importe en `MXN` con tipo de cambio `0` o negativo
- **THEN** el sistema rechaza la operación indicando que el tipo de cambio debe ser mayor que cero

#### Scenario: El tipo de cambio no se recalcula

- **WHEN** se consulta un importe registrado hace un mes con un tipo de cambio distinto al actual
- **THEN** su equivalente en USD sigue siendo el que resultó del tipo de cambio congelado en él

### Requirement: Resultado explícito de las operaciones de escritura

Toda operación de escritura SHALL devolver un resultado explícito que indique éxito o error. Un error de validación SHALL identificar los campos afectados con un mensaje comprensible para el usuario. El sistema MUST NOT enviar al navegador trazas de excepción, mensajes del motor de base de datos ni ningún otro detalle interno.

#### Scenario: Error de validación

- **WHEN** una operación de escritura recibe datos que no cumplen su esquema
- **THEN** devuelve un error que señala qué campos fallaron y por qué, y no escribe nada

#### Scenario: Falla inesperada del servidor

- **WHEN** una operación de escritura falla por un problema de infraestructura
- **THEN** el usuario recibe un mensaje genérico de error, el detalle técnico queda solo en el registro del servidor, y no se escribe nada parcialmente

#### Scenario: Operación exitosa

- **WHEN** una operación de escritura se completa
- **THEN** devuelve un resultado de éxito con los datos que la vista necesita, y la vista afectada refleja el cambio sin recargar la página manualmente

### Requirement: Trazabilidad de las escrituras

Toda creación, modificación y anulación SHALL quedar registrada con el usuario que la ejecutó y la marca de tiempo del servidor. El sistema MUST NOT tomar la fecha del reloj del navegador. La autoría SHALL conservarse aunque el usuario responsable sea posteriormente desactivado.

#### Scenario: Autoría de una escritura

- **WHEN** un usuario con sesión válida crea un registro
- **THEN** el registro guarda su identificador de usuario y la hora del servidor

#### Scenario: Usuario desactivado

- **WHEN** se desactiva la cuenta del usuario que creó un registro
- **THEN** el registro sigue mostrando su nombre como autor

#### Scenario: Escritura sin sesión

- **WHEN** llega una operación de escritura sin sesión válida
- **THEN** es rechazada y no se crea ningún registro sin autoría

### Requirement: Instalabilidad PWA basica

El sistema SHALL exponerse como una Progressive Web App instalable en navegadores compatibles mediante un Web App Manifest valido, iconos de aplicacion y metadata global de marca. La aplicacion SHALL abrir en modo `standalone` cuando el usuario la instale desde la pantalla de inicio o launcher. La instalabilidad basica MUST NOT introducir cache offline, sincronizacion offline, push notifications ni cambios de autenticacion en esta fase.

#### Scenario: Manifest disponible

- **WHEN** el navegador solicita el manifest de la aplicacion
- **THEN** recibe un manifest valido con nombre, nombre corto, descripcion, `start_url`, `scope`, `display`, color de tema, color de fondo e iconos requeridos

#### Scenario: Instalacion en pantalla de inicio

- **WHEN** un usuario abre la aplicacion en un navegador movil compatible y el navegador evalua los criterios de instalacion
- **THEN** la aplicacion se presenta como instalable con el nombre corto y el icono definidos por la marca

#### Scenario: Apertura standalone

- **WHEN** el usuario abre la aplicacion desde el icono instalado en el dispositivo
- **THEN** la aplicacion abre dentro del contexto standalone del navegador y conserva el flujo normal de autenticacion desde `/`

#### Scenario: Sin offline en esta fase

- **WHEN** el dispositivo pierde conexion
- **THEN** el sistema no promete captura, consulta ni sincronizacion offline como parte de esta capacidad

### Requirement: Identidad de aplicacion

El sistema SHALL tener metadata global propia para la aplicacion del lote, reemplazando cualquier titulo o descripcion genericos de plantilla. La metadata SHALL incluir un nombre final seleccionado, descripcion operativa, nombre de aplicacion y configuracion compatible con instalacion en dispositivos Apple cuando aplique.

#### Scenario: Metadata de plantilla reemplazada

- **WHEN** se inspecciona el head de la aplicacion
- **THEN** no aparecen titulo ni descripcion genericos de Create Next App

#### Scenario: Nombre corto legible

- **WHEN** el usuario instala la aplicacion en un dispositivo movil
- **THEN** el launcher muestra un nombre corto que cabe razonablemente debajo del icono y permite reconocer la app del lote

#### Scenario: Flujo de autenticacion conservado

- **WHEN** un usuario sin sesion abre la app instalada
- **THEN** llega al mismo flujo de autenticacion que tendria entrando desde el navegador a la raiz

### Requirement: Icono original de marca

El sistema SHALL incluir un icono original y representativo de la administracion de lote vehicular. El icono SHALL tener una fuente SVG editable, SHALL evitar texto embebido, SHALL ser legible en tamanos pequenos y SHALL contar con derivados raster suficientes para manifest PWA y Apple touch icon.

#### Scenario: Fuente SVG editable

- **WHEN** un desarrollador necesita ajustar el icono
- **THEN** encuentra un SVG canonico en el repositorio con formas vectoriales editables y sin depender de assets externos

#### Scenario: Iconos PWA rasterizados

- **WHEN** el manifest lista los iconos de instalacion
- **THEN** referencia derivados PNG de 192x192 y 512x512 generados desde la fuente SVG

#### Scenario: Apple touch icon

- **WHEN** un dispositivo Apple evalua los iconos de la aplicacion
- **THEN** encuentra un `apple-icon` PNG compatible con la convencion de Next App Router

#### Scenario: Legibilidad en favicon

- **WHEN** el icono se renderiza a 32x32
- **THEN** conserva una silueta reconocible y no depende de texto ni detalles demasiado finos
