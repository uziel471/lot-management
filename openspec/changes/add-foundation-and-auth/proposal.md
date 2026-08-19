# Fase 0 + 1 — Base del sistema y autenticación

## Why

El sistema hoy es un proyecto Next.js recién inicializado: no hay conexión a base de datos, no hay identidad, y no existe ninguna de las reglas que el negocio ya sabe que necesita. Antes de construir cualquier módulo del lote hay que dejar resueltas de una sola vez las tres cosas que todos los módulos van a dar por hechas: cómo se emite un identificador legible sin duplicarlo, cómo se representa el dinero sin perder centavos, y quién está operando el sistema.

Estas tres piezas son también las que fallaron en el sistema anterior en Google Sheets. Los IDs fantasma (`PUR-0001` a `PUR-0006` consumidos sin una sola compra real) y la imposibilidad de separar al capturista de la estructura de datos no fueron bugs: fueron consecuencia de no tener una capa de servicio con transacciones y permisos. Resolverlo ahora, con tests, evita reconstruir seis módulos más adelante.

## What Changes

- Conexión a MongoDB con Mongoose, cacheada entre recargas de desarrollo, y un `MongoClient` compartido para que Better Auth no abra una segunda conexión.
- Emisor de códigos legibles (`VEH-0001`, `PUR-0001`) sobre una colección `counters`, con incremento atómico. Sustituye a `nextId_` + `LockService` + `PropertiesService` del sistema anterior.
- Módulo de dinero: importes como enteros de unidades menores, tipo de cambio como decimal exacto, y las funciones de suma y conversión bimoneda, cubiertas por tests.
- Contrato uniforme de retorno para las operaciones de escritura (`ActionResult`), de modo que ningún error interno llegue al navegador.
- Autenticación con Better Auth: correo y contraseña, sesiones persistidas y revocables, `/login`, cierre de sesión.
- Tres roles (`admin`, `capturista`, `lectura`) con control de acceso, y la capa de acceso a datos que los verifica junto a la consulta, no en el ruteo.
- `src/proxy.ts` para el redirect optimista de rutas privadas (Next 16 renombró `middleware.ts`).
- Administración de usuarios para `admin`: alta, cambio de rol, desactivación, restablecimiento de contraseña; más un script de alta del primer administrador.
- Estructura de carpetas del proyecto según `ARCHITECTURE.md`, con la separación `actions.ts` / `queries.ts` ya en su lugar.

**Fuera de alcance:** catálogos, vehículos, compras y la migración del Spreadsheet. Cada uno tiene su propia fase.

## Capabilities

### New Capabilities

- `project`: reglas transversales que heredan todos los módulos — emisión de códigos legibles, representación exacta del dinero, conversión bimoneda con tipo de cambio congelado, contrato de resultado de las escrituras y trazabilidad de autoría. Esta fase introduce la capacidad; las reglas de anulación, control de signo y frontera de costos se agregan en la fase de compras, cuando existan transacciones a las que aplicarlas.
- `authentication`: identidad, sesión y el punto donde se verifica la autorización.
- `users`: quién puede operar el sistema, con qué rol, y cómo se le retira el acceso.

### Modified Capabilities

Ninguna: es el primer cambio del proyecto.

## Impact

- **Dependencias nuevas:** `better-auth` y `@better-auth/mongo-adapter`. `mongoose` y `zod` ya están instalados.
- **Configuración:** `MONGODB_URI`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` en `.env.local`, documentadas en `.env.example`.
- **Base de datos:** colecciones `counters` y las cuatro de Better Auth (`user`, `session`, `account`, `verification`). Ninguna colección de negocio todavía.
- **Estructura:** se crean `src/features/`, `src/lib/db/`, `src/lib/auth/`, `src/proxy.ts`, `scripts/` y `tests/`.
- **Sistema anterior:** el Spreadsheet sigue siendo el sistema en producción durante toda esta fase. No se toca ni se migra nada todavía.
