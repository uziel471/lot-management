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
  /**
   * Reparaciones: alta y cambios de ciclo de vida para `capturista`
   * y `admin`; anulación reservada a `admin`. No hay `update`: una
   * reparación se consulta y cambia de estado, no se reescribe como
   * registro abierto después de capturarla.
   */
  repair: ["create", "transition", "complete", "cancel", "void"],
  /**
   * Gastos: alta para `capturista` y `admin`; anulación reservada a
   * `admin`. No hay edición: el gasto es inmutable después del alta.
   */
  expense: ["create", "void"],
  /**
   * Pagos: alta para `capturista` y `admin`; anulación reservada a
   * `admin`. No hay edición ni borrado: el pago es inmutable después
   * del alta.
   */
  payment: ["create", "void"],
  /**
   * Ventas: alta para `capturista` y `admin`; anulación reservada a
   * `admin`. La venta es inmutable fuera de esa anulación.
   */
  sale: ["create", "void"],
} as const

export const ac = createAccessControl(statement)

export const roles = {
  admin: ac.newRole({
    user: ["create", "list", "set-role", "ban", "delete", "set-password", "set-email", "get", "update"],
    session: ["list", "revoke", "delete"],
    catalog: ["create", "update", "set-active"],
    vehicle: ["create", "update", "void"],
    purchase: ["create", "void"],
    repair: ["create", "transition", "complete", "cancel", "void"],
    expense: ["create", "void"],
    payment: ["create", "void"],
    sale: ["create", "void"],
  }),
  capturista: ac.newRole({
    user: [],
    session: [],
    catalog: ["create", "update"],
    vehicle: ["create", "update"],
    purchase: ["create"],
    repair: ["create", "transition", "complete", "cancel"],
    expense: ["create"],
    payment: ["create"],
    sale: ["create"],
  }),
  lectura: ac.newRole({
    user: [],
    session: [],
    catalog: [],
    repair: [],
    vehicle: [],
    purchase: [],
    expense: [],
    payment: [],
    sale: [],
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

/**
 * Los roles de reparaciones: `lectura` solo consulta, `capturista`
 * y `admin` registran y gestionan el ciclo operativo, y anular queda
 * reservado a `admin`.
 */
export const REPAIR_READ_ROLES: readonly Role[] = ["admin", "capturista", "lectura"]
export const REPAIR_WRITE_ROLES: readonly Role[] = ["admin", "capturista"]
export const REPAIR_VOID_ROLES: readonly Role[] = ["admin"]

/**
 * Los roles de gastos: `lectura` solo consulta, `capturista` y
 * `admin` registran, y anular queda reservado a `admin`.
 */
export const EXPENSE_READ_ROLES: readonly Role[] = ["admin", "capturista", "lectura"]
export const EXPENSE_WRITE_ROLES: readonly Role[] = ["admin", "capturista"]
export const EXPENSE_VOID_ROLES: readonly Role[] = ["admin"]

/**
 * Los roles de pagos: `lectura` solo consulta, `capturista` y
 * `admin` registran, y anular queda reservado a `admin`.
 */
export const PAYMENT_READ_ROLES: readonly Role[] = ["admin", "capturista", "lectura"]
export const PAYMENT_WRITE_ROLES: readonly Role[] = ["admin", "capturista"]
export const PAYMENT_VOID_ROLES: readonly Role[] = ["admin"]

export const SALE_READ_ROLES: readonly Role[] = ["admin", "capturista", "lectura"]
export const SALE_WRITE_ROLES: readonly Role[] = ["admin", "capturista"]
export const SALE_VOID_ROLES: readonly Role[] = ["admin"]

export const DASHBOARD_READ_ROLES: readonly Role[] = ["admin", "lectura"]
export const REPORT_READ_ROLES: readonly Role[] = ["admin", "lectura"]
export const REPORT_EXPORT_ROLES: readonly Role[] = ["admin", "lectura"]
export const MANUAL_READ_ROLES: readonly Role[] = ["admin", "capturista", "lectura"]
