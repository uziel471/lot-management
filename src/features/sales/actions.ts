"use server"

import { revalidatePath } from "next/cache"
import { Types } from "mongoose"
import { dbConnect } from "@/lib/db/client"
import { nextCode } from "@/lib/db/counters"
import { requireRole } from "@/lib/auth/dal"
import { SALE_VOID_ROLES, SALE_WRITE_ROLES } from "@/lib/auth/permissions"
import { fail, failFromUnknownError, failFromZodError, ok } from "@/lib/result"
import { formDataToValues } from "@/lib/form-values"
import type { ActionResult } from "@/types/action-result"
import { Vehicle } from "@/lib/db/models/vehicle"
import { Sale } from "@/lib/db/models/sale"
import { getSaleByCode, getVehicleSaleCostPreview } from "./queries"
import { saleCreateSchema, voidSaleSchema } from "./schema"
import type { SaleDetailDTO } from "./types"

const UNAUTHORIZED = "No tienes autorización para realizar esta acción."
const NOT_FOUND = "No se encontró la venta indicada."
const DUPLICATE_KEY_CODE = 11000

function isDuplicateKeyError(error: unknown): error is { code: number; keyPattern?: Record<string, unknown> } {
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

function revalidateSales(code?: string, vehicleCode?: string) {
  revalidatePath("/ventas")
  if (code) revalidatePath(`/ventas/${code}`)
  revalidatePath("/vehiculos")
  if (vehicleCode) revalidatePath(`/vehiculos/${vehicleCode}`)
}

export async function createSale(input: unknown): Promise<ActionResult<SaleDetailDTO>> {
  const session = await requireRole(SALE_WRITE_ROLES)
  if (!session) return fail(UNAUTHORIZED)

  const parsed = saleCreateSchema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)

  const author = userObjectId(session.user.id)
  if (!author) return fail(UNAUTHORIZED)
  const data = parsed.data

  try {
    await dbConnect()

    const existingByToken = await Sale.findOne({ submissionToken: data.submissionToken }).select({ code: 1 }).lean()
    if (existingByToken) {
      const dto = await getSaleByCode(existingByToken.code)
      return dto ? ok(dto) : fail(NOT_FOUND)
    }

    if (!Types.ObjectId.isValid(data.vehicleId)) {
      return fail("El vehículo indicado no es válido.", { vehicleId: ["El vehículo indicado no es válido."] })
    }

    const vehicle = await Vehicle.findById(data.vehicleId).select({ code: 1, voidedAt: 1 }).lean()
    if (!vehicle) return fail("El vehículo indicado no existe.", { vehicleId: ["El vehículo indicado no existe."] })
    if (vehicle.voidedAt) return fail("El vehículo indicado está anulado.", { vehicleId: ["El vehículo indicado está anulado."] })

    const activeSale = await Sale.findOne({ vehicleId: new Types.ObjectId(data.vehicleId), voidedAt: null })
      .select({ code: 1 })
      .lean()
    if (activeSale) {
      const message = `Ese vehículo ya tiene una venta activa (${activeSale.code}).`
      return fail(message, { vehicleId: [message] })
    }

    const preview = await getVehicleSaleCostPreview(data.vehicleId)
    if (!preview) return fail("No se pudo calcular el costo activo del vehículo.")

    const code = await nextCode("SAL")
    const created = await Sale.create({
      code,
      vehicleId: new Types.ObjectId(data.vehicleId),
      saleDate: data.saleDate,
      buyerName: data.buyerName,
      buyerPhone: data.buyerPhone ?? null,
      buyerEmail: data.buyerEmail ?? null,
      salePriceUsd: data.salePriceUsd,
      terms: data.terms ?? null,
      referenceNumber: data.referenceNumber ?? null,
      notes: data.notes ?? null,
      submissionToken: data.submissionToken,
      acquisitionCostUsd: preview.acquisitionCostUsd.amount,
      repairCostUsd: preview.repairCostUsd.amount,
      vehicleExpenseCostUsd: preview.vehicleExpenseCostUsd.amount,
      totalCostUsd: preview.totalCostUsd.amount,
      profitUsd: data.salePriceUsd - preview.totalCostUsd.amount,
      roiNumerator: preview.totalCostUsd.amount > 0 ? data.salePriceUsd - preview.totalCostUsd.amount : null,
      roiDenominator: preview.totalCostUsd.amount > 0 ? preview.totalCostUsd.amount : null,
      acquisitionCount: preview.acquisitionCount,
      repairCount: preview.repairCount,
      vehicleExpenseCount: preview.vehicleExpenseCount,
      createdBy: author,
      updatedBy: author,
      voidedAt: null,
      voidedBy: null,
      voidReason: null,
    })

    revalidateSales(created.code, vehicle.code)
    const dto = await getSaleByCode(created.code)
    return dto ? ok(dto) : fail(NOT_FOUND)
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const pattern = error.keyPattern ?? {}
      if ("submissionToken" in pattern) {
        const winner = await Sale.findOne({ submissionToken: data.submissionToken }).select({ code: 1 }).lean()
        if (winner) {
          const dto = await getSaleByCode(winner.code)
          if (dto) return ok(dto)
        }
        return fail("Ese envío ya se procesó. Actualiza la página.")
      }
      if ("vehicleId" in pattern) {
        return fail("Ese vehículo ya tiene una venta activa.", { vehicleId: ["Ese vehículo ya tiene una venta activa."] })
      }
      return fail("Ese código ya existe.")
    }
    return failFromUnknownError(error, "createSale")
  }
}

export async function voidSale(code: string, input: unknown): Promise<ActionResult<SaleDetailDTO>> {
  const session = await requireRole(SALE_VOID_ROLES)
  if (!session) return fail(UNAUTHORIZED)

  const parsed = voidSaleSchema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)

  const author = userObjectId(session.user.id)
  if (!author) return fail(UNAUTHORIZED)

  try {
    await dbConnect()
    const current = await Sale.findOne({ code }).select({ vehicleId: 1, voidedAt: 1 }).lean()
    if (!current) return fail(NOT_FOUND)
    if (current.voidedAt) return fail("La venta ya está anulada.")

    const vehicle = await Vehicle.findById(current.vehicleId).select({ code: 1 }).lean()
    const updated = await Sale.findOneAndUpdate(
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

    revalidateSales(code, vehicle?.code)
    const dto = await getSaleByCode(code)
    return dto ? ok(dto) : fail(NOT_FOUND)
  } catch (error) {
    return failFromUnknownError(error, "voidSale")
  }
}

export async function saveSaleAction(
  _previousState: ActionResult<SaleDetailDTO> | null,
  formData: FormData,
): Promise<ActionResult<SaleDetailDTO>> {
  const input = formDataToValues(formData)
  const result = await createSale(input)
  return result.ok ? result : { ...result, values: input }
}

export async function voidSaleAction(
  code: string,
  formData: FormData,
): Promise<ActionResult<SaleDetailDTO>> {
  return voidSale(code, { reason: formData.get("reason") })
}
