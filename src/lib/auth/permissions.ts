import { createAccessControl } from "better-auth/plugins/access"
import { defaultStatements } from "better-auth/plugins/admin/access"
import type { Role } from "@/types/role"

/**
 * Los tres roles y sus permisos, en código (no en base de datos): un
 * lote con tres usuarios no necesita roles configurables, y tenerlos
 * en código los hace revisables en el diff y testeables.
 *
 * Este control de acceso gobierna las operaciones administrativas de
 * Better Auth (gestionar usuarios y sus sesiones). La autorización de
 * las operaciones de negocio (vehículos, compras, catálogos) se
 * agrega feature por feature, en su propio `requireRole()` de
 * `dal.ts` — esta fase solo tiene la capacidad `users`.
 */
const statement = {
  ...defaultStatements,
} as const

export const ac = createAccessControl(statement)

export const roles = {
  admin: ac.newRole({
    user: ["create", "list", "set-role", "ban", "delete", "set-password", "get", "update"],
    session: ["list", "revoke", "delete"],
  }),
  capturista: ac.newRole({
    user: [],
    session: [],
  }),
  lectura: ac.newRole({
    user: [],
    session: [],
  }),
} satisfies Record<Role, ReturnType<typeof ac.newRole>>
