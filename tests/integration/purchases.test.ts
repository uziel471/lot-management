import { beforeEach, describe, expect, it, vi } from "vitest"
import { setCookieToCookieHeader } from "./helpers/cookies"

/**
 * Los escenarios del spec `purchases`, ejecutados contra un MongoDB
 * de verdad (`mongodb-memory-server`, ver tests/setup.ts). Reproduce
 * los seis escenarios de validación de la Fase 2 del plan v2, más las
 * reglas nuevas de esta fase: compra inicial única, inmutabilidad,
 * comprobante único, guardado doble y costo acumulado.
 */

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
const { listPurchases, getVehicleAcquisitionCost } = await import("@/features/purchases/queries")

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

/** Marca, modelo, estatus, proveedor y un vehículo vigentes, listos para comprar. */
async function seedVehicleAndVendor() {
  const make = await createCatalogEntry("makes", { name: "Toyota" })
  if (!make.ok) throw new Error(make.error)
  const model = await createCatalogEntry("models", { name: "Corolla", makeId: make.data.id })
  if (!model.ok) throw new Error(model.error)
  const status = await createCatalogEntry("vehicleStatuses", { name: "Purchased", sortOrder: 10 })
  if (!status.ok) throw new Error(status.error)
  const vendor = await createCatalogEntry("vendors", { name: "Subasta Otay" })
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
  return `token-${tokenSeq}`
}

function baseInput(vehicleId: string, vendorId: string, overrides: Record<string, unknown> = {}) {
  return {
    vehicleId,
    vendorId,
    purchaseDate: "2026-08-05",
    sourceType: "auction",
    currency: "USD",
    exchangeRate: "1",
    purchasePrice: "10000",
    txType: "initial",
    submissionToken: nextToken(),
    ...overrides,
  }
}

beforeEach(async () => {
  ctx.headers = new Headers()
})

describe("registro de compra", () => {
  it("da de alta la primera compra del sistema en USD con PUR-0001", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()

    const result = await createPurchase(baseInput(vehicle.id, vendor.id))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.code).toBe("PUR-0001")
    expect(result.data.exchangeRate).toBe("1")
  })

  it("rechaza el guardado sin proveedor y no consume código", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()

    const invalid = await createPurchase(baseInput(vehicle.id, "", {}))
    expect(invalid.ok).toBe(false)

    const valid = await createPurchase(baseInput(vehicle.id, vendor.id))
    expect(valid.ok).toBe(true)
    if (valid.ok) expect(valid.data.code).toBe("PUR-0001")
  })

  it("tres compras válidas seguidas reciben códigos consecutivos", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()

    const first = await createPurchase(baseInput(vehicle.id, vendor.id))
    expect(first.ok && first.data.code).toBe("PUR-0001")

    const second = await createPurchase(
      baseInput(vehicle.id, vendor.id, { txType: "adjustment", purchasePrice: "100" }),
    )
    expect(second.ok && second.data.code).toBe("PUR-0002")

    const third = await createPurchase(
      baseInput(vehicle.id, vendor.id, { txType: "adjustment", purchasePrice: "50" }),
    )
    expect(third.ok && third.data.code).toBe("PUR-0003")
  })

  it("rechaza una compra de un vehículo anulado", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()
    const voided = await voidVehicle(vehicle.code, { reason: "capturado por error" })
    expect(voided.ok).toBe(true)

    const result = await createPurchase(baseInput(vehicle.id, vendor.id))
    expect(result.ok).toBe(false)
  })
})

describe("moneda y conversión", () => {
  it("370,000.00 MXN a 18.50 expone 20,000.00 USD", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()

    const result = await createPurchase(
      baseInput(vehicle.id, vendor.id, {
        currency: "MXN",
        exchangeRate: "18.50",
        purchasePrice: "370000",
      }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.totalUsd).toEqual({ amount: 2_000_000, currency: "USD" })
  })

  it("rechaza tipo de cambio distinto de 1 en una compra en USD", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()

    const result = await createPurchase(baseInput(vehicle.id, vendor.id, { exchangeRate: "18" }))
    expect(result.ok).toBe(false)
  })

  it("rechaza tipo de cambio 0", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()

    const result = await createPurchase(
      baseInput(vehicle.id, vendor.id, { currency: "MXN", exchangeRate: "0" }),
    )
    expect(result.ok).toBe(false)
  })
})

describe("control de signo y tipo", () => {
  it("rechaza un componente negativo en una compra Initial", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()

    const result = await createPurchase(baseInput(vehicle.id, vendor.id, { purchasePrice: "-500" }))
    expect(result.ok).toBe(false)
  })

  it("acepta un Adjustment negativo", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()

    const initial = await createPurchase(baseInput(vehicle.id, vendor.id))
    expect(initial.ok).toBe(true)

    const adjustment = await createPurchase(
      baseInput(vehicle.id, vendor.id, { txType: "adjustment", purchasePrice: "-500" }),
    )
    expect(adjustment.ok).toBe(true)
  })

  it("rechaza un Adjustment sin compra base", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()

    const result = await createPurchase(
      baseInput(vehicle.id, vendor.id, { txType: "adjustment", purchasePrice: "100" }),
    )
    expect(result.ok).toBe(false)
  })

  it("rechaza una segunda compra Initial vigente del mismo vehículo", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()

    const first = await createPurchase(baseInput(vehicle.id, vendor.id))
    expect(first.ok).toBe(true)

    const second = await createPurchase(baseInput(vehicle.id, vendor.id))
    expect(second.ok).toBe(false)
  })

  it("tras anular la Initial, una Correction se acepta y pasa a ser el costo base", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()

    const initial = await createPurchase(baseInput(vehicle.id, vendor.id))
    expect(initial.ok).toBe(true)
    if (!initial.ok) return

    const voided = await voidPurchase(initial.data.code, { reason: "capturada al vehículo equivocado" })
    expect(voided.ok).toBe(true)

    const correction = await createPurchase(
      baseInput(vehicle.id, vendor.id, {
        txType: "correction",
        correctsPurchaseId: initial.data.id,
        purchasePrice: "9500",
      }),
    )
    expect(correction.ok).toBe(true)

    const cost = await getVehicleAcquisitionCost(vehicle.id)
    expect(cost?.total).toEqual({ amount: 950_000, currency: "USD" })
  })
})

describe("unicidad del comprobante", () => {
  it("rechaza una referencia repetida del mismo proveedor", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()

    const first = await createPurchase(baseInput(vehicle.id, vendor.id, { referenceNumber: "FAC-1023" }))
    expect(first.ok).toBe(true)

    const second = await createPurchase(
      baseInput(vehicle.id, vendor.id, {
        txType: "adjustment",
        purchasePrice: "100",
        referenceNumber: " fac-1023 ",
      }),
    )
    expect(second.ok).toBe(false)
  })

  it("acepta el mismo folio de dos proveedores distintos", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()
    const otherVendor = await createCatalogEntry("vendors", { name: "Dealer Chula Vista" })
    expect(otherVendor.ok).toBe(true)
    if (!otherVendor.ok) return

    const first = await createPurchase(baseInput(vehicle.id, vendor.id, { referenceNumber: "FAC-1" }))
    expect(first.ok).toBe(true)

    const second = await createPurchase(
      baseInput(vehicle.id, otherVendor.data.id, {
        txType: "related",
        purchasePrice: "100",
        referenceNumber: "FAC-1",
      }),
    )
    expect(second.ok).toBe(true)
  })
})

describe("protección contra guardado doble", () => {
  it("dos envíos con el mismo token crean una sola compra", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()
    const token = nextToken()

    const first = await createPurchase(baseInput(vehicle.id, vendor.id, { submissionToken: token }))
    expect(first.ok).toBe(true)

    const second = await createPurchase(baseInput(vehicle.id, vendor.id, { submissionToken: token }))
    expect(second.ok).toBe(true)
    if (first.ok && second.ok) {
      expect(second.data.code).toBe(first.data.code)
    }

    const purchases = await listPurchases({ vehicleId: vehicle.id })
    expect(purchases?.length).toBe(1)
  })
})

describe("anulación de compras", () => {
  it("capturista no puede anular", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()
    const purchase = await createPurchase(baseInput(vehicle.id, vendor.id))
    expect(purchase.ok).toBe(true)
    if (!purchase.ok) return

    await signInAs("capturista")
    const result = await voidPurchase(purchase.data.code, { reason: "intento no autorizado" })
    expect(result.ok).toBe(false)
  })

  it("admin anula con motivo y el costo del vehículo baja", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()
    const purchase = await createPurchase(baseInput(vehicle.id, vendor.id))
    expect(purchase.ok).toBe(true)
    if (!purchase.ok) return

    const result = await voidPurchase(purchase.data.code, { reason: "capturada al vehículo equivocado" })
    expect(result.ok).toBe(true)

    const cost = await getVehicleAcquisitionCost(vehicle.id)
    expect(cost?.total).toEqual({ amount: 0, currency: "USD" })
  })

  it("no permite anular dos veces", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()
    const purchase = await createPurchase(baseInput(vehicle.id, vendor.id))
    expect(purchase.ok).toBe(true)
    if (!purchase.ok) return

    await voidPurchase(purchase.data.code, { reason: "primer motivo" })
    const secondVoid = await voidPurchase(purchase.data.code, { reason: "segundo intento" })
    expect(secondVoid.ok).toBe(false)
  })
})

describe("bloqueo de anulación de vehículo con compras vigentes", () => {
  it("rechaza anular un vehículo con compras vigentes", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()
    await createPurchase(baseInput(vehicle.id, vendor.id))

    const result = await voidVehicle(vehicle.code, { reason: "ya no está en el lote" })
    expect(result.ok).toBe(false)
  })

  it("permite anular tras anular todas sus compras", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()
    const purchase = await createPurchase(baseInput(vehicle.id, vendor.id))
    expect(purchase.ok).toBe(true)
    if (!purchase.ok) return

    await voidPurchase(purchase.data.code, { reason: "regresó al proveedor" })
    const result = await voidVehicle(vehicle.code, { reason: "ya no está en el lote" })
    expect(result.ok).toBe(true)
  })
})

describe("autorización", () => {
  it("lectura no puede registrar compras", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()

    await signInAs("lectura")
    const result = await createPurchase(baseInput(vehicle.id, vendor.id))
    expect(result.ok).toBe(false)
  })

  it("capturista registra pero no anula", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()

    await signInAs("capturista")
    const result = await createPurchase(baseInput(vehicle.id, vendor.id))
    expect(result.ok).toBe(true)
  })
})

describe("costo de adquisición acumulado", () => {
  it("un vehículo sin compras da cero", async () => {
    await signInAs("admin")
    const { vehicle } = await seedVehicleAndVendor()

    const cost = await getVehicleAcquisitionCost(vehicle.id)
    expect(cost?.total).toEqual({ amount: 0, currency: "USD" })
    expect(cost?.purchaseCount).toBe(0)
  })

  it("suma una compra en USD y otra en MXN con sus propios tipos de cambio", async () => {
    await signInAs("admin")
    const { vehicle, vendor } = await seedVehicleAndVendor()

    await createPurchase(baseInput(vehicle.id, vendor.id, { purchasePrice: "10000" }))
    await createPurchase(
      baseInput(vehicle.id, vendor.id, {
        txType: "adjustment",
        currency: "MXN",
        exchangeRate: "18.50",
        purchasePrice: "37000",
      }),
    )

    const cost = await getVehicleAcquisitionCost(vehicle.id)
    // 10,000 USD + (37,000 MXN / 18.50 = 2,000 USD) = 12,000 USD
    expect(cost?.total).toEqual({ amount: 1_200_000, currency: "USD" })
  })
})
