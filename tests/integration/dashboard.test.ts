import { Types } from "mongoose"
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
const { getExecutiveDashboard } = await import("@/features/dashboard/queries")
const { Purchase } = await import("@/lib/db/models/purchase")
const { Repair } = await import("@/lib/db/models/repair")
const { Expense } = await import("@/lib/db/models/expense")
const { Sale } = await import("@/lib/db/models/sale")

type Role = "admin" | "capturista" | "lectura"

let userSequence = 0
let codeSequence = 0
let catalogSequence = 0
let tokenSequence = 0

async function signInAs(role: Role): Promise<{ id: string }> {
  userSequence++
  const auth = await getAuth()
  const email = `${role}-${userSequence}@dashboard.test`
  const { user } = await auth.api.createUser({
    body: { name: `${role} ${userSequence}`, email, password: "password123", role },
  })
  const response = await auth.api.signInEmail({
    body: { email, password: "password123" },
    asResponse: true,
  })
  ctx.headers = new Headers({
    cookie: setCookieToCookieHeader(response.headers.get("set-cookie")),
  })
  return { id: user.id }
}

function nextCode(prefix: string) {
  codeSequence++
  return `${prefix}-${String(codeSequence).padStart(4, "0")}`
}

function nextToken(prefix: string) {
  tokenSequence++
  return `${prefix}-${tokenSequence}`
}

async function seedCatalogs() {
  catalogSequence++
  const make = await createCatalogEntry("makes", { name: `Toyota dash ${catalogSequence}` })
  const model = await createCatalogEntry("models", {
    name: `Corolla dash ${catalogSequence}`,
    makeId: make.ok ? make.data.id : "",
  })
  const status = await createCatalogEntry("vehicleStatuses", {
    name: `Disponible dash ${catalogSequence}`,
    sortOrder: 10,
  })
  const vendor = await createCatalogEntry("vendors", { name: `Proveedor dash ${catalogSequence}` })
  if (!make.ok || !model.ok || !status.ok || !vendor.ok) throw new Error("No se pudieron sembrar catálogos")
  return { makeId: make.data.id, modelId: model.data.id, statusId: status.data.id, vendorId: vendor.data.id }
}

async function seedVehicle(catalogs: Awaited<ReturnType<typeof seedCatalogs>>, dateReceived: string) {
  const vehicle = await createVehicle({
    makeId: catalogs.makeId,
    modelId: catalogs.modelId,
    statusId: catalogs.statusId,
    year: "2020",
    dateReceived,
  })
  if (!vehicle.ok) throw new Error(vehicle.error)
  return vehicle.data
}

async function insertPurchase({
  vehicleId,
  vendorId,
  createdBy,
  amount,
}: {
  vehicleId: string
  vendorId: string
  createdBy: string
  amount: number
}) {
  await Purchase.collection.insertOne({
    _id: new Types.ObjectId(),
    code: nextCode("PUR"),
    vehicleId: new Types.ObjectId(vehicleId),
    vendorId: new Types.ObjectId(vendorId),
    purchaseDate: new Date("2026-08-02T00:00:00.000Z"),
    sourceType: "auction",
    currency: "USD",
    exchangeRate: "1",
    purchasePrice: amount,
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
    submissionToken: nextToken("purchase"),
    notes: null,
    createdBy: new Types.ObjectId(createdBy),
    updatedBy: new Types.ObjectId(createdBy),
    voidedAt: null,
    voidedBy: null,
    voidReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

async function insertRepair({
  vehicleId,
  createdBy,
  amount,
}: {
  vehicleId: string
  createdBy: string
  amount: number
}) {
  await Repair.collection.insertOne({
    _id: new Types.ObjectId(),
    code: nextCode("REP"),
    vehicleId: new Types.ObjectId(vehicleId),
    vendorId: null,
    category: "mechanical",
    status: "requested",
    openedAt: new Date("2026-08-03T00:00:00.000Z"),
    completedAt: null,
    completedBy: null,
    completionNote: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    currency: "USD",
    exchangeRate: "1",
    laborCost: amount,
    partsCost: 0,
    taxCost: 0,
    outsideServiceCost: 0,
    otherCost: 0,
    description: "Reparación test",
    referenceNumber: null,
    workOrderNumber: null,
    submissionToken: nextToken("repair"),
    notes: null,
    statusHistory: [],
    createdBy: new Types.ObjectId(createdBy),
    updatedBy: new Types.ObjectId(createdBy),
    voidedAt: null,
    voidedBy: null,
    voidReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

async function insertExpense({
  vehicleId,
  createdBy,
  amount,
  date,
}: {
  vehicleId: string | null
  createdBy: string
  amount: number
  date: string
}) {
  await Expense.collection.insertOne({
    _id: new Types.ObjectId(),
    code: nextCode("EXP"),
    vehicleId: vehicleId ? new Types.ObjectId(vehicleId) : null,
    vendorId: null,
    category: vehicleId ? "fuel" : "office",
    expenseDate: new Date(`${date}T00:00:00.000Z`),
    currency: "USD",
    exchangeRate: "1",
    amount,
    tax: 0,
    fees: 0,
    discount: 0,
    adjustment: 0,
    paymentMethod: null,
    referenceNumber: null,
    evidence: { type: null, label: null, url: null },
    submissionToken: nextToken("expense"),
    notes: null,
    createdBy: new Types.ObjectId(createdBy),
    updatedBy: new Types.ObjectId(createdBy),
    voidedAt: null,
    voidedBy: null,
    voidReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

async function insertSale({
  vehicleId,
  createdBy,
  saleDate,
  salePriceUsd,
  totalCostUsd,
  profitUsd,
}: {
  vehicleId: string
  createdBy: string
  saleDate: string
  salePriceUsd: number
  totalCostUsd: number
  profitUsd: number
}) {
  await Sale.collection.insertOne({
    _id: new Types.ObjectId(),
    code: nextCode("SAL"),
    vehicleId: new Types.ObjectId(vehicleId),
    saleDate: new Date(`${saleDate}T00:00:00.000Z`),
    buyerName: "Comprador test",
    buyerPhone: null,
    buyerEmail: null,
    salePriceUsd,
    terms: null,
    referenceNumber: null,
    notes: null,
    submissionToken: nextToken("sale"),
    acquisitionCostUsd: totalCostUsd,
    repairCostUsd: 0,
    vehicleExpenseCostUsd: 0,
    totalCostUsd,
    profitUsd,
    roiNumerator: null,
    roiDenominator: null,
    acquisitionCount: 1,
    repairCount: 0,
    vehicleExpenseCount: 0,
    createdBy: new Types.ObjectId(createdBy),
    updatedBy: new Types.ObjectId(createdBy),
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
  tokenSequence = 0
})

describe("dashboard ejecutivo", () => {
  it("rechaza lecturas directas para roles fuera de DASHBOARD_READ_ROLES", async () => {
    await signInAs("capturista")
    const dashboard = await getExecutiveDashboard({ preset: "thisMonth" })
    expect(dashboard).toBeNull()
  })

  it("agrega ventas, gastos generales, inventario actual y accionables en una sola respuesta", async () => {
    const admin = await signInAs("admin")
    const catalogs = await seedCatalogs()

    const soldHealthy = await seedVehicle(catalogs, "2026-07-01")
    const soldLowMargin = await seedVehicle(catalogs, "2026-07-05")
    const agedHighCost = await seedVehicle(catalogs, "2026-05-01")
    const currentNormal = await seedVehicle(catalogs, "2026-08-10")

    await insertPurchase({ vehicleId: soldHealthy.id, vendorId: catalogs.vendorId, createdBy: admin.id, amount: 1_150_000 })
    await insertPurchase({ vehicleId: soldLowMargin.id, vendorId: catalogs.vendorId, createdBy: admin.id, amount: 950_000 })
    await insertPurchase({ vehicleId: agedHighCost.id, vendorId: catalogs.vendorId, createdBy: admin.id, amount: 1_700_000 })
    await insertPurchase({ vehicleId: currentNormal.id, vendorId: catalogs.vendorId, createdBy: admin.id, amount: 500_000 })
    await insertRepair({ vehicleId: agedHighCost.id, createdBy: admin.id, amount: 200_000 })
    await insertExpense({ vehicleId: agedHighCost.id, createdBy: admin.id, amount: 100_000, date: "2026-08-05" })
    await insertExpense({ vehicleId: null, createdBy: admin.id, amount: 30_000, date: "2026-08-06" })

    await insertSale({
      vehicleId: soldHealthy.id,
      createdBy: admin.id,
      saleDate: "2026-08-12",
      salePriceUsd: 1_300_000,
      totalCostUsd: 1_150_000,
      profitUsd: 150_000,
    })
    await insertSale({
      vehicleId: soldLowMargin.id,
      createdBy: admin.id,
      saleDate: "2026-08-15",
      salePriceUsd: 1_000_000,
      totalCostUsd: 950_000,
      profitUsd: 50_000,
    })

    const dashboard = await getExecutiveDashboard({
      preset: "custom",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    })

    expect(dashboard).not.toBeNull()
    if (!dashboard) return

    expect(dashboard.period.preset).toBe("custom")
    expect(dashboard.kpis.vehiclesSold).toBe(2)
    expect(dashboard.kpis.salesRevenueUsd.amount).toBe(2_300_000)
    expect(dashboard.kpis.soldVehicleCostUsd.amount).toBe(2_100_000)
    expect(dashboard.kpis.grossProfitUsd.amount).toBe(200_000)
    expect(dashboard.kpis.averageGrossMarginPct).toBe(8.7)
    expect(dashboard.kpis.averageSalePriceUsd?.amount).toBe(1_150_000)
    expect(dashboard.kpis.generalExpensesUsd.amount).toBe(30_000)

    expect(dashboard.inventory.totalAvailable).toBe(2)
    expect(dashboard.inventory.currentInventoryValueUsd.amount).toBe(2_500_000)
    expect(dashboard.inventory.averageInventoryCostUsd?.amount).toBe(1_250_000)
    expect(dashboard.inventory.over30Count).toBe(1)
    expect(dashboard.inventory.over60Count).toBe(1)
    expect(dashboard.inventory.over90Count).toBe(1)
    expect(dashboard.inventory.agingBuckets.map((bucket) => bucket.value)).toEqual([1, 0, 0, 1])

    expect(dashboard.actionItems.agedVehicles).toHaveLength(1)
    expect(dashboard.actionItems.agedVehicles[0]?.severity).toBe("destructive")
    expect(dashboard.actionItems.elevatedCostVehicles).toHaveLength(1)
    expect(dashboard.actionItems.elevatedCostVehicles[0]?.currentCostUsd.amount).toBe(2_000_000)
    expect(dashboard.actionItems.lowMarginSales).toHaveLength(1)
    expect(dashboard.actionItems.lowMarginSales[0]?.grossMarginPct).toBe(5)
  })

  it("permite lectura al rol lectura", async () => {
    const admin = await signInAs("admin")
    const catalogs = await seedCatalogs()
    const vehicle = await seedVehicle(catalogs, "2026-08-01")
    await insertPurchase({ vehicleId: vehicle.id, vendorId: catalogs.vendorId, createdBy: admin.id, amount: 400_000 })

    await signInAs("lectura")
    const dashboard = await getExecutiveDashboard({ preset: "custom", startDate: "2026-08-01", endDate: "2026-08-31" })

    expect(dashboard).not.toBeNull()
    expect(dashboard?.inventory.totalAvailable).toBe(1)
  })
})
