# Arquitectura — LOTE VEHICULOS · Management

**Estado:** propuesta para aprobación · **Fecha:** 2026-08-19
**Stack:** Next.js 16.3 (App Router) · React 19.2 · TypeScript · MongoDB + Mongoose 9 · Better Auth · Zod 4 · Tailwind 4 + shadcn/base-ui · Vitest 4 · OpenSpec 1.8

---

## 0. Decisiones tomadas

| # | Decisión | Valor |
|---|---|---|
| D1 | Rol del sistema en Sheets | **Reemplazo total.** MongoDB pasa a ser el source of truth. El Spreadsheet se importa una vez y se retira. |
| D2 | Autenticación | **Better Auth** con adaptador oficial de MongoDB. |
| D3 | Tenencia | **Un solo lote (una LLC).** Sin `lotId` en los documentos. |
| D4 | Entregable | `ARCHITECTURE.md` + specs base en `openspec/specs/`. |

### Nota sobre D2 — por qué no Auth.js v5

La opción inicial era Auth.js v5 (NextAuth). Al verificarlo:

- Auth.js está **en modo mantenimiento** (solo parches de seguridad); su mantenimiento pasó al equipo de Better Auth, que recomienda Better Auth para proyectos nuevos.
- Su `peerDependencies` declara `next@^12 || ^13 || ^14 || ^15` — **no incluye Next.js 16**; el issue está abierto y la instalación exige `--legacy-peer-deps`.
- El patrón documentado `export { auth as middleware }` no aplica en Next 16, que renombró `middleware.ts` → `proxy.ts`.

Better Auth resuelve los tres puntos: adaptador Mongo oficial, sesiones en tu propia base, y un `export async function proxy()` estándar.

---

## 1. Herencia del PLAN MAESTRO v2

El plan v2 ya había llegado a la conclusión correcta: **la captura no debe ocurrir sobre celdas, sino sobre una interfaz que valida y asigna IDs del lado del servidor, de forma atómica.** Esta migración no cambia esa conclusión — la lleva a su forma natural.

| Problema en Sheets | Cómo se resuelve aquí |
|---|---|
| IDs fantasma por `onEdit` | El código legible (`PUR-0001`) se asigna en un `findOneAndUpdate($inc)` sobre `counters`, dentro de la transacción de creación. Si la validación falla, no se consume nada. |
| Capturista rompe fórmulas | No hay fórmulas ni celdas. Las escrituras pasan solo por Server Actions validadas con Zod. |
| Rangos protegidos, `_LISTS` oculta | Permisos por rol en la capa de acceso a datos, no por protección de rangos. |
| Fórmulas calculadas (`total_orig`, `total_usd`) | Cálculo en código puro, testeado con Vitest, no reconstruible por el usuario. |
| Contador desfasado por pruebas | El contador vive en la base, es transaccional y auditable. |
| Límite de 6 min de Apps Script | No aplica. |

**Lo que NO cambia** — los 10 principios de la Parte 3 del plan v2 se conservan íntegros y se convierten en invariantes del código, no en convenciones de captura. Están formalizados en `openspec/specs/project/spec.md`.

---

## 2. Árbol de carpetas propuesto

Tu propuesta es correcta en su columna vertebral (`app` / `components` / `features` / `lib`). Los cambios que propongo resuelven ambigüedades concretas que aparecen al segundo o tercer módulo.

```
lote-management/
│
├── openspec/
│   ├── config.yaml
│   ├── specs/                        # el contrato vigente: lo que el sistema hace HOY
│   │                                 # (arranca vacío; se llena al archivar cada fase)
│   └── changes/
│       └── add-foundation-and-auth/  # Fase 0+1 en curso
│           ├── proposal.md
│           ├── design.md
│           ├── tasks.md
│           └── specs/                # deltas: project, authentication, users
│
├── docs/
│   └── borrador-specs/               # specs redactados, aún no comprometidos a una fase
│       ├── catalogs.md               #   → Fase 2
│       ├── vehicles.md               #   → Fase 3
│       └── purchases.md              #   → Fase 4
│
├── scripts/
│   ├── import-legacy-sheet.ts        # migración única desde el Spreadsheet (idempotente)
│   └── seed-admin.ts                 # alta del primer usuario admin
│
├── src/
│   ├── app/                          # SOLO ruteo. Archivos delgados.
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   └── login/page.tsx
│   │   ├── (app)/                    # todo lo que exige sesión
│   │   │   ├── layout.tsx            # shell + verifySession()
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── vehiculos/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── nuevo/page.tsx
│   │   │   │   └── [code]/page.tsx
│   │   │   ├── compras/
│   │   │   ├── catalogos/
│   │   │   └── usuarios/
│   │   ├── api/
│   │   │   └── auth/[...all]/route.ts   # único handler REST necesario hoy
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   └── unauthorized.tsx
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/base-ui, sin lógica de negocio
│   │   └── shared/                   # DataTable, MoneyInput, PageHeader, EmptyState
│   │
│   ├── features/                     # una carpeta por dominio, siempre la misma forma
│   │   ├── auth/
│   │   ├── users/
│   │   ├── catalogs/
│   │   ├── vehicles/
│   │   │   ├── components/           # UI específica del dominio
│   │   │   ├── actions.ts            # 'use server'  — escrituras
│   │   │   ├── queries.ts            # 'server-only' — lecturas (DAL)
│   │   │   ├── schema.ts             # Zod: entrada de formularios y de actions
│   │   │   ├── domain.ts             # reglas puras, sin I/O — aquí van los tests
│   │   │   └── types.ts
│   │   ├── purchases/
│   │   └── dashboard/
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── client.ts             # conexión Mongoose cacheada entre hot-reloads
│   │   │   ├── counters.ts           # nextCode('PUR') atómico
│   │   │   └── models/               # vehicle.ts, vendor.ts, purchase.ts, ...
│   │   ├── auth/
│   │   │   ├── auth.ts               # betterAuth() servidor
│   │   │   ├── auth-client.ts        # cliente
│   │   │   ├── permissions.ts        # roles y access control
│   │   │   └── dal.ts                # verifySession() / requireRole() con cache()
│   │   ├── money.ts                  # aritmética bimoneda en unidades menores
│   │   ├── result.ts                 # ActionResult<T> — contrato de retorno de actions
│   │   └── utils.ts                  # cn() y poco más
│   │
│   ├── hooks/                        # solo hooks transversales
│   ├── types/                        # solo tipos verdaderamente globales
│   └── proxy.ts                      # ex middleware.ts (Next 16)
│
├── tests/
│   ├── integration/                  # contra MongoDB real (mongodb-memory-server)
│   └── setup.ts
│
├── AGENTS.md
├── ARCHITECTURE.md
├── .env.local / .env.example
└── ...
```

### 2.1 Qué cambié respecto a tu propuesta, y por qué

**a) `app/` con route groups `(auth)` y `(app)` en vez de `login/` y `dashboard/` sueltos.**
El paréntesis no aparece en la URL, pero te da **dos layouts distintos**: uno público y uno que ejecuta `verifySession()` una sola vez para todo lo protegido. Sin esto terminas repitiendo el check en cada `page.tsx`, y el día que olvidas uno tienes una fuga.

**b) `src/lib/validations/` eliminado; los esquemas Zod viven en `features/<dominio>/schema.ts`.**
Una carpeta central de validaciones se convierte en un basurero: el esquema de compra queda a tres carpetas del código que lo usa, y nadie sabe si `purchaseSchema` sigue vivo. Manteniéndolo junto a la action, borrar la feature borra su esquema.

**c) `src/types/` se conserva pero se acota.**
Solo lo que de verdad cruza dominios (`Currency`, `Money`, `Role`, `ActionResult`). Los tipos de vehículo viven en `features/vehicles/types.ts`.

**d) `src/app/api/` casi vacío.**
En Next 16 las mutaciones van por **Server Actions**, no por `fetch` a rutas propias. Una capa REST interna sería una traducción extra sin lector. Se reserva `api/` para lo que sí necesita un endpoint HTTP: el handler de Better Auth hoy; mañana exportaciones a CSV/PDF o webhooks.

**e) Separación explícita `actions.ts` (escritura) vs `queries.ts` (lectura).**
`queries.ts` lleva `import 'server-only'` y es la única puerta a la base para leer; `actions.ts` lleva `'use server'` y es la única puerta para escribir. Esta es la *Data Access Layer* que recomienda la guía oficial de Next.js, y es lo que evita que una consulta se filtre a un Client Component.

**f) `src/proxy.ts` agregado.**
Next 16 renombró `middleware.ts` a `proxy.ts`. Su rol aquí es **exclusivamente el redirect optimista** de rutas protegidas leyendo la cookie de sesión — no la autorización real. La autorización real ocurre en `dal.ts`, junto a los datos.

**g) `scripts/` agregado.**
La migración desde el Spreadsheet es código que se ejecuta una vez pero debe ser revisable y repetible; no es un script de terminal improvisado.

**h) `tests/` se queda, con una regla de reparto.**
Tests unitarios (`domain.ts`, `money.ts`) **colocados** junto al archivo, como `money.test.ts` — así se borran con el código que prueban. `tests/integration/` para lo que toca MongoDB de verdad. Vitest ya está en el proyecto.

### 2.2 Dirección de dependencias (regla dura)

```
app/  ──►  features/  ──►  lib/  ──►  (mongoose, zod, better-auth)
                │
                └──►  components/ui, components/shared
```

- `features/` **nunca** importa de `app/`.
- `lib/` **nunca** importa de `features/` ni de `app/`.
- Dos features solo se comunican a través de `lib/` o de sus `queries.ts` públicas — nunca importando el `actions.ts` de la otra.

Si en algún momento una regla se rompe, el síntoma es siempre el mismo: un import circular o un `'server-only'` que revienta el build del cliente.

---

## 3. Capas en tiempo de ejecución

```
┌──────────────────────────────────────────────────────────┐
│  Cliente (React)                                         │
│  Formularios controlados · validación Zod en vivo        │
│  useActionState → Server Action                          │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────┐
│  src/proxy.ts — redirect optimista por cookie            │
│  NO decide permisos. Solo evita pintar rutas privadas.   │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────┐
│  Server Actions  (features/*/actions.ts)                 │
│  1. requireRole(...)        ← autorización real          │
│  2. schema.safeParse(input) ← validación (fuente única)  │
│  3. regla de dominio        ← domain.ts, puro y testeado │
│  4. transacción Mongo       ← código legible + escritura │
│  5. revalidatePath()        ← invalidar la vista         │
│  → devuelve ActionResult<T>, nunca lanza al cliente      │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────┐
│  DAL de lectura  (features/*/queries.ts, 'server-only')  │
│  verifySession() memoizado con React cache()             │
│  Devuelve DTOs, no documentos Mongoose crudos            │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────┐
│  MongoDB — modelos Mongoose + colección counters         │
└──────────────────────────────────────────────────────────┘
```

El paralelo con el plan v2 es directo: `Formulario_Purchases.html` → los componentes de `features/purchases`; `Svc_Purchases.gs` → `actions.ts`; `Core_Ids.gs` → `lib/db/counters.ts`; los rangos protegidos → `requireRole()`.

---

## 4. Modelo de datos

### 4.1 Convenciones de colección

Todo documento transaccional lleva:

| Campo | Tipo | Nota |
|---|---|---|
| `_id` | ObjectId | clave técnica, nunca se muestra |
| `code` | string, único | clave humana: `VEH-0001`, `PUR-0001` |
| `createdAt` / `updatedAt` | Date | `timestamps: true` |
| `createdBy` / `updatedBy` | ObjectId → user | quién |
| `voidedAt` / `voidedBy` / `voidReason` | nullable | **anulación, nunca borrado** |

Todo documento de catálogo lleva `code`, `name`, `isActive`. **Nunca se borra un catálogo; se desactiva.** Nunca se reutiliza un `code`.

### 4.2 Dinero — la decisión más importante

`Number` en JavaScript es punto flotante binario. `0.1 + 0.2 !== 0.3`. En un sistema donde el costo de adquisición se suma de ocho componentes y luego se divide entre un tipo de cambio, ese error se acumula y se vuelve visible en el reporte de utilidad.

**Regla:** los montos se guardan como **enteros en unidades menores** (centavos). `$12,345.67 USD` → `1234567`. El tipo de cambio se guarda como `Decimal128`. Toda la aritmética vive en `lib/money.ts` y se testea con Vitest.

```ts
type Money = { amount: number; currency: 'USD' | 'MXN' }  // amount en centavos
```

Cada transacción es **monomoneda** (principio bimoneda del plan v2). `exchangeRate` = MXN por 1 USD, congelado al capturar, `1` cuando la moneda es USD. Monedas mezcladas = varias filas del mismo vehículo.

### 4.3 Colecciones

```
users            (Better Auth: user, session, account, verification)
counters         { _id: 'PUR', seq: 42 }
makes            code MAKE-####,  name, isActive
models           code MODEL-####, makeId → makes, name, isActive
vehicleStatuses  code STATUS-####, name, isActive
vendors          code VEND-####,  name, contacto..., isActive
vehicles         code VEH-####,   makeId, modelId, year, vin, statusId, acquiredAt, ...
purchases        code PUR-####,   vehicleId, vendorId, purchaseDate, currency,
                                  exchangeRate, components[8], txType, void*, notes
repairs          code REP-####    (Fase 5)
expenses         code EXP-####    (Fase 6)
payments         code PAY-####    (Fase 7)
sales            code SAL-####    (Fase 8)
auditLogs        append-only: actor, acción, colección, docId, antes, después, ts
```

### 4.4 Lo que NO se replica del Spreadsheet

Las columnas calculadas (`vendor_name`, `vehicle_desc`, `total_*`, `days_in_inventory`) **no se guardan**. En Sheets existían porque una celda no puede hacer un JOIN. Aquí se calculan:

- `total_orig` / `total_usd` → funciones puras en `domain.ts`, evaluadas al leer.
- `vendor_name` / `vehicle_desc` → `$lookup` en la agregación de la vista de lista.
- `days_in_inventory` → derivado de `acquiredAt` en el render.

Guardar un total calculado es guardar una segunda verdad que puede desincronizarse. Si en algún momento una vista se vuelve lenta, se resuelve con un índice o una vista materializada explícita, no denormalizando por defecto.

Tampoco se replica `_LISTS` (era un truco de validación de datos de Sheets) ni `_README` (esa función la cumplen `openspec/specs/` y este documento).

### 4.5 Índices mínimos

```
vehicles:  { code: 1 } unique · { vin: 1 } sparse unique · { statusId: 1, acquiredAt: -1 }
purchases: { code: 1 } unique · { vehicleId: 1, purchaseDate: -1 } · { vendorId: 1 }
catálogos: { code: 1 } unique · { isActive: 1, name: 1 }
```

---

## 5. Autenticación y autorización

### 5.1 Montaje

- `src/lib/auth/auth.ts` — `betterAuth()` con `mongodbAdapter`. El adaptador usa el **driver nativo de MongoDB**, no Mongoose. Para no abrir dos conexiones, se le pasa el `MongoClient` que ya expone la conexión de Mongoose (`mongoose.connection.getClient()`).
- `src/app/api/auth/[...all]/route.ts` — `export const { GET, POST } = toNextJsHandler(auth)`.
- **Sesiones en base de datos**, no solo JWT: revocar el acceso de un capturista debe ser inmediato.

### 5.2 Roles

Tres roles, con el plugin `admin` de Better Auth y `createAccessControl()`:

| Rol | Puede |
|---|---|
| `admin` | Todo, incluido gestionar usuarios, anular y editar catálogos. |
| `capturista` | Crear compras, vehículos y catálogos. **No** puede anular ni borrar. |
| `lectura` | Solo consultar y exportar. |

Es la traducción directa de la pregunta 4 de la Parte 6 del plan v2 ("¿quién capturará?"): el capturista opera sin ver nunca la estructura de datos.

### 5.3 Dónde se verifica

| Capa | Qué hace | Qué NO hace |
|---|---|---|
| `proxy.ts` | Lee la cookie, redirige a `/login` si no existe | **No** consulta la base ni decide permisos |
| `(app)/layout.tsx` | `verifySession()` — sesión válida | No decide permisos por recurso |
| `queries.ts` / `actions.ts` | `requireRole()` antes de tocar datos | — |

La regla: **la autorización vive junto a los datos, no junto a las rutas.** Un check en el proxy es una conveniencia de UX; el que protege es el que está pegado a la consulta.

---

## 6. Convenciones de código

**Server Actions.** Firma uniforme, nunca lanzan al cliente:

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
```

**Zod como fuente única.** El mismo esquema valida en el cliente (feedback inmediato) y en el servidor (la que cuenta). El tipo de TS se deriva con `z.infer`, nunca se escribe a mano en paralelo.

**Server Components por defecto.** `'use client'` solo en la hoja del árbol que necesita estado o eventos — típicamente el formulario, no la página.

**Caché.** El sistema es un panel privado por usuario: no se cachea contenido por defecto. Después de cada action, `revalidatePath()` de la vista afectada. No activar `cacheComponents` hasta que exista una vista pública real.

**Nunca pasar documentos Mongoose a un Client Component.** `queries.ts` devuelve objetos planos serializables (DTOs).

**Idioma.** Código, nombres de archivo y campos de base de datos en **inglés**; rutas de UI, etiquetas, mensajes al usuario y specs en **español**. En los specs se conservan los conectores normativos del formato OpenSpec (`SHALL`, `WHEN`, `THEN`) porque el validador los exige.

---

## 7. Flujo de trabajo con OpenSpec

```
openspec/specs/     ← el contrato vigente. Lo que el sistema hace HOY.
openspec/changes/   ← una carpeta por cambio en curso:
                      proposal.md → specs/<cap>/spec.md (delta) → design.md → tasks.md
```

**Una fase = un change.** Se construye contra `tasks.md`; al terminar, el cambio se archiva y su delta se funde en `openspec/specs/`. Por eso `specs/` arranca vacío: hoy el sistema todavía no hace nada, y `specs/` describe lo construido, no lo prometido. `pnpm spec:validate` corre en cada commit.

Esto sustituye el "criterio de salida + validación tuya" de cada fase del plan v2, con una ventaja: los escenarios de un spec **son** los casos de prueba de Vitest. Los seis escenarios de validación de la Fase 2 del plan v2 están escritos tal cual en `docs/borrador-specs/purchases.md`, listos para convertirse en el delta de la Fase 4.

Los specs de `docs/borrador-specs/` son redacción adelantada, no contrato: cada uno se mueve a `openspec/changes/<fase>/specs/` cuando su fase arranca, y de ahí a `openspec/specs/` cuando termina.

---

## 8. Roadmap

Mismo orden que el plan v2, reordenado por lo que la migración hace necesario primero.

| Fase | Alcance | Criterio de salida |
|---|---|---|
| **0** | Base: conexión Mongo, `counters`, `money.ts`, `ActionResult`, layout del shell | `pnpm test` verde sobre `money.ts` y `counters` |
| **1** | Auth: Better Auth + roles + `dal.ts` + `proxy.ts` + `/login` | Un admin entra; un anónimo es redirigido; un capturista no ve `/usuarios` |
| **2** | Catálogos: makes, models, vehicleStatuses, vendors — CRUD con desactivación | Alta y desactivación por UI; los `code` son consecutivos |
| **3** | Vehículos: alta, listado, detalle, dropdown Make→Model dependiente | Se registra un vehículo completo desde la UI |
| **4** | Compras: los 8 componentes de costo, bimoneda, anulación, corrección | Los 6 escenarios de la Fase 2 del plan v2, ejecutados como tests |
| **5** | Migración: import del Spreadsheet + conciliación de totales | Los totales por vehículo coinciden con el Sheet al centavo |
| **6** | Consulta: buscador, detalle, resumen de costo por vehículo | Ciclo alta → consulta → corrección sin tocar la base |
| **7+** | `repairs` → `expenses` → `payments` → `sales` → dashboard | Uno por fase, cada uno con su spec |

**Decisiones de negocio pendientes** (heredadas del plan v2, siguen abiertas):

1. Frontera exacta `repairs` vs `expenses`, con tres ejemplos reales de cada lado — antes de la Fase 7.
2. ¿Los gastos generales se prorratean al costo por vehículo? — antes de `expenses`.
3. `payments`: FK polimórfica vs. columnas dedicadas — recomendación: dedicadas.
4. Manejo de venta devuelta (*return*) — antes de `sales`.
5. ¿El negocio usa *floor plan* (financiamiento de inventario)? Si sí, `financing` entra entre `payments` y `sales`.
6. ¿Qué se hace con los 6 IDs consumidos (`PUR-0001`…`PUR-0006`) en el Sheet? Recomendación: **no** migrarlos y arrancar el contador en 0 — nunca existieron como compras reales.
7. **Los nombres exactos de los 8 componentes de costo de adquisición** (columnas H:O de `PURCHASES`). El spec de compras está escrito sin fijarlos para no inventarlos; necesito la lista real antes de la Fase 4.

---

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| Redondeo de dinero en la conversión bimoneda | Enteros en centavos + `Decimal128` para el tipo de cambio; `money.test.ts` con los casos frontera del plan v2 |
| Colisión de `code` bajo concurrencia | `findOneAndUpdate({_id:'PUR'}, {$inc:{seq:1}}, {returnDocument:'after', upsert:true})` — atómico por definición, sin locks |
| Doble submit por doble clic | `useActionState` + botón deshabilitado en `pending`, e índice único sobre `code` como red final |
| Una consulta se filtra a un Client Component | `import 'server-only'` en todo `queries.ts`; el build falla si alguien lo importa desde el cliente |
| El proxy se confunde con autorización | `requireRole()` en cada action y query; el proxy solo redirige |
| Migración del Sheet incompleta o duplicada | Import idempotente por `code` + reporte de conciliación de totales antes de retirar el Sheet |
| Better Auth y Mongoose abren conexiones separadas | Pasar `mongoose.connection.getClient()` al `mongodbAdapter` |
| Se rompe la frontera de costos y un gasto se registra dos veces | Regla en `project/spec.md` + validación de dominio que rechaza el mismo comprobante en dos colecciones |

---

## Fuentes

- [Proxy (Next.js 16) — `middleware.js` está deprecado y renombrado](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Authentication — Data Access Layer y DTOs (Next.js)](https://nextjs.org/docs/app/guides/authentication)
- [I tested every major auth library for Next.js in 2026 — LogRocket](https://blog.logrocket.com/best-auth-library-nextjs-2026/)
- [NextAuth con Next.js 16 — issue de compatibilidad #13302](https://github.com/nextauthjs/next-auth/issues/13302)
- [Better Auth — MongoDB Adapter](https://better-auth.com/docs/adapters/mongo)
- [Better Auth — Next.js integration](https://better-auth.com/docs/integrations/next)
- [Better Auth — Admin plugin (roles y access control)](https://better-auth.com/docs/plugins/admin)
