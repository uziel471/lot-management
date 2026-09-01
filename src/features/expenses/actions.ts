"use server"

import { revalidatePath } from "next/cache"
import { Types } from "mongoose"
import { dbConnect } from "@/lib/db/client"
import { nextCode } from "@/lib/db/counters"
import { requireRole } from "@/lib/auth/dal"
import { EXPENSE_VOID_ROLES, EXPENSE_WRITE_ROLES } from "@/lib/auth/permissions"
import { fail, failFromUnknownError, failFromZodError, ok } from "@/lib/result"
import { formDataToValues, normalizeUsdExchangeRate } from "@/lib/form-values"
import type { ActionResult } from "@/types/action-result"
import { Expense } from "@/lib/db/models/expense"
import { Vehicle } from "@/lib/db/models/vehicle"
import { Vendor } from "@/lib/db/models/vendor"
import { getBlockingPaymentsForSources } from "@/features/payments/queries"
import { isExpenseCategory } from "./domain"
import { EXPENSE_COMPONENT_KEYS } from "./enums"
import { expenseCreateSchema, type ExpenseInput, voidExpenseSchema } from "./schema"
import { getExpenseByCode } from "./queries"
import type { ExpenseDetailDTO } from "./types"

const UNAUTHORIZED = "No tienes autorización para realizar esta acción."
const NOT_FOUND = "No se encontró el gasto indicado."
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

function revalidateExpenses(code?: string, vehicleCode?: string) {
  revalidatePath("/gastos")
  if (code) revalidatePath(`/gastos/${code}`)
  if (vehicleCode) revalidatePath(`/vehiculos/${vehicleCode}`)
}

export type SaveExpenseResult = ActionResult<ExpenseDetailDTO>

export async function createExpense(input: unknown): Promise<SaveExpenseResult> {
  const session = await requireRole(EXPENSE_WRITE_ROLES)
  if (!session) return fail(UNAUTHORIZED)

  const parsed = expenseCreateSchema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)

  const author = userObjectId(session.user.id)
  if (!author) return fail(UNAUTHORIZED)

  const data = parsed.data

  try {
    await dbConnect()

    const existingByToken = await Expense.findOne({ submissionToken: data.submissionToken })
      .select({ code: 1 })
      .lean()
    if (existingByToken) {
      const dto = await getExpenseByCode(existingByToken.code)
      return dto ? ok(dto) : fail(NOT_FOUND)
    }

    if (!isExpenseCategory(data.category)) {
      const message = "La categoría indicada no es válida."
      return fail(message, { category: [message] })
    }

    let vehicleObjectId: Types.ObjectId | null = null
    let vehicleCode: string | undefined
    if (data.vehicleId) {
      if (!Types.ObjectId.isValid(data.vehicleId)) {
        const message = "El vehículo indicado no es válido."
        return fail(message, { vehicleId: [message] })
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
      vehicleObjectId = new Types.ObjectId(data.vehicleId)
      vehicleCode = vehicle.code
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

    const code = await nextCode("EXP")
    const componentFields = Object.fromEntries(EXPENSE_COMPONENT_KEYS.map((key) => [key, data[key]]))

    await Expense.create({
      code,
      vehicleId: vehicleObjectId,
      vendorId: vendorObjectId,
      category: data.category,
      expenseDate: data.expenseDate,
      currency: data.currency,
      exchangeRate: data.exchangeRate,
      ...componentFields,
      paymentMethod: data.paymentMethod ?? null,
      referenceNumber: data.referenceNumber ?? null,
      evidence: {
        type: data.evidenceType ?? null,
        label: data.evidenceLabel ?? null,
        url: data.evidenceUrl ?? null,
      },
      submissionToken: data.submissionToken,
      notes: data.notes ?? null,
      createdBy: author,
      updatedBy: author,
      voidedAt: null,
      voidedBy: null,
      voidReason: null,
    })

    revalidateExpenses(code, vehicleCode)
    const dto = await getExpenseByCode(code)
    return dto ? ok(dto) : fail(NOT_FOUND)
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const pattern = error.keyPattern ?? {}
      if ("submissionToken" in pattern) {
        const winner = await Expense.findOne({ submissionToken: data.submissionToken })
          .select({ code: 1 })
          .lean()
        if (winner) {
          const dto = await getExpenseByCode(winner.code)
          if (dto) return ok(dto)
        }
        return fail("Ese envío ya se procesó. Actualiza la página.")
      }
      return fail("Ese código ya existe.")
    }
    return failFromUnknownError(error, "createExpense")
  }
}

export async function voidExpense(code: string, input: unknown): Promise<ActionResult<ExpenseDetailDTO>> {
  const session = await requireRole(EXPENSE_VOID_ROLES)
  if (!session) return fail(UNAUTHORIZED)

  const parsed = voidExpenseSchema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)

  const author = userObjectId(session.user.id)
  if (!author) return fail(UNAUTHORIZED)

  try {
    await dbConnect()

    const current = await Expense.findOne({ code }).select({ _id: 1, vehicleId: 1 }).lean()
    if (!current) return fail(NOT_FOUND)

    const blocking = await getBlockingPaymentsForSources([{ type: "expense", id: String(current._id) }])
    const blockingPayments = blocking.get(`expense:${current._id}`) ?? []
    if (blockingPayments.length > 0) {
      const codes = blockingPayments.map((payment) => payment.paymentCode).join(", ")
      return fail(`No se puede anular el gasto mientras tenga pagos activos (${codes}).`)
    }

    const updated = await Expense.findOneAndUpdate(
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

    if (!updated) {
      return fail("Este gasto ya está anulado.")
    }

    let vehicleCode: string | undefined
    if (current.vehicleId) {
      const vehicle = await Vehicle.findById(current.vehicleId).select({ code: 1 }).lean()
      vehicleCode = vehicle?.code
    }

    revalidateExpenses(code, vehicleCode)
    const dto = await getExpenseByCode(code)
    return dto ? ok(dto) : fail(NOT_FOUND)
  } catch (error) {
    return failFromUnknownError(error, "voidExpense")
  }
}

export async function saveExpenseAction(
  _previousState: SaveExpenseResult | null,
  formData: FormData,
): Promise<SaveExpenseResult> {
  const input = normalizeUsdExchangeRate(formDataToValues(formData))
  const result = await createExpense(input as ExpenseInput)
  return result.ok ? result : { ...result, values: input }
}

export async function voidExpenseAction(
  code: string,
  formData: FormData,
): Promise<ActionResult<ExpenseDetailDTO>> {
  return voidExpense(code, { reason: formData.get("reason") })
}
