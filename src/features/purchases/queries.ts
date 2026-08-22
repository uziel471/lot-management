import "server-only"
import { Types } from "mongoose"
import { dbConnect } from "@/lib/db/client"
import { requireRole } from "@/lib/auth/dal"
import { PURCHASE_READ_ROLES } from "@/lib/auth/permissions"
import { Purchase } from "@/lib/db/models/purchase"
import { Vehicle } from "@/lib/db/models/vehicle"
import { Vendor } from "@/lib/db/models/vendor"
import { Make } from "@/lib/db/models/make"
import { VehicleModel } from "@/lib/db/models/model"
import { calculatePaidAndPending, paymentStatus as paymentStatusOfSource } from "@/features/payments/domain"
import { listActivePaymentApplicationsBySource } from "@/features/payments/queries"
import { describeVehicle } from "@/features/vehicles/domain"
import type { Money } from "@/types/money"
import {
  accumulateAcquisitionCost,
  totalOriginal as domainTotalOriginal,
  totalUsd as domainTotalUsd,
} from "./domain"
import { COST_COMPONENT_KEYS, type CostComponentKey, type CostComponents } from "./enums"
import type {
  PurchaseDetailDTO,
  PurchaseFilters,
  PurchaseListItemDTO,
  VehicleAcquisitionCostDTO,
  VehicleAcquisitionCostPreviewDTO,
  VoidedPurchaseOptionDTO,
} from "./types"

/**
 * Única puerta de lectura de compras (la DAL de la feature). Cada
 * función verifica el rol antes de tocar datos y devuelve objetos
 * planos: nunca un documento de Mongoose. Los totales se calculan en
 * JavaScript con `domain.ts`, nunca en el pipeline de agregación (ver
 * design.md, "Los totales no se guardan y no los calcula MongoDB").
 */

type PurchaseLean = {
  _id: Types.ObjectId
  code: string
  vehicleId: Types.ObjectId
  vendorId: Types.ObjectId
  purchaseDate: Date
  sourceType: PurchaseListItemDTO["sourceType"]
  currency: "USD" | "MXN"
  exchangeRate: unknown
  txType: PurchaseListItemDTO["txType"]
  correctsPurchaseId: Types.ObjectId | null
  paymentMethod: PurchaseDetailDTO["paymentMethod"]
  referenceNumber: string | null
  lotNumber: string | null
  notes: string | null
  createdBy: Types.ObjectId
  updatedBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
  voidedAt: Date | null
  voidedBy: Types.ObjectId | null
  voidReason: string | null
} & CostComponents

/** El tipo de cambio siempre viaja como cadena decimal exacta, nunca como `number`. */
function exchangeRateToString(value: unknown): string {
  return (value as { toString(): string }).toString()
}

function componentsOf(purchase: PurchaseLean): CostComponents {
  return Object.fromEntries(
    COST_COMPONENT_KEYS.map((key) => [key, purchase[key] ?? 0]),
  ) as CostComponents
}

async function vehicleDescriptions(ids: Types.ObjectId[]): Promise<Map<string, { code: string; description: string }>> {
  if (ids.length === 0) return new Map()
  const vehicles = (await Vehicle.find({ _id: { $in: ids } })
    .select({ code: 1, year: 1, makeId: 1, modelId: 1 })
    .lean()) as unknown as { _id: Types.ObjectId; code: string; year: number; makeId: Types.ObjectId; modelId: Types.ObjectId }[]

  const makeIds = vehicles.map((v) => v.makeId)
  const modelIds = vehicles.map((v) => v.modelId)
  const [makes, models] = await Promise.all([
    Make.find({ _id: { $in: makeIds } }).select({ name: 1 }).lean() as unknown as Promise<
      { _id: Types.ObjectId; name: string }[]
    >,
    VehicleModel.find({ _id: { $in: modelIds } }).select({ name: 1 }).lean() as unknown as Promise<
      { _id: Types.ObjectId; name: string }[]
    >,
  ])
  const makeNames = new Map(makes.map((m) => [String(m._id), m.name]))
  const modelNames = new Map(models.map((m) => [String(m._id), m.name]))

  return new Map(
    vehicles.map((vehicle) => [
      String(vehicle._id),
      {
        code: vehicle.code,
        description: describeVehicle({
          year: vehicle.year,
          makeName: makeNames.get(String(vehicle.makeId)) ?? "—",
          modelName: modelNames.get(String(vehicle.modelId)) ?? "—",
        }),
      },
    ]),
  )
}

async function vendorNames(ids: Types.ObjectId[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const vendors = (await Vendor.find({ _id: { $in: ids } })
    .select({ name: 1 })
    .lean()) as unknown as { _id: Types.ObjectId; name: string }[]
  return new Map(vendors.map((v) => [String(v._id), v.name]))
}

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

function toListItemDTO(
  purchase: PurchaseLean,
  vehicles: Map<string, { code: string; description: string }>,
  vendors: Map<string, string>,
  paymentSummary: Pick<PurchaseListItemDTO, "paymentStatus" | "paidUsd" | "pendingUsd">,
): PurchaseListItemDTO {
  const rate = exchangeRateToString(purchase.exchangeRate)
  const components = componentsOf(purchase)
  const vehicle = vehicles.get(String(purchase.vehicleId))

  return {
    id: String(purchase._id),
    code: purchase.code,
    vehicleId: String(purchase.vehicleId),
    vehicleCode: vehicle?.code ?? "—",
    vehicleDescription: vehicle?.description ?? "—",
    vendorId: String(purchase.vendorId),
    vendorName: vendors.get(String(purchase.vendorId)) ?? "—",
    purchaseDate: purchase.purchaseDate.toISOString(),
    sourceType: purchase.sourceType,
    txType: purchase.txType,
    currency: purchase.currency,
    exchangeRate: rate,
    totalOriginal: domainTotalOriginal(components, purchase.currency),
    totalUsd: domainTotalUsd(components, purchase.currency, rate),
    paymentStatus: paymentSummary.paymentStatus,
    paidUsd: paymentSummary.paidUsd,
    pendingUsd: paymentSummary.pendingUsd,
    isVoided: Boolean(purchase.voidedAt),
  }
}

/**
 * Listado de compras, filtrable por vehículo, proveedor, tipo y rango
 * de fechas. Excluye las anuladas salvo que se pidan explícitamente.
 * Devuelve `null` si el usuario en sesión no puede consultar.
 */
export async function listPurchases(
  filters: PurchaseFilters = {},
): Promise<PurchaseListItemDTO[] | null> {
  const session = await requireRole(PURCHASE_READ_ROLES)
  if (!session) return null

  await dbConnect()

  const query: Record<string, unknown> = {}
  if (!filters.includeVoided) query.voidedAt = null
  if (filters.vehicleId && Types.ObjectId.isValid(filters.vehicleId)) {
    query.vehicleId = new Types.ObjectId(filters.vehicleId)
  }
  if (filters.vendorId && Types.ObjectId.isValid(filters.vendorId)) {
    query.vendorId = new Types.ObjectId(filters.vendorId)
  }
  if (filters.txType) query.txType = filters.txType
  if (filters.dateFrom || filters.dateTo) {
    const range: Record<string, Date> = {}
    if (filters.dateFrom) range.$gte = filters.dateFrom
    if (filters.dateTo) range.$lte = filters.dateTo
    query.purchaseDate = range
  }

  const purchases = (await Purchase.find(query)
    .sort({ purchaseDate: -1, code: -1 })
    .lean()) as unknown as PurchaseLean[]

  const [vehicles, vendors, paymentApplications] = await Promise.all([
    vehicleDescriptions(purchases.map((p) => p.vehicleId)),
    vendorNames(purchases.map((p) => p.vendorId)),
    listActivePaymentApplicationsBySource(
      purchases.map((purchase) => ({ type: "purchase" as const, id: String(purchase._id) })),
    ),
  ])

  return purchases.map((purchase) => {
    const components = componentsOf(purchase)
    const totalUsd = domainTotalUsd(components, purchase.currency, exchangeRateToString(purchase.exchangeRate))
    const applications = paymentApplications.get(`purchase:${purchase._id}`) ?? []
    const balances = calculatePaidAndPending(
      totalUsd.amount,
      applications.map((application) => ({ appliedUsd: application.appliedUsd })),
    )
    return toListItemDTO(purchase, vehicles, vendors, {
      paymentStatus: paymentStatusOfSource(
        totalUsd.amount,
        applications.map((application) => ({ appliedUsd: application.appliedUsd })),
      ),
      paidUsd: balances.paidUsd,
      pendingUsd: balances.pendingUsd,
    })
  })
}

/** Detalle completo de una compra, con la conversión aplicada y los datos de anulación. */
export async function getPurchaseByCode(code: string): Promise<PurchaseDetailDTO | null> {
  const session = await requireRole(PURCHASE_READ_ROLES)
  if (!session) return null

  await dbConnect()
  const purchase = (await Purchase.findOne({ code }).lean()) as unknown as PurchaseLean | null
  if (!purchase) return null

  const [vehicles, vendors, paymentApplications] = await Promise.all([
    vehicleDescriptions([purchase.vehicleId]),
    vendorNames([purchase.vendorId]),
    listActivePaymentApplicationsBySource([{ type: "purchase", id: String(purchase._id) }]),
  ])
  const purchaseTotal = domainTotalUsd(componentsOf(purchase), purchase.currency, exchangeRateToString(purchase.exchangeRate))
  const applications = paymentApplications.get(`purchase:${purchase._id}`) ?? []
  const balances = calculatePaidAndPending(
    purchaseTotal.amount,
    applications.map((application) => ({ appliedUsd: application.appliedUsd })),
  )
  const listItem = toListItemDTO(purchase, vehicles, vendors, {
    paymentStatus: paymentStatusOfSource(
      purchaseTotal.amount,
      applications.map((application) => ({ appliedUsd: application.appliedUsd })),
    ),
    paidUsd: balances.paidUsd,
    pendingUsd: balances.pendingUsd,
  })

  const components = componentsOf(purchase)
  const componentMoney = Object.fromEntries(
    COST_COMPONENT_KEYS.map((key) => [
      key,
      { amount: components[key], currency: purchase.currency } satisfies Money,
    ]),
  ) as Record<CostComponentKey, Money>

  const relatedIds = [
    ...(purchase.correctsPurchaseId ? [purchase.correctsPurchaseId] : []),
  ]
  const relatedDocs = relatedIds.length
    ? ((await Purchase.find({ _id: { $in: relatedIds } })
        .select({ code: 1 })
        .lean()) as unknown as { _id: Types.ObjectId; code: string }[])
    : []
  const relatedCodeById = new Map(relatedDocs.map((d) => [String(d._id), d.code]))

  const correctedBy = (await Purchase.findOne({ correctsPurchaseId: purchase._id })
    .select({ code: 1 })
    .lean()) as unknown as { code: string } | null

  const userIds = [purchase.createdBy, ...(purchase.voidedBy ? [purchase.voidedBy] : [])]
  const userNames = await userNamesById(userIds)

  return {
    ...listItem,
    components: componentMoney,
    paymentMethod: purchase.paymentMethod,
    referenceNumber: purchase.referenceNumber,
    lotNumber: purchase.lotNumber,
    notes: purchase.notes,
    correctsPurchaseId: purchase.correctsPurchaseId ? String(purchase.correctsPurchaseId) : null,
    correctsPurchaseCode: purchase.correctsPurchaseId
      ? (relatedCodeById.get(String(purchase.correctsPurchaseId)) ?? null)
      : null,
    correctedByPurchaseCode: correctedBy?.code ?? null,
    createdBy: String(purchase.createdBy),
    createdByName: userNames.get(String(purchase.createdBy)) ?? null,
    createdAt: purchase.createdAt.toISOString(),
    updatedAt: purchase.updatedAt.toISOString(),
    voidedAt: purchase.voidedAt ? purchase.voidedAt.toISOString() : null,
    voidedBy: purchase.voidedBy ? String(purchase.voidedBy) : null,
    voidedByName: purchase.voidedBy ? (userNames.get(String(purchase.voidedBy)) ?? null) : null,
    voidReason: purchase.voidReason,
    paymentSummary: {
      paymentStatus: listItem.paymentStatus,
      paidUsd: listItem.paidUsd,
      pendingUsd: listItem.pendingUsd,
      activeApplications: applications.map((application) => ({
        paymentCode: application.paymentCode,
        paymentDate: application.paymentDate,
        paymentHref: application.paymentHref,
        sourceType: application.sourceType,
        sourceId: application.sourceId,
        sourceCode: application.sourceCode,
        appliedAmount: { amount: application.appliedAmount, currency: purchase.currency },
        appliedUsd: { amount: application.appliedUsd, currency: "USD" },
      })),
    },
  }
}

/** Las compras de un vehículo, vigentes y anuladas, ordenadas por fecha. */
export async function listPurchasesByVehicle(vehicleId: string): Promise<PurchaseListItemDTO[] | null> {
  if (!Types.ObjectId.isValid(vehicleId)) return []
  return listPurchases({ vehicleId, includeVoided: true })
}

/**
 * Costo de adquisición acumulado de un vehículo, con su desglose por
 * componente. Es la función que consume la ficha del vehículo — sin
 * que `features/vehicles` importe `features/purchases` (ver
 * design.md, "El costo acumulado se compone en la página, no en la
 * feature"): la composición ocurre en la página de `app/`.
 */
export async function getVehicleAcquisitionCost(
  vehicleId: string,
): Promise<VehicleAcquisitionCostDTO | null> {
  const session = await requireRole(PURCHASE_READ_ROLES)
  if (!session) return null
  if (!Types.ObjectId.isValid(vehicleId)) return null

  await dbConnect()
  const purchases = (await Purchase.find({ vehicleId: new Types.ObjectId(vehicleId) })
    .lean()) as unknown as PurchaseLean[]

  const accumulation = accumulateAcquisitionCost(
    purchases.map((purchase) => ({
      currency: purchase.currency,
      exchangeRate: exchangeRateToString(purchase.exchangeRate),
      components: componentsOf(purchase),
      voidedAt: purchase.voidedAt,
    })),
  )
  const paymentApplications = await listActivePaymentApplicationsBySource(
    purchases.map((purchase) => ({ type: "purchase" as const, id: String(purchase._id) })),
  )
  const activeRows = purchases.filter((purchase) => !purchase.voidedAt)
  const paidUsdAmount = activeRows.reduce((total, purchase) => {
    const applications = paymentApplications.get(`purchase:${purchase._id}`) ?? []
    return total + applications.reduce((subtotal, application) => subtotal + application.appliedUsd, 0)
  }, 0)

  return {
    total: accumulation.total,
    paidUsd: { amount: paidUsdAmount, currency: "USD" },
    pendingUsd: { amount: Math.max(0, accumulation.total.amount - paidUsdAmount), currency: "USD" },
    components: accumulation.components,
    purchaseCount: purchases.filter((p) => !p.voidedAt).length,
  }
}

export async function getVehicleAcquisitionCostPreviews(
  vehicleIds: readonly string[],
): Promise<Map<string, VehicleAcquisitionCostPreviewDTO>> {
  const session = await requireRole(PURCHASE_READ_ROLES)
  if (!session) return new Map()

  const validIds = vehicleIds.filter((vehicleId) => Types.ObjectId.isValid(vehicleId))
  if (validIds.length === 0) return new Map()

  await dbConnect()
  const purchases = (await Purchase.find({
    vehicleId: { $in: validIds.map((vehicleId) => new Types.ObjectId(vehicleId)) },
  }).lean()) as unknown as PurchaseLean[]

  const byVehicle = new Map<string, PurchaseLean[]>()
  for (const purchase of purchases) {
    const key = String(purchase.vehicleId)
    byVehicle.set(key, [...(byVehicle.get(key) ?? []), purchase])
  }

  return new Map(
    validIds.map((vehicleId) => {
      const rows = byVehicle.get(vehicleId) ?? []
      const accumulation = accumulateAcquisitionCost(
        rows.map((purchase) => ({
          currency: purchase.currency,
          exchangeRate: exchangeRateToString(purchase.exchangeRate),
          components: componentsOf(purchase),
          voidedAt: purchase.voidedAt,
        })),
      )
      return [
        vehicleId,
        {
          totalUsd: accumulation.total,
          purchaseCount: rows.filter((purchase) => !purchase.voidedAt).length,
        } satisfies VehicleAcquisitionCostPreviewDTO,
      ]
    }),
  )
}

/** Compras anuladas de un vehículo sin corrección aún, para el desplegable de `correctsPurchaseId`. */
export async function listVoidedPurchasesByVehicle(
  vehicleId: string,
): Promise<VoidedPurchaseOptionDTO[]> {
  const session = await requireRole(PURCHASE_READ_ROLES)
  if (!session) return []
  if (!Types.ObjectId.isValid(vehicleId)) return []

  await dbConnect()
  const voided = (await Purchase.find({
    vehicleId: new Types.ObjectId(vehicleId),
    voidedAt: { $ne: null },
  }).lean()) as unknown as PurchaseLean[]

  const correctedIds = new Set(
    (
      (await Purchase.find({
        vehicleId: new Types.ObjectId(vehicleId),
        correctsPurchaseId: { $ne: null },
      })
        .select({ correctsPurchaseId: 1 })
        .lean()) as unknown as { correctsPurchaseId: Types.ObjectId }[]
    ).map((p) => String(p.correctsPurchaseId)),
  )

  return voided
    .filter((purchase) => !correctedIds.has(String(purchase._id)))
    .map((purchase) => {
      const components = componentsOf(purchase)
      return {
        id: String(purchase._id),
        code: purchase.code,
        txType: purchase.txType,
        totalOriginal: domainTotalOriginal(components, purchase.currency),
        voidedAt: purchase.voidedAt ? purchase.voidedAt.toISOString() : null,
        voidReason: purchase.voidReason,
      }
    })
}
