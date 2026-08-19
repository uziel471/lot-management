# Tareas — Catálogos

## 1. Preparación

- [ ] 1.1 Confirmar que `add-foundation-and-auth` está archivado y que sus tareas 7.5 y 7.7 corrieron contra una instancia real de MongoDB
- [x] 1.2 Extender `src/lib/db/common-fields.ts`: agregar a `catalogFields` los campos `nameKey`, `createdBy`, `updatedBy`, `deactivatedAt` y `deactivatedBy`, con `timestamps: true`
- [x] 1.3 Declarar los permisos de catálogo en `src/lib/auth/permissions.ts`: recurso `catalog` con las acciones `create`, `update` y `set-active`, otorgadas a `admin`; `create` y `update` a `capturista`; ninguna a `lectura`
- [x] 1.4 Instalar los componentes de shadcn/base-ui que faltan: `input`, `label`, `table`, `dialog`, `alert-dialog`, `select`, `badge`, `textarea`, `sonner`
  - Escritos a mano en `src/components/ui/` con las mismas clases y la misma API (`dialog` cubre también el caso de `alert-dialog`; `select` es el nativo estilizado; las notificaciones usan `Toast` de Base UI en lugar de `sonner`, que habría agregado una dependencia de producción que la propuesta descarta). Volver a generarlos con `pnpm dlx shadcn add …` los reemplaza sin tocar nada más.
- [x] 1.5 Escribir `scripts/seed-counters.ts`: recorre cada colección de catálogo, busca el `code` más alto realmente presente y deja el contador de ese prefijo en ese número si está por debajo; idempotente y sin números escritos a mano
- [x] 1.6 Escribir `scripts/seed-catalogs.ts`: carga entradas desde un JSON o CSV pasando por las mismas reglas de dominio que la Server Action —normaliza el nombre, verifica duplicados, respeta el `code` del archivo si viene, firma la autoría con un administrador indicado por parámetro—, idempotente por `nameKey` y con reporte de lo que ya existía
- [x] 1.7 Agregar los scripts `seed:counters` y `seed:catalogs` a `package.json` y documentar en el README el orden de puesta en marcha: cargar catálogos, realinear contadores, y recién entonces usar la interfaz

## 2. Dominio y normalización

- [x] 2.1 Implementar `src/features/catalogs/domain.ts` con `normalizeName(name)`: recorta, colapsa espacios internos, normaliza a NFD, quita diacríticos y pasa a minúsculas
- [x] 2.2 Implementar en el mismo módulo las reglas puras de estado: si una entrada puede desactivarse, si puede reactivarse, y si un modelo puede vivir bajo una marca dada
- [x] 2.3 Escribir `src/features/catalogs/domain.test.ts`: `"  toyota "` y `"Toyota"` colapsan a la misma clave; `"Land   Rover"` y `"Land Rover"` también; `"García"` y `"Garcia"` también; nombres distintos no colapsan; cadena vacía y solo espacios rechazadas

## 3. Modelos de datos

- [x] 3.1 Crear `src/lib/db/models/make.ts` con `catalogFields` e índices `{ code: 1 }` único y `{ nameKey: 1 }` único
- [x] 3.2 Crear `src/lib/db/models/model.ts` con `makeId` referenciando `Make`, índice `{ makeId: 1, nameKey: 1 }` único e índice `{ makeId: 1, isActive: 1, name: 1 }`
- [x] 3.3 Crear `src/lib/db/models/vehicle-status.ts` con `sortOrder` (entero, obligatorio) y `description` (opcional) además de los campos de catálogo, e índice `{ sortOrder: 1, name: 1 }`
- [x] 3.4 Crear `src/lib/db/models/vendor.ts` con `phone`, `email`, `city` y `notes` opcionales, además de los campos de catálogo
- [x] 3.5 Aplicar en los cuatro el patrón de registro de modelo que sobrevive al hot reload (`mongoose.models.X ?? mongoose.model(...)`), igual que en `counters.ts`

## 4. Registro de catálogos y esquemas

- [x] 4.1 Implementar `src/features/catalogs/registry.ts`: por cada catálogo, la clave de ruta en español, la clave interna, el prefijo de código, el modelo, el esquema Zod, las etiquetas de UI y las columnas de la tabla
- [x] 4.2 Implementar `src/features/catalogs/schema.ts` con los esquemas Zod de alta y edición: el base común, el de modelo con `makeId` obligatorio, el de proveedor con los cuatro campos de contacto opcionales y validación de formato de correo, y el de estatus con `sortOrder` entero obligatorio y `description` opcional
- [x] 4.3 Implementar `src/features/catalogs/types.ts` con los DTO serializables que devuelven las consultas, sin documentos de Mongoose

## 5. Lecturas

- [x] 5.1 Implementar `src/features/catalogs/queries.ts` con `import 'server-only'` y `requireRole` en cada función
- [x] 5.2 `listCatalogEntries(catalogKey, { includeInactive })`: listado de administración, con el nombre de la marca resuelto en el caso de modelos
- [x] 5.3 `listActiveOptions(catalogKey)`: opciones activas para desplegables, ordenadas por nombre, salvo los estatus, que se ordenan por `sortOrder` y desempatan por nombre — es la función que consumirán vehículos y compras
- [x] 5.4 `listActiveModelsByMake(makeId)`: modelos activos de una marca activa; devuelve vacío si la marca está inactiva o no existe
- [x] 5.5 `getCatalogEntry(catalogKey, code)` para la vista de edición

## 6. Escrituras

- [x] 6.1 Implementar `src/features/catalogs/actions.ts` con `'use server'`, siguiendo el orden `requireRole` → `safeParse` → regla de dominio → escritura → `revalidatePath`, y devolviendo siempre `ActionResult`
- [x] 6.2 `createCatalogEntry`: verifica el nombre normalizado duplicado antes de escribir, emite el código con `nextCode` solo después de validar, y guarda `createdBy` / `updatedBy`
- [x] 6.3 Mensaje de rechazo por duplicado que nombre la entrada existente, y caso aparte cuando la entrada que colisiona está desactivada, sugiriendo reactivarla
- [x] 6.4 `updateCatalogEntry`: permite renombrar y editar los campos propios, rechaza el nombre duplicado y actualiza `updatedBy`; MUST NOT permitir cambiar el `code`
- [x] 6.5 Validación de marca en el alta y la edición de modelos: la marca debe existir y estar activa
- [x] 6.6 `setCatalogEntryActive`: reservada a `admin`, registra `deactivatedAt` / `deactivatedBy` al desactivar y los limpia al reactivar
- [x] 6.7 Manejar la colisión del índice único (error 11000) como un error de campo comprensible, no como falla genérica

## 7. UI compartida

- [x] 7.1 Implementar `src/components/shared/page-header.tsx`: título, descripción y espacio para la acción principal
- [x] 7.2 Implementar `src/components/shared/data-table.tsx`: columnas declarativas, filtro de texto en el cliente, estado vacío y densidad consistente
- [x] 7.3 Implementar `src/components/shared/empty-state.tsx`
- [x] 7.4 Implementar `src/components/shared/confirm-dialog.tsx` para desactivar y reactivar
- [x] 7.5 Implementar `src/components/shared/submit-button.tsx`, deshabilitado mientras `pending` — es también la defensa contra el doble submit

## 8. Pantallas de catálogo

- [x] 8.1 Crear `src/app/(app)/catalogos/page.tsx` como índice con las cuatro secciones
- [x] 8.2 Crear `src/app/(app)/catalogos/[catalogo]/page.tsx`, resolviendo la clave contra el registro y llamando `notFound()` si no existe
- [x] 8.3 Implementar `src/features/catalogs/components/catalog-table.tsx`: listado con estado visible, conmutador para ver también las inactivas y acciones por fila
- [x] 8.4 Implementar `src/features/catalogs/components/catalog-form.tsx`: formulario de alta y edición en diálogo, con `useActionState`, campos derivados del registro y errores por campo
- [x] 8.5 Implementar el desplegable dependiente marca → modelo, limpiando el modelo seleccionado al cambiar de marca
- [x] 8.6 Ocultar las acciones de desactivar y reactivar a quien no sea `admin`, sin que esa ocultación sea la única defensa
- [x] 8.7 Agregar "Catálogos" al menú del layout `(app)`
- [x] 8.8 Confirmar la operación con una notificación y revalidar la vista sin recarga manual

## 9. Verificación

- [x] 9.1 Escribir `tests/integration/catalogs.test.ts`: alta correcta con código consecutivo; `"  toyota "` rechazado existiendo `"Toyota"`; `"Garcia Autos"` rechazado existiendo `"García Autos"`; renombrar a un nombre ocupado rechazado; colisión con una entrada desactivada reportada como tal
- [x] 9.2 Tests de códigos: tras desactivar una entrada, la siguiente alta recibe el código siguiente y nunca el liberado; un alta rechazada por validación no consume código
- [x] 9.3 Tests de la dependencia marca → modelo: modelo sin marca rechazado; modelo bajo marca inactiva rechazado; `"Sonata"` aceptado bajo dos marcas distintas
- [x] 9.4 Tests de desactivación de marca: sus modelos no cambian de estado en la base pero desaparecen de las opciones; al reactivar la marca vuelven exactamente los que estaban activos
- [x] 9.5 Tests de autorización: `capturista` crea y edita pero no desactiva; `lectura` rechazado en toda escritura; escritura sin sesión rechazada
- [x] 9.6 Tests de trazabilidad: el alta guarda `createdBy` y la hora del servidor; la edición por otro usuario conserva el autor original y actualiza `updatedBy`
- [x] 9.7 Tests de proveedor: alta sin correo aceptada; correo con formato inválido rechazado en el campo correcto; dos proveedores con el mismo teléfono aceptados
- [x] 9.8 Tests de estatus: el orden manda sobre el código —un estatus con orden 45 y código `STATUS-0010` aparece entre el de orden 40 y el de orden 50—; dos estatus con el mismo orden desempatan por nombre; descripción vacía aceptada
- [x] 9.9 Tests de los scripts de carga: `seed-catalogs.ts` corrido dos veces no duplica y reporta lo existente; una entrada cargada sin `nameKey` es detectable; `seed-counters.ts` deja el contador en el código más alto presente y no lo baja si ya está por encima
- [ ] 9.10 Correr `pnpm lint`, `pnpm test` y `pnpm build` en limpio
  - `pnpm lint`, `pnpm build` y los tests unitarios corren en verde. Falta correr `pnpm test` completo (los de integración necesitan descargar el binario de MongoDB, que el entorno donde se construyó esta fase no podía alcanzar).
- [x] 9.11 Correr `pnpm spec:validate` y confirmar que el cambio valida en modo estricto
- [ ] 9.12 Cargar los 65 registros reales con `seed-catalogs.ts`, correr `seed-counters.ts`, y verificar que la siguiente alta desde la interfaz recibe `MAKE-0012`, `MODEL-0045` y `STATUS-0011`
- [ ] 9.13 Recorrido manual de aceptación: dar de alta una marca, un modelo y un proveedor; comprobar que el desplegable de estatus sale en el orden 10→90 con "On Hold" entre reacondicionamiento y listo para venta; desactivar una marca y comprobar que sus modelos desaparecen del desplegable; reactivarla y comprobar que vuelven; intentar el alta duplicada con espacios y mayúsculas; repetir el recorrido con sesión de capturista y comprobar que no puede desactivar
