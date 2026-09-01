"use server"

import { revalidatePath } from "next/cache"
import { Types } from "mongoose"
import { dbConnect } from "@/lib/db/client"
import { nextCode } from "@/lib/db/counters"
import { requireRole } from "@/lib/auth/dal"
import { PAYMENT_VOID_ROLES, PAYMENT_WRITE_ROLES } from "@/lib/auth/permissions"
import { fail, failFromUnknownError, failFromZodError, ok } from "@/lib/result"
import { formDataToValuesWithIndexedGroups, normalizeUsdExchangeRate } from "@/lib/form-values"
import type { ActionResult } from "@/types/action-result"
import { Payment } from "@/lib/db/models/payment"
import { PaymentCreationLock } from "@/lib/db/models/payment-creation-lock"
import { MoneyError } from "@/lib/money"
import {
  assertApplicationsMatchPaymentAmount,
  assertApplicationsNotEmpty,
  assertNoOverpayment,
  assertPositivePaymentAmount,
  assertSupportedSourceType,
  calculatePaidAndPending,
  paymentTotalUsd,
} from "./domain"
import { getPaymentByCode, listActivePaymentApplicationsBySource } from "./queries"
import { paymentCreateSchema, voidPaymentSchema, type PaymentInput } from "./schema"
import { getPayableSourceDocuments, type PaymentSourceRef } from "./source-documents"
import type { PaymentDetailDTO } from "./types"

const UNAUTHORIZED = "No tienes autorización para realizar esta acción."
const NOT_FOUND = "No se encontró el pago indicado."
const DUPLICATE_KEY_CODE = 11000

function isDuplicateKeyError(
  error: unknown,
): error is { code: number; keyPattern?: Record<string, unknown> } {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === DUPLICATE_KEY_CODE
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function userObjectId(id: string): Types.ObjectId | null {
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null
}

function sourceKey(sourceType: string, sourceId: string) {
  return `${sourceType}:${sourceId}`
}

function lockExpiresAt() {
  return new Date(Date.now() + 60_000)
}

async function acquireSourceLocks(keys: string[], token: string) {
  if (keys.length === 0) return
  for (let attempt = 0; attempt < 100; attempt++) {
    const now = new Date()
    await PaymentCreationLock.deleteMany({
      sourceKey: { $in: keys },
      expiresAt: { $lte: now },
    })

    try {
      await PaymentCreationLock.insertMany(
        keys.map((key) => ({ sourceKey: key, token, expiresAt: lockExpiresAt() })),
        { ordered: true },
      )
      return
    } catch (error) {
      if (!isDuplicateKeyError(error) || !error.keyPattern?.sourceKey || attempt === 99) {
        throw error
      }
      await wait(25)
    }
  }
}

async function releaseSourceLocks(keys: string[], token: string) {
  if (keys.length === 0) return
  await PaymentCreationLock.deleteMany({
    sourceKey: { $in: keys },
    token,
  })
}

async function readPaymentBySubmissionToken(submissionToken: string) {
  const winner = await Payment.findOne({ submissionToken }).select({ code: 1 }).lean()
  if (!winner) return null
  return getPaymentByCode(winner.code)
}

async function resolveSourceConflictMessage(
  data: PaymentInput,
  sourceRefs: PaymentSourceRef[],
): Promise<string | null> {
  for (let attempt = 0; attempt < 40; attempt++) {
    await wait(25)
    try {
      const retry = await buildPaymentApplications(data, sourceRefs)
      if (!Array.isArray(retry) && !retry.ok) {
        return retry.error
      }
    } catch (error) {
      if (error instanceof MoneyError) {
        return error.message
      }
    }
  }

  const sources = await getPayableSourceDocuments(sourceRefs)
  const firstSource = sourceRefs.map((ref) => sources.get(sourceKey(ref.type, ref.id))).find(Boolean)
  return firstSource
    ? `El documento ${firstSource.code} cambió mientras se registraba el pago. Revisa su saldo pendiente e intenta de nuevo.`
    : "Los documentos seleccionados cambiaron mientras se registraba el pago. Intenta de nuevo."
}

async function buildPaymentApplications(
  data: PaymentInput,
  sourceRefs: PaymentSourceRef[],
) {
  const [sources, activeApplicationsBySource] = await Promise.all([
    getPayableSourceDocuments(sourceRefs),
    listActivePaymentApplicationsBySource(sourceRefs),
  ])

  const applicationProviderIds = new Set<string>()
  for (const ref of sourceRefs) {
    const source = sources.get(sourceKey(ref.type, ref.id))
    if (!source) {
      throw new MoneyError(`No se encontró el documento ${ref.type} indicado.`)
    }
    if (!source.isPayable) {
      throw new MoneyError(`El documento ${source.code} ya no admite pagos.`)
    }
    if (source.providerId) applicationProviderIds.add(source.providerId)
  }

  if (applicationProviderIds.size > 1) {
    throw new MoneyError("Todos los documentos del pago deben pertenecer al mismo proveedor operativo.")
  }
  if (data.providerId && applicationProviderIds.size === 1 && !applicationProviderIds.has(data.providerId)) {
    return fail("El proveedor capturado no coincide con los documentos seleccionados.", {
      providerId: ["El proveedor capturado no coincide con los documentos seleccionados."],
    })
  }

  return data.applications.map((application) => {
    const key = sourceKey(application.sourceType, application.sourceId)
    const source = sources.get(key)!
    const appliedUsd = paymentTotalUsd(application.appliedAmount, data.currency, data.exchangeRate)
    const activeApplications = activeApplicationsBySource.get(key) ?? []
    assertNoOverpayment(
      source.code,
      source.totalUsd.amount,
      activeApplications.map((entry) => ({ appliedUsd: entry.appliedUsd })),
      appliedUsd.amount,
    )
    const balances = calculatePaidAndPending(
      source.totalUsd.amount,
      activeApplications.map((entry) => ({ appliedUsd: entry.appliedUsd })),
    )

    return {
      sourceType: application.sourceType,
      sourceId: new Types.ObjectId(application.sourceId),
      sourceCode: source.code,
      appliedAmount: application.appliedAmount,
      appliedUsd: appliedUsd.amount,
      sourceTotalUsdSnapshot: source.totalUsd.amount,
      sourcePendingUsdSnapshot: balances.pendingUsd.amount,
    }
  })
}

function revalidatePayments(code?: string) {
  revalidatePath("/pagos")
  if (code) revalidatePath(`/pagos/${code}`)
  revalidatePath("/compras")
  revalidatePath("/gastos")
  revalidatePath("/reparaciones")
}

export async function createPayment(input: unknown): Promise<ActionResult<PaymentDetailDTO>> {
  const session = await requireRole(PAYMENT_WRITE_ROLES)
  if (!session) return fail(UNAUTHORIZED)

  const parsed = paymentCreateSchema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)

  const author = userObjectId(session.user.id)
  if (!author) return fail(UNAUTHORIZED)

  const data = parsed.data
  const sourceRefs: PaymentSourceRef[] = data.applications.map((application) => ({
    type: application.sourceType,
    id: application.sourceId,
  }))
  const sourceLocks = Array.from(
    new Set(sourceRefs.map((ref) => sourceKey(ref.type, ref.id))).values(),
  ).sort()

  try {
    await dbConnect()

    const existingByToken = await readPaymentBySubmissionToken(data.submissionToken)
    if (existingByToken) {
      return ok(existingByToken)
    }

    assertPositivePaymentAmount(data.amount)
    assertApplicationsNotEmpty(data.applications)
    assertApplicationsMatchPaymentAmount(
      { amount: data.amount, currency: data.currency, exchangeRate: data.exchangeRate },
      data.applications,
    )

    for (const application of data.applications) {
      assertSupportedSourceType(application.sourceType)
    }

    await acquireSourceLocks(sourceLocks, data.submissionToken)

    const applicationsOrError = await buildPaymentApplications(data, sourceRefs)
    if (Array.isArray(applicationsOrError) === false) {
      return applicationsOrError
    }

    const code = await nextCode("PAY")

    const created = await Payment.create({
      code,
      paymentDate: data.paymentDate,
      providerId: data.providerId && Types.ObjectId.isValid(data.providerId) ? new Types.ObjectId(data.providerId) : null,
      currency: data.currency,
      exchangeRate: data.exchangeRate,
      amount: data.amount,
      method: data.method,
      referenceNumber: data.referenceNumber ?? null,
      accountLabel: data.accountLabel ?? null,
      submissionToken: data.submissionToken,
      evidence: data.evidence,
      applications: applicationsOrError,
      notes: data.notes ?? null,
      createdBy: author,
      updatedBy: author,
      voidedAt: null,
      voidedBy: null,
      voidReason: null,
    })

    revalidatePayments(created.code)
    const dto = await getPaymentByCode(created.code)
    return dto ? ok(dto) : fail(NOT_FOUND)
  } catch (error) {
    if (error instanceof MoneyError) {
      return fail(error.message)
    }
    if (typeof error === "object" && error !== null && "ok" in error && "error" in error) {
      return error as ActionResult<PaymentDetailDTO>
    }
    if (isDuplicateKeyError(error)) {
      const pattern = error.keyPattern ?? {}
      if ("submissionToken" in pattern) {
        const dto = await readPaymentBySubmissionToken(data.submissionToken)
        if (dto) {
          return ok(dto)
        }
        return fail("Ese envío ya se procesó. Actualiza la página.")
      }
      const message = await resolveSourceConflictMessage(data, sourceRefs)
      if (message) {
        return fail(message)
      }
      return fail("Ese código ya existe.")
    }
    return failFromUnknownError(error, "createPayment")
  } finally {
    await releaseSourceLocks(sourceLocks, data.submissionToken)
  }
}

export async function voidPayment(code: string, input: unknown): Promise<ActionResult<PaymentDetailDTO>> {
  const session = await requireRole(PAYMENT_VOID_ROLES)
  if (!session) return fail(UNAUTHORIZED)

  const parsed = voidPaymentSchema.safeParse(input)
  if (!parsed.success) return failFromZodError(parsed.error)

  const author = userObjectId(session.user.id)
  if (!author) return fail(UNAUTHORIZED)

  try {
    await dbConnect()

    const updated = await Payment.findOneAndUpdate(
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

    if (!updated) return fail("Este pago ya está anulado.")

    revalidatePayments(code)
    const dto = await getPaymentByCode(code)
    return dto ? ok(dto) : fail(NOT_FOUND)
  } catch (error) {
    return failFromUnknownError(error, "voidPayment")
  }
}

export async function savePaymentAction(
  _previousState: ActionResult<PaymentDetailDTO> | null,
  formData: FormData,
): Promise<ActionResult<PaymentDetailDTO>> {
  const input = formDataToValuesWithIndexedGroups(formData, ["applications", "evidence"])
  const normalized = normalizeUsdExchangeRate(input)
  const result = await createPayment(normalized as PaymentInput)
  return result.ok ? result : { ...result, values: normalized }
}

export async function voidPaymentAction(
  code: string,
  formData: FormData,
): Promise<ActionResult<PaymentDetailDTO>> {
  return voidPayment(code, { reason: formData.get("reason") })
}
