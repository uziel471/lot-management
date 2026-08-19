import "server-only"
import { cache } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getAuth } from "./auth"
import { isRole, type Role } from "@/types/role"

export type SessionUser = {
  id: string
  name: string
  email: string
  role: Role
}

/**
 * Verifica que exista una sesión válida contra la base de datos (no
 * solo la cookie: eso es lo que hace `proxy.ts`, de forma optimista).
 * Memoizada con `cache()` de React para no repetir la consulta
 * dentro de un mismo render. Redirige a `/login` si no hay sesión
 * válida — este es el respaldo real de autenticación.
 */
export const verifySession = cache(async () => {
  const auth = await getAuth()
  const result = await auth.api.getSession({ headers: await headers() })

  if (!result?.session || !result.user) {
    redirect("/login")
  }

  const role: Role = isRole(result.user.role) ? result.user.role : "lectura"

  return {
    session: result.session,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role,
    } satisfies SessionUser,
  }
})

/**
 * Verifica sesión y rol. Es la autorización real del sistema: se
 * invoca en cada `queries.ts` y cada `actions.ts`, inmediatamente
 * antes de tocar datos — nunca solo en `proxy.ts` ni solo en el
 * layout.
 *
 * Devuelve `{ user, session }` si el usuario tiene uno de los roles
 * permitidos, o `null` si no. Deliberadamente no redirige ni lanza:
 * una página puede llamar `unauthorized()` al recibir `null`, pero
 * una Server Action debe devolver un `ActionResult` de error, nunca
 * navegar fuera del formulario que la invocó.
 */
export async function requireRole(allowed: Role | Role[]) {
  const { user, session } = await verifySession()
  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed]

  if (!allowedRoles.includes(user.role)) {
    return null
  }

  return { user, session }
}
