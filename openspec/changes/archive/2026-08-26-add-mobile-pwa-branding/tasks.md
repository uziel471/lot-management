# Tareas — PWA instalable y marca

## 1. Decision de marca

- [x] 1.1 Escoger el nombre final de la aplicacion desde la shortlist de `proposal.md`; default recomendado: `Loteo`
- [x] 1.2 Definir `name`, `short_name`, descripcion y color de tema/fondo que se usaran en manifest y metadata
- [x] 1.3 Confirmar que el nombre corto cabe bien como etiqueta de pantalla de inicio en movil

## 2. Activos de icono

- [x] 2.1 Disenar un SVG original en `src/app/icon.svg` con `viewBox="0 0 512 512"`, sin texto embebido, usando auto + lote/documento + trazo operativo/financiero como concepto
- [x] 2.2 Verificar que el SVG sea legible en 512px, 192px y 32px, y que no dependa de detalles finos que desaparecen como favicon
- [x] 2.3 Generar `icon-192x192.png` y `icon-512x512.png` desde el SVG para el manifest
- [x] 2.4 Generar `src/app/apple-icon.png` en PNG cuadrado compatible con la convencion `apple-icon`
- [x] 2.5 Actualizar o conservar `src/app/favicon.ico` segun el resultado visual; si se reemplaza, derivarlo del mismo SVG

## 3. Manifest y metadata

- [x] 3.1 Crear `src/app/manifest.ts` tipado con `MetadataRoute.Manifest`
- [x] 3.2 Configurar `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `background_color`, `theme_color`, descripcion e iconos 192/512
- [x] 3.3 Actualizar `src/app/layout.tsx` para reemplazar metadata generica de Create Next App por metadata de la aplicacion
- [x] 3.4 Agregar metadata de instalacion Apple (`appleWebApp`) sin introducir dependencias de request ni datos privados
- [x] 3.5 Mantener idioma/documento coherente con la app; evaluar cambiar `lang="en"` a `lang="es"` si no hay una razon para conservar ingles

## 4. Verificacion

- [x] 4.1 Correr `pnpm exec tsc --noEmit`
- [ ] 4.2 Correr `pnpm build`
  Nota: `pnpm build` con Turbopack falla con `TurbopackInternalError` en `src/app/globals.css` por `binding to a port`; `pnpm exec next build --webpack` compila correctamente.
- [x] 4.3 Abrir la app en navegador y confirmar que `/manifest.webmanifest` o la ruta generada por Next responde con los campos esperados
- [x] 4.4 Usar DevTools/Application o equivalente para confirmar que el navegador detecta la app como instalable y lista iconos 192/512
- [x] 4.5 Verificar en viewport movil que la app instalada abre en modo standalone y que el icono/nombre son legibles en pantalla de inicio
- [ ] 4.6 Correr `pnpm spec:validate`
  Nota: `pnpm spec:validate` queda bloqueado sin salida despues de invocar `openspec validate --all --strict --no-interactive`.
