# LOTE VEHICULOS · Management

Sistema de gestión de inventario, compras y costos de un lote de vehículos.
Next.js 16 (App Router, Server Actions), MongoDB con Mongoose, Better Auth y Vitest.

- `ARCHITECTURE.md` — decisiones de arquitectura y convenciones.
- `openspec/` — el contrato: `specs/` es lo que el sistema hace hoy; `changes/` lo que está en curso.
- `AGENTS.md` — notas para agentes que trabajan en el repositorio.

## Requisitos

- Node 22
- pnpm 8
- MongoDB accesible (local o Atlas)

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local     # completar MONGODB_URI, MONGODB_DB y BETTER_AUTH_SECRET
pnpm dev
```

El secreto se genera con `openssl rand -base64 32`.

### Datos iniciales, en este orden

1. **Primer administrador.** Sin él no hay con quién entrar ni a nombre de quién firmar las cargas.

   ```bash
   SEED_ADMIN_NAME="Nombre" SEED_ADMIN_EMAIL="admin@lote.com" \
   SEED_ADMIN_PASSWORD="contraseña-segura" pnpm seed:admin
   ```

2. **Catálogos.** La carga pasa por las mismas reglas de dominio que la aplicación: normaliza el
   nombre, verifica duplicados, respeta el `code` del archivo si viene y firma la autoría. Es
   idempotente por nombre normalizado: correrla dos veces no duplica nada y reporta lo que ya existía.

   ```bash
   pnpm seed:catalogs --catalog=marcas      --file=./data/makes.json    --author=admin@lote.com
   pnpm seed:catalogs --catalog=modelos     --file=./data/models.json   --author=admin@lote.com
   pnpm seed:catalogs --catalog=estatus     --file=./data/statuses.json --author=admin@lote.com
   pnpm seed:catalogs --catalog=proveedores --file=./data/vendors.json  --author=admin@lote.com
   ```

   Acepta JSON (arreglo de objetos) o CSV con encabezado. Columnas por catálogo:

   | Catálogo | Columnas |
   |---|---|
   | `marcas` | `name`; `code` opcional |
   | `modelos` | `name`, `make` o `makeCode`; `code` opcional |
   | `estatus` | `name`, `sortOrder`; `description` y `code` opcionales |
   | `proveedores` | `name`; `phone`, `email`, `city`, `notes` y `code` opcionales |

   `--dry-run` informa sin escribir. Las marcas se cargan antes que los modelos.

3. **Contadores.** Una inserción directa no pasa por `nextCode()`, así que deja los contadores en
   cero mientras las colecciones ya tienen `MAKE-0011`. Este comando los deja en el código más alto
   que exista en cada colección; nunca los baja.

   ```bash
   pnpm seed:counters
   ```

4. **Recién entonces, la interfaz.** Invertir los pasos 3 y 4 no pierde datos, pero la primera alta
   hecha desde la aplicación falla por código duplicado hasta que los contadores se realineen.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción (incluye typecheck) |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest: unitarios y de integración (MongoDB en memoria) |
| `pnpm spec:validate` | Valida los specs de OpenSpec en modo estricto |
| `pnpm seed:admin` | Alta del primer administrador |
| `pnpm seed:catalogs` | Carga de catálogos |
| `pnpm seed:counters` | Realinea los contadores de códigos |
