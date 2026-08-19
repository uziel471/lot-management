import { beforeEach, describe, expect, it, vi } from "vitest"
import { setCookieToCookieHeader } from "./helpers/cookies"

/**
 * Los escenarios del spec `vehicles`, ejecutados contra un MongoDB de
 * verdad (`mongodb-memory-server`, ver tests/setup.ts).
 */

const ctx = vi.hoisted(() => ({ headers: new Headers() }))

vi.mock("next/headers", () => ({
  headers: async () => ctx.headers,
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}))

vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }))

const { getAuth } = await import("@/lib/auth/auth")
const { createCatalogEntry } = await import("@/features/catalogs/actions")
const {
  createVehicle,
  updateVehicle,
  changeVehicleStatus,
  changeAskingPrice,
  voidVehicle,
} = await import("@/features/vehicles/actions")
const { listVehicles, getVehicleByCode } = await import("@/features/vehicles/queries")
const { Vehicle } = await import("@/lib/db/models/vehicle")
const { BODY_STYLE_VALUES } = await import("@/features/vehicles/enums")

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

/** Da de alta marca, modelo y estatus activos, y devuelve sus ids. */
async function seedCatalogs() {
  const make = await createCatalogEntry("makes", { name: "Toyota" })
  expect(make.ok).toBe(true)
  if (!make.ok) throw new Error(make.error)

  const model = await createCatalogEntry("models", { name: "Corolla", makeId: make.data.id })
  expect(model.ok).toBe(true)
  if (!model.ok) throw new Error(model.error)

  const status = await createCatalogEntry("vehicleStatuses", { name: "Purchased", sortOrder: 10 })
  expect(status.ok).toBe(true)
  if (!status.ok) throw new Error(status.error)

  const secondStatus = await createCatalogEntry("vehicleStatuses", {
    name: "Listed",
    sortOrder: 50,
  })
  expect(secondStatus.ok).toBe(true)
  if (!secondStatus.ok) throw new Error(secondStatus.error)

  return {
    make: make.data,
    model: model.data,
    status: status.data,
    secondStatus: secondStatus.data,
  }
}

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    makeId: "",
    modelId: "",
    statusId: "",
    year: "2020",
    dateReceived: "2026-08-01",
    ...overrides,
  }
}

beforeEach(async () => {
  ctx.headers = new Headers()
})

describe("alta de vehículo", () => {
  it("da de alta con los cinco obligatorios y deja el resto en blanco", async () => {
    await signInAs("admin")
    const { make, model, status } = await seedCatalogs()

    const result = await createVehicle(
      baseInput({ makeId: make.id, modelId: model.id, statusId: status.id }),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.code).toBe("VEH-0001")
    expect(result.data.vin).toBeNull()
    expect(result.data.askingPrice).toBeNull()

    const listed = await listVehicles()
    expect(listed?.some((vehicle) => vehicle.code === result.data.code)).toBe(true)
  })

  it("rechaza el guardado sin año y no consume código", async () => {
    await signInAs("admin")
    const { make, model, status } = await seedCatalogs()

    const invalid = await createVehicle({
      makeId: make.id,
      modelId: model.id,
      statusId: status.id,
      dateReceived: "2026-08-01",
    })
    expect(invalid.ok).toBe(false)

    const valid = await createVehicle(
      baseInput({ makeId: make.id, modelId: model.id, statusId: status.id }),
    )
    expect(valid.ok).toBe(true)
    if (valid.ok) expect(valid.data.code).toBe("VEH-0001")
  })

  it("rechaza un modelo que no pertenece a la marca indicada", async () => {
    await signInAs("admin")
    const { model, status } = await seedCatalogs()
    const otherMake = await createCatalogEntry("makes", { name: "Ford" })
    expect(otherMake.ok).toBe(true)
    if (!otherMake.ok) return

    const result = await createVehicle(
      baseInput({ makeId: otherMake.data.id, modelId: model.id, statusId: status.id }),
    )
    expect(result.ok).toBe(false)
  })

  it("rechaza una marca, modelo o estatus desactivado", async () => {
    await signInAs("admin")
    const { make, model, status } = await seedCatalogs()
    const { setCatalogEntryActive } = await import("@/features/catalogs/actions")
    await setCatalogEntryActive("makes", make.code, false)

    const result = await createVehicle(
      baseInput({ makeId: make.id, modelId: model.id, statusId: status.id }),
    )
    expect(result.ok).toBe(false)
  })

  it("rechaza un año fuera de rango", async () => {
    await signInAs("admin")
    const { make, model, status } = await seedCatalogs()

    const tooOld = await createVehicle(
      baseInput({ makeId: make.id, modelId: model.id, statusId: status.id, year: "1900" }),
    )
    expect(tooOld.ok).toBe(false)

    const tooNew = await createVehicle(
      baseInput({ makeId: make.id, modelId: model.id, statusId: status.id, year: "2099" }),
    )
    expect(tooNew.ok).toBe(false)
  })
})

describe("VIN", () => {
  const VALID_VIN = "1M8GDM9AXKP042788"

  it("rechaza un VIN duplicado nombrando el vehículo que ya lo usa", async () => {
    await signInAs("admin")
    const { make, model, status } = await seedCatalogs()

    const first = await createVehicle(
      baseInput({ makeId: make.id, modelId: model.id, statusId: status.id, vin: VALID_VIN }),
    )
    expect(first.ok).toBe(true)
    if (!first.ok) return

    const duplicate = await createVehicle(
      baseInput({ makeId: make.id, modelId: model.id, statusId: status.id, vin: VALID_VIN }),
    )
    expect(duplicate.ok).toBe(false)
    if (!duplicate.ok) expect(duplicate.error).toContain(first.data.code)
  })

  it("rechaza un VIN de formato inválido", async () => {
    await signInAs("admin")
    const { make, model, status } = await seedCatalogs()

    const result = await createVehicle(
      baseInput({ makeId: make.id, modelId: model.id, statusId: status.id, vin: "CORTO" }),
    )
    expect(result.ok).toBe(false)
  })

  it("normaliza un VIN capturado en minúsculas y con espacios", async () => {
    await signInAs("admin")
    const { make, model, status } = await seedCatalogs()

    const result = await createVehicle(
      baseInput({
        makeId: make.id,
        modelId: model.id,
        statusId: status.id,
        vin: ` ${VALID_VIN.toLowerCase()} `,
      }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.vin).toBe(VALID_VIN)
  })

  it("guarda un VIN con dígito verificador incorrecto y advierte, sin bloquear", async () => {
    await signInAs("admin")
    const { make, model, status } = await seedCatalogs()
    const wrongCheckDigit = `${VALID_VIN.slice(0, 8)}1${VALID_VIN.slice(9)}`

    const result = await createVehicle(
      baseInput({ makeId: make.id, modelId: model.id, statusId: status.id, vin: wrongCheckDigit }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.vin).toBe(wrongCheckDigit)
      expect(result.vinCheckDigitWarning).toBe(true)
    }
  })

  it("acepta varios vehículos sin VIN", async () => {
    await signInAs("admin")
    const { make, model, status } = await seedCatalogs()

    const first = await createVehicle(
      baseInput({ makeId: make.id, modelId: model.id, statusId: status.id }),
    )
    const second = await createVehicle(
      baseInput({ makeId: make.id, modelId: model.id, statusId: status.id }),
    )
    expect(first.ok && second.ok).toBe(true)
  })
})

describe("número de inventario", () => {
  it("rechaza un número de inventario duplicado", async () => {
    await signInAs("admin")
    const { make, model, status } = await seedCatalogs()

    const first = await createVehicle(
      baseInput({ makeId: make.id, modelId: model.id, statusId: status.id, stockNumber: "A-1" }),
    )
    expect(first.ok).toBe(true)

    const duplicate = await createVehicle(
      baseInput({ makeId: make.id, modelId: model.id, statusId: status.id, stockNumber: "A-1" }),
    )
    expect(duplicate.ok).toBe(false)
  })
})

describe("estatus e historial", () => {
  it("la entrada inicial del historial existe tras el alta", async () => {
    await signInAs("admin")
    const { make, model, status } = await seedCatalogs()

    const created = await createVehicle(
      baseInput({ makeId: make.id, modelId: model.id, statusId: status.id }),
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return

    expect(created.data.statusHistory).toHaveLength(1)
    expect(created.data.statusHistory[0]?.previousStatusName).toBeNull()
    expect(created.data.statusHistory[0]?.newStatusId).toBe(status.id)
  })

  it("un cambio de estatus agrega entrada, y un retroceso se acepta igual", async () => {
    await signInAs("admin")
    const { make, model, status, secondStatus } = await seedCatalogs()

    const created = await createVehicle(
      baseInput({ makeId: make.id, modelId: model.id, statusId: status.id }),
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const forward = await changeVehicleStatus(created.data.code, { statusId: secondStatus.id })
    expect(forward.ok).toBe(true)

    const back = await changeVehicleStatus(created.data.code, { statusId: status.id })
    expect(back.ok).toBe(true)
    if (back.ok) expect(back.data.statusHistory).toHaveLength(3)
  })

  it("guardar el mismo estatus no agrega entrada al historial", async () => {
    await signInAs("admin")
    const { make, model, status } = await seedCatalogs()

    const created = await createVehicle(
      baseInput({ makeId: make.id, modelId: model.id, statusId: status.id }),
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const same = await changeVehicleStatus(created.data.code, { statusId: status.id })
    expect(same.ok).toBe(true)
    if (same.ok) expect(same.data.statusHistory).toHaveLength(1)
  })
})

describe("precio de lista", () => {
  it("acepta el alta sin precio y registra el cambio con autor y fecha", async () => {
    const admin = await signInAs("admin")
    const { make, model, status } = await seedCatalogs()

    const created = await createVehicle(
      baseInput({ makeId: make.id, modelId: model.id, statusId: status.id }),
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(created.data.askingPrice).toBeNull()

    const changed = await changeAskingPrice(created.data.code, { askingPrice: "15000" })
    expect(changed.ok).toBe(true)
    if (changed.ok) {
      expect(changed.data.askingPrice?.amount).toBe(1_500_000)
    }

    const stored = await Vehicle.findOne({ code: created.data.code }).lean()
    expect(String(stored?.askingPriceUpdatedBy)).toBe(admin.id)
    expect(stored?.askingPriceUpdatedAt).toBeInstanceOf(Date)
  })

  it("rechaza un precio negativo", async () => {
    await signInAs("admin")
    const { make, model, status } = await seedCatalogs()

    const created = await createVehicle(
      baseInput({ makeId: make.id, modelId: model.id, statusId: status.id }),
    )
    if (!created.ok) throw new Error(created.error)

    const result = await changeAskingPrice(created.data.code, { askingPrice: "-1" })
    expect(result.ok).toBe(false)
  })
})

describe("kilometraje", () => {
  it("conserva la unidad tal como se capturó", async () => {
    await signInAs("admin")
    const { make, model, status } = await seedCatalogs()

    const result = await createVehicle(
      baseInput({
        makeId: make.id,
        modelId: model.id,
        statusId: status.id,
        mileage: "84000",
        mileageUnit: "mi",
      }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.mileage).toBe(84000)
      expect(result.data.mileageUnit).toBe("mi")
    }
  })

  it("rechaza un kilometraje negativo", async () => {
    await signInAs("admin")
    const { make, model, status } = await seedCatalogs()

    const result = await createVehicle(
      baseInput({
        makeId: make.id,
        modelId: model.id,
        statusId: status.id,
        mileage: "-5",
        mileageUnit: "mi",
      }),
    )
    expect(result.ok).toBe(false)
  })
})

describe("anulación", () => {
  it("un capturista no puede anular", async () => {
    await signInAs("admin")
    const { make, model, status } = await seedCatalogs()
    const created = await createVehicle(
      baseInput({ makeId: make.id, modelId: model.id, statusId: status.id }),
    )
    if (!created.ok) throw new Error(created.error)

    await signInAs("capturista")
    const result = await voidVehicle(created.data.code, { reason: "Duplicado" })
    expect(result.ok).toBe(false)
  })

  it("un admin anula con motivo; el vehículo sale del inventario pero sigue consultable, y el código no se reutiliza", async () => {
    await signInAs("admin")
    const { make, model, status } = await seedCatalogs()
    const first = await createVehicle(
      baseInput({ makeId: make.id, modelId: model.id, statusId: status.id }),
    )
    if (!first.ok) throw new Error(first.error)

    const voided = await voidVehicle(first.data.code, { reason: "Capturado por error" })
    expect(voided.ok).toBe(true)

    const listed = await listVehicles()
    expect(listed?.some((vehicle) => vehicle.code === first.data.code)).toBe(false)

    const stillFound = await getVehicleByCode(first.data.code)
    expect(stillFound?.isVoided).toBe(true)

    const second = await createVehicle(
      baseInput({ makeId: make.id, modelId: model.id, statusId: status.id }),
    )
    expect(second.ok).toBe(true)
    if (second.ok) expect(second.data.code).toBe("VEH-0002")
  })
})

describe("autorización", () => {
  it("lectura no puede ejecutar ninguna escritura", async () => {
    await signInAs("admin")
    const { make, model, status } = await seedCatalogs()
    const created = await createVehicle(
      baseInput({ makeId: make.id, modelId: model.id, statusId: status.id }),
    )
    if (!created.ok) throw new Error(created.error)

    await signInAs("lectura")
    expect(
      (await createVehicle(baseInput({ makeId: make.id, modelId: model.id, statusId: status.id })))
        .ok,
    ).toBe(false)
    expect(
      (await updateVehicle(
        created.data.code,
        baseInput({ makeId: make.id, modelId: model.id, statusId: status.id }),
      )).ok,
    ).toBe(false)
    expect((await changeVehicleStatus(created.data.code, { statusId: status.id })).ok).toBe(false)
    expect((await voidVehicle(created.data.code, { reason: "x" })).ok).toBe(false)
  })

  it("una escritura sin sesión es rechazada y no crea nada", async () => {
    ctx.headers = new Headers()
    await expect(
      createVehicle(baseInput({ makeId: "x", modelId: "x", statusId: "x" })),
    ).rejects.toThrow()
    expect(await Vehicle.countDocuments({})).toBe(0)
  })
})

describe("integridad de enumeraciones", () => {
  it("todo valor de bodyStyle almacenado pertenece a la lista vigente", async () => {
    await signInAs("admin")
    const { make, model, status } = await seedCatalogs()

    await createVehicle(
      baseInput({ makeId: make.id, modelId: model.id, statusId: status.id, bodyStyle: "sedan" }),
    )

    const stored = await Vehicle.find({ bodyStyle: { $ne: null } }).lean()
    for (const vehicle of stored) {
      expect(BODY_STYLE_VALUES).toContain(vehicle.bodyStyle)
    }
  })
})

describe("días en inventario", () => {
  it("no se almacena y cambia con el paso del tiempo sin editar el documento", async () => {
    await signInAs("admin")
    const { make, model, status } = await seedCatalogs()

    const created = await createVehicle(
      baseInput({
        makeId: make.id,
        modelId: model.id,
        statusId: status.id,
        dateReceived: "2020-01-01",
      }),
    )
    if (!created.ok) throw new Error(created.error)

    expect(created.data.daysInInventory).toBeGreaterThan(0)

    const stored = await Vehicle.findOne({ code: created.data.code }).lean()
    expect(stored).not.toHaveProperty("daysInInventory")
  })
})

