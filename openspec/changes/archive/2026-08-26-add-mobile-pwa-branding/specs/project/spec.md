## ADDED Requirements

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
