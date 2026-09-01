"use server"

import { revalidatePath } from "next/cache"
import { Types } from "mongoose"
import { dbConnect } from "@/lib/db/client"
import { nextCode } from "@/lib/db/counters"
import { requireRole } from "@/lib/auth/dal"
import { PURCHASE_VOID_ROLES, PURCHASE_WRITE_ROLES } from "@/lib/auth/permissions"
import { fail, failFromUnknownError, failFromZodError, ok } from "@/lib/result"
import { formDataToValues, normalizeUsdExchangeRate } from "@/lib/form-values"
import type { ActionResult } from "@/types/action-result"
import { Purchase } from "@/lib/db/models/purchase"
import { Vehicle } from "@/lib/db/models/vehicle"
import { Vendor } from "@/lib/db/models/vendor"
import { getBlockingPaymentsForSources } from "@/features/payments/queries"
import { requiresCorrectionTarget, requiresExistingPurchase, toReferenceKey } from "./domain"
import { COST_COMPONENT_KEYS } from "./enums"
import { purchaseCreateSchema, voidPurchaseSchema, type PurchaseInput } from "./schema"
import { getPurchaseByCode } from "./queries"
import type { PurchaseDetailDTO } from "./types"

/**
 * Única puerta de escritura de compras. Sigue el mismo orden que
 * `features/vehicles/actions.ts` —`requireRole` → `safeParse` →
 * regla de dominio → verificación contra la base → `nextCode` →
 * escritura → `revalidatePath`— y devuelve `ActionResult`: nunca
 * lanza al cliente (ARCHITECTURE.md §6).
 *
 * No existe `updatePurchase`: la compra es inmutable (ver
 * design.md, "La compra es inmutable"). Solo `voidPurchase`.
 */

const UNAUTHORIZED = "No tienes autorización para realizar esta acción."
const NOT_FOUND = "No se encontró la compra indicada."
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

function revalidatePurchases(code?: string, vehicleCode?: string) {
  revalidatePath("/compras")
  if (code) revalidatePath(`/compras/${code}`)
  if (vehicleCode) revalidatePath(`/vehiculos/${vehicleCode}`)
}

export type SavePurchaseResult = ActionResult<PurchaseDetailDTO> & {
  purchaseDateWarning?: boolean
}

/**
 * Alta de una compra. Valida vehículo y proveedor vigentes, las
 * reglas de tipo (inicial única, compra base requerida, objetivo de
 * corrección), y la unicidad del comprobante, antes de emitir el
 * código: un alta rechazada no consume número de la secuencia.
 *
 * Protegida contra guardado doble por `submissionToken` (ver
 * design.md, "El guardado doble se resuelve con un token de envío"):
 * un segundo envío con el mismo token devuelve la compra ya creada
 * en vez de crear una nueva.
 */
export async function createPurchase(input: unknown): Promise<SavePurchaseResult> {
  const session = await requireRole(PURCHASE_WRITE_ROLES)
  if (!session) return fail(UNAUTHORIZED)

  const parsed = purchaseCreateSchema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)

  const author = userObjectId(session.user.id)
  if (!author) return fail(UNAUTHORIZED)

  const data = parsed.data

  try {
    await dbConnect()

    // Protección contra guardado doble: si el token ya produjo una
    // compra, se devuelve esa compra como éxito, no una nueva.
    const existingByToken = await Purchase.findOne({ submissionToken: data.submissionToken })
      .select({ code: 1 })
      .lean()
    if (existingByToken) {
      const dto = await getPurchaseByCode(existingByToken.code)
      return dto ? ok(dto) : fail(NOT_FOUND)
    }

    if (!Types.ObjectId.isValid(data.vehicleId)) {
      return fail("El vehículo indicado no es válido.", { vehicleId: ["El vehículo indicado no es válido."] })
    }
    if (!Types.ObjectId.isValid(data.vendorId)) {
      return fail("El proveedor indicado no es válido.", { vendorId: ["El proveedor indicado no es válido."] })
    }

    const vehicle = await Vehicle.findById(data.vehicleId)
      .select({ code: 1, voidedAt: 1, dateReceived: 1 })
      .lean()
    if (!vehicle) {
      const message = "El vehículo indicado no existe."
      return fail(message, { vehicleId: [message] })
    }
    if (vehicle.voidedAt) {
      const message = "El vehículo indicado está anulado."
      return fail(message, { vehicleId: [message] })
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

    const vehicleObjectId = new Types.ObjectId(data.vehicleId)

    // Reglas de tipo: compra base requerida, objetivo de corrección.
    if (requiresExistingPurchase(data.txType)) {
      const hasBase = await Purchase.exists({ vehicleId: vehicleObjectId, voidedAt: null })
      if (!hasBase) {
        const message = "Este vehículo todavía no tiene una compra inicial vigente."
        return fail(message, { txType: [message] })
      }
    }

    let correctsPurchaseObjectId: Types.ObjectId | null = null
    if (requiresCorrectionTarget(data.txType)) {
      if (!data.correctsPurchaseId || !Types.ObjectId.isValid(data.correctsPurchaseId)) {
        const message = "Indica qué compra corrige esta corrección."
        return fail(message, { correctsPurchaseId: [message] })
      }
      const target = await Purchase.findById(data.correctsPurchaseId)
        .select({ vehicleId: 1, voidedAt: 1, code: 1 })
        .lean()
      if (!target || String(target.vehicleId) !== data.vehicleId) {
        const message = "La compra que corrige no pertenece a este vehículo."
        return fail(message, { correctsPurchaseId: [message] })
      }
      if (!target.voidedAt) {
        const message = "Primero debe anularse la compra original antes de corregirla."
        return fail(message, { correctsPurchaseId: [message] })
      }
      correctsPurchaseObjectId = new Types.ObjectId(data.correctsPurchaseId)
    }

    // Unicidad del comprobante: mismo proveedor, misma referencia normalizada, ambas vigentes.
    const referenceKey = toReferenceKey(data.referenceNumber ?? null)
    if (referenceKey) {
      const duplicate = await Purchase.findOne({
        vendorId: new Types.ObjectId(data.vendorId),
        referenceKey,
        voidedAt: null,
      })
        .select({ code: 1 })
        .lean()
      if (duplicate) {
        const message = `Esa referencia ya la usa la compra ${duplicate.code} de este proveedor.`
        return fail(message, { referenceNumber: [message] })
      }
    }

    // Recién aquí se consume un número de la secuencia.
    const code = await nextCode("PUR")

    const componentFields = Object.fromEntries(COST_COMPONENT_KEYS.map((key) => [key, data[key]]))

    const created = await Purchase.create({
      code,
      vehicleId: vehicleObjectId,
      vendorId: new Types.ObjectId(data.vendorId),
      purchaseDate: data.purchaseDate,
      sourceType: data.sourceType,
      currency: data.currency,
      exchangeRate: data.exchangeRate,
      ...componentFields,
      txType: data.txType,
      correctsPurchaseId: correctsPurchaseObjectId,
      paymentMethod: data.paymentMethod ?? null,
      referenceNumber: data.referenceNumber ?? null,
      referenceKey,
      lotNumber: data.lotNumber ?? null,
      submissionToken: data.submissionToken,
      notes: data.notes ?? null,
      createdBy: author,
      updatedBy: author,
      voidedAt: null,
      voidedBy: null,
      voidReason: null,
    })

    revalidatePurchases(created.code, vehicle.code)
    const dto = await getPurchaseByCode(created.code)
    if (!dto) return fail(NOT_FOUND)

    const purchaseDateWarning = data.purchaseDate.getTime() > vehicle.dateReceived.getTime()

    return { ...ok(dto), purchaseDateWarning }
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const pattern = error.keyPattern ?? {}
      if ("submissionToken" in pattern) {
        // Colisión real de dos envíos simultáneos: relee y devuelve la
        // compra ganadora como éxito, no un error.
        const winner = await Purchase.findOne({ submissionToken: data.submissionToken })
          .select({ code: 1 })
          .lean()
        if (winner) {
          const dto = await getPurchaseByCode(winner.code)
          if (dto) return ok(dto)
        }
        return fail("Ese envío ya se procesó. Actualiza la página.")
      }
      if ("vehicleId" in pattern && !("vendorId" in pattern)) {
        const message = "Este vehículo ya tiene una compra inicial vigente."
        return fail(message, { txType: [message] })
      }
      if ("referenceKey" in pattern) {
        const message = "Esa referencia ya está en uso por otra compra vigente de este proveedor."
        return fail(message, { referenceNumber: [message] })
      }
      return fail("Ese código ya existe.")
    }
    return failFromUnknownError(error, "createPurchase")
  }
}

/**
 * Anulación de una compra. Reservada a `admin`. Sin borrado en ningún
 * nivel: la compra sigue siendo consultable y su código no se
 * reutiliza. Rechaza anular una compra ya anulada.
 */
export async function voidPurchase(code: string, input: unknown): Promise<ActionResult<PurchaseDetailDTO>> {
  const session = await requireRole(PURCHASE_VOID_ROLES)
  if (!session) return fail(UNAUTHORIZED)

  const parsed = voidPurchaseSchema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)

  const author = userObjectId(session.user.id)
  if (!author) return fail(UNAUTHORIZED)

  try {
    await dbConnect()

    const current = await Purchase.findOne({ code }).select({ _id: 1, vehicleId: 1 }).lean()
    if (!current) return fail(NOT_FOUND)

    const blocking = await getBlockingPaymentsForSources([{ type: "purchase", id: String(current._id) }])
    const blockingPayments = blocking.get(`purchase:${current._id}`) ?? []
    if (blockingPayments.length > 0) {
      const codes = blockingPayments.map((payment) => payment.paymentCode).join(", ")
      return fail(`No se puede anular la compra mientras tenga pagos activos (${codes}).`)
    }

    const updated = await Purchase.findOneAndUpdate(
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
      return fail("Esta compra ya está anulada.")
    }

    const vehicle = await Vehicle.findById(current.vehicleId).select({ code: 1 }).lean()
    revalidatePurchases(code, vehicle?.code)
    const dto = await getPurchaseByCode(code)
    return dto ? ok(dto) : fail(NOT_FOUND)
  } catch (error) {
    return failFromUnknownError(error, "voidPurchase")
  }
}

/** Envoltura para `useActionState`: alta de una compra desde el formulario. */
export async function savePurchaseAction(
  _previousState: SavePurchaseResult | null,
  formData: FormData,
): Promise<SavePurchaseResult> {
  const input = normalizeUsdExchangeRate(formDataToValues(formData))
  const result = await createPurchase(input as PurchaseInput)
  return result.ok ? result : { ...result, values: input }
}

/** Envoltura de `voidPurchase` para el formulario de detalle. */
export async function voidPurchaseAction(
  code: string,
  formData: FormData,
): Promise<ActionResult<PurchaseDetailDTO>> {
  return voidPurchase(code, { reason: formData.get("reason") })
}
