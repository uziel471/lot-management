# Diseño técnico — Base y autenticación

## Context

El proyecto es un Next.js 16.3 recién inicializado (App Router, React 19.2, Tailwind 4, shadcn/base-ui, Mongoose 9, Zod 4, Vitest 4). No hay conexión a base de datos, ni identidad, ni estructura de carpetas más allá de la que genera `create-next-app`.

El sistema al que reemplaza es un Google Spreadsheet con Apps Script, documentado en `PLAN_MAESTRO_V2.md`. Ese sistema sigue en producción durante toda esta fase; aquí no se migra nada. Lo que sí se hereda son sus conclusiones: la captura directa sobre celdas fue la causa raíz de los IDs fantasma, y la solución correcta era una capa de servicio que valide y asigne identificadores en una transacción controlada.

El contexto arquitectónico completo está en `ARCHITECTURE.md`; la motivación, en `proposal.md`.

## Goals / Non-Goals

**Goals:**

- Que ningún módulo posterior tenga que resolver por su cuenta la emisión de códigos ni la aritmética del dinero.
- Que la autorización quede estructuralmente pegada al acceso a datos, no al ruteo, de modo que olvidar un `check` sea difícil en lugar de fácil.
- Que las reglas de dinero e identificadores queden cubiertas por tests desde el primer día, porque son las que más caro cuesta corregir después.

**Non-Goals:**

- Recuperación de contraseña por correo, MFA e inicio de sesión con proveedores externos. Son tres usuarios en un lote; se agregan si aparece la necesidad.
- Bitácora de auditoría consultable. Esta fase deja la autoría en cada registro; la colección `auditLogs` llega con el primer módulo transaccional.
- Interfaz de administración de sesiones activas. La revocación existe en el servidor; la pantalla puede esperar.

## Decisions

### Better Auth en lugar de Auth.js v5

Auth.js está en modo mantenimiento —su mantenimiento pasó al equipo de Better Auth, que recomienda Better Auth para proyectos nuevos— y su `peerDependencies` declara `next@^12 || ^13 || ^14 || ^15`, sin incluir Next.js 16; instalarlo exige `--legacy-peer-deps`. Además, su patrón documentado `export { auth as middleware }` no aplica en Next 16, que renombró `middleware.ts` a `proxy.ts`.

*Alternativas consideradas:* Clerk (rápido de montar, pero los usuarios viven fuera de nuestra base y el servidor no controla la sesión); sesiones propias con `jose` siguiendo la guía oficial de Next.js (control total, pero es escribir y mantener el hashing, la rotación y la revocación a mano para un beneficio que Better Auth ya entrega).

### Una sola conexión a MongoDB

El adaptador Mongo de Better Auth usa el driver nativo, no Mongoose. Para no abrir dos pools contra el mismo clúster, se le pasa el `MongoClient` que ya expone la conexión de Mongoose (`mongoose.connection.getClient()`). El módulo de conexión garantiza que Mongoose esté conectado antes de construir el adaptador.

*Alternativa considerada:* dos clientes independientes. Funciona, pero duplica conexiones, complica el cierre ordenado y hace imposible una transacción que cruce datos de negocio y de sesión.

### Códigos legibles en una colección `counters`

`findOneAndUpdate({ _id: 'PUR' }, { $inc: { seq: 1 } }, { returnDocument: 'after', upsert: true })` es atómico por definición del motor. No hace falta lock ni transacción para emitir el código; sí hace falta que la emisión ocurra después de validar y dentro de la operación que persiste, para que una validación fallida no consuma número. El índice único sobre `code` es la red final.

*Alternativas consideradas:* usar el `ObjectId` como identificador visible (ilegible para el negocio, que ya piensa en `VEH-0001`); derivar el consecutivo de un `count()` de la colección (rompe en cuanto hay anulaciones o concurrencia); replicar el esquema de `PropertiesService` + `LockService` del sistema anterior (era una emulación de lo que la base ya hace nativamente).

### Dinero como enteros de unidades menores

`Number` en JavaScript es punto flotante binario: `0.1 + 0.2 !== 0.3`. El costo de adquisición se forma sumando ocho componentes y dividiendo entre un tipo de cambio; ese error se acumula y termina visible en el reporte de utilidad. Los importes se guardan como enteros de centavos; el tipo de cambio, como `Decimal128`. La conversión redondea a centavo con regla explícita y documentada, no con el redondeo implícito del lenguaje.

*Alternativa considerada:* `Decimal128` también para los importes. Es correcto, pero obliga a convertir en cada lectura y en cada suma, y `Decimal128` no es serializable directo hacia un Client Component. Enteros más una función de formato resultan más simples de testear.

### `proxy.ts` no autoriza

`src/proxy.ts` solo comprueba la presencia de la cookie de sesión y redirige. No consulta la base ni evalúa roles: la propia documentación de Next.js advierte que el proxy no debe ser una solución de gestión de sesión ni de autorización. La verificación real vive en `src/lib/auth/dal.ts` (`verifySession`, `requireRole`), memoizada con `cache()` de React para no repetir la consulta dentro de un mismo render, e invocada por cada `queries.ts` y cada `actions.ts`.

### `'use server'` y `'server-only'` como frontera física

Cada feature separa `actions.ts` (escritura, `'use server'`) de `queries.ts` (lectura, `import 'server-only'`). La segunda directiva hace que el build falle si alguien importa una consulta desde un Client Component. Es una barrera del compilador, no una convención que dependa de la disciplina de quien escribe.

### Roles fijos en código, no en base de datos

Los tres roles y sus permisos se definen con `createAccessControl()` en `src/lib/auth/permissions.ts`. Un lote con tres usuarios no necesita roles configurables; tenerlos en código los hace revisables en el diff y testeables.

## Risks / Trade-offs

- **El equivalente en USD se calcula al leer, no se almacena** → si una vista de agregación se vuelve lenta, se resuelve con índice o vista materializada explícita, no denormalizando por defecto. Guardar un total calculado es guardar una segunda verdad que puede desincronizarse.
- **Better Auth es una dependencia joven** → sus datos viven en colecciones propias de nuestra base y el esquema es público; una migración futura es un script de transformación, no un rescate de datos ajenos.
- **`mongoose.connection.getClient()` acopla el arranque de auth al de la base** → el módulo de conexión expone una promesa única y todo el arranque la espera; en desarrollo se cachea en `globalThis` para sobrevivir al hot reload.
- **Redondeo en la conversión bimoneda** → regla de redondeo única en `lib/money.ts`, con tests sobre los casos frontera del plan anterior (medio centavo, importes grandes en MXN, tipo de cambio con muchos decimales).
- **El proxy podría confundirse con autorización al crecer el equipo** → `requireRole()` en cada action y query, y un test de integración que invoca una operación de `admin` con sesión de `capturista` y espera rechazo.

## Migration Plan

No hay migración de datos en esta fase. El Spreadsheet sigue siendo el sistema en producción y no se toca.

El despliegue es la puesta en marcha inicial: crear la base en MongoDB, cargar las variables de entorno, ejecutar el script de alta del primer administrador y verificar el inicio de sesión. La reversión consiste en apagar el despliegue: no hay estado del negocio que perder.

## Open Questions

- Duración de la sesión y si debe renovarse con la actividad. Afecta un parámetro de configuración, no el diseño; se define al desplegar con base en cómo trabaje el capturista.
- Si el capturista operará desde celular. Cambia el orden en que se pulen las vistas, no la arquitectura. Es la misma pregunta que el plan anterior dejó abierta entre Sidebar y Web App.
