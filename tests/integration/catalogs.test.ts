import mongoose, { Types } from "mongoose"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { setCookieToCookieHeader } from "./helpers/cookies"

/**
 * Los escenarios del spec `catalogs`, ejecutados contra un MongoDB de
 * verdad (`mongodb-memory-server`, ver tests/setup.ts).
 */

const ctx = vi.hoisted(() => ({ headers: new Headers() }))

vi.mock("next/headers", () => ({
  headers: async () => ctx.headers,
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}))

// `revalidatePath` solo tiene sentido dentro de una petición de Next.
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }))

const { getAuth } = await import("@/lib/auth/auth")
const { createCatalogEntry, updateCatalogEntry, setCatalogEntryActive } = await import(
  "@/features/catalogs/actions"
)
const { listActiveModelsByMake, listActiveOptions, listCatalogEntries } = await import(
  "@/features/catalogs/queries"
)
const { Make } = await import("@/lib/db/models/make")
const { VehicleModel } = await import("@/lib/db/models/model")
const { Counter, nextCode } = await import("@/lib/db/counters")
const { seedCatalogEntries } = await import("../../scripts/seed-catalogs")
const { realignCounters } = await import("../../scripts/seed-counters")

type Role = "admin" | "capturista" | "lectura"

let sequence = 0

/** Crea un usuario del rol pedido y deja su sesión activa en `ctx`. */
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

async function createMake(name: string) {
  const result = await createCatalogEntry("makes", { name })
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.error)
  return result.data
}

beforeEach(async () => {
  ctx.headers = new Headers()
})

describe("alta, unicidad de nombre y códigos", () => {
  it("da de alta con el siguiente código de la secuencia y en estado activo", async () => {
    await signInAs("admin")

    const first = await createMake("Toyota")
    const second = await createMake("Ford")

    expect(first.code).toBe("MAKE-0001")
    expect(second.code).toBe("MAKE-0002")
    expect(first.isActive).toBe(true)
  })

  it("ignora un código enviado por el usuario y emite el de la secuencia", async () => {
    await signInAs("admin")

    const result = await createCatalogEntry("makes", { name: "Toyota", code: "MAKE-9999" })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.code).toBe("MAKE-0001")
  })

  it("conserva el nombre tal como se capturó", async () => {
    await signInAs("admin")
    const created = await createMake("Land Rover")
    expect(created.name).toBe("Land Rover")
  })

  it("rechaza «  toyota » existiendo «Toyota», nombrando la entrada que ocupa el nombre", async () => {
    await signInAs("admin")
    const existing = await createMake("Toyota")

    const duplicate = await createCatalogEntry("makes", { name: "  toyota " })
    expect(duplicate.ok).toBe(false)
    if (!duplicate.ok) {
      expect(duplicate.error).toContain("Toyota")
      expect(duplicate.error).toContain(existing.code)
      expect(duplicate.fieldErrors?.name?.length).toBeGreaterThan(0)
    }
  })

  it("rechaza «Garcia Autos» existiendo «García Autos»", async () => {
    await signInAs("admin")
    await createCatalogEntry("vendors", { name: "García Autos" })

    const duplicate = await createCatalogEntry("vendors", { name: "Garcia Autos" })
    expect(duplicate.ok).toBe(false)
    if (!duplicate.ok) expect(duplicate.error).toContain("García Autos")
  })

  it("rechaza renombrar a un nombre ya ocupado y conserva el anterior", async () => {
    await signInAs("admin")
    await createMake("Toyota")
    const ford = await createMake("Ford")

    const renamed = await updateCatalogEntry("makes", ford.code, { name: "toyota" })
    expect(renamed.ok).toBe(false)

    const stored = await Make.findOne({ code: ford.code }).lean()
    expect(stored?.name).toBe("Ford")
  })

  it("reporta la colisión con una entrada desactivada sugiriendo reactivarla", async () => {
    await signInAs("admin")
    const toyota = await createMake("Toyota")
    await setCatalogEntryActive("makes", toyota.code, false)

    const duplicate = await createCatalogEntry("makes", { name: "Toyota" })
    expect(duplicate.ok).toBe(false)
    if (!duplicate.ok) {
      expect(duplicate.error).toContain("desactivada")
      expect(duplicate.error.toLowerCase()).toContain("reactivar")
    }
  })
})

describe("los códigos no se reutilizan ni se consumen en vano", () => {
  it("tras desactivar una entrada, la siguiente alta recibe el código siguiente", async () => {
    await signInAs("admin")
    const first = await createMake("Toyota")
    await setCatalogEntryActive("makes", first.code, false)

    const second = await createMake("Ford")
    expect(second.code).toBe("MAKE-0002")
  })

  it("un alta rechazada por validación no consume código", async () => {
    await signInAs("admin")

    const invalid = await createCatalogEntry("makes", { name: " " })
    expect(invalid.ok).toBe(false)

    const duplicate = await createCatalogEntry("makes", { name: "Toyota" })
    expect(duplicate.ok).toBe(true)

    const rejectedDuplicate = await createCatalogEntry("makes", { name: "TOYOTA" })
    expect(rejectedDuplicate.ok).toBe(false)

    const next = await createMake("Ford")
    expect(next.code).toBe("MAKE-0002")
  })
})

describe("dependencia marca → modelo", () => {
  it("rechaza un modelo sin marca", async () => {
    await signInAs("admin")

    const result = await createCatalogEntry("models", { name: "Corolla" })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.toLowerCase()).toContain("marca")
  })

  it("rechaza un modelo bajo una marca desactivada", async () => {
    await signInAs("admin")
    const toyota = await createMake("Toyota")
    await setCatalogEntryActive("makes", toyota.code, false)

    const result = await createCatalogEntry("models", { name: "Corolla", makeId: toyota.id })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.toLowerCase()).toContain("activa")
  })

  it("acepta el mismo nombre de modelo bajo dos marcas distintas", async () => {
    await signInAs("admin")
    const hyundai = await createMake("Hyundai")
    const kia = await createMake("Kia")

    const first = await createCatalogEntry("models", { name: "Sonata", makeId: hyundai.id })
    const second = await createCatalogEntry("models", { name: "Sonata", makeId: kia.id })

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
  })

  it("rechaza dos modelos con el mismo nombre dentro de la misma marca", async () => {
    await signInAs("admin")
    const toyota = await createMake("Toyota")

    await createCatalogEntry("models", { name: "Corolla", makeId: toyota.id })
    const duplicate = await createCatalogEntry("models", { name: "  corolla ", makeId: toyota.id })

    expect(duplicate.ok).toBe(false)
  })
})

describe("desactivar una marca no cascadea sobre sus modelos", () => {
  it("los saca de los desplegables sin cambiarlos en la base, y los devuelve al reactivar", async () => {
    await signInAs("admin")
    const toyota = await createMake("Toyota")

    const corolla = await createCatalogEntry("models", { name: "Corolla", makeId: toyota.id })
    const camry = await createCatalogEntry("models", { name: "Camry", makeId: toyota.id })
    expect(corolla.ok && camry.ok).toBe(true)
    if (!corolla.ok || !camry.ok) return

    // Camry queda desactivado individualmente.
    await setCatalogEntryActive("models", camry.data.code, false)

    await setCatalogEntryActive("makes", toyota.code, false)

    const storedModels = await VehicleModel.find({}).lean()
    expect(storedModels.find((model) => model.code === corolla.data.code)?.isActive).toBe(true)

    expect(await listActiveOptions("models")).toEqual([])
    expect(await listActiveModelsByMake(toyota.id)).toEqual([])

    await setCatalogEntryActive("makes", toyota.code, true)

    const options = await listActiveOptions("models")
    expect(options.map((option) => option.name)).toEqual(["Corolla"])
  })
})

describe("autorización", () => {
  it("un capturista da de alta y edita, pero no desactiva", async () => {
    await signInAs("capturista")

    const created = await createCatalogEntry("makes", { name: "Toyota" })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const edited = await updateCatalogEntry("makes", created.data.code, { name: "Toyota Motor" })
    expect(edited.ok).toBe(true)

    const deactivated = await setCatalogEntryActive("makes", created.data.code, false)
    expect(deactivated.ok).toBe(false)

    const stored = await Make.findOne({ code: created.data.code }).lean()
    expect(stored?.isActive).toBe(true)
  })

  it("un usuario con rol lectura no puede escribir nada", async () => {
    await signInAs("admin")
    const toyota = await createMake("Toyota")

    await signInAs("lectura")

    expect((await createCatalogEntry("makes", { name: "Ford" })).ok).toBe(false)
    expect((await updateCatalogEntry("makes", toyota.code, { name: "Otra" })).ok).toBe(false)
    expect((await setCatalogEntryActive("makes", toyota.code, false)).ok).toBe(false)

    const stored = await Make.find({}).lean()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.name).toBe("Toyota")
  })

  it("una escritura sin sesión es rechazada y no crea nada", async () => {
    ctx.headers = new Headers()

    await expect(createCatalogEntry("makes", { name: "Toyota" })).rejects.toThrow()
    expect(await Make.countDocuments({})).toBe(0)
  })

  it("un capturista puede consultar el catálogo", async () => {
    await signInAs("capturista")
    const entries = await listCatalogEntries("makes")
    expect(entries).not.toBeNull()
  })
})

describe("trazabilidad", () => {
  it("el alta guarda el autor y la hora del servidor", async () => {
    const admin = await signInAs("admin")
    const before = Date.now()

    const created = await createMake("Toyota")

    const stored = await Make.findOne({ code: created.code }).lean()
    expect(String(stored?.createdBy)).toBe(admin.id)
    expect(String(stored?.updatedBy)).toBe(admin.id)
    expect(new Date(stored!.createdAt).getTime()).toBeGreaterThanOrEqual(before - 1000)
  })

  it("la edición por otro usuario conserva el autor original", async () => {
    const admin = await signInAs("admin")
    const created = await createMake("Toyota")

    const capturista = await signInAs("capturista")
    const edited = await updateCatalogEntry("makes", created.code, { name: "Toyota Motor" })
    expect(edited.ok).toBe(true)

    const stored = await Make.findOne({ code: created.code }).lean()
    expect(String(stored?.createdBy)).toBe(admin.id)
    expect(String(stored?.updatedBy)).toBe(capturista.id)
  })

  it("desactivar registra quién y cuándo, y reactivar lo limpia", async () => {
    const admin = await signInAs("admin")
    const created = await createMake("Toyota")

    await setCatalogEntryActive("makes", created.code, false)
    const deactivated = await Make.findOne({ code: created.code }).lean()
    expect(deactivated?.isActive).toBe(false)
    expect(String(deactivated?.deactivatedBy)).toBe(admin.id)
    expect(deactivated?.deactivatedAt).toBeInstanceOf(Date)

    await setCatalogEntryActive("makes", created.code, true)
    const reactivated = await Make.findOne({ code: created.code }).lean()
    expect(reactivated?.isActive).toBe(true)
    expect(reactivated?.deactivatedAt).toBeNull()
    expect(reactivated?.deactivatedBy).toBeNull()
  })
})

describe("proveedores", () => {
  it("acepta un alta con teléfono y ciudad, sin correo", async () => {
    await signInAs("admin")

    const result = await createCatalogEntry("vendors", {
      name: "Subasta Norte",
      phone: "664-000-0000",
      city: "Tijuana",
      email: "",
      notes: "",
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.phone).toBe("664-000-0000")
      expect(result.data.email).toBeNull()
    }
  })

  it("rechaza un correo con formato inválido señalando el campo", async () => {
    await signInAs("admin")

    const result = await createCatalogEntry("vendors", {
      name: "Subasta Sur",
      email: "no-es-un-correo",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.fieldErrors?.email?.length).toBeGreaterThan(0)
  })

  it("acepta dos proveedores con el mismo teléfono", async () => {
    await signInAs("admin")

    const first = await createCatalogEntry("vendors", { name: "Uno", phone: "664-000-0000" })
    const second = await createCatalogEntry("vendors", { name: "Dos", phone: "664-000-0000" })

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
  })
})

describe("estatus de vehículo", () => {
  it("presenta por orden y no por código", async () => {
    await signInAs("admin")

    await createCatalogEntry("vehicleStatuses", { name: "Reacondicionamiento", sortOrder: 40 })
    await createCatalogEntry("vehicleStatuses", { name: "Listo para venta", sortOrder: 50 })
    const onHold = await createCatalogEntry("vehicleStatuses", { name: "On Hold", sortOrder: 45 })

    expect(onHold.ok).toBe(true)
    if (onHold.ok) expect(onHold.data.code).toBe("STATUS-0003")

    const options = await listActiveOptions("vehicleStatuses")
    expect(options.map((option) => option.name)).toEqual([
      "Reacondicionamiento",
      "On Hold",
      "Listo para venta",
    ])
  })

  it("desempata por nombre cuando dos comparten orden", async () => {
    await signInAs("admin")

    await createCatalogEntry("vehicleStatuses", { name: "Zeta", sortOrder: 10 })
    await createCatalogEntry("vehicleStatuses", { name: "Alfa", sortOrder: 10 })

    const options = await listActiveOptions("vehicleStatuses")
    expect(options.map((option) => option.name)).toEqual(["Alfa", "Zeta"])
  })

  it("acepta un estatus sin descripción y rechaza uno sin orden", async () => {
    await signInAs("admin")

    const withoutDescription = await createCatalogEntry("vehicleStatuses", {
      name: "En tránsito",
      sortOrder: 20,
      description: "",
    })
    expect(withoutDescription.ok).toBe(true)
    if (withoutDescription.ok) expect(withoutDescription.data.description).toBeNull()

    const withoutOrder = await createCatalogEntry("vehicleStatuses", { name: "Sin orden" })
    expect(withoutOrder.ok).toBe(false)
    if (!withoutOrder.ok) expect(withoutOrder.fieldErrors?.sortOrder?.length).toBeGreaterThan(0)
  })
})

describe("scripts de carga", () => {
  async function adminObjectId(): Promise<Types.ObjectId> {
    const admin = await signInAs("admin")
    return new Types.ObjectId(admin.id)
  }

  it("seed-catalogs corrido dos veces no duplica y reporta lo existente", async () => {
    const authorId = await adminObjectId()
    const entries = [
      { code: "MAKE-0001", name: "Toyota" },
      { code: "MAKE-0002", name: "Ford" },
    ]

    const first = await seedCatalogEntries({ catalogKey: "makes", entries, authorId })
    expect(first.created).toBe(2)
    expect(first.existing).toBe(0)

    const second = await seedCatalogEntries({ catalogKey: "makes", entries, authorId })
    expect(second.created).toBe(0)
    expect(second.existing).toBe(2)

    expect(await Make.countDocuments({})).toBe(2)
  })

  it("seed-catalogs normaliza el nombre y firma la autoría", async () => {
    const authorId = await adminObjectId()

    await seedCatalogEntries({
      catalogKey: "makes",
      entries: [{ name: "  Land   Rover " }],
      authorId,
    })

    const stored = await Make.findOne({}).lean()
    expect(stored?.name).toBe("Land   Rover")
    expect(stored?.nameKey).toBe("land rover")
    expect(String(stored?.createdBy)).toBe(String(authorId))
    expect(stored?.code).toBe("MAKE-0001")
  })

  it("una entrada cargada a mano sin nameKey es detectable", async () => {
    await signInAs("admin")

    await mongoose.connection.collection("makes").insertOne({
      code: "MAKE-0500",
      name: "Cargada a mano",
      isActive: true,
    })

    const sinClave = await mongoose.connection
      .collection("makes")
      .countDocuments({ nameKey: { $exists: false } })

    expect(sinClave).toBe(1)
  })

  it("seed-counters deja el contador en el código más alto presente y no lo baja", async () => {
    const authorId = await adminObjectId()

    await seedCatalogEntries({
      catalogKey: "makes",
      entries: [
        { code: "MAKE-0010", name: "Toyota" },
        { code: "MAKE-0011", name: "Ford" },
      ],
      authorId,
    })

    await realignCounters()
    expect(await nextCode("MAKE")).toBe("MAKE-0012")

    // Ya por encima: no lo baja.
    await Counter.updateOne({ _id: "MAKE" }, { $set: { seq: 50 } }, { upsert: true })
    await realignCounters()
    const counter = await Counter.findById("MAKE").lean()
    expect(counter?.seq).toBe(50)
  })
})
