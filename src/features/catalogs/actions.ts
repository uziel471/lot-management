"use server"

import { revalidatePath } from "next/cache"
import { Types } from "mongoose"
import { dbConnect } from "@/lib/db/client"
import { nextCode } from "@/lib/db/counters"
import { requireRole } from "@/lib/auth/dal"
import { CATALOG_SET_ACTIVE_ROLES, CATALOG_WRITE_ROLES } from "@/lib/auth/permissions"
import { fail, failFromUnknownError, failFromZodError, ok } from "@/lib/result"
import { formDataToValues } from "@/lib/form-values"
import type { ActionResult } from "@/types/action-result"
import { canDeactivate, canModelLiveUnderMake, canReactivate, normalizeName } from "./domain"
import { getCatalog, type CatalogDefinition, type CatalogDocument } from "./registry"
import { listActiveModelsByMake, toCatalogEntryDTO } from "./queries"
import { isCatalogKey, type CatalogEntryDTO, type CatalogKey, type CatalogOption } from "./types"

/**
 * Única puerta de escritura de los catálogos. Todas las funciones
 * siguen el mismo orden —`requireRole` → `safeParse` → regla de
 * dominio → escritura → `revalidatePath`— y devuelven `ActionResult`:
 * nunca lanzan al cliente (ARCHITECTURE.md §6).
 *
 * No existe una acción de borrado. Es la regla central del spec
 * `catalogs`, y aquí no es una convención: es que no hay nada que
 * invocar.
 */

const UNAUTHORIZED = "No tienes autorización para realizar esta acción."
const UNKNOWN_CATALOG = "Ese catálogo no existe."
const NOT_FOUND = "No se encontró la entrada indicada."

/** Errores del motor por índice único (nombre o código duplicado). */
const DUPLICATE_KEY_CODE = 11000

function isDuplicateKeyError(error: unknown): boolean {
  // Se reconoce por el código del motor (11000) y no por la clase del
  // error: `mongodb` es una dependencia transitiva de Mongoose, no una
  // dependencia declarada de este proyecto.
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === DUPLICATE_KEY_CODE
  )
}

function resolveCatalog(catalogKey: string): CatalogDefinition | null {
  return isCatalogKey(catalogKey) ? getCatalog(catalogKey) : null
}

function userObjectId(id: string): Types.ObjectId | null {
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null
}

/**
 * Mensaje de rechazo por nombre duplicado. Nombra siempre la entrada
 * que ocupa el nombre —es la única forma de que el usuario entienda
 * un rechazo causado por acentos o espacios— y distingue el caso de
 * la entrada desactivada, que se resuelve reactivándola.
 */
function duplicateNameMessage(existing: CatalogDocument, scopedToMake: boolean): string {
  const scope = scopedToMake ? " dentro de esa marca" : ""
  if (existing.isActive) {
    return `Ese nombre ya está ocupado${scope} por «${existing.name}» (${existing.code}).`
  }
  return `Ese nombre ya está ocupado${scope} por «${existing.name}» (${existing.code}), una entrada desactivada. Puedes reactivarla en lugar de crear una nueva.`
}

/** Busca la entrada que ocupa un `nameKey`, opcionalmente excluyendo una. */
async function findByNameKey(
  definition: CatalogDefinition,
  nameKey: string,
  scope: { makeId?: Types.ObjectId; excludeId?: Types.ObjectId },
): Promise<CatalogDocument | null> {
  const filter: Record<string, unknown> = { nameKey }
  if (scope.makeId) filter.makeId = scope.makeId
  if (scope.excludeId) filter._id = { $ne: scope.excludeId }

  return (await definition.model.findOne(filter).lean()) as unknown as CatalogDocument | null
}

/**
 * Valida la marca de un modelo: debe existir y estar activa, tanto al
 * dar de alta como al reasignar.
 */
async function resolveMakeId(rawMakeId: unknown): Promise<
  { ok: true; makeId: Types.ObjectId } | { ok: false; result: ActionResult<never> }
> {
  const value = typeof rawMakeId === "string" ? rawMakeId : ""
  const error = (message: string) =>
    ({ ok: false as const, result: fail<never>(message, { makeId: [message] }) })

  if (!Types.ObjectId.isValid(value)) {
    return error("La marca es obligatoria.")
  }

  const makes = getCatalog("makes")
  const make = (await makes.model
    .findById(value)
    .select({ isActive: 1 })
    .lean()) as unknown as { isActive: boolean } | null

  if (!make) {
    return error("La marca indicada no existe.")
  }
  if (!canModelLiveUnderMake(make)) {
    return error("La marca no está activa. Reactívala antes de agregarle modelos.")
  }

  return { ok: true, makeId: new Types.ObjectId(value) }
}

function revalidateCatalog(definition: CatalogDefinition) {
  revalidatePath("/catalogos")
  revalidatePath(`/catalogos/${definition.routeKey}`)
}

/**
 * Alta de una entrada de catálogo. Verifica el nombre normalizado
 * antes de escribir y emite el código solo después de haber validado
 * todo: un alta rechazada no consume número de la secuencia.
 */
export async function createCatalogEntry(
  catalogKey: string,
  input: unknown,
): Promise<ActionResult<CatalogEntryDTO>> {
  const session = await requireRole(CATALOG_WRITE_ROLES)
  if (!session) return fail(UNAUTHORIZED)

  const definition = resolveCatalog(catalogKey)
  if (!definition) return fail(UNKNOWN_CATALOG)

  const parsed = definition.schema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)

  const author = userObjectId(session.user.id)
  if (!author) return fail(UNAUTHORIZED)

  const data = parsed.data as Record<string, unknown>
  const name = String(data.name)
  const nameKey = normalizeName(name)

  try {
    await dbConnect()

    const payload: Record<string, unknown> = { ...data, name, nameKey }

    if (definition.key === "models") {
      const make = await resolveMakeId(data.makeId)
      if (!make.ok) return make.result
      payload.makeId = make.makeId
    }

    const existing = await findByNameKey(definition, nameKey, {
      makeId: definition.key === "models" ? (payload.makeId as Types.ObjectId) : undefined,
    })
    if (existing) {
      const message = duplicateNameMessage(existing, definition.key === "models")
      return fail(message, { name: [message] })
    }

    // Recién aquí se consume un número de la secuencia.
    const code = await nextCode(definition.codePrefix)

    const created = await definition.model.create({
      ...payload,
      code,
      isActive: true,
      createdBy: author,
      updatedBy: author,
      deactivatedAt: null,
      deactivatedBy: null,
    } as unknown as CatalogDocument)

    revalidateCatalog(definition)
    return ok(toCatalogEntryDTO(created.toObject() as unknown as CatalogDocument))
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const message = "Ese nombre ya está ocupado por otra entrada del catálogo."
      return fail(message, { name: [message] })
    }
    return failFromUnknownError(error, "createCatalogEntry")
  }
}

/**
 * Edición de una entrada. Permite renombrar y cambiar los campos
 * propios del catálogo; el `code` no se toca nunca —no viaja en el
 * esquema y la entrada se localiza por él—.
 */
export async function updateCatalogEntry(
  catalogKey: string,
  code: string,
  input: unknown,
): Promise<ActionResult<CatalogEntryDTO>> {
  const session = await requireRole(CATALOG_WRITE_ROLES)
  if (!session) return fail(UNAUTHORIZED)

  const definition = resolveCatalog(catalogKey)
  if (!definition) return fail(UNKNOWN_CATALOG)

  const parsed = definition.schema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)

  const author = userObjectId(session.user.id)
  if (!author) return fail(UNAUTHORIZED)

  const data = parsed.data as Record<string, unknown>
  const name = String(data.name)
  const nameKey = normalizeName(name)

  try {
    await dbConnect()

    const current = (await definition.model
      .findOne({ code })
      .lean()) as unknown as CatalogDocument | null
    if (!current) return fail(NOT_FOUND)

    const payload: Record<string, unknown> = { ...data, name, nameKey, updatedBy: author }
    // El código no se edita nunca: la entrada se localiza por él.
    delete payload.code
    // Un campo opcional que el usuario vació se guarda como `null`,
    // no como `undefined`, que `$set` ignoraría dejando el valor viejo.
    for (const field of definition.fields) {
      if (payload[field.name] === undefined) payload[field.name] = null
    }

    if (definition.key === "models") {
      const make = await resolveMakeId(data.makeId ?? current.makeId)
      if (!make.ok) return make.result
      payload.makeId = make.makeId
    }

    const duplicate = await findByNameKey(definition, nameKey, {
      makeId: definition.key === "models" ? (payload.makeId as Types.ObjectId) : undefined,
      excludeId: current._id,
    })
    if (duplicate) {
      const message = duplicateNameMessage(duplicate, definition.key === "models")
      return fail(message, { name: [message] })
    }

    const updated = (await definition.model
      .findOneAndUpdate({ code }, { $set: payload }, { new: true })
      .lean()) as unknown as CatalogDocument | null

    if (!updated) return fail(NOT_FOUND)

    revalidateCatalog(definition)
    return ok(toCatalogEntryDTO(updated))
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const message = "Ese nombre ya está ocupado por otra entrada del catálogo."
      return fail(message, { name: [message] })
    }
    return failFromUnknownError(error, "updateCatalogEntry")
  }
}

/**
 * Desactiva o reactiva una entrada. Reservada a `admin`. Al
 * desactivar registra quién y cuándo; al reactivar limpia ese
 * registro, porque el retiro dejó de estar vigente.
 */
export async function setCatalogEntryActive(
  catalogKey: string,
  code: string,
  isActive: boolean,
): Promise<ActionResult<CatalogEntryDTO>> {
  const session = await requireRole(CATALOG_SET_ACTIVE_ROLES)
  if (!session) return fail(UNAUTHORIZED)

  const definition = resolveCatalog(catalogKey)
  if (!definition) return fail(UNKNOWN_CATALOG)

  const author = userObjectId(session.user.id)
  if (!author) return fail(UNAUTHORIZED)

  try {
    await dbConnect()

    const current = (await definition.model
      .findOne({ code })
      .lean()) as unknown as CatalogDocument | null
    if (!current) return fail(NOT_FOUND)

    if (isActive && !canReactivate(current)) {
      return fail("Esa entrada ya está activa.")
    }
    if (!isActive && !canDeactivate(current)) {
      return fail("Esa entrada ya está desactivada.")
    }

    const changes = isActive
      ? { isActive: true, deactivatedAt: null, deactivatedBy: null, updatedBy: author }
      : { isActive: false, deactivatedAt: new Date(), deactivatedBy: author, updatedBy: author }

    const updated = (await definition.model
      .findOneAndUpdate({ code }, { $set: changes }, { new: true })
      .lean()) as unknown as CatalogDocument | null

    if (!updated) return fail(NOT_FOUND)

    revalidateCatalog(definition)
    return ok(toCatalogEntryDTO(updated))
  } catch (error) {
    return failFromUnknownError(error, "setCatalogEntryActive")
  }
}

/**
 * Envoltura para `useActionState`: recibe el `FormData` del
 * formulario de alta o edición, decide cuál de las dos operaciones
 * corresponde según venga o no el código, y devuelve el mismo
 * `ActionResult` que ellas.
 */
export async function saveCatalogEntryAction(
  _previousState: ActionResult<CatalogEntryDTO> | null,
  formData: FormData,
): Promise<ActionResult<CatalogEntryDTO>> {
  const values = formDataToValues(formData)
  const catalogKey = String(formData.get("catalogKey") ?? "")
  const code = String(formData.get("code") ?? "").trim()

  const definition = resolveCatalog(catalogKey)
  if (!definition) return fail(UNKNOWN_CATALOG, undefined, values)

  const input: Record<string, unknown> = {}
  for (const field of definition.fields) {
    const value = formData.get(field.name)
    input[field.name] = typeof value === "string" ? value : ""
  }
  input.name = String(formData.get("name") ?? "")

  const result = code
    ? updateCatalogEntry(catalogKey, code, input)
    : createCatalogEntry(catalogKey, input)
  const resolved = await result
  return resolved.ok ? resolved : { ...resolved, values }
}

/** Envoltura de `setCatalogEntryActive` para los botones de la tabla. */
export async function setCatalogEntryActiveAction(
  catalogKey: CatalogKey,
  code: string,
  isActive: boolean,
): Promise<ActionResult<CatalogEntryDTO>> {
  return setCatalogEntryActive(catalogKey, code, isActive)
}

/**
 * Lectura expuesta como acción para el desplegable dependiente: un
 * Client Component no puede importar `queries.ts` (lleva
 * `server-only`), y necesita recargar los modelos cuando el usuario
 * cambia de marca.
 */
export async function listActiveModelsByMakeAction(makeId: string): Promise<CatalogOption[]> {
  return listActiveModelsByMake(makeId)
}
