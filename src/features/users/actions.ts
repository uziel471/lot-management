"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { APIError } from "better-auth"
import { getAuth } from "@/lib/auth/auth"
import { requireRole } from "@/lib/auth/dal"
import { ok, fail, failFromZodError, failFromUnknownError } from "@/lib/result"
import type { ActionResult } from "@/types/action-result"
import {
  createUserSchema,
  changeRoleSchema,
  setUserStatusSchema,
  resetPasswordSchema,
} from "./schema"
import { countActiveAdmins } from "./queries"
import type { UserDTO } from "./types"

const LAST_ADMIN_ERROR = "Debe existir al menos un administrador activo."

/** Alta de usuario. Solo `admin`. El correo debe ser único. */
export async function createUserAction(input: unknown): Promise<ActionResult<UserDTO>> {
  const session = await requireRole("admin")
  if (!session) return fail("No tienes autorización para realizar esta acción.")

  const parsed = createUserSchema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)

  const auth = await getAuth()

  try {
    const { user } = await auth.api.createUser({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        name: parsed.data.name,
        role: parsed.data.role,
      },
      headers: await headers(),
    })

    revalidatePath("/usuarios")
    return ok({
      id: user.id,
      name: user.name,
      email: user.email,
      role: parsed.data.role,
      isActive: true,
      createdAt: user.createdAt.toISOString(),
    })
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
      return fail("Ese correo ya está en uso.", { email: ["Ese correo ya está en uso."] })
    }
    return failFromUnknownError(error, "createUserAction")
  }
}

/** Cambia el rol de un usuario. Rechaza degradar al último admin activo. */
export async function changeRoleAction(input: unknown): Promise<ActionResult<null>> {
  const session = await requireRole("admin")
  if (!session) return fail("No tienes autorización para realizar esta acción.")

  const parsed = changeRoleSchema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)
  const { userId, role } = parsed.data

  const auth = await getAuth()
  const hdrs = await headers()

  try {
    if (role !== "admin") {
      const { users } = await auth.api.listUsers({ query: { limit: 1000 }, headers: hdrs })
      const target = users.find((u) => u.id === userId)
      const isDemotingAdmin = target?.role === "admin" && !target.banned
      if (isDemotingAdmin) {
        const activeAdmins = await countActiveAdmins()
        if (activeAdmins <= 1) {
          return fail(LAST_ADMIN_ERROR)
        }
      }
    }

    await auth.api.setRole({ body: { userId, role }, headers: hdrs })
    revalidatePath("/usuarios")
    return ok(null)
  } catch (error) {
    return failFromUnknownError(error, "changeRoleAction")
  }
}

/** Desactiva un usuario (ban permanente): revoca sus sesiones, preserva su registro. */
export async function deactivateUserAction(input: unknown): Promise<ActionResult<null>> {
  const session = await requireRole("admin")
  if (!session) return fail("No tienes autorización para realizar esta acción.")

  const parsed = setUserStatusSchema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)
  const { userId } = parsed.data

  const auth = await getAuth()
  const hdrs = await headers()

  try {
    const { users } = await auth.api.listUsers({ query: { limit: 1000 }, headers: hdrs })
    const target = users.find((u) => u.id === userId)
    if (target?.role === "admin" && !target.banned) {
      const activeAdmins = await countActiveAdmins()
      if (activeAdmins <= 1) {
        return fail(LAST_ADMIN_ERROR)
      }
    }

    await auth.api.banUser({
      body: { userId, banReason: "Desactivado por un administrador." },
      headers: hdrs,
    })
    // banUser ya revoca las sesiones activas del usuario.
    revalidatePath("/usuarios")
    return ok(null)
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "YOU_CANNOT_BAN_YOURSELF") {
      return fail("No puedes desactivar tu propia cuenta.")
    }
    return failFromUnknownError(error, "deactivateUserAction")
  }
}

/** Reactiva un usuario previamente desactivado; conserva su rol. */
export async function reactivateUserAction(input: unknown): Promise<ActionResult<null>> {
  const session = await requireRole("admin")
  if (!session) return fail("No tienes autorización para realizar esta acción.")

  const parsed = setUserStatusSchema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)

  const auth = await getAuth()

  try {
    await auth.api.unbanUser({ body: { userId: parsed.data.userId }, headers: await headers() })
    revalidatePath("/usuarios")
    return ok(null)
  } catch (error) {
    return failFromUnknownError(error, "reactivateUserAction")
  }
}

/** Restablece la contraseña de cualquier usuario y revoca sus sesiones activas. */
export async function resetPasswordAction(input: unknown): Promise<ActionResult<null>> {
  const session = await requireRole("admin")
  if (!session) return fail("No tienes autorización para realizar esta acción.")

  const parsed = resetPasswordSchema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)
  const { userId, newPassword } = parsed.data

  const auth = await getAuth()
  const hdrs = await headers()

  try {
    await auth.api.setUserPassword({ body: { userId, newPassword }, headers: hdrs })
    // setUserPassword no revoca sesiones por su cuenta: se hace explícito.
    await auth.api.revokeUserSessions({ body: { userId }, headers: hdrs })
    revalidatePath("/usuarios")
    return ok(null)
  } catch (error) {
    return failFromUnknownError(error, "resetPasswordAction")
  }
}
