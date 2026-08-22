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
const { createVehicle, voidVehicle } = await import("@/features/vehicles/actions")
const {
  createRepair,
  voidRepairRecord,
  completeRepairActionServer,
} = await import("@/features/repairs/actions")
const { getVehicleRepairSummary, listRepairs } = await import("@/features/repairs/queries")

type Role = "admin" | "capturista" | "lectura"

let sequence = 0
let tokenSequence = 0

async function signInAs(role: Role): Promise<{ id: string; email: string }> {
  sequence++
  const email = `${role}-repairs-${sequence}@lote.com`
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
  const status = await createCatalogEntry("vehicleStatuses", { name: "Disponible", sortOrder: 10 })
  if (!status.ok) throw new Error(status.error)
  const vendor = await createCatalogEntry("vendors", { name: "Taller Otay" })
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

function nextToken() {
  tokenSequence++
  return `repair-token-${tokenSequence}`
}

function baseInput(vehicleId: string, overrides: Record<string, unknown> = {}) {
  return {
    vehicleId,
    category: "mechanical",
    openedAt: "2026-08-10",
    currency: "USD",
    exchangeRate: "1",
    laborCost: "10000",
    description: "Cambio de frenos",
    submissionToken: nextToken(),
    ...overrides,
  }
}

beforeEach(() => {
  ctx.headers = new Headers()
})

describe("registro de reparaciones", () => {
  it("la primera reparación válida recibe REP-0001", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()

    const result = await createRepair(baseInput(vehicle.id, { vendorId: vendor.id }))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.code).toBe("REP-0001")
  })

  it("una validación rechazada no consume código", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()

    const invalid = await createRepair(baseInput(vehicle.id, { vendorId: vendor.id, laborCost: "0" }))
    expect(invalid.ok).toBe(false)

    const valid = await createRepair(baseInput(vehicle.id, { vendorId: vendor.id }))
    expect(valid.ok).toBe(true)
    if (valid.ok) expect(valid.data.code).toBe("REP-0001")
  })

  it("rechaza una reparación para un vehículo anulado", async () => {
    await signInAs("admin")
    const { vehicle } = await seedVehicleAndVendor()
    const voided = await voidVehicle(vehicle.code, { reason: "Capturado por error" })
    expect(voided.ok).toBe(true)

    const result = await createRepair(baseInput(vehicle.id))
    expect(result.ok).toBe(false)
  })
})

describe("moneda y guardado doble", () => {
  it("convierte MXN a USD con el tipo de cambio capturado", async () => {
    await signInAs("admin")
    const { vehicle } = await seedVehicleAndVendor()

    const result = await createRepair(
      baseInput(vehicle.id, {
        currency: "MXN",
        exchangeRate: "18.50",
        laborCost: "37000000",
      }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.totalUsd).toEqual({ amount: 2_000_000, currency: "USD" })
  })

  it("dos envíos con el mismo token preservan una sola reparación", async () => {
    await signInAs("admin")
    const { vehicle } = await seedVehicleAndVendor()
    const token = nextToken()

    const first = await createRepair(baseInput(vehicle.id, { submissionToken: token }))
    const second = await createRepair(baseInput(vehicle.id, { submissionToken: token }))

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    if (first.ok && second.ok) {
      expect(second.data.code).toBe(first.data.code)
    }

    const repairs = await listRepairs({ vehicleId: vehicle.id })
    expect(repairs?.length).toBe(1)
  })
})

describe("permisos y resúmenes", () => {
  it("capturista no puede anular reparaciones", async () => {
    await signInAs("admin")
    const { vehicle } = await seedVehicleAndVendor()
    const created = await createRepair(baseInput(vehicle.id))
    expect(created.ok).toBe(true)
    if (!created.ok) return

    await signInAs("capturista")
    const result = await voidRepairRecord(created.data.code, { reason: "No autorizado" })
    expect(result.ok).toBe(false)
  })

  it("las reparaciones anuladas salen del costo activo del vehículo pero siguen visibles", async () => {
    await signInAs("admin")
    const { vehicle } = await seedVehicleAndVendor()

    const first = await createRepair(baseInput(vehicle.id, { laborCost: "10000" }))
    const second = await createRepair(baseInput(vehicle.id, { laborCost: "5000" }))
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    if (!first.ok || !second.ok) return

    const completed = await completeRepairActionServer(first.data.code, {
      completedAt: "2026-08-11",
      note: "Trabajo terminado",
    })
    expect(completed.ok).toBe(true)

    const voided = await voidRepairRecord(second.data.code, { reason: "Registro duplicado" })
    expect(voided.ok).toBe(true)

    const summary = await getVehicleRepairSummary(vehicle.id)
    expect(summary?.activeTotalUsd).toEqual({ amount: 0, currency: "USD" })
    expect(summary?.rows).toHaveLength(2)
    expect(summary?.rows.some((repair) => repair.code === second.data.code && repair.isVoided)).toBe(true)
  })

  it("lectura puede consultar el resumen sin escribir", async () => {
    await signInAs("admin")
    const { vehicle } = await seedVehicleAndVendor()
    const created = await createRepair(baseInput(vehicle.id))
    expect(created.ok).toBe(true)

    await signInAs("lectura")
    const summary = await getVehicleRepairSummary(vehicle.id)
    expect(summary?.rows.length).toBe(1)
  })
})
