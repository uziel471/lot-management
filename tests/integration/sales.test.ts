import { beforeEach, describe, expect, it, vi } from "vitest"
import { Types } from "mongoose"
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
const { createSale, voidSale } = await import("@/features/sales/actions")
const {
  findActiveSaleByVehicleId,
  getSaleByCode,
  getVehicleSaleSummary,
  listSaleCandidateVehicles,
  listSales,
} = await import("@/features/sales/queries")
const { Purchase } = await import("@/lib/db/models/purchase")
const { Repair } = await import("@/lib/db/models/repair")
const { Expense } = await import("@/lib/db/models/expense")

type Role = "admin" | "capturista" | "lectura"

let sequence = 0
let codeSequence = 0
let seedSequence = 0

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

async function seedVehicle() {
  seedSequence++
  const suffix = seedSequence
  const make = await createCatalogEntry("makes", { name: `Toyota ${suffix}` })
  const model = await createCatalogEntry("models", {
    name: `Corolla ${suffix}`,
    makeId: make.ok ? make.data.id : "",
  })
  const status = await createCatalogEntry("vehicleStatuses", { name: `Purchased ${suffix}`, sortOrder: 10 })
  const vendor = await createCatalogEntry("vendors", { name: `Proveedor prueba ${suffix}` })
  if (!make.ok || !model.ok || !status.ok || !vendor.ok) throw new Error("No se pudieron crear catálogos")

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

function nextCode(prefix: string) {
  codeSequence++
  return `${prefix}-${String(codeSequence).padStart(4, "0")}`
}

let tokenSequence = 0
function nextToken() {
  tokenSequence++
  return `sale-token-${tokenSequence}`
}

async function seedCosts(vehicleId: string, vendorId: string, authorId: string) {
  const author = new Types.ObjectId(authorId)
  await Purchase.collection.insertOne({
    _id: new Types.ObjectId(),
    code: nextCode("PUR"),
    vehicleId: new Types.ObjectId(vehicleId),
    vendorId: new Types.ObjectId(vendorId),
    purchaseDate: new Date("2026-08-02"),
    sourceType: "auction",
    currency: "USD",
    exchangeRate: "1",
    purchasePrice: 1_000_000,
    auctionFees: 0,
    acquisitionTransportCost: 0,
    titleDocFees: 0,
    purchaseTax: 0,
    importDuties: 0,
    customsBrokerFees: 0,
    otherAcquisitionCosts: 0,
    txType: "initial",
    correctsPurchaseId: null,
    paymentMethod: null,
    referenceNumber: null,
    referenceKey: null,
    lotNumber: null,
    submissionToken: null,
    notes: null,
    createdBy: author,
    updatedBy: author,
    voidedAt: null,
    voidedBy: null,
    voidReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  await Repair.collection.insertOne({
    _id: new Types.ObjectId(),
    code: nextCode("REP"),
    vehicleId: new Types.ObjectId(vehicleId),
    vendorId: null,
    category: "mechanical",
    status: "requested",
    openedAt: new Date("2026-08-03"),
    completedAt: null,
    completedBy: null,
    completionNote: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    currency: "USD",
    exchangeRate: "1",
    laborCost: 100_000,
    partsCost: 0,
    taxCost: 0,
    outsideServiceCost: 0,
    otherCost: 0,
    description: "Afinación",
    referenceNumber: null,
    workOrderNumber: null,
    submissionToken: null,
    notes: null,
    statusHistory: [],
    createdBy: author,
    updatedBy: author,
    voidedAt: null,
    voidedBy: null,
    voidReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  await Expense.collection.insertOne({
    _id: new Types.ObjectId(),
    code: nextCode("EXP"),
    vehicleId: new Types.ObjectId(vehicleId),
    vendorId: null,
    category: "fuel",
    expenseDate: new Date("2026-08-04"),
    currency: "USD",
    exchangeRate: "1",
    amount: 50_000,
    tax: 0,
    fees: 0,
    discount: 0,
    adjustment: 0,
    paymentMethod: null,
    referenceNumber: null,
    evidence: { type: null, label: null, url: null },
    submissionToken: null,
    notes: null,
    createdBy: author,
    updatedBy: author,
    voidedAt: null,
    voidedBy: null,
    voidReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

beforeEach(() => {
  ctx.headers = new Headers()
  codeSequence = 0
  seedSequence = 0
})

describe("ventas", () => {
  it("crea una venta con snapshot financiero y código SAL", async () => {
    const user = await signInAs("admin")
    const { vehicle, vendor } = await seedVehicle()
    await seedCosts(vehicle.id, vendor.id, user.id)

    const result = await createSale({
      vehicleId: vehicle.id,
      saleDate: "2026-08-10",
      buyerName: "Juan Perez",
      salePriceUsd: "1250000",
      submissionToken: nextToken(),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.code).toBe("SAL-0001")
    expect(result.data.snapshot.totalCostUsd.amount).toBe(1_150_000)
    expect(result.data.snapshot.profitUsd.amount).toBe(100_000)
    expect(result.data.snapshot.roiLabel).toBe("8.70%")
  })

  it("no consume código si el precio es inválido", async () => {
    await signInAs("admin")
    const { vehicle } = await seedVehicle()

    const invalid = await createSale({
      vehicleId: vehicle.id,
      saleDate: "2026-08-10",
      buyerName: "Juan Perez",
      salePriceUsd: "0",
      submissionToken: nextToken(),
    })
    expect(invalid.ok).toBe(false)

    const valid = await createSale({
      vehicleId: vehicle.id,
      saleDate: "2026-08-10",
      buyerName: "Juan Perez",
      salePriceUsd: "500000",
      submissionToken: nextToken(),
    })
    expect(valid.ok).toBe(true)
    if (valid.ok) expect(valid.data.code).toBe("SAL-0001")
  })

  it("impide más de una venta activa por vehículo y respeta submission token", async () => {
    await signInAs("admin")
    const { vehicle } = await seedVehicle()
    const token = nextToken()

    const first = await createSale({
      vehicleId: vehicle.id,
      saleDate: "2026-08-10",
      buyerName: "Juan Perez",
      salePriceUsd: "500000",
      submissionToken: token,
    })
    const duplicate = await createSale({
      vehicleId: vehicle.id,
      saleDate: "2026-08-10",
      buyerName: "Juan Perez",
      salePriceUsd: "500000",
      submissionToken: token,
    })
    expect(first.ok && duplicate.ok).toBe(true)
    if (first.ok && duplicate.ok) expect(duplicate.data.code).toBe(first.data.code)

    const second = await createSale({
      vehicleId: vehicle.id,
      saleDate: "2026-08-11",
      buyerName: "Otro comprador",
      salePriceUsd: "510000",
      submissionToken: nextToken(),
    })
    expect(second.ok).toBe(false)
  })

  it("permite reemplazar una venta después de anularla", async () => {
    await signInAs("admin")
    const { vehicle } = await seedVehicle()

    const first = await createSale({
      vehicleId: vehicle.id,
      saleDate: "2026-08-10",
      buyerName: "Juan Perez",
      salePriceUsd: "500000",
      submissionToken: nextToken(),
    })
    expect(first.ok).toBe(true)
    if (!first.ok) return

    const voided = await voidSale(first.data.code, { reason: "Capturada al comprador equivocado" })
    expect(voided.ok).toBe(true)

    const replacement = await createSale({
      vehicleId: vehicle.id,
      saleDate: "2026-08-11",
      buyerName: "Maria Lopez",
      salePriceUsd: "520000",
      submissionToken: nextToken(),
    })
    expect(replacement.ok).toBe(true)
    if (!replacement.ok) return
    expect(replacement.data.code).toBe("SAL-0002")

    const active = await findActiveSaleByVehicleId(vehicle.id)
    expect(active?.code).toBe("SAL-0002")
  })

  it("excluye anuladas de totales y conserva historial consultable", async () => {
    await signInAs("admin")
    const firstVehicle = await seedVehicle()
    const secondVehicle = await seedVehicle()

    const first = await createSale({
      vehicleId: firstVehicle.vehicle.id,
      saleDate: "2026-08-10",
      buyerName: "Juan Perez",
      salePriceUsd: "500000",
      submissionToken: nextToken(),
    })
    const second = await createSale({
      vehicleId: secondVehicle.vehicle.id,
      saleDate: "2026-08-11",
      buyerName: "Maria Lopez",
      salePriceUsd: "700000",
      submissionToken: nextToken(),
    })
    if (!first.ok || !second.ok) throw new Error("No se pudieron crear ventas")
    await voidSale(first.data.code, { reason: "Capturada en unidad equivocada" })

    const list = await listSales({ includeVoided: true })
    expect(list?.rows).toHaveLength(2)
    expect(list?.summary.activeRevenueUsd.amount).toBe(700_000)

    const detail = await getSaleByCode(first.data.code)
    expect(detail?.isVoided).toBe(true)

    const summary = await getVehicleSaleSummary(firstVehicle.vehicle.id)
    expect(summary?.activeSale).toBeNull()
    expect(summary?.voidedSales).toHaveLength(1)
  })

  it("oculta vehículos ya vendidos de los candidatos y bloquea anulación del vehículo", async () => {
    await signInAs("admin")
    const { vehicle } = await seedVehicle()

    const before = await listSaleCandidateVehicles()
    expect(before.some((row) => row.id === vehicle.id)).toBe(true)

    const sale = await createSale({
      vehicleId: vehicle.id,
      saleDate: "2026-08-10",
      buyerName: "Juan Perez",
      salePriceUsd: "500000",
      submissionToken: nextToken(),
    })
    if (!sale.ok) throw new Error(sale.error)

    const after = await listSaleCandidateVehicles()
    expect(after.some((row) => row.id === vehicle.id)).toBe(false)

    const blocked = await voidVehicle(vehicle.code, { reason: "Duplicado" })
    expect(blocked.ok).toBe(false)

    await voidSale(sale.data.code, { reason: "Capturada por error" })
    const released = await voidVehicle(vehicle.code, { reason: "Duplicado" })
    expect(released.ok).toBe(true)
  })

  it("rechaza escritura para lectura", async () => {
    await signInAs("admin")
    const { vehicle } = await seedVehicle()
    await signInAs("lectura")

    const result = await createSale({
      vehicleId: vehicle.id,
      saleDate: "2026-08-10",
      buyerName: "Juan Perez",
      salePriceUsd: "500000",
      submissionToken: nextToken(),
    })
    expect(result.ok).toBe(false)
  })
})
