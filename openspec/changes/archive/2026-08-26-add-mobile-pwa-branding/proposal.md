# PWA instalable y marca de aplicación

## Why

El sistema ya funciona como aplicación web interna, pero en celular se sigue sintiendo como una pagina que hay que abrir desde el navegador. Para la operación diaria del lote eso estorba: capturar compras, gastos, reparaciones o consultar inventario desde el patio deberia estar a un toque, con nombre e icono propios en la pantalla de inicio.

Tambien queda una deuda visible de marca. El root layout conserva el titulo y descripcion genericos de Create Next App, no hay manifest de instalacion y el favicon no representa el dominio del producto. Esta propuesta convierte la app en una PWA instalable basica y define una identidad visual compacta: un icono SVG original, legible en tamanos pequenos, ligado al inventario vehicular y al control financiero del lote.

## What Changes

- La aplicacion expone un Web App Manifest desde `src/app/manifest.ts`, siguiendo la convencion de Next App Router, con `display: "standalone"`, `start_url: "/"`, colores de tema/fondo, nombre largo, nombre corto, descripcion e iconos.
- La metadata global deja de usar Create Next App y adopta el nombre elegido de la aplicacion, descripcion operativa, `applicationName`, `appleWebApp` y configuracion compatible con instalacion en pantalla de inicio.
- Se agrega un icono SVG original como fuente canonica de marca: una silueta frontal de auto integrada con una marca de lote/documento y un trazo de ruta/moneda, pensado para leerse en 32px, 192px y 512px.
- Se generan derivados raster desde el SVG para PWA: `icon-192.png`, `icon-512.png`, `apple-icon.png` y favicon cuando aplique. El SVG permanece en el repo como fuente editable.
- La app queda instalable en navegadores compatibles sin introducir modo offline ni push notifications en esta fase.
- Se documenta una shortlist de nombres ingeniosos para escoger antes de implementar texto final de manifest y metadata.

**Fuera de alcance:** cache offline, sincronizacion offline, background sync, notificaciones push, prompt de instalacion custom dentro de la UI, publicacion en app stores y rebranding profundo de pantallas internas. Esta fase se limita a instalabilidad, metadata e identidad base.

## Name Ideas

Recomendacion inicial: **Loteo**. Es corto, suena a herramienta de lote, cabe bien debajo de un icono en celular y no encierra la app solo en inventario o solo en finanzas.

- **Loteo**: corto, memorable y directo; buena opcion para `short_name`.
- **Autolote OS**: comunica sistema operativo del lote; mas serio, menos compacto.
- **PatioPro**: enfocado en operacion diaria del patio; suena a herramienta interna.
- **LlaveMaestra**: mas ingenioso; transmite control total, pero menos explicito.
- **LoteClave**: mezcla control e identidad de lote; claro en espanol.
- **RuedaBase**: alude a vehiculos y datos base; distintivo pero menos obvio.
- **MotorLote**: fuerte y facil de recordar; algo mas comercial.
- **LotePilot**: buen tono de panel operativo; anglicismo parcial.
- **Inventauto**: descriptivo para inventario, pero la app ya cubre compras, gastos, pagos y reportes.
- **RutaLote**: sugiere seguimiento del ciclo completo del vehiculo.

La propuesta no fija el nombre de forma irreversible. Las tareas dejan un paso explicito para escoger uno antes de escribir manifest y metadata.

## Capabilities

### Modified Capabilities

- `project`: agrega instalabilidad PWA basica, metadata global de aplicacion, activos de icono y reglas de verificacion movil.

## Impact

- **Dependencias nuevas:** ninguna obligatoria. La generacion de PNG puede hacerse con tooling existente si ya esta disponible o con un script puntual basado en una dependencia dev solo si el entorno no puede rasterizar SVG de forma confiable.
- **Base de datos:** sin cambios.
- **Codigo existente que se toca:** `src/app/layout.tsx` para metadata global y, si se decide, `src/app/favicon.ico`.
- **Estructura nueva:** `src/app/manifest.ts`, `src/app/icon.svg` o `src/app/icon.tsx` segun decision final, `src/app/apple-icon.png`, y derivados en `public/` si el manifest apunta a rutas publicas.
- **UI compartida:** sin componentes nuevos. La instalacion depende de metadata/manifest del navegador, no de una pantalla propia.
- **Restriccion de Next:** la implementacion debe seguir las guias locales en `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`, `.../01-metadata/manifest.md` y `.../01-metadata/app-icons.md`.
