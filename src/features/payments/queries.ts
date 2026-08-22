import "server-only"
import { Types } from "mongoose"
import { dbConnect } from "@/lib/db/client"
import { requireRole } from "@/lib/auth/dal"
import { PAYMENT_READ_ROLES } from "@/lib/auth/permissions"
import { Payment } from "@/lib/db/models/payment"
import { Vendor } from "@/lib/db/models/vendor"
import { searchPayableSourceDocuments, getPayableSourceDocuments, type PaymentSourceRef } from "./source-documents"
import { calculatePaidAndPending, paymentStatus as paymentStatusOfSource, paymentTotalUsd } from "./domain"
import type {
  PaymentApplicationDTO,
  PaymentBalanceSummaryDTO,
  PaymentDetailDTO,
  PaymentFilters,
  PaymentListItemDTO,
  SourcePayableOptionDTO,
} from "./types"

type PaymentLean = {
  _id: Types.ObjectId
  code: string
  paymentDate: Date
  providerId: Types.ObjectId | null
  currency: "USD" | "MXN"
  exchangeRate: { toString(): string }
  amount: number
  method: PaymentListItemDTO["method"]
  referenceNumber: string | null
  accountLabel: string | null
  evidence: { type: PaymentDetailDTO["evidence"][number]["type"]; label: string | null; url: string | null; notes: string | null }[]
  applications: {
    sourceType: PaymentApplicationDTO["sourceType"]
    sourceId: Types.ObjectId
    sourceCode: string
    appliedAmount: number
    appliedUsd: number
    sourceTotalUsdSnapshot: number
    sourcePendingUsdSnapshot: number
  }[]
  notes: string | null
  createdBy: Types.ObjectId
  updatedBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
  voidedAt: Date | null
  voidedBy: Types.ObjectId | null
  voidReason: string | null
}

export type ActivePaymentApplication = {
  paymentId: string
  paymentCode: string
  paymentDate: string
  paymentHref: string
  sourceType: PaymentApplicationDTO["sourceType"]
  sourceId: string
  sourceCode: string
  appliedAmount: number
  appliedUsd: number
  isVoided: boolean
}

type BlockingPayment = {
  paymentCode: string
  paymentDate: string
  sourceType: PaymentApplicationDTO["sourceType"]
  sourceId: string
  sourceCode: string
}

function exchangeRateToString(value: { toString(): string }) {
  return value.toString()
}

function toMoney(amount: number, currency: "USD" | "MXN") {
  return { amount, currency }
}

async function vendorNames(ids: Types.ObjectId[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const vendors = (await Vendor.find({ _id: { $in: ids } }).select({ name: 1 }).lean()) as unknown as {
    _id: Types.ObjectId
    name: string
  }[]
  return new Map(vendors.map((vendor) => [String(vendor._id), vendor.name]))
}

async function userNamesById(ids: Types.ObjectId[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const db = (await dbConnect()).connection.db
  if (!db) return new Map()
  const documents = (await db.collection("user").find({ _id: { $in: ids } }).project({ name: 1 }).toArray()) as unknown as {
    _id: unknown
    name: string
  }[]
  return new Map(documents.map((document) => [String(document._id), document.name]))
}

function paymentHref(code: string) {
  return `/pagos/${code}`
}

export async function listActivePaymentApplicationsBySource(
  sourceRefs: PaymentSourceRef[],
): Promise<Map<string, ActivePaymentApplication[]>> {
  const session = await requireRole(PAYMENT_READ_ROLES)
  if (!session) return new Map()
  if (sourceRefs.length === 0) return new Map()

  await dbConnect()
  const payments = (await Payment.find({
    voidedAt: null,
    $or: sourceRefs
      .filter((ref) => Types.ObjectId.isValid(ref.id))
      .map((ref) => ({
        applications: {
          $elemMatch: {
            sourceType: ref.type,
            sourceId: new Types.ObjectId(ref.id),
          },
        },
      })),
  }).lean()) as unknown as PaymentLean[]

  const bySource = new Map<string, ActivePaymentApplication[]>()

  for (const payment of payments) {
    for (const application of payment.applications) {
      const key = `${application.sourceType}:${application.sourceId}`
      if (!sourceRefs.some((ref) => key === `${ref.type}:${ref.id}`)) continue
      const row: ActivePaymentApplication = {
        paymentId: String(payment._id),
        paymentCode: payment.code,
        paymentDate: payment.paymentDate.toISOString(),
        paymentHref: paymentHref(payment.code),
        sourceType: application.sourceType,
        sourceId: String(application.sourceId),
        sourceCode: application.sourceCode,
        appliedAmount: application.appliedAmount,
        appliedUsd: application.appliedUsd,
        isVoided: Boolean(payment.voidedAt),
      }
      bySource.set(key, [...(bySource.get(key) ?? []), row])
    }
  }

  return bySource
}

export async function getBlockingPaymentsForSources(
  sourceRefs: PaymentSourceRef[],
): Promise<Map<string, BlockingPayment[]>> {
  const bySource = await listActivePaymentApplicationsBySource(sourceRefs)
  return new Map(
    Array.from(bySource.entries()).map(([key, applications]) => [
      key,
      applications.map((application) => ({
        paymentCode: application.paymentCode,
        paymentDate: application.paymentDate,
        sourceType: application.sourceType,
        sourceId: application.sourceId,
        sourceCode: application.sourceCode,
      })),
    ]),
  )
}

export async function getSourceBalanceSummary(
  sourceRef: PaymentSourceRef,
): Promise<PaymentBalanceSummaryDTO | null> {
  const session = await requireRole(PAYMENT_READ_ROLES)
  if (!session) return null

  const [sourceMap, applicationsBySource] = await Promise.all([
    getPayableSourceDocuments([sourceRef]),
    listActivePaymentApplicationsBySource([sourceRef]),
  ])
  const source = sourceMap.get(`${sourceRef.type}:${sourceRef.id}`)
  if (!source) return null

  const activeApplications = applicationsBySource.get(`${sourceRef.type}:${sourceRef.id}`) ?? []
  const balances = calculatePaidAndPending(
    source.totalUsd.amount,
    activeApplications.map((application) => ({ appliedUsd: application.appliedUsd })),
  )

  return {
    paymentStatus: paymentStatusOfSource(
      source.totalUsd.amount,
      activeApplications.map((application) => ({ appliedUsd: application.appliedUsd })),
    ),
    paidUsd: balances.paidUsd,
    pendingUsd: balances.pendingUsd,
    activeApplications: activeApplications.map((application) => ({
      paymentCode: application.paymentCode,
      paymentDate: application.paymentDate,
      paymentHref: application.paymentHref,
      sourceType: application.sourceType,
      sourceId: application.sourceId,
      sourceCode: application.sourceCode,
      appliedAmount: toMoney(application.appliedAmount, source.type === "purchase" ? source.totalUsd.currency : source.totalUsd.currency),
      appliedUsd: toMoney(application.appliedUsd, "USD"),
    })),
  }
}

export async function searchPayableSources(filters: {
  providerId?: string
  sourceType?: PaymentApplicationDTO["sourceType"]
  code?: string
  vehicleId?: string
}): Promise<SourcePayableOptionDTO[] | null> {
  const session = await requireRole(PAYMENT_READ_ROLES)
  if (!session) return null

  const rows = await searchPayableSourceDocuments(filters)
  if (rows.length === 0) return []

  const applicationsBySource = await listActivePaymentApplicationsBySource(
    rows.map((row) => ({ type: row.type, id: row.id })),
  )

  return rows
    .map((row) => {
      const applications = applicationsBySource.get(`${row.type}:${row.id}`) ?? []
      const balances = calculatePaidAndPending(
        row.totalUsd.amount,
        applications.map((application) => ({ appliedUsd: application.appliedUsd })),
      )
      return {
        type: row.type,
        id: row.id,
        code: row.code,
        label: row.label,
        href: row.href,
        providerId: row.providerId,
        providerName: row.providerName,
        vehicleId: row.vehicleId,
        vehicleCode: row.vehicleCode,
        vehicleDescription: row.vehicleDescription,
        totalUsd: row.totalUsd,
        paymentStatus: paymentStatusOfSource(
          row.totalUsd.amount,
          applications.map((application) => ({ appliedUsd: application.appliedUsd })),
        ),
        paidUsd: balances.paidUsd,
        pendingUsd: balances.pendingUsd,
        isPayable: row.isPayable && balances.pendingUsd.amount > 0,
      } satisfies SourcePayableOptionDTO
    })
    .filter((row) => row.isPayable)
}

function matchesSearch(payment: PaymentListItemDTO, search: string) {
  const needle = search.trim().toLowerCase()
  return [
    payment.code,
    payment.providerName ?? "Sin proveedor",
    payment.method,
    payment.status,
    ...payment.sourceTypes,
  ]
    .join(" ")
    .toLowerCase()
    .includes(needle)
}

async function toPaymentListItemDTO(
  payment: PaymentLean,
  vendors: Map<string, string>,
): Promise<PaymentListItemDTO> {
  const totalUsd = paymentTotalUsd(
    payment.amount,
    payment.currency,
    exchangeRateToString(payment.exchangeRate),
  )

  return {
    id: String(payment._id),
    code: payment.code,
    paymentDate: payment.paymentDate.toISOString(),
    providerId: payment.providerId ? String(payment.providerId) : null,
    providerName: payment.providerId ? (vendors.get(String(payment.providerId)) ?? "—") : null,
    currency: payment.currency,
    exchangeRate: exchangeRateToString(payment.exchangeRate),
    amount: toMoney(payment.amount, payment.currency),
    totalUsd,
    method: payment.method,
    applicationCount: payment.applications.length,
    sourceTypes: Array.from(new Set(payment.applications.map((application) => application.sourceType))),
    status: payment.voidedAt ? "voided" : "active",
    isVoided: Boolean(payment.voidedAt),
  }
}

export async function listPayments(filters: PaymentFilters = {}): Promise<PaymentListItemDTO[] | null> {
  const session = await requireRole(PAYMENT_READ_ROLES)
  if (!session) return null

  await dbConnect()
  const query: Record<string, unknown> = {}
  if (!filters.includeVoided) query.voidedAt = null
  if (filters.providerId && Types.ObjectId.isValid(filters.providerId)) {
    query.providerId = new Types.ObjectId(filters.providerId)
  }
  if (filters.method) query.method = filters.method
  if (filters.currency) query.currency = filters.currency
  if (filters.status === "active") query.voidedAt = null
  if (filters.status === "voided") query.voidedAt = { $ne: null }
  if (filters.sourceType) query["applications.sourceType"] = filters.sourceType
  if (filters.dateFrom || filters.dateTo) {
    const range: Record<string, Date> = {}
    if (filters.dateFrom) range.$gte = filters.dateFrom
    if (filters.dateTo) range.$lte = filters.dateTo
    query.paymentDate = range
  }

  const payments = (await Payment.find(query).sort({ paymentDate: -1, code: -1 }).lean()) as unknown as PaymentLean[]
  const vendors = await vendorNames(payments.flatMap((payment) => (payment.providerId ? [payment.providerId] : [])))
  const rows = await Promise.all(payments.map((payment) => toPaymentListItemDTO(payment, vendors)))
  return filters.search ? rows.filter((payment) => matchesSearch(payment, filters.search!)) : rows
}

export async function getPaymentByCode(code: string): Promise<PaymentDetailDTO | null> {
  const session = await requireRole(PAYMENT_READ_ROLES)
  if (!session) return null

  await dbConnect()
  const payment = (await Payment.findOne({ code }).lean()) as unknown as PaymentLean | null
  if (!payment) return null

  const [vendors, users, sources] = await Promise.all([
    vendorNames(payment.providerId ? [payment.providerId] : []),
    userNamesById([payment.createdBy, ...(payment.voidedBy ? [payment.voidedBy] : [])]),
    getPayableSourceDocuments(
      payment.applications.map((application) => ({ type: application.sourceType, id: String(application.sourceId) })),
    ),
  ])

  const listItem = await toPaymentListItemDTO(payment, vendors)

  const applications: PaymentApplicationDTO[] = payment.applications.map((application) => {
    const source = sources.get(`${application.sourceType}:${application.sourceId}`)
    return {
      sourceType: application.sourceType,
      sourceId: String(application.sourceId),
      sourceCode: application.sourceCode,
      sourceLabel: source?.label ?? application.sourceCode,
      sourceHref: source?.href ?? "#",
      appliedAmount: toMoney(application.appliedAmount, payment.currency),
      appliedUsd: toMoney(application.appliedUsd, "USD"),
      sourceTotalUsdSnapshot: toMoney(application.sourceTotalUsdSnapshot, "USD"),
      sourcePendingUsdSnapshot: toMoney(application.sourcePendingUsdSnapshot, "USD"),
    }
  })

  return {
    ...listItem,
    referenceNumber: payment.referenceNumber,
    accountLabel: payment.accountLabel,
    notes: payment.notes,
    applications,
    evidence: payment.evidence.map((entry) => ({
      type: entry.type,
      label: entry.label,
      url: entry.url,
      notes: entry.notes,
    })),
    createdBy: String(payment.createdBy),
    createdByName: users.get(String(payment.createdBy)) ?? null,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
    voidedAt: payment.voidedAt ? payment.voidedAt.toISOString() : null,
    voidedBy: payment.voidedBy ? String(payment.voidedBy) : null,
    voidedByName: payment.voidedBy ? (users.get(String(payment.voidedBy)) ?? null) : null,
    voidReason: payment.voidReason,
  }
}
