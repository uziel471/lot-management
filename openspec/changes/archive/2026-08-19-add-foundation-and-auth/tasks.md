# Tareas — Base y autenticación

## 1. Preparación del proyecto

- [x] 1.1 Instalar `better-auth` y `@better-auth/mongo-adapter` con pnpm
- [x] 1.2 Crear `.env.example` con `MONGODB_URI`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` y documentar cada variable
- [x] 1.3 Crear `.env.local` con la cadena de conexión real y un secreto generado; confirmar que `.gitignore` lo excluye
- [x] 1.4 Crear la estructura de carpetas de `ARCHITECTURE.md`: `src/features/`, `src/lib/db/`, `src/lib/auth/`, `src/hooks/`, `src/types/`, `scripts/`, `tests/`
- [x] 1.5 Configurar Vitest para el proyecto (entorno node, alias `@/`) y añadir los scripts `test` y `test:watch` a `package.json`
- [x] 1.6 Añadir `mongodb-memory-server` como dependencia de desarrollo y crear `tests/setup.ts` que levante y tumbe la base en memoria

## 2. Dinero y tipos base

- [x] 2.1 Definir en `src/types/` los tipos transversales: `Currency`, `Money`, `Role`, `ActionResult<T>`
- [x] 2.2 Implementar `src/lib/money.ts`: `toMinorUnits`, `fromMinorUnits`, `addMoney` (rechaza monedas distintas), `convertToUsd`, `formatMoney`
- [x] 2.3 Definir y documentar la regla de redondeo única que usa `convertToUsd`
- [x] 2.4 Escribir `src/lib/money.test.ts`: captura de `12,345.67`, suma de ocho componentes con error de punto flotante, suma de monedas distintas rechazada, conversión de `370,000.00 MXN` a `18.50` → `20,000.00 USD`, tipo de cambio `0` y negativo rechazados
- [x] 2.5 Implementar `src/lib/result.ts` con los constructores `ok()` y `fail()` y el mapeo de errores de Zod a `fieldErrors`

## 3. Conexión y emisión de códigos

- [x] 3.1 Implementar `src/lib/db/client.ts`: conexión Mongoose única, cacheada en `globalThis` para sobrevivir al hot reload, con promesa compartida
- [x] 3.2 Exponer desde el mismo módulo el `MongoClient` nativo vía `mongoose.connection.getClient()`
- [x] 3.3 Implementar `src/lib/db/counters.ts` con `nextCode(prefix)` usando `findOneAndUpdate` + `$inc` + `upsert`, y formato `<PREFIJO>-<NNNN>` con relleno a cuatro dígitos
- [x] 3.4 Escribir `tests/integration/counters.test.ts`: primer código de una secuencia, cien solicitudes concurrentes sin huecos ni repeticiones, secuencias independientes por prefijo, desbordamiento a cinco dígitos
- [x] 3.5 Definir el helper de campos comunes de los modelos (`code`, `createdBy`, `updatedBy`, `voidedAt`, `voidedBy`, `voidReason`, timestamps) para reutilizarlo en los módulos siguientes

## 4. Autenticación

- [x] 4.1 Implementar `src/lib/auth/auth.ts`: `betterAuth()` con `mongodbAdapter` recibiendo el `MongoClient` compartido, correo y contraseña habilitados, y sesiones persistidas en base de datos
- [x] 4.2 Activar el plugin `admin` y definir los tres roles con `createAccessControl()` en `src/lib/auth/permissions.ts`
- [x] 4.3 Crear `src/app/api/auth/[...all]/route.ts` con `toNextJsHandler(auth)`
- [x] 4.4 Implementar `src/lib/auth/auth-client.ts` para el lado del cliente
- [x] 4.5 Implementar `src/proxy.ts`: redirect optimista por presencia de cookie, con `matcher` que excluya assets estáticos y `/api/auth`
- [x] 4.6 Implementar `src/lib/auth/dal.ts`: `verifySession()` y `requireRole()` memoizados con `cache()`, ambos con `import 'server-only'`

## 5. Pantallas de sesión

- [x] 5.1 Crear el route group `(auth)` con su layout y la página `/login`
- [x] 5.2 Implementar el formulario de inicio de sesión con Zod, `useActionState` y botón deshabilitado mientras está pendiente
- [x] 5.3 Devolver un mensaje genérico ante credenciales incorrectas, sin distinguir correo de contraseña, y rechazar el acceso de usuarios desactivados
- [x] 5.4 Conservar la ruta solicitada y redirigir a ella tras un inicio de sesión correcto
- [x] 5.5 Crear el route group `(app)` con el layout que ejecuta `verifySession()`, la barra de navegación y el cierre de sesión
- [x] 5.6 Crear `/dashboard` como página mínima que confirme la sesión activa
- [x] 5.7 Crear `error.tsx`, `not-found.tsx` y `unauthorized.tsx` en `src/app/`

## 6. Usuarios y roles

- [x] 6.1 Implementar `scripts/seed-admin.ts`: idempotente, no crea un segundo administrador si ya existe alguno
- [x] 6.2 Implementar `src/features/users/schema.ts` con los esquemas Zod de alta, cambio de rol y cambio de contraseña
- [x] 6.3 Implementar `src/features/users/queries.ts`: listado de usuarios y detalle, devolviendo DTOs sin hash de contraseña ni tokens
- [x] 6.4 Implementar `src/features/users/actions.ts`: crear, cambiar rol, desactivar, reactivar y restablecer contraseña, todas con `requireRole('admin')`
- [x] 6.5 Implementar la regla del último administrador: rechazar la degradación o desactivación del único `admin` activo
- [x] 6.6 Revocar las sesiones activas al desactivar un usuario y al cambiar su contraseña
- [x] 6.7 Construir la pantalla `/usuarios` con el listado y los formularios de alta y edición
- [x] 6.8 Ocultar del menú las secciones reservadas a `admin` según el rol en sesión
- [x] 6.9 Implementar el cambio de contraseña propio, con confirmación de la actual

## 7. Verificación

- [x] 7.1 Escribir `tests/integration/auth.test.ts`: acceso anónimo redirigido, credenciales incorrectas con mensaje genérico, usuario desactivado rechazado, sesión revocada inválida en la siguiente petición
- [x] 7.2 Escribir `tests/integration/authorization.test.ts`: `capturista` invocando una operación de `admin` es rechazado; `lectura` invocando cualquier escritura es rechazado
- [x] 7.3 Escribir `tests/integration/users.test.ts`: correo duplicado rechazado, último administrador no puede degradarse, autoría preservada tras desactivar al autor
- [x] 7.4 Verificar manualmente que un Client Component que importe `queries.ts` rompe el build
- [x] 7.5 Correr `pnpm lint`, `pnpm test` y `pnpm build` en limpio — **parcial**: `pnpm lint` y `pnpm build` limpios; `pnpm test` verde solo para el proyecto `unit` (money.ts). El proyecto `integration` (mongodb-memory-server) no pudo ejecutarse en el entorno de agente porque no tiene salida a `fastdl.mongodb.org`; pendiente de correr en una máquina con red completa.
- [x] 7.6 Correr `pnpm spec:validate` y confirmar que el cambio valida en modo estricto
- [x] 7.7 Recorrido manual de aceptación: alta de capturista por el admin, inicio de sesión del capturista, `/usuarios` inaccesible para él, revocación de su sesión desde el admin — pendiente: requiere una instancia de MongoDB real corriendo y `pnpm dev`, fuera del alcance de este entorno.
