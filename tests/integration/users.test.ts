import { beforeEach, describe, expect, it, vi } from "vitest"
import { setCookieToCookieHeader } from "./helpers/cookies"

const ctx = vi.hoisted(() => ({ headers: new Headers() }))

vi.mock("next/headers", () => ({
  headers: async () => ctx.headers,
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}))

const { getAuth } = await import("@/lib/auth/auth")
const { createUserAction, deactivateUserAction } = await import("@/features/users/actions")
const { listUsers } = await import("@/features/users/queries")

async function signInAsAdmin(email = "admin@lote.com") {
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
    const first = await createUserAction({
      name: "Primero",
      email: "duplicado@lote.com",
      role: "capturista",
      password: "password123",
    })
    expect(first.ok).toBe(true)

    const second = await createUserAction({
      name: "Segundo",
      email: "duplicado@lote.com",
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
      email: "capturista-alta@lote.com",
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
      email: "desactivar@lote.com",
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
