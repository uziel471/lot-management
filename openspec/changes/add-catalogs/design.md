# Diseño técnico — Catálogos

## Context

La fase anterior dejó en su lugar la conexión a MongoDB, el emisor de códigos (`lib/db/counters.ts`), la aritmética del dinero, el contrato `ActionResult` y la capa de identidad con `verifySession()` / `requireRole()`. Lo que no existe todavía es una sola colección de negocio, ni un modelo de Mongoose, ni una pantalla que no sea de sesión o de usuarios.

Esta fase construye las cuatro listas de referencia que todo lo demás va a consumir. Son, deliberadamente, el módulo más simple del sistema: no hay dinero, no hay anulación de transacciones, no hay conversión bimoneda. Eso las vuelve el lugar correcto para fijar dos cosas que después se replican doce veces —la forma de una feature y la forma de una pantalla de administración— con el costo de equivocarse todavía bajo.

El contexto arquitectónico está en `ARCHITECTURE.md`; la motivación, en `proposal.md`.

## Goals / Non-Goals

**Goals:**

- Que los cuatro catálogos compartan una sola implementación de las reglas que de verdad comparten, y que sus diferencias reales —los campos de contacto del proveedor, la marca del modelo— sean declaraciones y no ramas de código repetido.
- Que "Toyota", "toyota" y "Toyota " no puedan coexistir, garantizado por un índice de la base de datos y no solo por una validación de la aplicación.
- Que la vista de administración que se construye aquí sea la que se reutilice en vehículos y compras sin reescribirla.

**Non-Goals:**

- Importar los 11 makes, 44 models y 10 statuses del Spreadsheet. Es la Fase 5, y hacerlo aquí obligaría a escribir dos veces el mismo importador.
- Fusionar entradas duplicadas ya existentes. No hay datos todavía; si la migración descubre duplicados, se resuelven ahí.
- Jerarquías de catálogo más allá de marca → modelo. No hay una tercera.
- Búsqueda y paginación del lado del servidor. Cuarenta y cuatro modelos caben en una consulta; el `DataTable` filtra en el cliente. Se revisa cuando un catálogo pase de unos cientos de entradas.

## Decisions

### Una feature `catalogs`, cuatro definiciones declarativas

Los cuatro catálogos comparten el 90 % de su comportamiento: emitir código, normalizar y verificar el nombre, escribir con autoría, desactivar, reactivar, listar activos. Escribir cuatro veces ese 90 % garantiza que la quinta corrección de un bug se olvide en uno de los cuatro.

`src/features/catalogs/` contiene entonces un registro —`registry.ts`— donde cada catálogo declara su clave de ruta, su prefijo de código, su modelo de Mongoose, su esquema Zod, sus etiquetas en español y las columnas que muestra su tabla. `actions.ts` y `queries.ts` reciben la clave del catálogo y trabajan contra esa declaración. Las dos diferencias reales viven fuera del núcleo genérico: la validación de la marca en el alta de un modelo, y los campos de contacto del proveedor, ambos expresados en el esquema Zod de su catálogo más una regla adicional en el caso de modelos.

*Alternativa considerada:* cuatro features independientes (`makes/`, `models/`, `vehicleStatuses/`, `vendors/`), como haría la lectura literal de `ARCHITECTURE.md` §2. Es más explícita y más fácil de leer aisladamente, pero cuadruplica un archivo de acciones que sería idéntico salvo por un prefijo. La abstracción aquí es barata porque el eje de variación es conocido y cerrado: no van a aparecer catálogos con reglas radicalmente distintas; los módulos que sí las tienen —vehículos, compras— son features propias, no catálogos.

El límite de la abstracción es explícito: si un quinto catálogo necesitara una regla que no se pueda expresar como declaración, se saca del registro y se le da su propia feature, en lugar de agregar un parámetro más al núcleo.

### `nameKey` derivado, con índice único, en vez de collation

La unicidad insensible a mayúsculas se puede resolver con una collation de MongoDB (`strength: 2`). No basta: la collation resuelve mayúsculas y acentos, pero no los espacios sobrantes ni los espacios internos duplicados, que son exactamente la mitad del problema real de captura. Y deja la regla escrita en la definición del índice, donde no se puede probar con un test unitario.

Cada documento de catálogo guarda entonces un campo derivado `nameKey`, calculado por una función pura en `domain.ts`: recorta, colapsa espacios internos, normaliza a NFD, quita los diacríticos y pasa a minúsculas. El índice único va sobre `nameKey` —compuesto `{ makeId: 1, nameKey: 1 }` en modelos— y la acción verifica el duplicado antes de escribir para poder devolver un mensaje útil, con el índice como red final ante una carrera.

El pliegue de acentos tiene un costo aceptado: "Peña" y "Pena" se consideran el mismo nombre. En un catálogo de marcas y proveedores de un lote de autos, la probabilidad de que eso rechace un alta legítima es mucho menor que la de que "García Autos" y "Garcia Autos" acaben siendo dos proveedores. El mensaje de rechazo nombra la entrada existente, así que el caso raro es visible y resoluble renombrando.

### Desactivar una marca no cascadea sobre sus modelos

Si desactivar "Toyota" desactivara sus 12 modelos en la base, reactivarla no podría saber cuáles estaban activos antes: la información se perdió al escribir. La desactivación de la marca es por tanto un filtro en la consulta, no una escritura sobre los hijos. `listActiveModels(makeId)` exige que la marca esté activa, y la consulta de opciones para desplegables hace un `$lookup` —o dos consultas, dado el tamaño— que descarta los modelos cuya marca no lo está.

*Alternativa considerada:* cascada dura con un campo `deactivatedByParent` que recuerde el motivo. Funciona, pero agrega un estado tercero a un campo booleano y una regla más que mantener en cada escritura, para un caso que el filtro resuelve sin escribir nada.

### `catalogFields` gana autoría; el retiro se registra como el void

El spec `project` ya exige que toda creación, modificación y anulación registre usuario y hora del servidor. `catalogFields` hoy no lo cumple: tiene solo `code`, `name` e `isActive`. Se extiende con `createdBy`, `updatedBy`, `timestamps: true` y el par `deactivatedAt` / `deactivatedBy`, que es al retiro de un catálogo lo que `voidedAt` / `voidedBy` es a la anulación de una transacción. `nameKey` se suma también, porque lo llevan los cuatro.

No se reutiliza `auditableFields` tal cual: una entrada de catálogo no se anula, se retira, y llamar `voidReason` a un retiro confundiría dos conceptos que el negocio distingue.

### La carga directa a la base necesita dos scripts, no ninguno

Los datos del sistema anterior se van a administrar directamente en MongoDB, sin un importador dentro de la aplicación. Es una decisión razonable —son 65 registros y una sola vez— pero deja tres huecos que la aplicación va a descubrir después, no en el momento:

Un `insertMany` no pasa por `nextCode`, así que la colección `counters` se queda en cero mientras las colecciones ya tienen `MAKE-0011`. La primera alta hecha desde la interfaz pedirá `MAKE-0001`, y el índice único la rechazará con un error del motor que no dice nada útil. Tampoco calcula `nameKey`, con lo cual el índice único de nombre queda cubriendo el valor `null` de todos los documentos cargados —y el segundo de ellos falla, o peor, si el índice es sparse, "Toyota" y "toyota" conviven sin que nada lo impida. Y no registra `createdBy`, que el spec `project` exige.

Se resuelve con dos piezas:

`scripts/seed-catalogs.ts` recibe un JSON o CSV con `code`, `name` y los campos propios de cada catálogo, y da de alta pasando por la misma función de dominio que usa la Server Action: normaliza el nombre, verifica el duplicado, respeta el `code` que trae el archivo si viene y lo emite si no, y firma la autoría con un usuario administrador indicado por parámetro. Es idempotente por `nameKey`: correrlo dos veces no duplica nada y reporta lo que ya existía.

`scripts/seed-counters.ts` recorre cada colección, busca el `code` más alto realmente presente y deja el contador de ese prefijo en ese número si está por debajo. No lleva los valores del Sheet escritos a mano —`MAKE=11`, `MODEL=44`— porque esos números envejecen en cuanto alguien inserta un registro más; derivarlos de la base es correcto siempre y no hay que acordarse de actualizarlo.

*Alternativa considerada:* dejar que la carga directa sea puramente manual y confiar en que quien la haga ponga `nameKey` y ajuste el contador. Es exactamente el tipo de disciplina que el sistema anterior demostró que no sobrevive, y es lo que estos dos scripts existen para no depender de ella.

### Un segmento dinámico `[catalogo]` en vez de cuatro páginas

`src/app/(app)/catalogos/[catalogo]/page.tsx` resuelve la clave contra el registro y llama `notFound()` si no existe. Cuatro páginas idénticas salvo por un import serían la misma duplicación que la feature genérica ya evitó en el servidor. `/catalogos` queda como índice con las cuatro tarjetas.

Las rutas van en español (`/catalogos/marcas`, `/catalogos/modelos`, `/catalogos/estatus`, `/catalogos/proveedores`) y las claves internas en inglés, conforme a la convención de idioma de `ARCHITECTURE.md` §6; el registro es quien traduce entre ambas.

### La UI compartida es mínima y se construye contra un consumidor real

`src/components/shared/` recibe solo lo que los cuatro catálogos usan de verdad: `PageHeader`, `DataTable` (columnas declarativas, filtro de texto en el cliente, estado vacío), `EmptyState`, `ConfirmDialog` y `SubmitButton` (deshabilitado mientras `pending`, que es también la defensa contra el doble submit). Nada se construye "porque vehículos lo va a necesitar": lo que vehículos necesite y no exista, lo agrega vehículos.

Los formularios usan `useActionState` contra la Server Action, con el mismo esquema Zod validando en el cliente para el feedback inmediato y en el servidor como única fuente que decide.

## Risks / Trade-offs

- **La abstracción del registro puede erosionarse** → si un catálogo necesita una regla que no cabe en la declaración, se saca del registro y se le da su feature propia. La señal de alarma es el segundo `if (catalogKey === ...)` dentro de `actions.ts`.
- **El pliegue de acentos puede rechazar un nombre legítimo** → el mensaje de rechazo identifica la entrada existente que colisiona, de modo que el usuario ve por qué y puede renombrar. La función de normalización es pura y está testeada, así que cambiar la regla es cambiar un archivo y correr los tests.
- **Filtrar por marca activa en cada consulta de modelos es un `$lookup` recurrente** → con decenas de marcas y cientos de modelos es irrelevante; si un día deja de serlo, se resuelve con un índice o cacheando el conjunto de marcas activas, no denormalizando el estado en el modelo.
- **La carga directa a la base puede seguir haciéndose sin los scripts** → nada impide un `insertMany` desde una consola de Mongo, y el resultado son documentos sin `nameKey` ni autoría y un contador desfasado. La mitigación es que `seed-counters.ts` sea barato de correr y que la fase documente el orden: cargar, correr los contadores, y recién entonces usar la interfaz. El test 9.9 verifica que un documento cargado sin `nameKey` es detectable.
- **`DataTable` sin paginación del servidor** → aceptable hasta unos cientos de filas. El punto de revisión es el catálogo de modelos si el negocio empieza a cargar el catálogo completo de una marca.

## Migration Plan

Las cuatro colecciones nacen vacías y sus índices se crean con los modelos de Mongoose. Los 65 registros del sistema anterior entran directamente a la base, en este orden:

1. Cargar los catálogos con `scripts/seed-catalogs.ts`, que normaliza el nombre, firma la autoría y respeta los códigos originales.
2. Correr `scripts/seed-counters.ts` para dejar cada contador en el código más alto que quedó en la base.
3. Recién entonces usar la interfaz.

Invertir los pasos 2 y 3 no pierde datos, pero la primera alta desde la interfaz falla por código duplicado hasta que los contadores se realineen.

Los diez estatus del sistema anterior llegan con su orden: 10, 20, 30, 40, **45**, 50, 60, 70, 80, 90. El 45 corresponde a "On Hold", que fue el último dado de alta (`STATUS-0010`) y va intercalado entre reacondicionamiento y listo para venta — es el caso que justifica el campo.

La reversión consiste en vaciar las cuatro colecciones y los cuatro contadores: mientras no existan vehículos ni compras, nada las referencia.

## Open Questions

- **¿Un proveedor puede tener tipo (subasta, dealer, particular)?** El sistema anterior lo modelaba como `source_type` en la compra, no en el proveedor. Se mantiene así aquí; si al capturar compras resulta que el tipo es siempre el mismo por proveedor, se mueve en la Fase 4.
- **¿La descripción del estatus se muestra al capturar?** Los diez estatus traen una descripción que explica cuándo aplicarlos ("Detenido temporalmente: título, piezas, decisión administrativa"). Es información útil en el momento de elegir, pero un desplegable con diez descripciones largas es ruidoso. Se resuelve al construir el formulario de vehículo, probablemente como texto de ayuda del estatus seleccionado.
