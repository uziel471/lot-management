"use server"

import { revalidatePath } from "next/cache"
import { Types } from "mongoose"
import { dbConnect } from "@/lib/db/client"
import { nextCode } from "@/lib/db/counters"
import { requireRole } from "@/lib/auth/dal"
import { REPAIR_VOID_ROLES, REPAIR_WRITE_ROLES } from "@/lib/auth/permissions"
import { fail, failFromUnknownError, failFromZodError, ok } from "@/lib/result"
import { formDataToValues, normalizeUsdExchangeRate } from "@/lib/form-values"
import type { ActionResult } from "@/types/action-result"
import { Repair } from "@/lib/db/models/repair"
import { Vehicle } from "@/lib/db/models/vehicle"
import { Vendor } from "@/lib/db/models/vendor"
import { getBlockingPaymentsForSources } from "@/features/payments/queries"
import { cancelRepair, completeRepair, transitionRepairStatus, voidRepair } from "./domain"
import { REPAIR_COST_COMPONENT_KEYS } from "./enums"
import {
  cancelRepairSchema,
  completeRepairSchema,
  repairCreateSchema,
  repairStatusChangeSchema,
  type RepairInput,
  voidRepairSchema,
} from "./schema"
import { getRepairByCode } from "./queries"
import type { RepairDetailDTO } from "./types"

const UNAUTHORIZED = "No tienes autorización para realizar esta acción."
const NOT_FOUND = "No se encontró la reparación indicada."
const DUPLICATE_KEY_CODE = 11000

function isDuplicateKeyError(
  error: unknown,
): error is { code: number; keyPattern?: Record<string, unknown> } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === DUPLICATE_KEY_CODE
  )
}

function userObjectId(id: string): Types.ObjectId | null {
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null
}

function revalidateRepairs(code?: string, vehicleCode?: string) {
  revalidatePath("/reparaciones")
  if (code) revalidatePath(`/reparaciones/${code}`)
  if (vehicleCode) revalidatePath(`/vehiculos/${vehicleCode}`)
}

export type SaveRepairResult = ActionResult<RepairDetailDTO>

export async function createRepair(input: unknown): Promise<SaveRepairResult> {
  const session = await requireRole(REPAIR_WRITE_ROLES)
  if (!session) return fail(UNAUTHORIZED)

  const parsed = repairCreateSchema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)

  const author = userObjectId(session.user.id)
  if (!author) return fail(UNAUTHORIZED)

  const data = parsed.data

  try {
    await dbConnect()

    const existingByToken = await Repair.findOne({ submissionToken: data.submissionToken })
      .select({ code: 1 })
      .lean()
    if (existingByToken) {
      const dto = await getRepairByCode(existingByToken.code)
      return dto ? ok(dto) : fail(NOT_FOUND)
    }

    if (!Types.ObjectId.isValid(data.vehicleId)) {
      return fail("El vehículo indicado no es válido.", { vehicleId: ["El vehículo indicado no es válido."] })
    }

    const vehicle = await Vehicle.findById(data.vehicleId).select({ code: 1, voidedAt: 1 }).lean()
    if (!vehicle) {
      const message = "El vehículo indicado no existe."
      return fail(message, { vehicleId: [message] })
    }
    if (vehicle.voidedAt) {
      const message = "El vehículo indicado está anulado."
      return fail(message, { vehicleId: [message] })
    }

    let vendorObjectId: Types.ObjectId | null = null
    if (data.vendorId) {
      if (!Types.ObjectId.isValid(data.vendorId)) {
        const message = "El proveedor indicado no es válido."
        return fail(message, { vendorId: [message] })
      }
      const vendor = await Vendor.findById(data.vendorId).select({ isActive: 1 }).lean()
      if (!vendor) {
        const message = "El proveedor indicado no existe."
        return fail(message, { vendorId: [message] })
      }
      if (!vendor.isActive) {
        const message = "El proveedor no está activo."
        return fail(message, { vendorId: [message] })
      }
      vendorObjectId = new Types.ObjectId(data.vendorId)
    }

    const code = await nextCode("REP")
    const componentFields = Object.fromEntries(REPAIR_COST_COMPONENT_KEYS.map((key) => [key, data[key]]))

    const created = await Repair.create({
      code,
      vehicleId: new Types.ObjectId(data.vehicleId),
      vendorId: vendorObjectId,
      category: data.category,
      status: "requested",
      openedAt: data.openedAt,
      completedAt: null,
      completedBy: null,
      completionNote: null,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
      currency: data.currency,
      exchangeRate: data.exchangeRate,
      ...componentFields,
      description: data.description,
      referenceNumber: data.referenceNumber ?? null,
      workOrderNumber: data.workOrderNumber ?? null,
      submissionToken: data.submissionToken,
      notes: data.notes ?? null,
      createdBy: author,
      updatedBy: author,
      voidedAt: null,
      voidedBy: null,
      voidReason: null,
      statusHistory: [
        {
          previousStatus: null,
          nextStatus: "requested",
          changedBy: author,
          changedAt: new Date(),
          note: null,
        },
      ],
    })

    revalidateRepairs(created.code, vehicle.code)
    const dto = await getRepairByCode(created.code)
    return dto ? ok(dto) : fail(NOT_FOUND)
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const pattern = error.keyPattern ?? {}
      if ("submissionToken" in pattern) {
        const winner = await Repair.findOne({ submissionToken: data.submissionToken })
          .select({ code: 1 })
          .lean()
        if (winner) {
          const dto = await getRepairByCode(winner.code)
          if (dto) return ok(dto)
        }
        return fail("Ese envío ya se procesó. Actualiza la página.")
      }
      return fail("Ese código ya existe.")
    }
    return failFromUnknownError(error, "createRepair")
  }
}

async function findRepairForMutation(code: string) {
  const repair = await Repair.findOne({ code }).select({
    _id: 1,
    code: 1,
    vehicleId: 1,
    openedAt: 1,
    status: 1,
    voidedAt: 1,
  }).lean() as unknown as {
    _id: Types.ObjectId
    code: string
    vehicleId: Types.ObjectId
    openedAt: Date
    status: RepairDetailDTO["status"]
    voidedAt: Date | null
  } | null

  if (!repair) return null
  const vehicle = await Vehicle.findById(repair.vehicleId).select({ code: 1 }).lean()
  return { repair, vehicleCode: vehicle?.code }
}

export async function changeRepairStatus(
  code: string,
  input: unknown,
): Promise<ActionResult<RepairDetailDTO>> {
  const session = await requireRole(REPAIR_WRITE_ROLES)
  if (!session) return fail(UNAUTHORIZED)

  const parsed = repairStatusChangeSchema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)

  const author = userObjectId(session.user.id)
  if (!author) return fail(UNAUTHORIZED)

  try {
    await dbConnect()
    const current = await findRepairForMutation(code)
    if (!current) return fail(NOT_FOUND)

    const transition = transitionRepairStatus(current.repair.status, parsed.data.nextStatus, parsed.data.note)
    const updated = await Repair.findOneAndUpdate(
      { code, voidedAt: null },
      {
        $set: {
          status: transition.nextStatus,
          updatedBy: author,
        },
        $push: {
          statusHistory: {
            previousStatus: transition.previousStatus,
            nextStatus: transition.nextStatus,
            changedBy: author,
            changedAt: new Date(),
            note: transition.note ?? null,
          },
        },
      },
      { returnDocument: "after" },
    ).lean()

    if (!updated) return fail("La reparación anulada ya no admite cambios de estatus.")

    revalidateRepairs(code, current.vehicleCode)
    const dto = await getRepairByCode(code)
    return dto ? ok(dto) : fail(NOT_FOUND)
  } catch (error) {
    if (error instanceof Error) return fail(error.message)
    return failFromUnknownError(error, "changeRepairStatus")
  }
}

export async function completeRepairActionServer(
  code: string,
  input: unknown,
): Promise<ActionResult<RepairDetailDTO>> {
  const session = await requireRole(REPAIR_WRITE_ROLES)
  if (!session) return fail(UNAUTHORIZED)

  const parsed = completeRepairSchema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)

  const author = userObjectId(session.user.id)
  if (!author) return fail(UNAUTHORIZED)

  try {
    await dbConnect()
    const current = await findRepairForMutation(code)
    if (!current) return fail(NOT_FOUND)

    const transition = completeRepair(
      current.repair.status,
      current.repair.openedAt,
      parsed.data.completedAt,
      parsed.data.note,
    )
    const updated = await Repair.findOneAndUpdate(
      { code, voidedAt: null },
      {
        $set: {
          status: transition.nextStatus,
          completedAt: parsed.data.completedAt,
          completedBy: author,
          completionNote: transition.note ?? null,
          updatedBy: author,
        },
        $push: {
          statusHistory: {
            previousStatus: transition.previousStatus,
            nextStatus: transition.nextStatus,
            changedBy: author,
            changedAt: new Date(),
            note: transition.note ?? null,
          },
        },
      },
      { returnDocument: "after" },
    ).lean()

    if (!updated) return fail("La reparación anulada ya no admite conclusión.")

    revalidateRepairs(code, current.vehicleCode)
    const dto = await getRepairByCode(code)
    return dto ? ok(dto) : fail(NOT_FOUND)
  } catch (error) {
    if (error instanceof Error) return fail(error.message)
    return failFromUnknownError(error, "completeRepair")
  }
}

export async function cancelRepairActionServer(
  code: string,
  input: unknown,
): Promise<ActionResult<RepairDetailDTO>> {
  const session = await requireRole(REPAIR_WRITE_ROLES)
  if (!session) return fail(UNAUTHORIZED)

  const parsed = cancelRepairSchema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)

  const author = userObjectId(session.user.id)
  if (!author) return fail(UNAUTHORIZED)

  try {
    await dbConnect()
    const current = await findRepairForMutation(code)
    if (!current) return fail(NOT_FOUND)

    const blocking = await getBlockingPaymentsForSources([{ type: "repair", id: String(current.repair._id) }])
    const blockingPayments = blocking.get(`repair:${current.repair._id}`) ?? []
    if (blockingPayments.length > 0) {
      const codes = blockingPayments.map((payment) => payment.paymentCode).join(", ")
      return fail(`No se puede cancelar la reparación mientras tenga pagos activos (${codes}).`)
    }

    const transition = cancelRepair(current.repair.status, parsed.data.reason)
    const updated = await Repair.findOneAndUpdate(
      { code, voidedAt: null },
      {
        $set: {
          status: transition.nextStatus,
          cancelledAt: new Date(),
          cancelledBy: author,
          cancellationReason: parsed.data.reason,
          updatedBy: author,
        },
        $push: {
          statusHistory: {
            previousStatus: transition.previousStatus,
            nextStatus: transition.nextStatus,
            changedBy: author,
            changedAt: new Date(),
            note: transition.note ?? null,
          },
        },
      },
      { returnDocument: "after" },
    ).lean()

    if (!updated) return fail("La reparación anulada ya no admite cancelación.")

    revalidateRepairs(code, current.vehicleCode)
    const dto = await getRepairByCode(code)
    return dto ? ok(dto) : fail(NOT_FOUND)
  } catch (error) {
    if (error instanceof Error) return fail(error.message)
    return failFromUnknownError(error, "cancelRepair")
  }
}

export async function voidRepairRecord(
  code: string,
  input: unknown,
): Promise<ActionResult<RepairDetailDTO>> {
  const session = await requireRole(REPAIR_VOID_ROLES)
  if (!session) return fail(UNAUTHORIZED)

  const parsed = voidRepairSchema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)

  const author = userObjectId(session.user.id)
  if (!author) return fail(UNAUTHORIZED)

  try {
    await dbConnect()
    const current = await findRepairForMutation(code)
    if (!current) return fail(NOT_FOUND)

    const blocking = await getBlockingPaymentsForSources([{ type: "repair", id: String(current.repair._id) }])
    const blockingPayments = blocking.get(`repair:${current.repair._id}`) ?? []
    if (blockingPayments.length > 0) {
      const codes = blockingPayments.map((payment) => payment.paymentCode).join(", ")
      return fail(`No se puede anular la reparación mientras tenga pagos activos (${codes}).`)
    }

    const transition = voidRepair(current.repair.status, parsed.data.reason)
    const updated = await Repair.findOneAndUpdate(
      { code, voidedAt: null },
      {
        $set: {
          status: transition.nextStatus,
          voidedAt: new Date(),
          voidedBy: author,
          voidReason: parsed.data.reason,
          updatedBy: author,
        },
        $push: {
          statusHistory: {
            previousStatus: transition.previousStatus,
            nextStatus: transition.nextStatus,
            changedBy: author,
            changedAt: new Date(),
            note: transition.note ?? null,
          },
        },
      },
      { returnDocument: "after" },
    ).lean()

    if (!updated) return fail("Esta reparación ya está anulada.")

    revalidateRepairs(code, current.vehicleCode)
    const dto = await getRepairByCode(code)
    return dto ? ok(dto) : fail(NOT_FOUND)
  } catch (error) {
    if (error instanceof Error) return fail(error.message)
    return failFromUnknownError(error, "voidRepair")
  }
}

export async function saveRepairAction(
  _previousState: SaveRepairResult | null,
  formData: FormData,
): Promise<SaveRepairResult> {
  const input = normalizeUsdExchangeRate(formDataToValues(formData))
  const result = await createRepair(input as RepairInput)
  return result.ok ? result : { ...result, values: input }
}

export async function changeRepairStatusAction(
  code: string,
  formData: FormData,
): Promise<ActionResult<RepairDetailDTO>> {
  return changeRepairStatus(code, {
    nextStatus: formData.get("nextStatus"),
    note: formData.get("note"),
  })
}

export async function completeRepairAction(
  code: string,
  formData: FormData,
): Promise<ActionResult<RepairDetailDTO>> {
  return completeRepairActionServer(code, {
    completedAt: formData.get("completedAt"),
    note: formData.get("note"),
  })
}

export async function cancelRepairAction(
  code: string,
  formData: FormData,
): Promise<ActionResult<RepairDetailDTO>> {
  return cancelRepairActionServer(code, { reason: formData.get("reason") })
}

export async function voidRepairAction(
  code: string,
  formData: FormData,
): Promise<ActionResult<RepairDetailDTO>> {
  return voidRepairRecord(code, { reason: formData.get("reason") })
}
