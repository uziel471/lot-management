import { beforeEach, describe, expect, it, vi } from "vitest"
import { setCookieToCookieHeader } from "./helpers/cookies"

const ctx = vi.hoisted(() => ({ headers: new Headers() }))

vi.mock("next/headers", () => ({
  headers: async () => ctx.headers,
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}))

vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }))

const { getAuth } = await import("@/lib/auth/auth")
const { createCatalogEntry, setCatalogEntryActive } = await import("@/features/catalogs/actions")
const { createVehicle, voidVehicle } = await import("@/features/vehicles/actions")
const { createExpense, voidExpense } = await import("@/features/expenses/actions")
const { getExpenseByCode, getVehicleExpenseSummary, listExpenses } = await import("@/features/expenses/queries")

type Role = "admin" | "capturista" | "lectura"

let sequence = 0

async function signInAs(role: Role): Promise<{ id: string; email: string }> {
  sequence++
  const email = `${role}-${sequence}@lote.com`
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

async function seedVehicleAndVendor() {
  const make = await createCatalogEntry("makes", { name: "Honda" })
  if (!make.ok) throw new Error(make.error)
  const model = await createCatalogEntry("models", { name: "Civic", makeId: make.data.id })
  if (!model.ok) throw new Error(model.error)
  const status = await createCatalogEntry("vehicleStatuses", { name: "Available", sortOrder: 10 })
  if (!status.ok) throw new Error(status.error)
  const vendor = await createCatalogEntry("vendors", { name: "Servicio Centro" })
  if (!vendor.ok) throw new Error(vendor.error)

  const vehicle = await createVehicle({
    makeId: make.data.id,
    modelId: model.data.id,
    statusId: status.data.id,
    year: "2020",
    dateReceived: "2026-08-01",
  })
  if (!vehicle.ok) throw new Error(vehicle.error)

  return { vehicle: vehicle.data, vendor: vendor.data }
}

let tokenSeq = 0
function nextToken(): string {
  tokenSeq++
  return `expense-token-${tokenSeq}`
}

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    category: "fuel",
    expenseDate: "2026-08-22",
    currency: "USD",
    exchangeRate: "1",
    amount: "10000",
    submissionToken: nextToken(),
    ...overrides,
  }
}

beforeEach(async () => {
  ctx.headers = new Headers()
})

describe("registro de gastos", () => {
  it("registra un gasto general válido y emite EXP-0001", async () => {
    await signInAs("admin")

    const result = await createExpense(baseInput())

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.code).toBe("EXP-0001")
    expect(result.data.isGeneral).toBe(true)
  })

  it("acepta un gasto relacionado a vehículo con proveedor y evidencia", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()

    const result = await createExpense(
      baseInput({
        vehicleId: vehicle.id,
        vendorId: vendor.id,
        evidenceType: "invoice",
        evidenceLabel: "FAC-22",
        evidenceUrl: "https://example.com/fac-22",
        referenceNumber: "REF-22",
      }),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.vehicleId).toBe(vehicle.id)
    expect(result.data.vendorId).toBe(vendor.id)
  })

  it("protege contra submissionToken duplicado y devuelve el mismo gasto", async () => {
    await signInAs("admin")
    const token = nextToken()

    const first = await createExpense(baseInput({ submissionToken: token, amount: "15000" }))
    const second = await createExpense(baseInput({ submissionToken: token, amount: "99999" }))

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    if (first.ok && second.ok) {
      expect(second.data.code).toBe(first.data.code)
      expect(second.data.totalOriginal).toEqual(first.data.totalOriginal)
    }
  })

  it("rechaza un gasto para vehículo anulado", async () => {
    await signInAs("admin")
    const { vehicle } = await seedVehicleAndVendor()

    const voided = await voidVehicle(vehicle.code, { reason: "capturado por error" })
    expect(voided.ok).toBe(true)

    const result = await createExpense(baseInput({ vehicleId: vehicle.id }))
    expect(result.ok).toBe(false)
  })

  it("rechaza un proveedor inactivo", async () => {
    await signInAs("admin")
    const { vendor } = await seedVehicleAndVendor()

    const deactivated = await setCatalogEntryActive("vendors", vendor.code, false)
    expect(deactivated.ok).toBe(true)

    const result = await createExpense(baseInput({ vendorId: vendor.id }))
    expect(result.ok).toBe(false)
  })
})

describe("permisos y anulación", () => {
  it("permite a capturista registrar gastos", async () => {
    await signInAs("capturista")

    const result = await createExpense(baseInput())

    expect(result.ok).toBe(true)
  })

  it("rechaza escritura para lectura", async () => {
    await signInAs("lectura")

    const result = await createExpense(baseInput())

    expect(result.ok).toBe(false)
  })

  it("solo admin puede anular un gasto", async () => {
    await signInAs("admin")
    const created = await createExpense(baseInput())
    expect(created.ok).toBe(true)
    if (!created.ok) return

    await signInAs("capturista")
    const denied = await voidExpense(created.data.code, { reason: "No procede" })
    expect(denied.ok).toBe(false)

    await signInAs("admin")
    const result = await voidExpense(created.data.code, { reason: "Registro duplicado" })
    expect(result.ok).toBe(true)

    const detail = await getExpenseByCode(created.data.code)
    expect(detail?.isVoided).toBe(true)
    expect(detail?.voidReason).toBe("Registro duplicado")
  })

  it("rechaza anular dos veces el mismo gasto", async () => {
    await signInAs("admin")
    const created = await createExpense(baseInput())
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const first = await voidExpense(created.data.code, { reason: "Duplicado" })
    expect(first.ok).toBe(true)

    const second = await voidExpense(created.data.code, { reason: "Otra vez" })
    expect(second.ok).toBe(false)
  })
})

describe("listado y resumen por vehículo", () => {
  it("el resumen del vehículo excluye gastos generales y anulados del total activo", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()

    const vehicleExpense = await createExpense(
      baseInput({
        vehicleId: vehicle.id,
        vendorId: vendor.id,
        category: "fuel",
        amount: "10000",
      }),
    )
    expect(vehicleExpense.ok).toBe(true)

    const cleaningExpense = await createExpense(
      baseInput({
        vehicleId: vehicle.id,
        category: "cleaning",
        amount: "5000",
      }),
    )
    expect(cleaningExpense.ok).toBe(true)
    if (!cleaningExpense.ok) return

    const generalExpense = await createExpense(baseInput({ category: "administrative", amount: "7000" }))
    expect(generalExpense.ok).toBe(true)

    const voided = await voidExpense(cleaningExpense.data.code, { reason: "Captura repetida" })
    expect(voided.ok).toBe(true)

    const summary = await getVehicleExpenseSummary(vehicle.id)
    expect(summary?.activeTotalUsd).toEqual({ amount: 100_00, currency: "USD" })
    expect(summary?.activeCount).toBe(1)
    expect(summary?.rows).toHaveLength(2)
    expect(summary?.categorySummary).toEqual([
      {
        category: "fuel",
        label: "Combustible",
        count: 1,
        activeTotalUsd: { amount: 100_00, currency: "USD" },
      },
    ])
  })

  it("lista gastos anulados solo cuando se piden y conserva consulta histórica", async () => {
    await signInAs("admin")
    const created = await createExpense(baseInput({ amount: "12000" }))
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const voided = await voidExpense(created.data.code, { reason: "Prueba" })
    expect(voided.ok).toBe(true)

    const visibleDefault = await listExpenses()
    const visibleAll = await listExpenses({ includeVoided: true })

    expect(visibleDefault?.some((expense) => expense.code === created.data.code)).toBe(false)
    expect(visibleAll?.some((expense) => expense.code === created.data.code)).toBe(true)
  })
})
