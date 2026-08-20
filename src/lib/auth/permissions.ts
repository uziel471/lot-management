import { createAccessControl } from "better-auth/plugins/access"
import { defaultStatements } from "better-auth/plugins/admin/access"
import type { Role } from "@/types/role"

/**
 * Los tres roles y sus permisos, en código (no en base de datos): un
 * lote con tres usuarios no necesita roles configurables, y tenerlos
 * en código los hace revisables en el diff y testeables.
 *
 * Este control de acceso gobierna las operaciones administrativas de
 * Better Auth (gestionar usuarios y sus sesiones) y declara además
 * las capacidades de negocio que cada fase va agregando. La
 * verificación efectiva de las operaciones de negocio ocurre en el
 * `requireRole()` de `dal.ts`, invocado dentro de cada `queries.ts` y
 * cada `actions.ts`, junto a los datos: este objeto es la
 * declaración, no el guardia.
 */
const statement = {
  ...defaultStatements,
  /**
   * Catálogos: marcas, modelos, estatus de vehículo y proveedores.
   * `set-active` cubre desactivar y reactivar, que es lo reservado a
   * `admin`. No hay acción de borrado porque no existe la operación.
   */
  catalog: ["create", "update", "set-active"],
  /**
   * Vehículos: alta y edición para `capturista` y `admin`; anulación
   * reservada a `admin`. No hay acción de borrado.
   */
  vehicle: ["create", "update", "void"],
  /**
   * Compras: alta para `capturista` y `admin`; anulación reservada a
   * `admin`. No hay acción `update`: la compra es inmutable una vez
   * registrada (ver design.md de `add-purchases`, "La compra es
   * inmutable"), así que no existe una operación que ocultar.
   */
  purchase: ["create", "void"],
} as const

export const ac = createAccessControl(statement)

export const roles = {
  admin: ac.newRole({
    user: ["create", "list", "set-role", "ban", "delete", "set-password", "get", "update"],
    session: ["list", "revoke", "delete"],
    catalog: ["create", "update", "set-active"],
    vehicle: ["create", "update", "void"],
    purchase: ["create", "void"],
  }),
  capturista: ac.newRole({
    user: [],
    session: [],
    catalog: ["create", "update"],
    vehicle: ["create", "update"],
    purchase: ["create"],
  }),
  lectura: ac.newRole({
    user: [],
    session: [],
    catalog: [],
    vehicle: [],
    purchase: [],
  }),
} satisfies Record<Role, ReturnType<typeof ac.newRole>>

/**
 * Los roles de catálogo, expresados como listas para `requireRole()`.
 * Se derivan de la tabla de arriba y son lo que consumen `queries.ts`
 * y `actions.ts`; tenerlos en un solo lugar evita que una operación
 * nueva copie la lista equivocada.
 */
export const CATALOG_READ_ROLES: readonly Role[] = ["admin", "capturista", "lectura"]
export const CATALOG_WRITE_ROLES: readonly Role[] = ["admin", "capturista"]
export const CATALOG_SET_ACTIVE_ROLES: readonly Role[] = ["admin"]

/**
 * Los roles de vehículo, con la misma idea: `lectura` solo consulta,
 * `capturista` y `admin` registran y editan, y anular queda reservado
 * a `admin`.
 */
export const VEHICLE_READ_ROLES: readonly Role[] = ["admin", "capturista", "lectura"]
export const VEHICLE_WRITE_ROLES: readonly Role[] = ["admin", "capturista"]
export const VEHICLE_VOID_ROLES: readonly Role[] = ["admin"]

/**
 * Los roles de compra: `lectura` solo consulta, `capturista` y
 * `admin` registran, y anular queda reservado a `admin`. No hay lista
 * de edición: no existe la operación.
 */
export const PURCHASE_READ_ROLES: readonly Role[] = ["admin", "capturista", "lectura"]
export const PURCHASE_WRITE_ROLES: readonly Role[] = ["admin", "capturista"]
export const PURCHASE_VOID_ROLES: readonly Role[] = ["admin"]
