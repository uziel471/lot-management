import { beforeEach, describe, expect, it, vi } from "vitest"
import { setCookieToCookieHeader } from "./helpers/cookies"

const ctx = vi.hoisted(() => ({ headers: new Headers() }))

vi.mock("next/headers", () => ({
  headers: async () => ctx.headers,
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}))

const { getAuth } = await import("@/lib/auth/auth")
const { verifySession } = await import("@/lib/auth/dal")

let sequence = 0

async function createActiveUser(email: string, password: string, role: "admin" | "capturista" | "lectura" = "capturista") {
  const auth = await getAuth()
  await auth.api.createUser({ body: { name: "Test User", email, password, role } })
}

describe("inicio de sesión con credenciales", () => {
  beforeEach(() => {
    ctx.headers = new Headers()
  })

  it("acepta credenciales correctas y crea una sesión", async () => {
    await createActiveUser("valid@lote.com", "password123")
    const auth = await getAuth()

    const response = await auth.api.signInEmail({
      body: { email: "valid@lote.com", password: "password123" },
      asResponse: true,
    })

    expect(response.status).toBeLessThan(300)
    expect(response.headers.get("set-cookie")).toBeTruthy()
  })

  it("responde con mensaje genérico ante contraseña incorrecta", async () => {
    await createActiveUser("wrongpass@lote.com", "password123")
    const auth = await getAuth()

    await expect(
      auth.api.signInEmail({ body: { email: "wrongpass@lote.com", password: "incorrecta" } }),
    ).rejects.toMatchObject({ body: { code: "INVALID_EMAIL_OR_PASSWORD" } })
  })

  it("responde el mismo mensaje genérico ante un correo no registrado", async () => {
    const auth = await getAuth()

    await expect(
      auth.api.signInEmail({ body: { email: "no-existe@lote.com", password: "cualquiera123" } }),
    ).rejects.toMatchObject({ body: { code: "INVALID_EMAIL_OR_PASSWORD" } })
  })

  it("rechaza el inicio de sesión de un usuario desactivado", async () => {
    await createActiveUser("banned@lote.com", "password123")
    const auth = await getAuth()

    const { users } = await auth.api.listUsers({
      query: { searchField: "email", searchValue: "banned@lote.com" },
      headers: await adminHeaders(),
    })
    const target = users[0]!

    await auth.api.banUser({
      body: { userId: target.id, banReason: "prueba" },
      headers: await adminHeaders(),
    })

    await expect(
      auth.api.signInEmail({ body: { email: "banned@lote.com", password: "password123" } }),
    ).rejects.toThrow()
  })
})

describe("sesión revocable del lado del servidor", () => {
  beforeEach(() => {
    ctx.headers = new Headers()
  })

  it("una sesión revocada deja de ser válida en la siguiente petición", async () => {
    await createActiveUser("revoke@lote.com", "password123")
    const auth = await getAuth()

    const signInResponse = await auth.api.signInEmail({
      body: { email: "revoke@lote.com", password: "password123" },
      asResponse: true,
    })
    const cookie = setCookieToCookieHeader(signInResponse.headers.get("set-cookie"))
    const sessionHeaders = new Headers({ cookie })

    const sessionBefore = await auth.api.getSession({ headers: sessionHeaders })
    expect(sessionBefore?.user.email).toBe("revoke@lote.com")

    await auth.api.revokeUserSessions({
      body: { userId: sessionBefore!.user.id },
      headers: await adminHeaders(),
    })

    const sessionAfter = await auth.api.getSession({ headers: sessionHeaders })
    expect(sessionAfter).toBeNull()
  })

  it("cerrar sesión elimina la sesión del servidor", async () => {
    await createActiveUser("signout@lote.com", "password123")
    const auth = await getAuth()

    const signInResponse = await auth.api.signInEmail({
      body: { email: "signout@lote.com", password: "password123" },
      asResponse: true,
    })
    const cookie = setCookieToCookieHeader(signInResponse.headers.get("set-cookie"))
    const sessionHeaders = new Headers({ cookie })

    await auth.api.signOut({ headers: sessionHeaders })
    const sessionAfter = await auth.api.getSession({ headers: sessionHeaders })
    expect(sessionAfter).toBeNull()
  })
})

describe("verifySession()", () => {
  beforeEach(() => {
    ctx.headers = new Headers()
  })

  it("redirige a /login cuando no hay sesión", async () => {
    await expect(verifySession()).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") })
  })
})

// Sesión de un admin de prueba, usada para operaciones administrativas
// (listUsers, banUser, revokeUserSessions) en estos tests. No se
// cachea entre tests: `tests/setup.ts` limpia todas las colecciones
// en cada `afterEach`, así que cada test necesita su propio admin.
async function adminHeaders(): Promise<Headers> {
  const auth = await getAuth()
  sequence++
  const email = `admin-fixture-${sequence}@lote.com`
  await auth.api.createUser({
    body: { name: "Admin de prueba", email, password: "password123", role: "admin" },
  })
  const response = await auth.api.signInEmail({
    body: { email, password: "password123" },
    asResponse: true,
  })
  return new Headers({ cookie: setCookieToCookieHeader(response.headers.get("set-cookie")) })
}
