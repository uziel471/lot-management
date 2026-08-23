import { beforeEach, describe, expect, it, vi } from "vitest"
import { setCookieToCookieHeader } from "./helpers/cookies"

const ctx = vi.hoisted(() => ({ headers: new Headers() }))

vi.mock("next/headers", () => ({
  headers: async () => ctx.headers,
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}))

vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }))

const { getAuth } = await import("@/lib/auth/auth")
const { createCatalogEntry } = await import("@/features/catalogs/actions")
const { createVehicle } = await import("@/features/vehicles/actions")
const { createPurchase } = await import("@/features/purchases/actions")
const { createPayment, voidPayment } = await import("@/features/payments/actions")
const { getReportExport, getReportResult, listReportCatalog } = await import("@/features/reports/queries")

type Role = "admin" | "capturista" | "lectura"

let sequence = 0
let tokenSequence = 0

async function signInAs(role: Role): Promise<{ id: string; email: string }> {
  sequence++
  const email = `${role}-reports-${sequence}@lote.com`
  const auth = await getAuth()
  const { user } = await auth.api.createUser({
    body: { name: `${role} ${sequence}`, email, password: "password123", role },
  })
  const response = await auth.api.signInEmail({
    body: { email, password: "password123" },
    asResponse: true,
  })
  ctx.headers = new Headers({
    cookie: setCookieToCookieHeader(response.headers.get("set-cookie")),
  })
  return { id: user.id, email }
}

function nextToken(prefix: string) {
  tokenSequence++
  return `${prefix}-${tokenSequence}`
}

async function seedVehicleAndVendor() {
  const suffix = `${sequence}-${tokenSequence + 1}`
  const make = await createCatalogEntry("makes", { name: `Toyota reportes ${suffix}` })
  if (!make.ok) throw new Error(make.error)
  const model = await createCatalogEntry("models", { name: `Corolla reportes ${suffix}`, makeId: make.data.id })
  if (!model.ok) throw new Error(model.error)
  const status = await createCatalogEntry("vehicleStatuses", { name: `Disponible reportes ${suffix}`, sortOrder: 10 })
  if (!status.ok) throw new Error(status.error)
  const vendor = await createCatalogEntry("vendors", { name: `Proveedor reportes ${suffix}` })
  if (!vendor.ok) throw new Error(vendor.error)

  const vehicle = await createVehicle({
    makeId: make.data.id,
    modelId: model.data.id,
    statusId: status.data.id,
    year: "2021",
    dateReceived: "2026-08-01",
  })
  if (!vehicle.ok) throw new Error(vehicle.error)

  return { vehicle: vehicle.data, vendor: vendor.data }
}

beforeEach(() => {
  ctx.headers = new Headers()
})

async function expectRedirectToLogin(promise: Promise<unknown>) {
  await expect(promise).rejects.toMatchObject({ message: "NEXT_REDIRECT" })
}

describe("reportes", () => {
  it("authorizes catalog, report reads, and exports only for admin and lectura", async () => {
    await expectRedirectToLogin(listReportCatalog())
    await expectRedirectToLogin(getReportResult("profit-loss", { preset: "thisMonth" }))
    await expectRedirectToLogin(getReportExport("profit-loss", { preset: "thisMonth" }, "pdf"))

    await signInAs("capturista")
    expect(await listReportCatalog()).toBeNull()
    expect(await getReportResult("profit-loss", { preset: "thisMonth" })).toBeNull()
    expect(await getReportExport("profit-loss", { preset: "thisMonth" }, "pdf")).toBeNull()

    await signInAs("lectura")
    const lecturaCatalog = await listReportCatalog()
    const lecturaReport = await getReportResult("profit-loss", { preset: "thisMonth" })
    const lecturaExport = await getReportExport("profit-loss", { preset: "thisMonth" }, "pdf")

    expect(lecturaCatalog).not.toBeNull()
    expect(lecturaReport).not.toBeNull()
    expect(lecturaExport?.contentType).toBe("application/pdf")

    await signInAs("admin")
    const adminCatalog = await listReportCatalog()
    const adminReport = await getReportResult("profit-loss", { preset: "thisMonth" })
    const adminExport = await getReportExport("profit-loss", { preset: "thisMonth" }, "csv")

    expect(adminCatalog).not.toBeNull()
    expect(adminReport).not.toBeNull()
    expect(adminExport?.contentType).toContain("text/csv")
  })

  it("keeps payable balances based on active applications and ignores voided payments", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()

    const purchase = await createPurchase({
      vehicleId: vehicle.id,
      vendorId: vendor.id,
      purchaseDate: "2026-08-05",
      sourceType: "auction",
      currency: "USD",
      exchangeRate: "1",
      purchasePrice: "100000",
      txType: "initial",
      submissionToken: nextToken("purchase"),
    })
    expect(purchase.ok).toBe(true)
    if (!purchase.ok) return

    const activePayment = await createPayment({
      paymentDate: "2026-08-10",
      providerId: vendor.id,
      currency: "USD",
      exchangeRate: "1",
      amount: "40000",
      method: "wire",
      applications: [{ sourceType: "purchase", sourceId: purchase.data.id, appliedAmount: "40000" }],
      submissionToken: nextToken("payment"),
    })
    expect(activePayment.ok).toBe(true)
    if (!activePayment.ok) return

    const voidedPayment = await createPayment({
      paymentDate: "2026-08-12",
      providerId: vendor.id,
      currency: "USD",
      exchangeRate: "1",
      amount: "15000",
      method: "wire",
      applications: [{ sourceType: "purchase", sourceId: purchase.data.id, appliedAmount: "15000" }],
      submissionToken: nextToken("payment"),
    })
    expect(voidedPayment.ok).toBe(true)
    if (!voidedPayment.ok) return

    const voided = await voidPayment(voidedPayment.data.code, { reason: "Duplicado" })
    expect(voided.ok).toBe(true)

    const report = await getReportResult("accounts-payable", { preset: "thisMonth" })
    expect(report).not.toBeNull()
    if (!report) return

    const row = report.result.rows.find((item) => item.values.code === purchase.data.code)
    expect(row).toBeDefined()
    expect((row?.values.originalUsd as { amount: number }).amount).toBe(100000)
    expect((row?.values.paidUsd as { amount: number }).amount).toBe(40000)
    expect((row?.values.pendingUsd as { amount: number }).amount).toBe(60000)
  })
})
