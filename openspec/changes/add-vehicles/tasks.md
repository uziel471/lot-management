# Tareas — Vehículos

## 1. Preparación

- [ ] 1.1 Confirmar que `add-catalogs` está archivado, con los cuatro catálogos cargados y los contadores realineados
- [ ] 1.2 Declarar los permisos de vehículo en `src/lib/auth/permissions.ts`: recurso `vehicle` con `create`, `update` y `void`; las tres a `admin`, `create` y `update` a `capturista`, ninguna a `lectura`
- [ ] 1.3 Extender `scripts/seed-counters.ts` para que cubra también el prefijo `VEH`

## 2. Enumeraciones y dominio

- [ ] 2.1 Implementar `src/features/vehicles/enums.ts` con las cinco listas cerradas —estilo de carrocería, transmisión, combustible, tracción y situación del título—, valor en inglés y etiqueta de UI en español, más la regla documentada de que un valor ya usado nunca se renombra ni se elimina
- [ ] 2.2 Implementar `src/features/vehicles/domain.ts` con `normalizeVin(vin)`: mayúsculas, sin espacios ni guiones
- [ ] 2.3 Implementar en el mismo módulo `isValidVinFormat(vin)`: 17 caracteres alfanuméricos sin `I`, `O` ni `Q`
- [ ] 2.4 Implementar `hasValidVinCheckDigit(vin)` según el estándar ISO 3779, para advertir sin bloquear
- [ ] 2.5 Implementar `daysInInventory(dateReceived, today)` como función pura
- [ ] 2.6 Implementar `describeVehicle({ year, makeName, modelName })`, que es lo que en la hoja era la columna calculada `vehicle_desc`
- [ ] 2.7 Escribir `src/features/vehicles/domain.test.ts`: VIN con minúsculas y espacios se normaliza; VIN de 15 caracteres rechazado; VIN con `O` rechazado; dígito verificador correcto e incorrecto detectados; días en inventario en el mismo día, al día siguiente y a través de un cambio de mes

## 3. Modelo de datos

- [ ] 3.1 Crear `src/lib/db/models/vehicle.ts` con `auditableFields` más los veintitrés campos de captura
- [ ] 3.2 Definir el subdocumento del historial de estatus: estatus anterior, estatus nuevo, usuario y marca de tiempo
- [ ] 3.3 Índices: `{ code: 1 }` único; `{ vin: 1 }` único disperso; `{ stockNumber: 1 }` único disperso; `{ statusId: 1, dateReceived: -1 }`; `{ makeId: 1, modelId: 1 }`
- [ ] 3.4 Guardar `askingPrice` como entero de centavos de dólar, reutilizando el tipo `Money` de `lib/money.ts`
- [ ] 3.5 Guardar `mileage` con su unidad (`mi` o `km`) en un campo aparte, sin convertir

## 4. Esquemas y tipos

- [ ] 4.1 Implementar `src/features/vehicles/schema.ts`: esquema de alta con marca, modelo, año, estatus y fecha de recepción obligatorios y todo lo demás opcional
- [ ] 4.2 Validar el año contra el rango admitido (1950 al año siguiente al actual) y el kilometraje como entero no negativo
- [ ] 4.3 Esquema de edición, esquema de cambio de estatus y esquema de cambio de precio, por separado
- [ ] 4.4 Implementar `src/features/vehicles/types.ts` con los DTO serializables del listado, del detalle y del historial

## 5. Lecturas

- [ ] 5.1 Implementar `src/features/vehicles/queries.ts` con `import 'server-only'` y `requireRole` en cada función
- [ ] 5.2 `listVehicles(filtros)`: filtros por estatus, marca y rango de fecha de recepción; búsqueda por `code`, VIN o número de inventario; excluye los anulados salvo que se pidan explícitamente
- [ ] 5.3 Resolver marca, modelo y estatus con `$lookup` en la agregación del listado, en lugar de guardar los nombres
- [ ] 5.4 Calcular días en inventario y la descripción del vehículo al proyectar, nunca almacenados
- [ ] 5.5 `getVehicleByCode(code)`: ficha completa más el historial de estatus ordenado
- [ ] 5.6 `listVehicleOptions()`: vehículos vigentes para los desplegables de compras y reparaciones — es la función que consumirá la Fase 4

## 6. Escrituras

- [ ] 6.1 Implementar `src/features/vehicles/actions.ts` con `'use server'`, siguiendo el orden `requireRole` → `safeParse` → regla de dominio → escritura → `revalidatePath`, devolviendo siempre `ActionResult`
- [ ] 6.2 `createVehicle`: valida que el modelo pertenezca a la marca y que marca, modelo y estatus estén activos, antes de emitir el código
- [ ] 6.3 Crear la entrada inicial del historial de estatus en la misma operación del alta, con el estatus anterior en nulo
- [ ] 6.4 Verificar VIN y número de inventario duplicados antes de escribir, con mensajes que nombren el vehículo que ya los usa
- [ ] 6.5 Devolver la advertencia de dígito verificador junto al resultado exitoso, sin bloquear el guardado
- [ ] 6.6 `updateVehicle`: mismas validaciones que el alta, MUST NOT permitir cambiar el `code`, actualiza `updatedBy`
- [ ] 6.7 `changeVehicleStatus`: valida que el estatus exista y esté activo, agrega la entrada al historial, y no agrega nada si el estatus es el mismo que ya tenía
- [ ] 6.8 `changeAskingPrice`: rechaza negativos y registra autor y fecha del cambio
- [ ] 6.9 `voidVehicle`: reservada a `admin`, exige motivo, registra `voidedAt` y `voidedBy`
- [ ] 6.10 Manejar la colisión de los índices únicos (error 11000) como error de campo comprensible, distinguiendo VIN de número de inventario

## 7. Pantallas

- [ ] 7.1 Crear `src/app/(app)/vehiculos/page.tsx`: inventario con filtros, búsqueda y el listado
- [ ] 7.2 Crear `src/app/(app)/vehiculos/nuevo/page.tsx` y `src/app/(app)/vehiculos/[code]/page.tsx`
- [ ] 7.3 Implementar `src/features/vehicles/components/vehicle-form.tsx` con las cinco secciones —Identificación, Ficha técnica, Título, Inventario y ubicación, Precio y notas—, plegadas salvo la primera en el alta
- [ ] 7.4 Implementar el desplegable dependiente marca → modelo consumiendo `listActiveModelsByMake`, limpiando el modelo al cambiar de marca
- [ ] 7.5 Ordenar el desplegable y el filtro de estatus por el orden del catálogo, y mostrar la descripción del estatus seleccionado como texto de ayuda
- [ ] 7.6 Implementar `vehicle-detail.tsx`: ficha de lectura con las acciones de cambiar estatus y cambiar precio, y el señalamiento de lo que falta por capturar
- [ ] 7.7 Implementar `status-history.tsx`: la secuencia de estatus con autor y fecha
- [ ] 7.8 Mostrar la advertencia de dígito verificador en el detalle mientras el VIN sea sospechoso, no solo al guardar
- [ ] 7.9 Ocultar la acción de anular a quien no sea `admin`, sin que esa ocultación sea la única defensa
- [ ] 7.10 Agregar "Vehículos" al menú del layout `(app)`
- [ ] 7.11 Revisar qué componentes nuevos merecen subir a `components/shared` y cuáles se quedan en la feature

## 8. Verificación

- [ ] 8.1 Escribir `tests/integration/vehicles.test.ts`: alta con los cinco obligatorios; alta sin año rechazada sin consumir código; modelo que no pertenece a la marca rechazado; marca, modelo o estatus inactivo rechazado en alta nueva; año fuera de rango rechazado
- [ ] 8.2 Tests de VIN: duplicado rechazado nombrando el vehículo que lo usa; formato inválido rechazado; minúsculas y espacios normalizados; dígito verificador incorrecto guardado con advertencia; varios vehículos sin VIN aceptados
- [ ] 8.3 Tests de número de inventario: duplicado rechazado; varios vehículos sin número aceptados
- [ ] 8.4 Tests de estatus: la entrada inicial existe tras el alta; un cambio agrega entrada con autor y fecha; un retroceso de "Sale Pending" a "Listed" se acepta; guardar el mismo estatus no agrega entrada
- [ ] 8.5 Tests de precio: negativo rechazado; alta sin precio aceptada; el cambio queda registrado con autor y fecha
- [ ] 8.6 Tests de kilometraje: negativo rechazado; la unidad se conserva tal como se capturó
- [ ] 8.7 Tests de anulación: `capturista` rechazado; `admin` anula con motivo; el anulado sale del inventario y sigue consultable; el código no se reutiliza
- [ ] 8.8 Tests de autorización: `lectura` rechazado en toda escritura; escritura sin sesión rechazada
- [ ] 8.9 Test de integridad de enumeraciones: todos los valores almacenados en la base pertenecen a las listas vigentes
- [ ] 8.10 Test de días en inventario: no está almacenado y cambia con el paso del tiempo sin editar el documento
- [ ] 8.11 Correr `pnpm lint`, `pnpm test` y `pnpm build` en limpio
- [ ] 8.12 Correr `pnpm spec:validate` y confirmar que el cambio valida en modo estricto
- [ ] 8.13 Recorrido manual de aceptación: registrar un vehículo solo con los cinco obligatorios; completar VIN, título y precio después; llevarlo de "Purchased" a "Ready for Sale" y devolverlo a "On Hold"; comprobar el historial completo; intentar un VIN duplicado; anularlo como `admin` y comprobar que sale del inventario; repetir con sesión de capturista y comprobar que no puede anular
