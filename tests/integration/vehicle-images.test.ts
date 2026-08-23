import { beforeEach, describe, expect, it, vi } from "vitest"
import { setCookieToCookieHeader } from "./helpers/cookies"

const ctx = vi.hoisted(() => ({ headers: new Headers() }))
const storage = vi.hoisted(() => ({
  uploads: [] as { bucket: string; path: string; contentType: string; size: number }[],
  deletes: [] as { bucket: string; path: string }[],
  failDelete: false,
}))

vi.mock("next/headers", () => ({
  headers: async () => ctx.headers,
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}))

vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }))

vi.mock("@/lib/supabase/vehicle-image-storage.server", () => ({
  uploadVehicleImageObject: async ({ path, contentType, body }: { path: string; contentType: string; body: Uint8Array }) => {
    storage.uploads.push({ bucket: "vehicle-images", path, contentType, size: body.byteLength })
    return { bucket: "vehicle-images", path }
  },
  deleteVehicleImageObject: async ({ bucket, path }: { bucket: string; path: string }) => {
    if (storage.failDelete) {
      throw new Error("fallo simulado de borrado")
    }
    storage.deletes.push({ bucket, path })
  },
  getVehicleImageRenderableUrl: async ({ bucket, path }: { bucket: string; path: string }) => {
    return `https://example.test/${bucket}/${path}`
  },
}))

const { getAuth } = await import("@/lib/auth/auth")
const { createCatalogEntry } = await import("@/features/catalogs/actions")
const { createVehicle, uploadVehicleImage, deleteVehicleImage } = await import("@/features/vehicles/actions")
const { getVehicleByCode } = await import("@/features/vehicles/queries")
const { VehicleImage } = await import("@/lib/db/models/vehicle-image")

type Role = "admin" | "capturista" | "lectura"

let sequence = 0

async function signInAs(role: Role): Promise<{ id: string; email: string }> {
  sequence++
  const email = `${role}-images-${sequence}@lote.com`
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
  const make = await createCatalogEntry("makes", { name: `Toyota ${sequence}` })
  if (!make.ok) throw new Error(make.error)

  const model = await createCatalogEntry("models", { name: `Corolla ${sequence}`, makeId: make.data.id })
  if (!model.ok) throw new Error(model.error)

  const status = await createCatalogEntry("vehicleStatuses", { name: `Disponible ${sequence}`, sortOrder: 10 })
  if (!status.ok) throw new Error(status.error)

  const vehicle = await createVehicle({
    makeId: make.data.id,
    modelId: model.data.id,
    statusId: status.data.id,
    year: "2020",
    dateReceived: "2026-08-01",
  })
  if (!vehicle.ok) throw new Error(vehicle.error)

  return vehicle.data
}

function createImage(name = "unidad.jpg", type = "image/jpeg", content = "fake-image") {
  return new File([content], name, { type })
}

beforeEach(() => {
  ctx.headers = new Headers()
  storage.uploads = []
  storage.deletes = []
  storage.failDelete = false
})

describe("vehicle images", () => {
  it("sube una imagen válida, crea metadata y aparece en el detalle", async () => {
    await signInAs("admin")
    const vehicle = await seedVehicle()

    const result = await uploadVehicleImage(vehicle.id, createImage())
    expect(result.ok).toBe(true)
    expect(storage.uploads).toHaveLength(1)

    const detail = await getVehicleByCode(vehicle.code)
    expect(detail?.images).toHaveLength(1)
    expect(detail?.images[0]?.originalFileName).toBe("unidad.jpg")
    expect(detail?.images[0]?.renderUrl).toContain("vehicle-images/")
  })

  it("rechaza archivo no soportado o demasiado grande sin crear metadata", async () => {
    await signInAs("admin")
    const vehicle = await seedVehicle()

    const badType = await uploadVehicleImage(vehicle.id, createImage("archivo.pdf", "application/pdf"))
    expect(badType.ok).toBe(false)

    const tooBig = await uploadVehicleImage(
      vehicle.id,
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], "pesada.jpg", { type: "image/jpeg" }),
    )
    expect(tooBig.ok).toBe(false)

    const count = await VehicleImage.countDocuments()
    expect(count).toBe(0)
  })

  it("rechaza superar el límite de imágenes activas y conserva las existentes", async () => {
    await signInAs("admin")
    const vehicle = await seedVehicle()

    for (let index = 0; index < 40; index++) {
      const result = await uploadVehicleImage(vehicle.id, createImage(`foto-${index}.jpg`))
      expect(result.ok).toBe(true)
    }

    const overflow = await uploadVehicleImage(vehicle.id, createImage("foto-extra.jpg"))
    expect(overflow.ok).toBe(false)

    const detail = await getVehicleByCode(vehicle.code)
    expect(detail?.images).toHaveLength(40)
  })

  it("rechaza la carga para un vehículo anulado", async () => {
    await signInAs("admin")
    const vehicle = await seedVehicle()
    const { voidVehicle } = await import("@/features/vehicles/actions")

    const voided = await voidVehicle(vehicle.code, { reason: "Baja operativa" })
    expect(voided.ok).toBe(true)

    const result = await uploadVehicleImage(vehicle.id, createImage())
    expect(result.ok).toBe(false)
    expect(storage.uploads).toHaveLength(0)
  })

  it("elimina una imagen sin modificar el vehículo y la excluye del detalle", async () => {
    await signInAs("admin")
    const vehicle = await seedVehicle()
    const uploaded = await uploadVehicleImage(vehicle.id, createImage())
    expect(uploaded.ok).toBe(true)
    if (!uploaded.ok) return

    const deletion = await deleteVehicleImage(vehicle.id, uploaded.data.id)
    expect(deletion.ok).toBe(true)
    expect(storage.deletes).toHaveLength(1)

    const detail = await getVehicleByCode(vehicle.code)
    expect(detail?.images).toHaveLength(0)

    const vehicleRecord = await getVehicleByCode(vehicle.code)
    expect(vehicleRecord?.code).toBe(vehicle.code)
  })

  it("si falla el borrado de storage, la imagen desaparece del detalle y queda deleteError", async () => {
    await signInAs("admin")
    const vehicle = await seedVehicle()
    const uploaded = await uploadVehicleImage(vehicle.id, createImage())
    expect(uploaded.ok).toBe(true)
    if (!uploaded.ok) return

    storage.failDelete = true

    const deletion = await deleteVehicleImage(vehicle.id, uploaded.data.id)
    expect(deletion.ok).toBe(true)

    const detail = await getVehicleByCode(vehicle.code)
    expect(detail?.images).toHaveLength(0)

    const stored = await VehicleImage.findById(uploaded.data.id).lean()
    expect(stored?.deleteError).toContain("fallo simulado")
  })

  it("usuario sin permiso de escritura no puede subir ni eliminar imágenes", async () => {
    await signInAs("admin")
    const vehicle = await seedVehicle()
    const uploaded = await uploadVehicleImage(vehicle.id, createImage())
    expect(uploaded.ok).toBe(true)
    if (!uploaded.ok) return

    await signInAs("lectura")

    const uploadDenied = await uploadVehicleImage(vehicle.id, createImage("lectura.jpg"))
    const deleteDenied = await deleteVehicleImage(vehicle.id, uploaded.data.id)
    expect(uploadDenied.ok).toBe(false)
    expect(deleteDenied.ok).toBe(false)

    const detail = await getVehicleByCode(vehicle.code)
    expect(detail?.images).toHaveLength(1)
  })
})
