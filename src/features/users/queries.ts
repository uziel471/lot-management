import "server-only"
import { headers } from "next/headers"
import { getAuth } from "@/lib/auth/auth"
import { requireRole } from "@/lib/auth/dal"
import { isRole } from "@/types/role"
import type { UserDTO } from "./types"

function toDTO(user: {
  id: string
  name: string
  email: string
  role?: string | null
  banned?: boolean | null
  createdAt: Date
}): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: isRole(user.role) ? user.role : "lectura",
    isActive: !user.banned,
    createdAt: user.createdAt.toISOString(),
  }
}

/** Listado de usuarios, solo para `admin`. Devuelve `null` si el usuario en sesión no es admin. */
export async function listUsers(): Promise<UserDTO[] | null> {
  const session = await requireRole("admin")
  if (!session) return null

  const auth = await getAuth()
  const { users } = await auth.api.listUsers({
    query: { sortBy: "createdAt", sortDirection: "asc", limit: 200 },
    headers: await headers(),
  })

  return users.map(toDTO)
}

/** Cuenta cuántos administradores activos (no desactivados) existen. */
export async function countActiveAdmins(): Promise<number> {
  const auth = await getAuth()
  const { users } = await auth.api.listUsers({
    query: {
      filterField: "role",
      filterOperator: "eq",
      filterValue: "admin",
      limit: 200,
    },
    headers: await headers(),
  })
  return users.filter((user) => !user.banned).length
}
