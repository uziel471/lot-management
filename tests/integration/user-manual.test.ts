import { PDFDocument } from "pdf-lib"
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { setCookieToCookieHeader } from "./helpers/cookies"

const ctx = vi.hoisted(() => ({ headers: new Headers() }))

vi.mock("next/headers", () => ({
  headers: async () => ctx.headers,
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}))

const { getAuth } = await import("@/lib/auth/auth")
const { GET } = await import("@/app/(app)/manual/usuario.pdf/route")
const { USER_MANUAL, REQUIRED_MANUAL_SECTION_TITLES, manualTextForValidation } = await import(
  "@/features/user-manual/content"
)

type Role = "admin" | "capturista" | "lectura"

let sequence = 0

async function signInAs(role: Role) {
  sequence++
  const email = `${role}-manual-${sequence}@lote.com`
  const auth = await getAuth()
  await auth.api.createUser({
    body: { name: `${role} ${sequence}`, email, password: "password123", role },
  })
  const response = await auth.api.signInEmail({
    body: { email, password: "password123" },
    asResponse: true,
  })
  ctx.headers = new Headers({
    cookie: setCookieToCookieHeader(response.headers.get("set-cookie")),
  })
}

beforeEach(() => {
  ctx.headers = new Headers()
})

describe("manual de usuario", () => {
  it("denies direct PDF access without a session", async () => {
    await expect(GET()).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") })
  })

  it.each<Role>(["admin", "capturista", "lectura"])(
    "returns the PDF download for authenticated %s users",
    async (role) => {
      await signInAs(role)

      const response = await GET()
      const body = new Uint8Array(await response.arrayBuffer())
      const pdf = await PDFDocument.load(body)

      expect(response.status).toBe(200)
      expect(response.headers.get("Content-Type")).toBe("application/pdf")
      expect(response.headers.get("Content-Disposition")).toBe(
        'attachment; filename="manual-usuario-lote-vehiculos.pdf"',
      )
      expect(new TextDecoder().decode(body.slice(0, 5))).toBe("%PDF-")
      expect(pdf.getTitle()).toBe("LOTE VEHICULOS - Manual de usuario")
      expect(pdf.getSubject()).toBe("Manual operativo de usuario")
      expect(pdf.getPageCount()).toBeGreaterThan(2)
    },
  )

  it("renders visible PDF text beyond the table of contents", async () => {
    await signInAs("admin")

    const response = await GET()
    const body = new Uint8Array(await response.arrayBuffer())
    const dir = mkdtempSync(join(tmpdir(), "manual-pdf-"))
    const pdfPath = join(dir, "manual.pdf")

    try {
      writeFileSync(pdfPath, body)
      const extracted = execFileSync("pdftotext", [pdfPath, "-"], { encoding: "utf8" })

      expect(extracted).toContain("Vehiculos")
      expect(extracted).toContain("Compras")
      expect(extracted).toContain("Pagos")
      expect(extracted).toContain("Errores de validacion")
      expect(extracted).toContain("Registros anulados o inactivos")
      expect(extracted).toContain("La anulacion preserva trazabilidad")
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("keeps required module sections, revision metadata, and user-facing content in the source", () => {
    const text = manualTextForValidation()

    expect(USER_MANUAL.publicationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(USER_MANUAL.revision).toBeTruthy()
    for (const title of REQUIRED_MANUAL_SECTION_TITLES) {
      expect(text).toContain(title)
    }
    expect(text).toContain("formularios recuperables conservan los valores capturados")
    expect(text).toContain("anulados")
    expect(text).not.toMatch(/MONGODB_URI|BETTER_AUTH_SECRET|SUPABASE_SERVICE_ROLE_KEY|stack trace|collection|schema/i)
  })
})
