import { beforeEach, describe, expect, it, vi } from "vitest"
import { setCookieToCookieHeader } from "./helpers/cookies"

const ctx = vi.hoisted(() => ({ headers: new Headers() }))

vi.mock("next/headers", () => ({
  headers: async () => ctx.headers,
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}))

const { getAuth } = await import("@/lib/auth/auth")
const { createUserAction, changeRoleAction, deactivateUserAction } = await import(
  "@/features/users/actions"
)

async function signInAs(email: string, password: string, role: "admin" | "capturista" | "lectura") {
  const auth = await getAuth()
  await auth.api.createUser({ body: { name: "Test", email, password, role } })
  const response = await auth.api.signInEmail({ body: { email, password }, asResponse: true })
  ctx.headers = new Headers({ cookie: setCookieToCookieHeader(response.headers.get("set-cookie")) })
}

describe("autorización de operaciones de usuarios (admin-only)", () => {
  beforeEach(() => {
    ctx.headers = new Headers()
  })

  it("un capturista invocando crear un usuario es rechazado y no modifica datos", async () => {
    await signInAs("capturista@lote.com", "password123", "capturista")

    const result = await createUserAction({
      name: "Nuevo",
      email: "nuevo@lote.com",
      role: "lectura",
      password: "password123",
    })

    expect(result.ok).toBe(false)

    const auth = await getAuth()
    const adminForCheck = await createAdminAndSignIn()
    const { users } = await auth.api.listUsers({ query: {}, headers: adminForCheck })
    expect(users.some((u) => u.email === "nuevo@lote.com")).toBe(false)
  })

  it("un usuario con rol lectura invocando cualquier escritura es rechazado", async () => {
    await signInAs("lectura@lote.com", "password123", "lectura")

    const result = await deactivateUserAction({ userId: "cualquier-id" })
    expect(result.ok).toBe(false)
  })

  it("un capturista abriendo la administración de usuarios no ve datos de otros usuarios", async () => {
    await signInAs("capturista2@lote.com", "password123", "capturista")
    const { listUsers } = await import("@/features/users/queries")
    const result = await listUsers()
    expect(result).toBeNull()
  })

  it("un admin puede crear usuarios con normalidad", async () => {
    ctx.headers = await createAdminAndSignIn()

    const result = await createUserAction({
      name: "Capturista Nuevo",
      email: "capturista-nuevo@lote.com",
      role: "capturista",
      password: "password123",
    })

    expect(result.ok).toBe(true)
  })
})

describe("último administrador", () => {
  beforeEach(() => {
    ctx.headers = new Headers()
  })

  it("rechaza degradar al único admin activo", async () => {
    const auth = await getAuth()
    await auth.api.createUser({
      body: { name: "Único Admin", email: "unico@lote.com", password: "password123", role: "admin" },
    })
    const response = await auth.api.signInEmail({
      body: { email: "unico@lote.com", password: "password123" },
      asResponse: true,
    })
    ctx.headers = new Headers({ cookie: setCookieToCookieHeader(response.headers.get("set-cookie")) })

    const { users } = await auth.api.listUsers({ query: {}, headers: ctx.headers })
    const self = users.find((u) => u.email === "unico@lote.com")!

    const result = await changeRoleAction({ userId: self.id, role: "capturista" })
    expect(result.ok).toBe(false)
  })

  it("permite el cambio cuando existen dos administradores activos", async () => {
    const auth = await getAuth()
    await auth.api.createUser({
      body: { name: "Admin Uno", email: "admin1@lote.com", password: "password123", role: "admin" },
    })
    await auth.api.createUser({
      body: { name: "Admin Dos", email: "admin2@lote.com", password: "password123", role: "admin" },
    })
    const response = await auth.api.signInEmail({
      body: { email: "admin1@lote.com", password: "password123" },
      asResponse: true,
    })
    ctx.headers = new Headers({ cookie: setCookieToCookieHeader(response.headers.get("set-cookie")) })

    const { users } = await auth.api.listUsers({ query: {}, headers: ctx.headers })
    const target = users.find((u) => u.email === "admin2@lote.com")!

    const result = await changeRoleAction({ userId: target.id, role: "capturista" })
    expect(result.ok).toBe(true)
  })
})

async function createAdminAndSignIn(): Promise<Headers> {
  const auth = await getAuth()
  const email = `admin-${Math.random().toString(36).slice(2)}@lote.com`
  await auth.api.createUser({ body: { name: "Admin", email, password: "password123", role: "admin" } })
  const response = await auth.api.signInEmail({ body: { email, password: "password123" }, asResponse: true })
  return new Headers({ cookie: setCookieToCookieHeader(response.headers.get("set-cookie")) })
}
