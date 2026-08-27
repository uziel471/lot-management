# Diseño tecnico — PWA instalable y marca

## Context

La aplicacion usa Next 16.3.1 con App Router bajo `src/app`. Las guias locales de Next indican que el manifest se define en la raiz de `app` como `manifest.(json|webmanifest|ts)` y que los iconos de aplicacion se resuelven por convencion con `icon` y `apple-icon` dentro de `app`. El manifest generado por `manifest.ts` es un Route Handler especial cacheado por defecto mientras no use APIs de request.

Hoy `src/app/layout.tsx` exporta metadata generica de Create Next App. Existe `src/app/favicon.ico`, pero no hay manifest ni activos de PWA.

## Goals / Non-Goals

**Goals:**

- Que el usuario pueda instalar la aplicacion en la pantalla de inicio de iOS/Android/escritorio cuando el navegador lo permita.
- Que el nombre mostrado al instalar sea deliberado, corto y entendible para operadores del lote.
- Que el icono sea original, representativo y legible desde favicon hasta icono de home screen.
- Que la implementacion no cambie reglas de negocio, permisos, navegacion ni base de datos.

**Non-Goals:**

- Offline-first, cache de paginas privadas, sincronizacion de capturas sin conexion o resolucion de conflictos.
- Push notifications.
- Prompt custom de instalacion dentro de la app.
- Redisenar el shell autenticado o rehacer la identidad visual completa.

## Decisions

### Manifest generado en `src/app/manifest.ts`

Se usa `manifest.ts` y no un JSON estatico porque permite tipar el objeto con `MetadataRoute.Manifest`, mantener los nombres en TypeScript y evitar divergencias al ajustar nombre, descripcion o colores.

El manifest debe incluir al menos:

- `name`
- `short_name`
- `description`
- `start_url: "/"`
- `scope: "/"`
- `display: "standalone"`
- `background_color`
- `theme_color`
- `icons` con 192x192 y 512x512 PNG

`start_url` se mantiene en `/` porque la raiz ya decide el destino segun autenticacion. Apuntar directo a `/dashboard` puede ser peor para sesiones expiradas o usuarios no autenticados.

### Icono SVG como fuente canonica, PNG para instalacion

El activo maestro sera un SVG cuadrado con `viewBox="0 0 512 512"`. El concepto recomendado:

- fondo solido oscuro/neutral para buena lectura en home screen;
- silueta frontal o tres-cuartos de auto en alto contraste;
- una placa/documento minimalista que represente administracion del lote;
- una linea ascendente o trazo circular sutil que represente flujo financiero/operativo;
- sin texto dentro del icono, porque se vuelve ilegible en 32px.

Aunque Next acepta `icon.svg` para favicon/app icon, el manifest debe apuntar a PNG 192 y 512 para compatibilidad PWA mas predecible, especialmente en launchers moviles. Apple requiere `apple-icon` en PNG/JPG, asi que tambien se genera `src/app/apple-icon.png`.

### Metadata global de marca

`src/app/layout.tsx` debe exportar metadata global con el nombre elegido. La metadata no debe depender de request ni de datos privados; debe ser estatica para que el head se pueda resolver sin trabajo dinamico innecesario.

Campos esperados:

- `title` con plantilla si el proyecto ya la necesita, o titulo plano para esta fase;
- `description` orientada a administracion de lote;
- `applicationName`;
- `appleWebApp` con `capable: true`, `title` y barra de estado compatible con el color de tema;
- `formatDetection` si se quiere evitar transformaciones automaticas molestas en telefonos.

### Nombre elegido por decision pequena antes de implementar

La propuesta recomienda **Loteo** como default, con `name: "Loteo"` o `"Loteo - Administracion de lote"` segun se prefiera tono compacto o descriptivo, y `short_name: "Loteo"`.

Si el usuario elige otro nombre de la shortlist, solo cambian strings de manifest/metadata y, opcionalmente, el texto alternativo/descripcion de assets. El icono propuesto sigue sirviendo mientras el nombre represente la operacion del lote.

### Sin service worker en esta fase

La guia PWA de Next muestra service worker para push notifications, pero tambien deja claro que la instalacion y experiencia app-like dependen primero del manifest e iconos. Como esta app contiene pantallas privadas y datos operativos, introducir cache offline sin una estrategia de autenticacion y consistencia seria mas riesgoso que valioso.

Esta fase no registra service worker. Si despues se agrega offline, debe ser un cambio separado con reglas claras por ruta y pruebas de expiracion de sesion.

## Risks / Trade-offs

- **PWA sin offline puede parecer incompleta** -> es una decision deliberada. La necesidad pedida es instalarla en celular; cache offline de datos privados requiere otro diseno.
- **SVG no basta para todos los launchers** -> por eso el manifest apunta tambien a PNG 192/512 y Apple recibe PNG dedicado.
- **Nombre ingenioso vs claridad operativa** -> se prioriza que el operador lo reconozca rapido debajo del icono. Nombres demasiado conceptuales quedan como alternativas, no default.
- **Generar PNG puede requerir tooling adicional** -> la tarea acepta usar una herramienta disponible localmente o agregar una dependencia dev pequena si hace falta, pero no mete runtime dependencies.

## Migration Plan

No hay migracion de datos. La reversa consiste en eliminar `manifest.ts`, retirar los activos nuevos y restaurar la metadata anterior. Los navegadores que ya hayan instalado la app actualizaran nombre/icono segun su politica de refresco de manifest; no hay estado de servidor que migrar.

## Open Questions

- **Nombre final:** default propuesto `Loteo`, pendiente de aprobacion.
- **Tono del nombre largo:** `Loteo` puro contra `Loteo - Administracion de lote`.
- **Color de tema:** usar una combinacion sobria existente del sistema o introducir un acento de marca especifico para el icono manteniendo coherencia con `docs/design-system/UI_GUIDELINES.md`.
