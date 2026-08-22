"use server"

import { revalidatePath } from "next/cache"
import { Types } from "mongoose"
import { dbConnect } from "@/lib/db/client"
import { nextCode } from "@/lib/db/counters"
import { requireRole } from "@/lib/auth/dal"
import { VEHICLE_VOID_ROLES, VEHICLE_WRITE_ROLES } from "@/lib/auth/permissions"
import { fail, failFromUnknownError, failFromZodError, ok } from "@/lib/result"
import type { ActionResult } from "@/types/action-result"
import { Vehicle } from "@/lib/db/models/vehicle"
import { Make } from "@/lib/db/models/make"
import { VehicleModel } from "@/lib/db/models/model"
import { VehicleStatus } from "@/lib/db/models/vehicle-status"
import { Purchase } from "@/lib/db/models/purchase"
import { Expense } from "@/lib/db/models/expense"
import { Repair } from "@/lib/db/models/repair"
import { getBlockingPaymentsForSources } from "@/features/payments/queries"
import { toMinorUnits } from "@/lib/money"
import { getVehicleByCode } from "./queries"
import {
  changeAskingPriceSchema,
  changeVehicleStatusSchema,
  vehicleCreateSchema,
  vehicleUpdateSchema,
  voidVehicleSchema,
  type VehicleInput,
} from "./schema"
import type { VehicleDetailDTO } from "./types"

/**
 * Única puerta de escritura de vehículos. Todas las funciones siguen
 * el mismo orden —`requireRole` → `safeParse` → regla de dominio →
 * escritura → `revalidatePath`— y devuelven `ActionResult`: nunca
 * lanzan al cliente (ARCHITECTURE.md §6).
 *
 * No existe una acción de borrado, solo `voidVehicle`.
 */

const UNAUTHORIZED = "No tienes autorización para realizar esta acción."
const NOT_FOUND = "No se encontró el vehículo indicado."
const DUPLICATE_KEY_CODE = 11000

function isDuplicateKeyError(error: unknown): error is { code: number; keyPattern?: Record<string, unknown> } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === DUPLICATE_KEY_CODE
  )
}

function duplicateKeyField(error: { keyPattern?: Record<string, unknown> }): "vin" | "stockNumber" | null {
  if (error.keyPattern?.vin) return "vin"
  if (error.keyPattern?.stockNumber) return "stockNumber"
  return null
}

function userObjectId(id: string): Types.ObjectId | null {
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null
}

function revalidateVehicle(code?: string) {
  revalidatePath("/vehiculos")
  if (code) revalidatePath(`/vehiculos/${code}`)
}

/** Valida que el modelo pertenezca a la marca y que ambos estén activos. */
async function resolveMakeAndModel(
  makeId: string,
  modelId: string,
): Promise<
  | { ok: true; makeId: Types.ObjectId; modelId: Types.ObjectId }
  | { ok: false; result: ActionResult<never> }
> {
  const error = (field: "makeId" | "modelId", message: string) =>
    ({ ok: false as const, result: fail<never>(message, { [field]: [message] }) })

  if (!Types.ObjectId.isValid(makeId)) return error("makeId", "La marca indicada no es válida.")
  if (!Types.ObjectId.isValid(modelId)) return error("modelId", "El modelo indicado no es válido.")

  const make = (await Make.findById(makeId).select({ isActive: 1 }).lean()) as unknown as {
    isActive: boolean
  } | null
  if (!make) return error("makeId", "La marca indicada no existe.")
  if (!make.isActive) return error("makeId", "La marca no está activa.")

  const model = (await VehicleModel.findById(modelId)
    .select({ isActive: 1, makeId: 1 })
    .lean()) as unknown as { isActive: boolean; makeId: Types.ObjectId } | null
  if (!model) return error("modelId", "El modelo indicado no existe.")
  if (!model.isActive) return error("modelId", "El modelo no está activo.")
  if (String(model.makeId) !== makeId) {
    return error("modelId", "El modelo indicado no pertenece a la marca seleccionada.")
  }

  return { ok: true, makeId: new Types.ObjectId(makeId), modelId: new Types.ObjectId(modelId) }
}

/** Valida que el estatus exista y esté activo. */
async function resolveStatus(
  statusId: string,
): Promise<
  { ok: true; statusId: Types.ObjectId } | { ok: false; result: ActionResult<never> }
> {
  const error = (message: string) =>
    ({ ok: false as const, result: fail<never>(message, { statusId: [message] }) })

  if (!Types.ObjectId.isValid(statusId)) return error("El estatus indicado no es válido.")

  const status = (await VehicleStatus.findById(statusId)
    .select({ isActive: 1 })
    .lean()) as unknown as { isActive: boolean } | null
  if (!status) return error("El estatus indicado no existe.")
  if (!status.isActive) return error("El estatus no está activo.")

  return { ok: true, statusId: new Types.ObjectId(statusId) }
}

/** Busca el vehículo (si existe) que ya usa un VIN o número de inventario dados. */
async function findDuplicateBy(
  field: "vin" | "stockNumber",
  value: string,
  excludeId?: Types.ObjectId,
): Promise<{ code: string } | null> {
  const filter: Record<string, unknown> = { [field]: value }
  if (excludeId) filter._id = { $ne: excludeId }
  return (await Vehicle.findOne(filter).select({ code: 1 }).lean()) as unknown as {
    code: string
  } | null
}

const FIELD_LABEL: Record<"vin" | "stockNumber", string> = {
  vin: "El VIN",
  stockNumber: "El número de inventario",
}

async function checkUniqueFields(
  data: VehicleInput,
  excludeId?: Types.ObjectId,
): Promise<ActionResult<never> | null> {
  for (const field of ["vin", "stockNumber"] as const) {
    const value = data[field]
    if (!value) continue
    const existing = await findDuplicateBy(field, value, excludeId)
    if (existing) {
      const message = `${FIELD_LABEL[field]} ya lo usa el vehículo ${existing.code}.`
      return fail(message, { [field]: [message] })
    }
  }
  return null
}

/** Los campos propios del documento, comunes al alta y a la edición. */
function toDocumentFields(data: VehicleInput, makeId: Types.ObjectId, modelId: Types.ObjectId, statusId: Types.ObjectId) {
  return {
    makeId,
    modelId,
    year: data.year,
    vin: data.vin ?? null,
    stockNumber: data.stockNumber ?? null,
    trim: data.trim ?? null,
    bodyStyle: data.bodyStyle ?? null,
    exteriorColor: data.exteriorColor ?? null,
    interiorColor: data.interiorColor ?? null,
    mileage: data.mileage ?? null,
    mileageUnit: data.mileageUnit ?? null,
    transmission: data.transmission ?? null,
    fuelType: data.fuelType ?? null,
    drivetrain: data.drivetrain ?? null,
    titleStatus: data.titleStatus ?? null,
    titleNumber: data.titleNumber ?? null,
    titleInHand: data.titleInHand,
    statusId,
    dateReceived: data.dateReceived,
    dateListed: data.dateListed ?? null,
    lotLocation: data.lotLocation ?? null,
    askingPrice: data.askingPrice !== undefined ? toMinorUnits(data.askingPrice) : null,
    notes: data.notes ?? null,
  }
}

export type SaveVehicleResult = ActionResult<VehicleDetailDTO> & { vinCheckDigitWarning?: boolean }

/**
 * Alta de un vehículo. Valida que el modelo pertenezca a la marca y
 * que marca, modelo y estatus estén activos antes de emitir el
 * código: un alta rechazada no consume número de la secuencia.
 */
export async function createVehicle(input: unknown): Promise<SaveVehicleResult> {
  const session = await requireRole(VEHICLE_WRITE_ROLES)
  if (!session) return fail(UNAUTHORIZED)

  const parsed = vehicleCreateSchema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)

  const author = userObjectId(session.user.id)
  if (!author) return fail(UNAUTHORIZED)

  try {
    await dbConnect()

    const makeAndModel = await resolveMakeAndModel(parsed.data.makeId, parsed.data.modelId)
    if (!makeAndModel.ok) return makeAndModel.result

    const status = await resolveStatus(parsed.data.statusId)
    if (!status.ok) return status.result

    const duplicate = await checkUniqueFields(parsed.data)
    if (duplicate) return duplicate

    // Recién aquí se consume un número de la secuencia.
    const code = await nextCode("VEH")

    const created = await Vehicle.create({
      ...toDocumentFields(parsed.data, makeAndModel.makeId, makeAndModel.modelId, status.statusId),
      code,
      createdBy: author,
      updatedBy: author,
      voidedAt: null,
      voidedBy: null,
      voidReason: null,
      askingPriceUpdatedAt: parsed.data.askingPrice !== undefined ? new Date() : null,
      askingPriceUpdatedBy: parsed.data.askingPrice !== undefined ? author : null,
      // Entrada inicial del historial, con el estatus anterior en nulo.
      statusHistory: [
        {
          previousStatusId: null,
          newStatusId: status.statusId,
          changedBy: author,
          changedAt: new Date(),
        },
      ],
    })

    revalidateVehicle(created.code)
    const dto = await getVehicleByCode(created.code)
    if (!dto) return fail(NOT_FOUND)

    return { ...ok(dto), vinCheckDigitWarning: dto.vinCheckDigitWarning }
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const field = duplicateKeyField(error)
      const message = field
        ? `${FIELD_LABEL[field]} ya está en uso por otro vehículo.`
        : "Ese código ya existe."
      return fail(message, field ? { [field]: [message] } : undefined)
    }
    return failFromUnknownError(error, "createVehicle")
  }
}

/**
 * Edición de un vehículo. Mismas validaciones que el alta. El `code`
 * no se toca nunca: la entrada se localiza por él.
 */
export async function updateVehicle(code: string, input: unknown): Promise<SaveVehicleResult> {
  const session = await requireRole(VEHICLE_WRITE_ROLES)
  if (!session) return fail(UNAUTHORIZED)

  const parsed = vehicleUpdateSchema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)

  const author = userObjectId(session.user.id)
  if (!author) return fail(UNAUTHORIZED)

  try {
    await dbConnect()

    const current = await Vehicle.findOne({ code }).select({ _id: 1, askingPrice: 1 }).lean()
    if (!current) return fail(NOT_FOUND)

    const makeAndModel = await resolveMakeAndModel(parsed.data.makeId, parsed.data.modelId)
    if (!makeAndModel.ok) return makeAndModel.result

    const status = await resolveStatus(parsed.data.statusId)
    if (!status.ok) return status.result

    const duplicate = await checkUniqueFields(parsed.data, current._id)
    if (duplicate) return duplicate

    const priceChanged = parsed.data.askingPrice !== undefined
      ? toMinorUnits(parsed.data.askingPrice) !== (current.askingPrice ?? null)
      : current.askingPrice !== null

    const fields = toDocumentFields(
      parsed.data,
      makeAndModel.makeId,
      makeAndModel.modelId,
      status.statusId,
    )

    const updated = await Vehicle.findOneAndUpdate(
      { code },
      {
        $set: {
          ...fields,
          updatedBy: author,
          ...(priceChanged
            ? { askingPriceUpdatedAt: new Date(), askingPriceUpdatedBy: author }
            : {}),
        },
      },
      { new: true },
    ).lean()

    if (!updated) return fail(NOT_FOUND)

    revalidateVehicle(code)
    const dto = await getVehicleByCode(code)
    if (!dto) return fail(NOT_FOUND)

    return { ...ok(dto), vinCheckDigitWarning: dto.vinCheckDigitWarning }
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const field = duplicateKeyField(error)
      const message = field
        ? `${FIELD_LABEL[field]} ya está en uso por otro vehículo.`
        : "Ese código ya existe."
      return fail(message, field ? { [field]: [message] } : undefined)
    }
    return failFromUnknownError(error, "updateVehicle")
  }
}

/**
 * Cambio de estatus. El orden del catálogo ordena la presentación,
 * nunca restringe la transición (ver design.md): cualquier estatus
 * puede seguir a cualquiera. Guardar el mismo estatus no agrega
 * entrada al historial.
 */
export async function changeVehicleStatus(
  code: string,
  input: unknown,
): Promise<ActionResult<VehicleDetailDTO>> {
  const session = await requireRole(VEHICLE_WRITE_ROLES)
  if (!session) return fail(UNAUTHORIZED)

  const parsed = changeVehicleStatusSchema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)

  const author = userObjectId(session.user.id)
  if (!author) return fail(UNAUTHORIZED)

  try {
    await dbConnect()

    const status = await resolveStatus(parsed.data.statusId)
    if (!status.ok) return status.result

    const current = await Vehicle.findOne({ code }).select({ statusId: 1 }).lean()
    if (!current) return fail(NOT_FOUND)

    if (String(current.statusId) === String(status.statusId)) {
      // El mismo estatus que ya tenía: no agrega entrada al historial.
      revalidateVehicle(code)
      const dto = await getVehicleByCode(code)
      return dto ? ok(dto) : fail(NOT_FOUND)
    }

    const updated = await Vehicle.findOneAndUpdate(
      { code },
      {
        $set: { statusId: status.statusId, updatedBy: author },
        $push: {
          statusHistory: {
            previousStatusId: current.statusId,
            newStatusId: status.statusId,
            changedBy: author,
            changedAt: new Date(),
          },
        },
      },
      { new: true },
    ).lean()

    if (!updated) return fail(NOT_FOUND)

    revalidateVehicle(code)
    const dto = await getVehicleByCode(code)
    return dto ? ok(dto) : fail(NOT_FOUND)
  } catch (error) {
    return failFromUnknownError(error, "changeVehicleStatus")
  }
}

/** Cambio del precio de lista. Se registra siempre con autor y fecha. */
export async function changeAskingPrice(
  code: string,
  input: unknown,
): Promise<ActionResult<VehicleDetailDTO>> {
  const session = await requireRole(VEHICLE_WRITE_ROLES)
  if (!session) return fail(UNAUTHORIZED)

  const parsed = changeAskingPriceSchema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)

  const author = userObjectId(session.user.id)
  if (!author) return fail(UNAUTHORIZED)

  try {
    await dbConnect()

    const updated = await Vehicle.findOneAndUpdate(
      { code },
      {
        $set: {
          askingPrice: toMinorUnits(parsed.data.askingPrice),
          askingPriceUpdatedAt: new Date(),
          askingPriceUpdatedBy: author,
          updatedBy: author,
        },
      },
      { new: true },
    ).lean()

    if (!updated) return fail(NOT_FOUND)

    revalidateVehicle(code)
    const dto = await getVehicleByCode(code)
    return dto ? ok(dto) : fail(NOT_FOUND)
  } catch (error) {
    return failFromUnknownError(error, "changeAskingPrice")
  }
}

/**
 * Anulación de un vehículo. Reservada a `admin`. Sin borrado en ningún
 * nivel: el vehículo sale del inventario pero sigue siendo consultable.
 */
export async function voidVehicle(
  code: string,
  input: unknown,
): Promise<ActionResult<VehicleDetailDTO>> {
  const session = await requireRole(VEHICLE_VOID_ROLES)
  if (!session) return fail(UNAUTHORIZED)

  const parsed = voidVehicleSchema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)

  const author = userObjectId(session.user.id)
  if (!author) return fail(UNAUTHORIZED)

  try {
    await dbConnect()

    const current = await Vehicle.findOne({ code }).select({ _id: 1 }).lean()
    if (!current) return fail(NOT_FOUND)

    // Un vehículo con compras vigentes no puede anularse: primero
    // deben anularse sus compras (ver spec de add-purchases,
    // "Edición y anulación de vehículos"). `features/vehicles` no
    // importa `features/purchases`: la verificación consulta
    // directamente el modelo de `lib/db/models/purchase.ts`.
    const activePurchases = (await Purchase.find({ vehicleId: current._id, voidedAt: null })
      .select({ _id: 1, code: 1 })
      .lean()) as unknown as { _id: Types.ObjectId; code: string }[]
    if (activePurchases.length > 0) {
      const codes = activePurchases.map((purchase) => purchase.code).join(", ")
      const message = `No se puede anular: tiene compras vigentes (${codes}). Anúlalas primero.`
      return fail(message)
    }

    const [expenses, repairs] = await Promise.all([
      Expense.find({ vehicleId: current._id }).select({ _id: 1, code: 1 }).lean() as unknown as Promise<
        { _id: Types.ObjectId; code: string }[]
      >,
      Repair.find({ vehicleId: current._id }).select({ _id: 1, code: 1 }).lean() as unknown as Promise<
        { _id: Types.ObjectId; code: string }[]
      >,
    ])

    const blocking = await getBlockingPaymentsForSources([
      ...activePurchases.map((purchase) => ({ type: "purchase" as const, id: String(purchase._id) })),
      ...expenses.map((expense) => ({ type: "expense" as const, id: String(expense._id) })),
      ...repairs.map((repair) => ({ type: "repair" as const, id: String(repair._id) })),
    ])
    const blockingLabels = [
      ...activePurchases.flatMap((purchase) =>
        (blocking.get(`purchase:${purchase._id}`) ?? []).map((payment) => `${payment.paymentCode} en ${purchase.code}`),
      ),
      ...expenses.flatMap((expense) =>
        (blocking.get(`expense:${expense._id}`) ?? []).map((payment) => `${payment.paymentCode} en ${expense.code}`),
      ),
      ...repairs.flatMap((repair) =>
        (blocking.get(`repair:${repair._id}`) ?? []).map((payment) => `${payment.paymentCode} en ${repair.code}`),
      ),
    ]
    if (blockingLabels.length > 0) {
      return fail(`No se puede anular: tiene documentos financieros con pagos activos (${blockingLabels.join(", ")}).`)
    }

    const updated = await Vehicle.findOneAndUpdate(
      { code, voidedAt: null },
      {
        $set: {
          voidedAt: new Date(),
          voidedBy: author,
          voidReason: parsed.data.reason,
          updatedBy: author,
        },
      },
      { new: true },
    ).lean()

    if (!updated) return fail(NOT_FOUND)

    revalidateVehicle(code)
    const dto = await getVehicleByCode(code)
    return dto ? ok(dto) : fail(NOT_FOUND)
  } catch (error) {
    return failFromUnknownError(error, "voidVehicle")
  }
}

/** Envoltura para `useActionState`: alta o edición según venga o no el código. */
export async function saveVehicleAction(
  _previousState: SaveVehicleResult | null,
  formData: FormData,
): Promise<SaveVehicleResult> {
  const code = String(formData.get("code") ?? "").trim()
  const input: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    if (key === "code") continue
    input[key] = value
  }
  // Los checkboxes ausentes no aparecen en el FormData: forzamos su presencia.
  if (!("titleInHand" in input)) input.titleInHand = "false"

  return code ? updateVehicle(code, input) : createVehicle(input)
}

/** Envoltura de `changeVehicleStatus` para el formulario de la ficha. */
export async function changeVehicleStatusAction(
  code: string,
  formData: FormData,
): Promise<ActionResult<VehicleDetailDTO>> {
  return changeVehicleStatus(code, { statusId: formData.get("statusId") })
}

/** Envoltura de `changeAskingPrice` para el formulario de la ficha. */
export async function changeAskingPriceAction(
  code: string,
  formData: FormData,
): Promise<ActionResult<VehicleDetailDTO>> {
  return changeAskingPrice(code, { askingPrice: formData.get("askingPrice") })
}

/** Envoltura de `voidVehicle` para el formulario de la ficha. */
export async function voidVehicleAction(
  code: string,
  formData: FormData,
): Promise<ActionResult<VehicleDetailDTO>> {
  return voidVehicle(code, { reason: formData.get("reason") })
}
