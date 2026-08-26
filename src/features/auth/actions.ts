"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { APIError } from "better-auth"
import { getAuth } from "@/lib/auth/auth"
import { verifySession } from "@/lib/auth/dal"
import { loginSchema, changeOwnPasswordSchema } from "./schema"

export type LoginState = { error?: string } | undefined

const GENERIC_CREDENTIALS_ERROR = "Correo o contraseña incorrectos."

function isSafeInternalPath(path: string | undefined): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//")
}

/**
 * Server Action del formulario de login. Devuelve un mensaje
 * genérico ante cualquier combinación de credenciales inválidas
 * (correo inexistente o contraseña incorrecta), y conserva la ruta
 * solicitada para redirigir a ella tras un inicio de sesión correcto.
 */
export async function signInAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  })

  if (!parsed.success) {
    return { error: GENERIC_CREDENTIALS_ERROR }
  }

  const { email, password, next } = parsed.data
  const auth = await getAuth()

  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    })
  } catch (error) {
    if (error instanceof APIError) {
      if (error.body?.code === "INVALID_EMAIL_OR_PASSWORD") {
        return { error: GENERIC_CREDENTIALS_ERROR }
      }
      if (error.status === "FORBIDDEN") {
        // Usuario desactivado (baneado): Better Auth rechaza la
        // creación de sesión antes de que llegue aquí.
        return { error: error.body?.message ?? "Tu cuenta está desactivada." }
      }
    }
    console.error("[signInAction]", error)
    return { error: "Ocurrió un error inesperado. Intenta de nuevo." }
  }

  redirect(isSafeInternalPath(next) ? next : "/dashboard")
}

/** Cierra la sesión actual y borra la cookie. */
export async function signOutAction(): Promise<void> {
  const auth = await getAuth()
  await auth.api.signOut({ headers: await headers() })
  redirect("/login")
}

export type ChangeOwnPasswordFieldErrors = Partial<
  Record<"currentPassword" | "newPassword" | "confirmPassword", string[]>
>

export type ChangeOwnPasswordState =
  | {
      error?: string
      success?: boolean
      fieldErrors?: ChangeOwnPasswordFieldErrors
    }
  | undefined

/** Cambio de contraseña propio: exige confirmar la actual y revoca las demás sesiones. */
export async function changeOwnPasswordAction(
  _prevState: ChangeOwnPasswordState,
  formData: FormData,
): Promise<ChangeOwnPasswordState> {
  // La sesión ya fue establecida por el layout de `(app)`; aquí solo
  // se necesita para pasar `headers()` con la cookie a Better Auth.
  await verifySession()

  const parsed = changeOwnPasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Datos invalidos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const auth = await getAuth()

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    })
  } catch (error) {
    if (error instanceof APIError) {
      return { error: "La contraseña actual no es correcta." }
    }
    console.error("[changeOwnPasswordAction]", error)
    return { error: "Ocurrió un error inesperado. Intenta de nuevo." }
  }

  return { success: true }
}
