/**
 * Los tres roles del sistema. Cada usuario tiene exactamente uno.
 *
 * - `admin`: administra usuarios, catálogos, altas y anulaciones.
 * - `capturista`: crea registros de operación; no anula ni administra usuarios.
 * - `lectura`: consulta y exporta; no escribe nada.
 */
export const ROLES = ["admin", "capturista", "lectura"] as const

export type Role = (typeof ROLES)[number]

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value)
}
