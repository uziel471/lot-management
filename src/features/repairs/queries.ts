import "server-only"
import { Types } from "mongoose"
import { dbConnect } from "@/lib/db/client"
import { requireRole } from "@/lib/auth/dal"
import { REPAIR_READ_ROLES } from "@/lib/auth/permissions"
import { Repair } from "@/lib/db/models/repair"
import { Vehicle } from "@/lib/db/models/vehicle"
import { Vendor } from "@/lib/db/models/vendor"
import { Make } from "@/lib/db/models/make"
import { VehicleModel } from "@/lib/db/models/model"
import { describeVehicle } from "@/features/vehicles/domain"
import { calculatePaidAndPending, paymentStatus as paymentStatusOfSource } from "@/features/payments/domain"
import { listActivePaymentApplicationsBySource } from "@/features/payments/queries"
import type { Money } from "@/types/money"
import { accumulateActiveRepairCost, repairTotalOriginal, repairTotalUsd } from "./domain"
import {
  REPAIR_CATEGORY_LABELS,
  REPAIR_COST_COMPONENT_KEYS,
  REPAIR_STATUS_LABELS,
  type RepairCostComponentKey,
  type RepairCostComponents,
  type RepairStatus,
} from "./enums"
import type {
  RepairDetailDTO,
  RepairFilters,
  RepairListItemDTO,
  RepairStatusHistoryEntryDTO,
  VehicleRepairStatusSummaryDTO,
  VehicleRepairSummaryDTO,
} from "./types"

type RepairLean = {
  _id: Types.ObjectId
  code: string
  vehicleId: Types.ObjectId
  vendorId: Types.ObjectId | null
  category: RepairListItemDTO["category"]
  status: RepairListItemDTO["status"]
  openedAt: Date
  completedAt: Date | null
  completedBy: Types.ObjectId | null
  completionNote: string | null
  cancelledAt: Date | null
  cancelledBy: Types.ObjectId | null
  cancellationReason: string | null
  currency: "USD" | "MXN"
  exchangeRate: unknown
  description: string
  referenceNumber: string | null
  workOrderNumber: string | null
  notes: string | null
  createdBy: Types.ObjectId
  updatedBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
  voidedAt: Date | null
  voidedBy: Types.ObjectId | null
  voidReason: string | null
  statusHistory: {
    previousStatus: RepairStatus | null
    nextStatus: RepairStatus
    changedBy: Types.ObjectId
    changedAt: Date
    note: string | null
  }[]
} & RepairCostComponents

function exchangeRateToString(value: unknown): string {
  return (value as { toString(): string }).toString()
}

function componentsOf(repair: RepairLean): RepairCostComponents {
  return Object.fromEntries(
    REPAIR_COST_COMPONENT_KEYS.map((key) => [key, repair[key] ?? 0]),
  ) as RepairCostComponents
}

async function vehicleDescriptions(ids: Types.ObjectId[]): Promise<Map<string, { code: string; description: string }>> {
  if (ids.length === 0) return new Map()
  const vehicles = (await Vehicle.find({ _id: { $in: ids } })
    .select({ code: 1, year: 1, makeId: 1, modelId: 1 })
    .lean()) as unknown as { _id: Types.ObjectId; code: string; year: number; makeId: Types.ObjectId; modelId: Types.ObjectId }[]

  const [makes, models] = await Promise.all([
    Make.find({ _id: { $in: vehicles.map((vehicle) => vehicle.makeId) } })
      .select({ name: 1 })
      .lean() as unknown as Promise<{ _id: Types.ObjectId; name: string }[]>,
    VehicleModel.find({ _id: { $in: vehicles.map((vehicle) => vehicle.modelId) } })
      .select({ name: 1 })
      .lean() as unknown as Promise<{ _id: Types.ObjectId; name: string }[]>,
  ])

  const makeNames = new Map(makes.map((make) => [String(make._id), make.name]))
  const modelNames = new Map(models.map((model) => [String(model._id), model.name]))

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
  return new Map(vendors.map((vendor) => [String(vendor._id), vendor.name]))
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

function toRepairListItemDTO(
  repair: RepairLean,
  vehicles: Map<string, { code: string; description: string }>,
  vendors: Map<string, string>,
  paymentSummary: Pick<RepairListItemDTO, "paymentStatus" | "paidUsd" | "pendingUsd">,
): RepairListItemDTO {
  const vehicle = vehicles.get(String(repair.vehicleId))
  const rate = exchangeRateToString(repair.exchangeRate)
  const vendorId = repair.vendorId ? String(repair.vendorId) : null

  return {
    id: String(repair._id),
    code: repair.code,
    vehicleId: String(repair.vehicleId),
    vehicleCode: vehicle?.code ?? "—",
    vehicleDescription: vehicle?.description ?? "—",
    vendorId,
    vendorName: repair.vendorId ? (vendors.get(String(repair.vendorId)) ?? "—") : null,
    isInternal: !repair.vendorId,
    category: repair.category,
    status: repair.status,
    openedAt: repair.openedAt.toISOString(),
    completedAt: repair.completedAt ? repair.completedAt.toISOString() : null,
    currency: repair.currency,
    exchangeRate: rate,
    totalOriginal: repairTotalOriginal(componentsOf(repair), repair.currency),
    totalUsd: repairTotalUsd(componentsOf(repair), repair.currency, rate),
    paymentStatus: paymentSummary.paymentStatus,
    paidUsd: paymentSummary.paidUsd,
    pendingUsd: paymentSummary.pendingUsd,
    isVoided: Boolean(repair.voidedAt),
  }
}

export async function listRepairs(filters: RepairFilters = {}): Promise<RepairListItemDTO[] | null> {
  const session = await requireRole(REPAIR_READ_ROLES)
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
  if (filters.status) query.status = filters.status
  if (filters.category) query.category = filters.category
  if (filters.currency) query.currency = filters.currency
  if (filters.dateFrom || filters.dateTo) {
    const range: Record<string, Date> = {}
    if (filters.dateFrom) range.$gte = filters.dateFrom
    if (filters.dateTo) range.$lte = filters.dateTo
    query.openedAt = range
  }

  const repairs = (await Repair.find(query)
    .sort({ openedAt: -1, code: -1 })
    .lean()) as unknown as RepairLean[]

  const [vehicles, vendors, paymentApplications] = await Promise.all([
    vehicleDescriptions(repairs.map((repair) => repair.vehicleId)),
    vendorNames(repairs.flatMap((repair) => (repair.vendorId ? [repair.vendorId] : []))),
    listActivePaymentApplicationsBySource(
      repairs.map((repair) => ({ type: "repair" as const, id: String(repair._id) })),
    ),
  ])

  const rows = repairs.map((repair) => {
    const totalUsd = repairTotalUsd(componentsOf(repair), repair.currency, exchangeRateToString(repair.exchangeRate))
    const applications = paymentApplications.get(`repair:${repair._id}`) ?? []
    const balances = calculatePaidAndPending(
      totalUsd.amount,
      applications.map((application) => ({ appliedUsd: application.appliedUsd })),
    )
    return toRepairListItemDTO(repair, vehicles, vendors, {
      paymentStatus: paymentStatusOfSource(
        totalUsd.amount,
        applications.map((application) => ({ appliedUsd: application.appliedUsd })),
      ),
      paidUsd: balances.paidUsd,
      pendingUsd: balances.pendingUsd,
    })
  })
  if (!filters.search) return rows

  const needle = filters.search.trim().toLowerCase()
  return rows.filter((repair) =>
    [
      repair.code,
      repair.vehicleCode,
      repair.vehicleDescription,
      repair.vendorName ?? "Interna",
      REPAIR_CATEGORY_LABELS[repair.category],
      REPAIR_STATUS_LABELS[repair.status],
    ]
      .join(" ")
      .toLowerCase()
      .includes(needle),
  )
}

export async function getRepairByCode(code: string): Promise<RepairDetailDTO | null> {
  const session = await requireRole(REPAIR_READ_ROLES)
  if (!session) return null

  await dbConnect()
  const repair = (await Repair.findOne({ code }).lean()) as unknown as RepairLean | null
  if (!repair) return null

  const [vehicles, vendors, paymentApplications] = await Promise.all([
    vehicleDescriptions([repair.vehicleId]),
    vendorNames(repair.vendorId ? [repair.vendorId] : []),
    listActivePaymentApplicationsBySource([{ type: "repair", id: String(repair._id) }]),
  ])

  const totalUsd = repairTotalUsd(componentsOf(repair), repair.currency, exchangeRateToString(repair.exchangeRate))
  const applications = paymentApplications.get(`repair:${repair._id}`) ?? []
  const balances = calculatePaidAndPending(
    totalUsd.amount,
    applications.map((application) => ({ appliedUsd: application.appliedUsd })),
  )
  const listItem = toRepairListItemDTO(repair, vehicles, vendors, {
    paymentStatus: paymentStatusOfSource(
      totalUsd.amount,
      applications.map((application) => ({ appliedUsd: application.appliedUsd })),
    ),
    paidUsd: balances.paidUsd,
    pendingUsd: balances.pendingUsd,
  })
  const components = componentsOf(repair)
  const componentMoney = Object.fromEntries(
    REPAIR_COST_COMPONENT_KEYS.map((key) => [
      key,
      { amount: components[key], currency: repair.currency } satisfies Money,
    ]),
  ) as Record<RepairCostComponentKey, Money>

  const userIds = [
    repair.createdBy,
    ...(repair.completedBy ? [repair.completedBy] : []),
    ...(repair.cancelledBy ? [repair.cancelledBy] : []),
    ...(repair.voidedBy ? [repair.voidedBy] : []),
    ...repair.statusHistory.map((entry) => entry.changedBy),
  ]
  const userNames = await userNamesById(userIds)

  const statusHistory: RepairStatusHistoryEntryDTO[] = [...repair.statusHistory]
    .sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime())
    .map((entry) => ({
      previousStatus: entry.previousStatus,
      previousStatusLabel: entry.previousStatus ? REPAIR_STATUS_LABELS[entry.previousStatus] : null,
      nextStatus: entry.nextStatus,
      nextStatusLabel: REPAIR_STATUS_LABELS[entry.nextStatus],
      changedBy: String(entry.changedBy),
      changedByName: userNames.get(String(entry.changedBy)) ?? null,
      changedAt: entry.changedAt.toISOString(),
      note: entry.note,
    }))

  return {
    ...listItem,
    components: componentMoney,
    description: repair.description,
    referenceNumber: repair.referenceNumber,
    workOrderNumber: repair.workOrderNumber,
    notes: repair.notes,
    statusHistory,
    createdBy: String(repair.createdBy),
    createdByName: userNames.get(String(repair.createdBy)) ?? null,
    createdAt: repair.createdAt.toISOString(),
    updatedAt: repair.updatedAt.toISOString(),
    completedBy: repair.completedBy ? String(repair.completedBy) : null,
    completedByName: repair.completedBy ? (userNames.get(String(repair.completedBy)) ?? null) : null,
    completionNote: repair.completionNote,
    cancelledAt: repair.cancelledAt ? repair.cancelledAt.toISOString() : null,
    cancelledBy: repair.cancelledBy ? String(repair.cancelledBy) : null,
    cancelledByName: repair.cancelledBy ? (userNames.get(String(repair.cancelledBy)) ?? null) : null,
    cancellationReason: repair.cancellationReason,
    voidedAt: repair.voidedAt ? repair.voidedAt.toISOString() : null,
    voidedBy: repair.voidedBy ? String(repair.voidedBy) : null,
    voidedByName: repair.voidedBy ? (userNames.get(String(repair.voidedBy)) ?? null) : null,
    voidReason: repair.voidReason,
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
        appliedAmount: { amount: application.appliedAmount, currency: repair.currency },
        appliedUsd: { amount: application.appliedUsd, currency: "USD" },
      })),
    },
  }
}

export async function listRepairsByVehicle(vehicleId: string): Promise<RepairListItemDTO[] | null> {
  if (!Types.ObjectId.isValid(vehicleId)) return []
  return listRepairs({ vehicleId, includeVoided: true })
}

export async function getVehicleRepairSummary(vehicleId: string): Promise<VehicleRepairSummaryDTO | null> {
  const session = await requireRole(REPAIR_READ_ROLES)
  if (!session) return null
  if (!Types.ObjectId.isValid(vehicleId)) return null

  await dbConnect()
  const repairs = (await Repair.find({ vehicleId: new Types.ObjectId(vehicleId) })
    .sort({ openedAt: -1, code: -1 })
    .lean()) as unknown as RepairLean[]

  const [vehicles, vendors, paymentApplications] = await Promise.all([
    vehicleDescriptions(repairs.map((repair) => repair.vehicleId)),
    vendorNames(repairs.flatMap((repair) => (repair.vendorId ? [repair.vendorId] : []))),
    listActivePaymentApplicationsBySource(
      repairs.map((repair) => ({ type: "repair" as const, id: String(repair._id) })),
    ),
  ])

  const rows = repairs.map((repair) => {
    const totalUsd = repairTotalUsd(componentsOf(repair), repair.currency, exchangeRateToString(repair.exchangeRate))
    const applications = paymentApplications.get(`repair:${repair._id}`) ?? []
    const balances = calculatePaidAndPending(
      totalUsd.amount,
      applications.map((application) => ({ appliedUsd: application.appliedUsd })),
    )
    return toRepairListItemDTO(repair, vehicles, vendors, {
      paymentStatus: paymentStatusOfSource(
        totalUsd.amount,
        applications.map((application) => ({ appliedUsd: application.appliedUsd })),
      ),
      paidUsd: balances.paidUsd,
      pendingUsd: balances.pendingUsd,
    })
  })

  const accumulation = accumulateActiveRepairCost(
    repairs.map((repair) => ({
      currency: repair.currency,
      exchangeRate: exchangeRateToString(repair.exchangeRate),
      components: componentsOf(repair),
      status: repair.status,
      voidedAt: repair.voidedAt,
    })),
  )

  const counts = new Map<RepairStatus, number>()
  for (const repair of repairs) {
    counts.set(repair.status, (counts.get(repair.status) ?? 0) + 1)
  }

  const statusSummary: VehicleRepairStatusSummaryDTO[] = Array.from(counts.entries()).map(([status, count]) => ({
    status,
    label: REPAIR_STATUS_LABELS[status],
    count,
  }))

  const paidUsdAmount = repairs
    .filter((repair) => !repair.voidedAt && ["requested", "quoted", "inProgress", "completed"].includes(repair.status))
    .reduce((total, repair) => {
      const applications = paymentApplications.get(`repair:${repair._id}`) ?? []
      return total + applications.reduce((subtotal, application) => subtotal + application.appliedUsd, 0)
    }, 0)

  return {
    activeTotalUsd: accumulation.total,
    activePaidUsd: { amount: paidUsdAmount, currency: "USD" },
    activePendingUsd: { amount: Math.max(0, accumulation.total.amount - paidUsdAmount), currency: "USD" },
    activeCount: rows.filter((repair) => !repair.isVoided && ["requested", "quoted", "inProgress"].includes(repair.status)).length,
    rows,
    statusSummary,
  }
}
