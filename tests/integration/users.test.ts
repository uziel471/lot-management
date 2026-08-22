import { beforeEach, describe, expect, it, vi } from "vitest"
import { setCookieToCookieHeader } from "./helpers/cookies"

const ctx = vi.hoisted(() => ({ headers: new Headers() }))

vi.mock("next/headers", () => ({
  headers: async () => ctx.headers,
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}))

const { getAuth } = await import("@/lib/auth/auth")
const { createUserAction, deactivateUserAction, resetPasswordAction, updateUserAction } = await import(
  "@/features/users/actions"
)
const { listUsers } = await import("@/features/users/queries")

function uniqueEmail(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2)}@lote.com`
}

async function signInAsAdmin(email = uniqueEmail("admin")) {
  const auth = await getAuth()
  await auth.api.createUser({ body: { name: "Admin", email, password: "password123", role: "admin" } })
  const response = await auth.api.signInEmail({ body: { email, password: "password123" }, asResponse: true })
  ctx.headers = new Headers({ cookie: setCookieToCookieHeader(response.headers.get("set-cookie")) })
}

describe("alta de usuarios", () => {
  beforeEach(async () => {
    ctx.headers = new Headers()
    await signInAsAdmin()
  })

  it("rechaza un correo duplicado", async () => {
    const duplicateEmail = uniqueEmail("duplicado")
    const first = await createUserAction({
      name: "Primero",
      email: duplicateEmail,
      role: "capturista",
      password: "password123",
    })
    expect(first.ok).toBe(true)

    const second = await createUserAction({
      name: "Segundo",
      email: duplicateEmail,
      role: "lectura",
      password: "password123",
    })
    expect(second.ok).toBe(false)
    if (!second.ok) {
      expect(second.error).toContain("correo")
    }
  })

  it("crea el usuario activo con el rol indicado", async () => {
    const result = await createUserAction({
      name: "Nueva Capturista",
      email: uniqueEmail("capturista-alta"),
      role: "capturista",
      password: "password123",
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.role).toBe("capturista")
      expect(result.data.isActive).toBe(true)
    }
  })
})

describe("desactivación preserva el registro del usuario", () => {
  beforeEach(async () => {
    ctx.headers = new Headers()
    await signInAsAdmin()
  })

  it("conserva nombre y correo tras desactivar al usuario que los creó", async () => {
    const created = await createUserAction({
      name: "Capturista a desactivar",
      email: uniqueEmail("desactivar"),
      role: "capturista",
      password: "password123",
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const deactivated = await deactivateUserAction({ userId: created.data.id })
    expect(deactivated.ok).toBe(true)

    const users = await listUsers()
    const preserved = users?.find((u) => u.id === created.data.id)
    expect(preserved).toBeDefined()
    expect(preserved?.name).toBe("Capturista a desactivar")
    expect(preserved?.isActive).toBe(false)
  })
})

describe("edición y restablecimiento administrativo", () => {
  beforeEach(async () => {
    ctx.headers = new Headers()
    await signInAsAdmin()
  })

  it("actualiza nombre, correo y rol del usuario", async () => {
    const updatedEmail = uniqueEmail("usuario-editado")
    const created = await createUserAction({
      name: "Usuario Original",
      email: uniqueEmail("usuario-original"),
      role: "capturista",
      password: "password123",
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const updated = await updateUserAction({
      userId: created.data.id,
      name: "Usuario Editado",
      email: updatedEmail,
      role: "lectura",
    })

    expect(updated.ok).toBe(true)
    if (updated.ok) {
      expect(updated.data.name).toBe("Usuario Editado")
      expect(updated.data.email).toBe(updatedEmail)
      expect(updated.data.role).toBe("lectura")
    }
  })

  it("revoca las sesiones activas al restablecer la contraseña", async () => {
    const auth = await getAuth()

    const created = await createUserAction({
      name: "Usuario Con Sesion",
      email: uniqueEmail("sesion-usuario"),
      role: "capturista",
      password: "password123",
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const userSignIn = await auth.api.signInEmail({
      body: { email: created.data.email, password: "password123" },
      asResponse: true,
    })
    const userHeaders = new Headers({
      cookie: setCookieToCookieHeader(userSignIn.headers.get("set-cookie")),
    })

    const reset = await resetPasswordAction({
      userId: created.data.id,
      newPassword: "nuevaPassword123",
    })
    expect(reset.ok).toBe(true)

    const sessionAfterReset = await auth.api.getSession({ headers: userHeaders })
    expect(sessionAfterReset).toBeNull()

    const signInWithNewPassword = await auth.api.signInEmail({
      body: { email: created.data.email, password: "nuevaPassword123" },
      asResponse: true,
    })
    expect(signInWithNewPassword.status).toBe(200)
  })
})
