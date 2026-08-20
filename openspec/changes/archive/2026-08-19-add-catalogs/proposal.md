# Fase 2 — Catálogos

## Why

La fase anterior dejó resueltas las reglas transversales —códigos legibles, dinero exacto, resultado de escritura, identidad— pero el sistema todavía no guarda un solo dato del negocio. Los catálogos son lo primero que debe existir porque son la única cosa que todos los módulos posteriores necesitan antes de poder crearse: un vehículo no existe sin marca, modelo y estatus; una compra no existe sin proveedor. Construirlos antes que vehículos no es una preferencia de orden, es una dependencia dura.

Son además el lugar donde el sistema anterior tenía la regla más clara y la disciplina más frágil. En el Spreadsheet, "nunca borrar un catálogo, retirarlo con `is_active=FALSE`" era una convención escrita en `_README` que dependía de que quien tuviera acceso a la hoja la respetara. Aquí deja de ser una convención: no existe una operación de borrado que invocar. Y el problema que nunca se resolvió allá —"Toyota", "toyota" y "Toyota " conviviendo como tres marcas distintas, porque una celda no normaliza nada— se resuelve aquí de una vez, antes de que haya 44 modelos capturados sobre los que descubrirlo.

Esta fase es también la primera que construye pantallas de captura reales, así que es donde se define la forma que tendrán todas las demás.

## What Changes

- Cuatro catálogos —marcas (`MAKE`), modelos (`MODEL`), estatus de vehículo (`STATUS`) y proveedores (`VEND`)— con alta, edición, desactivación y reactivación. Sin borrado, en ningún nivel.
- Unicidad de nombre insensible a mayúsculas, espacios sobrantes y acentos, mediante una clave normalizada derivada y un índice único que la respalda. Para modelos, la unicidad es dentro de su marca.
- Dependencia marca → modelo: un modelo pertenece a exactamente una marca, no puede crearse bajo una marca inactiva, y los modelos de una marca desactivada dejan de ofrecerse sin desactivarse ellos mismos.
- Proveedores con los datos de contacto que la operación usa: teléfono, correo, ciudad y notas. Comparten con los demás catálogos el código, el nombre y el estado; se distinguen solo en esos campos añadidos.
- Estatus de vehículo con orden explícito y descripción. El orden es un campo real, no el de captura: los diez estatus del sistema anterior van de 10 en 10 precisamente para poder intercalar, y "On Hold" —el último dado de alta, `STATUS-0010`— ocupa el lugar 45, entre reacondicionamiento y listo para venta. Sin ese campo, el desplegable de estatus saldría en orden alfabético o de código, y ninguno de los dos significa nada.
- Consultas de opciones activas —la que alimentará cada desplegable de los módulos siguientes— y la consulta dependiente de modelos por marca.
- Autoría en los documentos de catálogo. Hoy `catalogFields` solo tiene `code`, `name` e `isActive`; la regla de trazabilidad del spec `project` exige que toda creación y modificación registre quién y cuándo, y esta fase la extiende con `createdBy`, `updatedBy`, timestamps y el par `deactivatedAt` / `deactivatedBy`.
- Permisos de catálogo en `permissions.ts`: `capturista` da de alta y edita, solo `admin` desactiva y reactiva, `lectura` únicamente consulta.
- La capa de UI compartida que hasta hoy no existe —`PageHeader`, `DataTable`, `EmptyState`, `ConfirmDialog`, `SubmitButton`— más los componentes de shadcn que faltan. Los cuatro catálogos son su primer consumidor y comparten exactamente la misma forma, así que es aquí donde se define.
- Dos scripts para la carga inicial, porque los datos del sistema anterior van a entrar directo a la base y no por la interfaz: uno que da de alta entradas de catálogo pasando por las mismas reglas de dominio que usa la aplicación, y otro que realinea los contadores con el código más alto que exista en cada colección.

**Fuera de alcance:** vehículos (Fase 3) y compras (Fase 4).

**Sobre la carga de los datos existentes.** Los 11 makes, 44 models y 10 statuses del sistema anterior se van a administrar directamente en la base, no por un importador dentro de la aplicación. Eso tiene una consecuencia que esta fase debe resolver: una inserción directa no pasa por `nextCode`, así que deja el contador en cero y la primera alta hecha desde la interfaz intentará emitir un código ya ocupado; tampoco calcula `nameKey`, con lo que la unicidad de nombre queda sin cubrir, ni registra autoría. Por eso los dos scripts son parte de la fase y no una nota para después.

## Capabilities

### New Capabilities

- `catalogs`: el comportamiento común de las cuatro listas de referencia —identidad, unicidad de nombre, retiro sin borrado, dependencia marca→modelo e integridad referencial hacia los módulos que las consumen.

### Modified Capabilities

Ninguna. Los permisos de catálogo ya están descritos en el requisito de tres roles de `users` (`admin` administra catálogos y anulaciones; `capturista` crea pero no anula); esta fase los implementa, no los cambia. La trazabilidad de las escrituras de catálogo ya está exigida por `project`; esta fase la cumple, tampoco la modifica.

## Impact

- **Dependencias nuevas:** ninguna de producción. Se agregan componentes de shadcn/base-ui ya cubiertos por `@base-ui/react`, que está instalado.
- **Base de datos:** colecciones `makes`, `models`, `vehiclestatuses` y `vendors`. Índices únicos sobre `code` y sobre la clave de nombre normalizada —compuesta con `makeId` en el caso de modelos—. La colección `counters` recibe los cuatro prefijos nuevos.
- **Enums, no catálogos:** `body_style`, `transmission`, `fuel_type`, `drivetrain` y `title_status` son listas cerradas y se modelan como enumeraciones en código en la Fase 3, no como catálogos. No cambian, no necesitan código legible ni retiro ni autoría, y tenerlas en el diff las hace revisables.
- **Código existente que se toca:** `src/lib/db/common-fields.ts` (extender `catalogFields`), `src/lib/auth/permissions.ts` (declarar los permisos de catálogo), y el menú del layout `(app)` para agregar la sección.
- **Estructura nueva:** `src/features/catalogs/`, `src/lib/db/models/`, `src/components/shared/`, `src/app/(app)/catalogos/`.
- **Sistema anterior:** el Spreadsheet sigue en producción. Esta fase no lee ni escribe nada en él.
- **Prerrequisito:** `add-foundation-and-auth` archivado, con sus tareas 7.5 y 7.7 ejecutadas contra una instancia real de MongoDB.
