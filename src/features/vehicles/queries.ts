import "server-only"
import { Types } from "mongoose"
import { dbConnect } from "@/lib/db/client"
import { requireRole } from "@/lib/auth/dal"
import { VEHICLE_READ_ROLES } from "@/lib/auth/permissions"
import { VehicleImage } from "@/lib/db/models/vehicle-image"
import { Vehicle } from "@/lib/db/models/vehicle"
import { Make } from "@/lib/db/models/make"
import { VehicleModel } from "@/lib/db/models/model"
import { VehicleStatus } from "@/lib/db/models/vehicle-status"
import { getVehicleImageRenderableUrl } from "@/lib/supabase/vehicle-image-storage.server"
import type { Money } from "@/types/money"
import { daysInInventory, describeVehicle, hasValidVinCheckDigit } from "./domain"
import type {
  StatusHistoryEntryDTO,
  VehicleDetailDTO,
  VehicleFilters,
  VehicleImageDTO,
  VehicleListItemDTO,
  VehicleOption,
} from "./types"

/**
 * Única puerta de lectura de vehículos (la DAL de la feature). Cada
 * función verifica el rol antes de tocar datos y devuelve objetos
 * planos: nunca un documento de Mongoose. Marca, modelo y estatus se
 * resuelven con `$lookup` / consultas separadas en vez de guardarse
 * como nombres (ver ARCHITECTURE.md §4.4).
 */

type VehicleLean = {
  _id: Types.ObjectId
  code: string
  makeId: Types.ObjectId
  modelId: Types.ObjectId
  year: number
  vin: string | null
  stockNumber: string | null
  trim: string | null
  bodyStyle: string | null
  exteriorColor: string | null
  interiorColor: string | null
  mileage: number | null
  mileageUnit: string | null
  transmission: string | null
  fuelType: string | null
  drivetrain: string | null
  titleStatus: string | null
  titleNumber: string | null
  titleInHand: boolean
  statusId: Types.ObjectId
  statusHistory: {
    previousStatusId: Types.ObjectId | null
    newStatusId: Types.ObjectId
    changedBy: Types.ObjectId
    changedAt: Date
  }[]
  dateReceived: Date
  dateListed: Date | null
  lotLocation: string | null
  askingPrice: number | null
  askingPriceUpdatedAt: Date | null
  askingPriceUpdatedBy: Types.ObjectId | null
  notes: string | null
  createdBy: Types.ObjectId
  updatedBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
  voidedAt: Date | null
  voidedBy: Types.ObjectId | null
  voidReason: string | null
}

type VehicleImageLean = {
  _id: Types.ObjectId
  vehicleId: Types.ObjectId
  storageBucket: string
  storagePath: string
  originalFileName: string
  mimeType: string
  byteSize: number
  createdBy: Types.ObjectId
  createdAt: Date
  deletedAt: Date | null
  deletedBy: Types.ObjectId | null
  deleteError: string | null
}

async function namesById(
  model: { find: typeof Make.find },
  ids: Types.ObjectId[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const documents = (await model
    .find({ _id: { $in: ids } })
    .select({ name: 1 })
    .lean()) as unknown as { _id: Types.ObjectId; name: string }[]
  return new Map(documents.map((document) => [String(document._id), document.name]))
}

/** Nombres de usuario (colección nativa de Better Auth), indexados por id. */
async function userNamesById(ids: Types.ObjectId[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const db = (await dbConnect()).connection.db
  if (!db) return new Map()
  const documents = (await db
    .collection("user")
    .find({ _id: { $in: ids } })
    .project({ name: 1 })
    .toArray()) as unknown as { _id: unknown; name: string }[]
  return new Map(documents.map((document) => [String(document._id), document.name]))
}

async function listVehicleImagesForVehicle(
  vehicleId: Types.ObjectId,
  includeDeleted = false,
): Promise<VehicleImageDTO[]> {
  const query: Record<string, unknown> = { vehicleId }
  if (!includeDeleted) query.deletedAt = null

  const images = (await VehicleImage.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .lean()) as unknown as VehicleImageLean[]

  const userNames = await userNamesById(images.map((image) => image.createdBy))

  return Promise.all(
    images.map(async (image) => ({
      id: String(image._id),
      vehicleId: String(image.vehicleId),
      storageBucket: image.storageBucket,
      storagePath: image.storagePath,
      originalFileName: image.originalFileName,
      mimeType: image.mimeType,
      byteSize: image.byteSize,
      createdBy: String(image.createdBy),
      createdByName: userNames.get(String(image.createdBy)) ?? null,
      createdAt: image.createdAt.toISOString(),
      deletedAt: image.deletedAt ? image.deletedAt.toISOString() : null,
      deletedBy: image.deletedBy ? String(image.deletedBy) : null,
      deleteError: image.deleteError,
      active: image.deletedAt === null,
      renderUrl: await getVehicleImageRenderableUrl({
        bucket: image.storageBucket,
        path: image.storagePath,
      }).catch((error) => {
        console.error("[vehicleImageRenderableUrl]", error)
        return ""
      }),
    })),
  )
}

function toMoney(amountInCents: number | null): Money | null {
  return amountInCents === null || amountInCents === undefined
    ? null
    : { amount: amountInCents, currency: "USD" }
}

async function toListItemDTO(
  vehicle: VehicleLean,
  makeNames: Map<string, string>,
  modelNames: Map<string, string>,
  statuses: Map<string, { name: string; sortOrder: number }>,
  today: Date,
): Promise<VehicleListItemDTO> {
  const makeName = makeNames.get(String(vehicle.makeId)) ?? "—"
  const modelName = modelNames.get(String(vehicle.modelId)) ?? "—"
  const status = statuses.get(String(vehicle.statusId))

  return {
    id: String(vehicle._id),
    code: vehicle.code,
    description: describeVehicle({ year: vehicle.year, makeName, modelName }),
    makeId: String(vehicle.makeId),
    makeName,
    modelId: String(vehicle.modelId),
    modelName,
    year: vehicle.year,
    vin: vehicle.vin,
    stockNumber: vehicle.stockNumber,
    statusId: String(vehicle.statusId),
    statusName: status?.name ?? "—",
    statusSortOrder: status?.sortOrder ?? 0,
    daysInInventory: daysInInventory(vehicle.dateReceived, today),
    askingPrice: toMoney(vehicle.askingPrice),
    dateReceived: vehicle.dateReceived.toISOString(),
    titleInHand: vehicle.titleInHand,
    isVoided: Boolean(vehicle.voidedAt),
  }
}

async function collectLookups(vehicles: VehicleLean[]) {
  const makeIds = vehicles.map((vehicle) => vehicle.makeId)
  const modelIds = vehicles.map((vehicle) => vehicle.modelId)
  const statusIds = [
    ...vehicles.map((vehicle) => vehicle.statusId),
    ...vehicles.flatMap((vehicle) =>
      vehicle.statusHistory.flatMap((entry) =>
        entry.previousStatusId ? [entry.previousStatusId, entry.newStatusId] : [entry.newStatusId],
      ),
    ),
  ]

  const [makeNames, modelNames, statusDocuments] = await Promise.all([
    namesById(Make, makeIds),
    namesById(VehicleModel, modelIds),
    VehicleStatus.find({ _id: { $in: statusIds } })
      .select({ name: 1, sortOrder: 1 })
      .lean() as unknown as Promise<{ _id: Types.ObjectId; name: string; sortOrder: number }[]>,
  ])

  const statuses = new Map(
    statusDocuments.map((document) => [
      String(document._id),
      { name: document.name, sortOrder: document.sortOrder },
    ]),
  )

  return { makeNames, modelNames, statuses }
}

/**
 * Listado de inventario, filtrable por estatus, marca y rango de
 * fecha de recepción, y buscable por `code`, VIN o número de
 * inventario. Excluye los vehículos anulados salvo que se pidan
 * explícitamente.
 *
 * Devuelve `null` si el usuario en sesión no puede consultar.
 */
export async function listVehicles(filters: VehicleFilters = {}): Promise<
  VehicleListItemDTO[] | null
> {
  const session = await requireRole(VEHICLE_READ_ROLES)
  if (!session) return null

  await dbConnect()

  const query: Record<string, unknown> = {}
  if (!filters.includeVoided) query.voidedAt = null
  if (filters.statusId && Types.ObjectId.isValid(filters.statusId)) {
    query.statusId = new Types.ObjectId(filters.statusId)
  }
  if (filters.makeId && Types.ObjectId.isValid(filters.makeId)) {
    query.makeId = new Types.ObjectId(filters.makeId)
  }
  if (filters.dateReceivedFrom || filters.dateReceivedTo) {
    const range: Record<string, Date> = {}
    if (filters.dateReceivedFrom) range.$gte = filters.dateReceivedFrom
    if (filters.dateReceivedTo) range.$lte = filters.dateReceivedTo
    query.dateReceived = range
  }
  if (filters.search) {
    const needle = filters.search.trim()
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const pattern = new RegExp(escaped, "i")
    query.$or = [{ code: pattern }, { vin: pattern }, { stockNumber: pattern }]
  }

  const vehicles = (await Vehicle.find(query)
    .sort({ dateReceived: -1, code: -1 })
    .lean()) as unknown as VehicleLean[]

  const { makeNames, modelNames, statuses } = await collectLookups(vehicles)
  const today = new Date()

  return Promise.all(
    vehicles.map((vehicle) => toListItemDTO(vehicle, makeNames, modelNames, statuses, today)),
  )
}

/** Ficha completa de un vehículo, con su historial de estatus ordenado. */
export async function getVehicleByCode(code: string): Promise<VehicleDetailDTO | null> {
  const session = await requireRole(VEHICLE_READ_ROLES)
  if (!session) return null

  await dbConnect()
  const vehicle = (await Vehicle.findOne({ code }).lean()) as unknown as VehicleLean | null
  if (!vehicle) return null

  const { makeNames, modelNames, statuses } = await collectLookups([vehicle])
  const today = new Date()
  const listItem = await toListItemDTO(vehicle, makeNames, modelNames, statuses, today)

  const userIds = [
    vehicle.createdBy,
    vehicle.updatedBy,
    ...(vehicle.voidedBy ? [vehicle.voidedBy] : []),
    ...vehicle.statusHistory.map((entry) => entry.changedBy),
  ]
  const [userNames, images] = await Promise.all([
    userNamesById(userIds),
    listVehicleImagesForVehicle(vehicle._id),
  ])

  const statusHistory: StatusHistoryEntryDTO[] = [...vehicle.statusHistory]
    .sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime())
    .map((entry) => ({
      previousStatusId: entry.previousStatusId ? String(entry.previousStatusId) : null,
      previousStatusName: entry.previousStatusId
        ? (statuses.get(String(entry.previousStatusId))?.name ?? "—")
        : null,
      newStatusId: String(entry.newStatusId),
      newStatusName: statuses.get(String(entry.newStatusId))?.name ?? "—",
      changedBy: String(entry.changedBy),
      changedByName: userNames.get(String(entry.changedBy)) ?? null,
      changedAt: entry.changedAt.toISOString(),
    }))

  return {
    ...listItem,
    trim: vehicle.trim,
    bodyStyle: vehicle.bodyStyle as VehicleDetailDTO["bodyStyle"],
    exteriorColor: vehicle.exteriorColor,
    interiorColor: vehicle.interiorColor,
    mileage: vehicle.mileage,
    mileageUnit: vehicle.mileageUnit as VehicleDetailDTO["mileageUnit"],
    transmission: vehicle.transmission as VehicleDetailDTO["transmission"],
    fuelType: vehicle.fuelType as VehicleDetailDTO["fuelType"],
    drivetrain: vehicle.drivetrain as VehicleDetailDTO["drivetrain"],
    titleStatus: vehicle.titleStatus as VehicleDetailDTO["titleStatus"],
    titleNumber: vehicle.titleNumber,
    dateListed: vehicle.dateListed ? vehicle.dateListed.toISOString() : null,
    lotLocation: vehicle.lotLocation,
    notes: vehicle.notes,
    statusHistory,
    images,
    vinCheckDigitWarning: Boolean(vehicle.vin) && !hasValidVinCheckDigit(vehicle.vin!),
    createdBy: String(vehicle.createdBy),
    createdByName: userNames.get(String(vehicle.createdBy)) ?? null,
    updatedBy: String(vehicle.updatedBy),
    updatedByName: userNames.get(String(vehicle.updatedBy)) ?? null,
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
    voidedAt: vehicle.voidedAt ? vehicle.voidedAt.toISOString() : null,
    voidedBy: vehicle.voidedBy ? String(vehicle.voidedBy) : null,
    voidReason: vehicle.voidReason,
  }
}

export async function listVehicleImages(vehicleId: string): Promise<VehicleImageDTO[]> {
  const session = await requireRole(VEHICLE_READ_ROLES)
  if (!session) return []
  if (!Types.ObjectId.isValid(vehicleId)) return []

  await dbConnect()
  return listVehicleImagesForVehicle(new Types.ObjectId(vehicleId))
}

/**
 * Vehículos vigentes (no anulados) para los desplegables de compras y
 * reparaciones: es la función que consumirá la Fase 4.
 */
export async function listVehicleOptions(): Promise<VehicleOption[]> {
  const session = await requireRole(VEHICLE_READ_ROLES)
  if (!session) return []

  await dbConnect()
  const vehicles = (await Vehicle.find({ voidedAt: null })
    .select({ code: 1, year: 1, makeId: 1, modelId: 1 })
    .sort({ code: 1 })
    .lean()) as unknown as Pick<VehicleLean, "_id" | "code" | "year" | "makeId" | "modelId">[]

  const [makeNames, modelNames] = await Promise.all([
    namesById(
      Make,
      vehicles.map((vehicle) => vehicle.makeId),
    ),
    namesById(
      VehicleModel,
      vehicles.map((vehicle) => vehicle.modelId),
    ),
  ])

  return vehicles.map((vehicle) => ({
    id: String(vehicle._id),
    code: vehicle.code,
    description: describeVehicle({
      year: vehicle.year,
      makeName: makeNames.get(String(vehicle.makeId)) ?? "—",
      modelName: modelNames.get(String(vehicle.modelId)) ?? "—",
    }),
  }))
}
