import "server-only"
import { Types } from "mongoose"
import { dbConnect } from "@/lib/db/client"
import { requireRole } from "@/lib/auth/dal"
import { CATALOG_READ_ROLES } from "@/lib/auth/permissions"
import { Make } from "@/lib/db/models/make"
import { getCatalog, type CatalogDocument } from "./registry"
import type { CatalogEntryDTO, CatalogKey, CatalogOption } from "./types"

/**
 * Única puerta de lectura de los catálogos (la DAL de la feature).
 * Cada función verifica el rol antes de tocar datos y devuelve
 * objetos planos: nunca un documento de Mongoose.
 *
 * `listActiveOptions` es la que van a consumir vehículos y compras
 * para llenar sus desplegables; es también donde vive la regla de que
 * una entrada retirada deja de ofrecerse.
 */

/**
 * Convierte un documento de catálogo en su DTO. Se exporta porque
 * `actions.ts` devuelve la entrada recién escrita con la misma forma
 * que la devuelve una consulta.
 */
export function toCatalogEntryDTO(document: CatalogDocument, makeName?: string): CatalogEntryDTO {
  const dto: CatalogEntryDTO = {
    id: String(document._id),
    code: document.code,
    name: document.name,
    isActive: document.isActive,
    createdAt: document.createdAt?.toISOString() ?? "",
    updatedAt: document.updatedAt?.toISOString() ?? "",
    deactivatedAt: document.deactivatedAt ? document.deactivatedAt.toISOString() : null,
  }

  if (document.makeId) {
    dto.makeId = String(document.makeId)
    dto.makeName = makeName
  }
  if (typeof document.sortOrder === "number") {
    dto.sortOrder = document.sortOrder
  }
  if (document.description !== undefined) {
    dto.description = document.description ?? null
  }
  if (document.phone !== undefined) dto.phone = document.phone ?? null
  if (document.email !== undefined) dto.email = document.email ?? null
  if (document.city !== undefined) dto.city = document.city ?? null
  if (document.notes !== undefined) dto.notes = document.notes ?? null

  return dto
}

function toOption(document: CatalogDocument): CatalogOption {
  return { id: String(document._id), code: document.code, name: document.name }
}

/** Nombre de cada marca, indexado por id, para resolver el de los modelos. */
async function makeNamesById(documents: CatalogDocument[]): Promise<Map<string, string>> {
  const ids = documents
    .map((document) => document.makeId)
    .filter((id): id is Types.ObjectId => Boolean(id))

  if (ids.length === 0) return new Map()

  const makes = (await Make.find({ _id: { $in: ids } })
    .select({ name: 1 })
    .lean()) as unknown as { _id: Types.ObjectId; name: string }[]

  return new Map(makes.map((make) => [String(make._id), make.name]))
}

/**
 * Listado de administración de un catálogo. Incluye las entradas
 * desactivadas por defecto —quien administra necesita verlas para
 * poder reactivarlas—, distinguidas por su campo `isActive`.
 *
 * Devuelve `null` si el usuario en sesión no puede consultar.
 */
export async function listCatalogEntries(
  catalogKey: CatalogKey,
  options: { includeInactive?: boolean } = {},
): Promise<CatalogEntryDTO[] | null> {
  const session = await requireRole(CATALOG_READ_ROLES)
  if (!session) return null

  const { includeInactive = true } = options
  const definition = getCatalog(catalogKey)
  await dbConnect()

  const filter = includeInactive ? {} : { isActive: true }
  const documents = (await definition.model
    .find(filter)
    .sort(definition.defaultSort)
    .lean()) as unknown as CatalogDocument[]

  if (catalogKey !== "models") {
    return documents.map((document) => toCatalogEntryDTO(document))
  }

  const names = await makeNamesById(documents)
  return documents.map((document) => toCatalogEntryDTO(document, names.get(String(document.makeId))))
}

/**
 * Opciones activas para los desplegables de captura. Los estatus se
 * ordenan por su `sortOrder` y desempatan por nombre; los demás
 * catálogos, por nombre.
 *
 * Los modelos llevan además el filtro por marca activa: desactivar
 * una marca no desactiva sus modelos en la base (eso perdería la
 * información de cuáles estaban activos), los deja fuera de la
 * consulta.
 */
export async function listActiveOptions(catalogKey: CatalogKey): Promise<CatalogOption[]> {
  const session = await requireRole(CATALOG_READ_ROLES)
  if (!session) return []

  const definition = getCatalog(catalogKey)
  await dbConnect()

  // Los estatus se presentan por su orden explícito y desempatan por
  // nombre; los demás catálogos, por nombre.
  const sort: Record<string, 1 | -1> =
    catalogKey === "vehicleStatuses" ? { sortOrder: 1, name: 1 } : { name: 1 }

  if (catalogKey === "models") {
    const activeMakeIds = await activeMakeObjectIds()
    const documents = (await definition.model
      .find({ isActive: true, makeId: { $in: activeMakeIds } })
      .sort(sort)
      .lean()) as unknown as CatalogDocument[]
    return documents.map(toOption)
  }

  const documents = (await definition.model
    .find({ isActive: true })
    .sort(sort)
    .lean()) as unknown as CatalogDocument[]

  return documents.map(toOption)
}

async function activeMakeObjectIds(): Promise<Types.ObjectId[]> {
  const makes = (await Make.find({ isActive: true })
    .select({ _id: 1 })
    .lean()) as unknown as { _id: Types.ObjectId }[]
  return makes.map((make) => make._id)
}

/**
 * Modelos activos de una marca activa: lo que alimenta el desplegable
 * dependiente. Devuelve vacío si la marca no existe, está
 * desactivada o el id no es válido.
 */
export async function listActiveModelsByMake(makeId: string): Promise<CatalogOption[]> {
  const session = await requireRole(CATALOG_READ_ROLES)
  if (!session) return []

  if (!Types.ObjectId.isValid(makeId)) return []

  await dbConnect()
  const make = (await Make.findById(makeId)
    .select({ isActive: 1 })
    .lean()) as unknown as { isActive: boolean } | null

  if (!make?.isActive) return []

  const definition = getCatalog("models")
  const documents = (await definition.model
    .find({ makeId: new Types.ObjectId(makeId), isActive: true })
    .sort({ name: 1 })
    .lean()) as unknown as CatalogDocument[]

  return documents.map(toOption)
}

/** Una entrada por su código legible, para la vista de edición. */
export async function getCatalogEntry(
  catalogKey: CatalogKey,
  code: string,
): Promise<CatalogEntryDTO | null> {
  const session = await requireRole(CATALOG_READ_ROLES)
  if (!session) return null

  const definition = getCatalog(catalogKey)
  await dbConnect()

  const document = (await definition.model
    .findOne({ code })
    .lean()) as unknown as CatalogDocument | null

  if (!document) return null

  if (catalogKey !== "models") return toCatalogEntryDTO(document)

  const names = await makeNamesById([document])
  return toCatalogEntryDTO(document, names.get(String(document.makeId)))
}
