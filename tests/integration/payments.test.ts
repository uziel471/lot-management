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
const { createPurchase, voidPurchase } = await import("@/features/purchases/actions")
const { createExpense, voidExpense } = await import("@/features/expenses/actions")
const { createRepair, cancelRepairActionServer, voidRepairRecord } = await import("@/features/repairs/actions")
const { createPayment, voidPayment } = await import("@/features/payments/actions")
const { getPaymentByCode, listPayments } = await import("@/features/payments/queries")
const { getPurchaseByCode } = await import("@/features/purchases/queries")
const { getExpenseByCode } = await import("@/features/expenses/queries")

type Role = "admin" | "capturista" | "lectura"

let sequence = 0
let tokenSequence = 0

async function signInAs(role: Role): Promise<{ id: string; email: string }> {
  sequence++
  const email = `${role}-payments-${sequence}@lote.com`
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

function nextToken() {
  tokenSequence++
  return `payment-token-${tokenSequence}`
}

async function seedVehicleAndVendor() {
  const suffix = `${sequence}-${tokenSequence + 1}`
  const make = await createCatalogEntry("makes", { name: `Toyota ${suffix}` })
  if (!make.ok) throw new Error(make.error)
  const model = await createCatalogEntry("models", { name: `Corolla ${suffix}`, makeId: make.data.id })
  if (!model.ok) throw new Error(model.error)
  const status = await createCatalogEntry("vehicleStatuses", { name: `Disponible ${suffix}`, sortOrder: 10 })
  if (!status.ok) throw new Error(status.error)
  const vendor = await createCatalogEntry("vendors", { name: `Proveedor ${suffix}` })
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

async function createPurchaseSource(overrides: Record<string, unknown> = {}) {
  const { vehicle, vendor } = await seedVehicleAndVendor()
  const result = await createPurchase({
    vehicleId: vehicle.id,
    vendorId: vendor.id,
    purchaseDate: "2026-08-05",
    sourceType: "auction",
    currency: "USD",
    exchangeRate: "1",
    purchasePrice: "10000",
    txType: "initial",
    submissionToken: nextToken(),
    ...overrides,
  })
  if (!result.ok) throw new Error(result.error)
  return { vehicle, vendor, purchase: result.data }
}

async function createExpenseSource(overrides: Record<string, unknown> = {}) {
  const { vehicle, vendor } = await seedVehicleAndVendor()
  const result = await createExpense({
    category: "fuel",
    expenseDate: "2026-08-10",
    currency: "USD",
    exchangeRate: "1",
    amount: "10000",
    vehicleId: vehicle.id,
    vendorId: vendor.id,
    submissionToken: nextToken(),
    ...overrides,
  })
  if (!result.ok) throw new Error(result.error)
  return { vehicle, vendor, expense: result.data }
}

async function createRepairSource(overrides: Record<string, unknown> = {}) {
  const { vehicle, vendor } = await seedVehicleAndVendor()
  const result = await createRepair({
    vehicleId: vehicle.id,
    vendorId: vendor.id,
    category: "mechanical",
    openedAt: "2026-08-10",
    currency: "USD",
    exchangeRate: "1",
    laborCost: "10000",
    description: "Cambio de frenos",
    submissionToken: nextToken(),
    ...overrides,
  })
  if (!result.ok) throw new Error(result.error)
  return { vehicle, vendor, repair: result.data }
}

function paymentInput(overrides: Record<string, unknown> = {}) {
  return {
    paymentDate: "2026-08-22",
    currency: "USD",
    exchangeRate: "1",
    amount: "10000",
    method: "wire",
    applications: [],
    submissionToken: nextToken(),
    ...overrides,
  }
}

beforeEach(() => {
  ctx.headers = new Headers()
})

describe("registro de pagos", () => {
  it("un pago USD válido produce PAY-0001", async () => {
    await signInAs("admin")
    const { vendor, purchase } = await createPurchaseSource()

    const result = await createPayment(paymentInput({
      providerId: vendor.id,
      applications: [{ sourceType: "purchase", sourceId: purchase.id, appliedAmount: "10000" }],
    }))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.code).toBe("PAY-0001")
    expect(result.data.totalUsd).toEqual({ amount: 10_000, currency: "USD" })
  })

  it("una alta inválida no consume código y tres altas válidas seguidas son consecutivas", async () => {
    await signInAs("admin")
    const firstSource = await createPurchaseSource()

    const invalid = await createPayment(paymentInput({
      providerId: firstSource.vendor.id,
      amount: "10000",
      applications: [{ sourceType: "purchase", sourceId: firstSource.purchase.id, appliedAmount: "9000" }],
    }))
    expect(invalid.ok).toBe(false)

    const first = await createPayment(paymentInput({
      providerId: firstSource.vendor.id,
      applications: [{ sourceType: "purchase", sourceId: firstSource.purchase.id, appliedAmount: "10000" }],
    }))
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.data.code).toBe("PAY-0001")

    const secondSource = await createExpenseSource()
    const second = await createPayment(paymentInput({
      providerId: secondSource.vendor.id,
      applications: [{ sourceType: "expense", sourceId: secondSource.expense.id, appliedAmount: "10000" }],
    }))
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.data.code).toBe("PAY-0002")

    const thirdSource = await createRepairSource()
    const third = await createPayment(paymentInput({
      providerId: thirdSource.vendor.id,
      applications: [{ sourceType: "repair", sourceId: thirdSource.repair.id, appliedAmount: "10000" }],
    }))
    expect(third.ok).toBe(true)
    if (!third.ok) return
    expect(third.data.code).toBe("PAY-0003")
  })
})

describe("moneda y aplicaciones", () => {
  it("un pago MXN expone el total USD correcto", async () => {
    await signInAs("admin")
    const { vendor, purchase } = await createPurchaseSource({ currency: "MXN", exchangeRate: "18.50", purchasePrice: "37000000" })

    const result = await createPayment(paymentInput({
      providerId: vendor.id,
      currency: "MXN",
      exchangeRate: "18.50",
      amount: "37000000",
      applications: [{ sourceType: "purchase", sourceId: purchase.id, appliedAmount: "37000000" }],
    }))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.totalUsd).toEqual({ amount: 2_000_000, currency: "USD" })

    const listed = await listPayments()
    expect(listed?.[0]?.totalUsd).toEqual({ amount: 2_000_000, currency: "USD" })
  })

  it("rechaza tipo de cambio cero, negativo y USD con tipo distinto de 1", async () => {
    await signInAs("admin")
    const { vendor, purchase } = await createPurchaseSource()

    const zero = await createPayment(paymentInput({
      providerId: vendor.id,
      currency: "MXN",
      exchangeRate: "0",
      amount: "10000",
      applications: [{ sourceType: "purchase", sourceId: purchase.id, appliedAmount: "10000" }],
    }))
    expect(zero.ok).toBe(false)

    const negative = await createPayment(paymentInput({
      providerId: vendor.id,
      currency: "MXN",
      exchangeRate: "-1",
      amount: "10000",
      applications: [{ sourceType: "purchase", sourceId: purchase.id, appliedAmount: "10000" }],
    }))
    expect(negative.ok).toBe(false)

    const usdBadRate = await createPayment(paymentInput({
      providerId: vendor.id,
      exchangeRate: "18.50",
      applications: [{ sourceType: "purchase", sourceId: purchase.id, appliedAmount: "10000" }],
    }))
    expect(usdBadRate.ok).toBe(false)
  })

  it("soporta pago parcial, pago completo y pago multi-documento; rechaza suma distinta y source type no soportado", async () => {
    await signInAs("admin")
    const purchaseSource = await createPurchaseSource()
    const expenseSource = await createExpenseSource()

    const partial = await createPayment(paymentInput({
      providerId: purchaseSource.vendor.id,
      amount: "4000",
      applications: [{ sourceType: "purchase", sourceId: purchaseSource.purchase.id, appliedAmount: "4000" }],
    }))
    expect(partial.ok).toBe(true)

    const purchaseAfterPartial = await getPurchaseByCode(purchaseSource.purchase.code)
    expect(purchaseAfterPartial?.paymentStatus).toBe("partial")
    expect(purchaseAfterPartial?.pendingUsd).toEqual({ amount: 6000, currency: "USD" })

    const full = await createPayment(paymentInput({
      providerId: purchaseSource.vendor.id,
      amount: "6000",
      applications: [{ sourceType: "purchase", sourceId: purchaseSource.purchase.id, appliedAmount: "6000" }],
    }))
    expect(full.ok).toBe(true)

    const paidPurchase = await getPurchaseByCode(purchaseSource.purchase.code)
    expect(paidPurchase?.paymentStatus).toBe("paid")
    expect(paidPurchase?.pendingUsd).toEqual({ amount: 0, currency: "USD" })

    const multiPurchase = await createPurchaseSource()
    const multiRepair = await createRepairSource({ vendorId: undefined })
    const multi = await createPayment(paymentInput({
      providerId: multiPurchase.vendor.id,
      amount: "10000",
      applications: [
        { sourceType: "purchase", sourceId: multiPurchase.purchase.id, appliedAmount: "5000" },
        { sourceType: "repair", sourceId: multiRepair.repair.id, appliedAmount: "5000" },
      ],
    }))
    expect(multi.ok).toBe(true)

    const mismatch = await createPayment(paymentInput({
      providerId: expenseSource.vendor.id,
      amount: "10000",
      applications: [{ sourceType: "expense", sourceId: expenseSource.expense.id, appliedAmount: "9000" }],
    }))
    expect(mismatch.ok).toBe(false)

    const unsupported = await createPayment(paymentInput({
      providerId: expenseSource.vendor.id,
      applications: [{ sourceType: "sale", sourceId: expenseSource.expense.id, appliedAmount: "10000" }],
    }))
    expect(unsupported.ok).toBe(false)
  })
})

describe("sobrepago y estados fuente", () => {
  it("rechaza un pago mayor al pendiente y dos pagos simultáneos no sobrepagan el documento", async () => {
    await signInAs("admin")
    const { vendor, purchase } = await createPurchaseSource()

    const over = await createPayment(paymentInput({
      providerId: vendor.id,
      amount: "11000",
      applications: [{ sourceType: "purchase", sourceId: purchase.id, appliedAmount: "11000" }],
    }))
    expect(over.ok).toBe(false)

    const [first, second] = await Promise.all([
      createPayment(paymentInput({
        providerId: vendor.id,
        applications: [{ sourceType: "purchase", sourceId: purchase.id, appliedAmount: "10000" }],
      })),
      createPayment(paymentInput({
        providerId: vendor.id,
        applications: [{ sourceType: "purchase", sourceId: purchase.id, appliedAmount: "10000" }],
      })),
    ])

    expect([first.ok, second.ok].filter(Boolean)).toHaveLength(1)
    const failed = first.ok ? second : first
    expect(failed.ok).toBe(false)
    if (!failed.ok) expect(failed.error).toContain(purchase.code)

    const detail = await getPurchaseByCode(purchase.code)
    expect(detail?.pendingUsd).toEqual({ amount: 0, currency: "USD" })
    expect(detail?.paidUsd).toEqual({ amount: 10_000, currency: "USD" })
  })

  it("rechaza compra y gasto anulados, reparación cancelada o anulada, y acepta reparación activa", async () => {
    await signInAs("admin")

    const purchaseSource = await createPurchaseSource()
    await voidPurchase(purchaseSource.purchase.code, { reason: "Prueba" })
    const purchasePayment = await createPayment(paymentInput({
      providerId: purchaseSource.vendor.id,
      applications: [{ sourceType: "purchase", sourceId: purchaseSource.purchase.id, appliedAmount: "10000" }],
    }))
    expect(purchasePayment.ok).toBe(false)

    const expenseSource = await createExpenseSource()
    await voidExpense(expenseSource.expense.code, { reason: "Prueba" })
    const expensePayment = await createPayment(paymentInput({
      providerId: expenseSource.vendor.id,
      applications: [{ sourceType: "expense", sourceId: expenseSource.expense.id, appliedAmount: "10000" }],
    }))
    expect(expensePayment.ok).toBe(false)

    const cancelledRepair = await createRepairSource()
    await cancelRepairActionServer(cancelledRepair.repair.code, { reason: "Cancelada" })
    const cancelledPayment = await createPayment(paymentInput({
      providerId: cancelledRepair.vendor.id,
      applications: [{ sourceType: "repair", sourceId: cancelledRepair.repair.id, appliedAmount: "10000" }],
    }))
    expect(cancelledPayment.ok).toBe(false)

    const voidedRepair = await createRepairSource()
    await voidRepairRecord(voidedRepair.repair.code, { reason: "Anulada" })
    const voidedPayment = await createPayment(paymentInput({
      providerId: voidedRepair.vendor.id,
      applications: [{ sourceType: "repair", sourceId: voidedRepair.repair.id, appliedAmount: "10000" }],
    }))
    expect(voidedPayment.ok).toBe(false)

    const activeRepair = await createRepairSource()
    const activePayment = await createPayment(paymentInput({
      providerId: activeRepair.vendor.id,
      applications: [{ sourceType: "repair", sourceId: activeRepair.repair.id, appliedAmount: "10000" }],
    }))
    expect(activePayment.ok).toBe(true)
  })
})

describe("anulación de pagos y bloqueos", () => {
  it("capturista no anula; admin anula con motivo; sin motivo y doble anulación se rechazan; el saldo se recalcula", async () => {
    await signInAs("admin")
    const { vendor, expense } = await createExpenseSource()

    const created = await createPayment(paymentInput({
      providerId: vendor.id,
      applications: [{ sourceType: "expense", sourceId: expense.id, appliedAmount: "10000" }],
    }))
    expect(created.ok).toBe(true)
    if (!created.ok) return

    await signInAs("capturista")
    const denied = await voidPayment(created.data.code, { reason: "No autorizado" })
    expect(denied.ok).toBe(false)

    await signInAs("admin")
    const missingReason = await voidPayment(created.data.code, { reason: "" })
    expect(missingReason.ok).toBe(false)

    const voided = await voidPayment(created.data.code, { reason: "Pago duplicado" })
    expect(voided.ok).toBe(true)

    const detail = await getPaymentByCode(created.data.code)
    expect(detail?.isVoided).toBe(true)
    expect(detail?.voidReason).toBe("Pago duplicado")

    const expenseDetail = await getExpenseByCode(expense.code)
    expect(expenseDetail?.pendingUsd).toEqual({ amount: 10_000, currency: "USD" })
    expect(expenseDetail?.paidUsd).toEqual({ amount: 0, currency: "USD" })

    const secondVoid = await voidPayment(created.data.code, { reason: "Otra vez" })
    expect(secondVoid.ok).toBe(false)
  })

  it("compras, gastos, reparaciones y vehículos con pagos activos no se pueden anular; tras anular el pago sí", async () => {
    await signInAs("admin")

    const purchaseSource = await createPurchaseSource()
    const purchasePayment = await createPayment(paymentInput({
      providerId: purchaseSource.vendor.id,
      applications: [{ sourceType: "purchase", sourceId: purchaseSource.purchase.id, appliedAmount: "10000" }],
    }))
    expect(purchasePayment.ok).toBe(true)
    if (!purchasePayment.ok) return

    const blockPurchase = await voidPurchase(purchaseSource.purchase.code, { reason: "Prueba" })
    expect(blockPurchase.ok).toBe(false)
    await voidPayment(purchasePayment.data.code, { reason: "Liberar compra" })
    expect((await voidPurchase(purchaseSource.purchase.code, { reason: "Prueba" })).ok).toBe(true)

    const expenseSource = await createExpenseSource()
    const expensePayment = await createPayment(paymentInput({
      providerId: expenseSource.vendor.id,
      applications: [{ sourceType: "expense", sourceId: expenseSource.expense.id, appliedAmount: "10000" }],
    }))
    expect(expensePayment.ok).toBe(true)
    if (!expensePayment.ok) return

    expect((await voidExpense(expenseSource.expense.code, { reason: "Prueba" })).ok).toBe(false)
    await voidPayment(expensePayment.data.code, { reason: "Liberar gasto" })
    expect((await voidExpense(expenseSource.expense.code, { reason: "Prueba" })).ok).toBe(true)

    const repairSource = await createRepairSource()
    const repairPayment = await createPayment(paymentInput({
      providerId: repairSource.vendor.id,
      applications: [{ sourceType: "repair", sourceId: repairSource.repair.id, appliedAmount: "10000" }],
    }))
    expect(repairPayment.ok).toBe(true)
    if (!repairPayment.ok) return

    expect((await voidRepairRecord(repairSource.repair.code, { reason: "Prueba" })).ok).toBe(false)
    await voidPayment(repairPayment.data.code, { reason: "Liberar reparación" })
    expect((await voidRepairRecord(repairSource.repair.code, { reason: "Prueba" })).ok).toBe(true)

    const vehicleSource = await createPurchaseSource()
    const vehiclePayment = await createPayment(paymentInput({
      providerId: vehicleSource.vendor.id,
      applications: [{ sourceType: "purchase", sourceId: vehicleSource.purchase.id, appliedAmount: "10000" }],
    }))
    expect(vehiclePayment.ok).toBe(true)
    if (!vehiclePayment.ok) return

    expect((await voidVehicle(vehicleSource.vehicle.code, { reason: "Prueba" })).ok).toBe(false)
    await voidPayment(vehiclePayment.data.code, { reason: "Liberar vehículo" })
    await voidPurchase(vehicleSource.purchase.code, { reason: "Quitar compra" })
    expect((await voidVehicle(vehicleSource.vehicle.code, { reason: "Prueba" })).ok).toBe(true)
  })
})

describe("autorización", () => {
  it("lectura no puede escribir; capturista registra pero no anula; sin sesión la escritura rebota a login", async () => {
    await signInAs("admin")
    const { vendor, purchase } = await createPurchaseSource()

    await signInAs("lectura")
    const deniedCreate = await createPayment(paymentInput({
      providerId: vendor.id,
      applications: [{ sourceType: "purchase", sourceId: purchase.id, appliedAmount: "10000" }],
    }))
    expect(deniedCreate.ok).toBe(false)

    await signInAs("capturista")
    const created = await createPayment(paymentInput({
      providerId: vendor.id,
      applications: [{ sourceType: "purchase", sourceId: purchase.id, appliedAmount: "10000" }],
    }))
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const deniedVoid = await voidPayment(created.data.code, { reason: "No autorizado" })
    expect(deniedVoid.ok).toBe(false)

    ctx.headers = new Headers()
    await expect(
      createPayment(paymentInput({
        providerId: vendor.id,
        applications: [{ sourceType: "purchase", sourceId: purchase.id, appliedAmount: "10000" }],
      })),
    ).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") })
  })
})
