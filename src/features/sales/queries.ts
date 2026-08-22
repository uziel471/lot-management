import "server-only"
import { Types } from "mongoose"
import { dbConnect } from "@/lib/db/client"
import { requireRole } from "@/lib/auth/dal"
import { SALE_READ_ROLES, SALE_VOID_ROLES } from "@/lib/auth/permissions"
import { Sale } from "@/lib/db/models/sale"
import { Vehicle } from "@/lib/db/models/vehicle"
import { Make } from "@/lib/db/models/make"
import { VehicleModel } from "@/lib/db/models/model"
import { describeVehicle } from "@/features/vehicles/domain"
import { listVehicleOptions } from "@/features/vehicles/queries"
import { getVehicleAcquisitionCostPreviews } from "@/features/purchases/queries"
import { getVehicleRepairPreviews } from "@/features/repairs/queries"
import { getVehicleExpensePreviews } from "@/features/expenses/queries"
import { saleResultOf, createSaleSnapshot } from "./domain"
import type {
  SaleCostSnapshotDTO,
  SaleDetailDTO,
  SaleFilters,
  SaleFormOptionsDTO,
  SaleListItemDTO,
  SaleListResponseDTO,
  VehicleSaleSummaryDTO,
} from "./types"

type SaleLean = {
  _id: Types.ObjectId
  code: string
  vehicleId: Types.ObjectId
  saleDate: Date
  buyerName: string
  buyerPhone: string | null
  buyerEmail: string | null
  salePriceUsd: number
  terms: string | null
  referenceNumber: string | null
  notes: string | null
  acquisitionCostUsd: number
  repairCostUsd: number
  vehicleExpenseCostUsd: number
  totalCostUsd: number
  profitUsd: number
  roiNumerator: number | null
  roiDenominator: number | null
  acquisitionCount: number
  repairCount: number
  vehicleExpenseCount: number
  createdBy: Types.ObjectId
  updatedBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
  voidedAt: Date | null
  voidedBy: Types.ObjectId | null
  voidReason: string | null
}

function toMoney(amount: number) {
  return { amount, currency: "USD" as const }
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

function snapshotOf(sale: SaleLean): SaleCostSnapshotDTO {
  const snapshot = createSaleSnapshot(toMoney(sale.salePriceUsd), {
    acquisitionCostUsd: toMoney(sale.acquisitionCostUsd),
    repairCostUsd: toMoney(sale.repairCostUsd),
    vehicleExpenseCostUsd: toMoney(sale.vehicleExpenseCostUsd),
    acquisitionCount: sale.acquisitionCount,
    repairCount: sale.repairCount,
    vehicleExpenseCount: sale.vehicleExpenseCount,
  })
  return snapshot
}

function toListItemDTO(
  sale: SaleLean,
  vehicles: Map<string, { code: string; description: string }>,
): SaleListItemDTO {
  const vehicle = vehicles.get(String(sale.vehicleId))
  const snapshot = snapshotOf(sale)
  return {
    id: String(sale._id),
    code: sale.code,
    vehicleId: String(sale.vehicleId),
    vehicleCode: vehicle?.code ?? "—",
    vehicleDescription: vehicle?.description ?? "—",
    buyerName: sale.buyerName,
    buyerPhone: sale.buyerPhone,
    buyerEmail: sale.buyerEmail,
    saleDate: sale.saleDate.toISOString(),
    salePriceUsd: toMoney(sale.salePriceUsd),
    snapshot,
    result: saleResultOf(snapshot.profitUsd),
    isVoided: Boolean(sale.voidedAt),
  }
}

function matchesFilters(sale: SaleListItemDTO, filters: SaleFilters): boolean {
  if (filters.search) {
    const needle = filters.search.trim().toLowerCase()
    const haystack = [
      sale.code,
      sale.vehicleCode,
      sale.vehicleDescription,
      sale.buyerName,
      sale.buyerPhone ?? "",
      sale.buyerEmail ?? "",
    ]
      .join(" ")
      .toLowerCase()
    if (!haystack.includes(needle)) return false
  }
  if (filters.vehicleId && sale.vehicleId !== filters.vehicleId) return false
  if (filters.dateFrom && sale.saleDate.slice(0, 10) < filters.dateFrom.toISOString().slice(0, 10)) return false
  if (filters.dateTo && sale.saleDate.slice(0, 10) > filters.dateTo.toISOString().slice(0, 10)) return false
  if (filters.result && sale.result !== filters.result) return false
  if (filters.roiRange) {
    const roi = sale.snapshot.roi
    if (filters.roiRange === "unavailable" && roi !== null) return false
    if (filters.roiRange === "negative" && !(roi !== null && roi < 0)) return false
    if (filters.roiRange === "zeroTo50" && !(roi !== null && roi >= 0 && roi <= 50)) return false
    if (filters.roiRange === "over50" && !(roi !== null && roi > 50)) return false
  }
  return filters.includeVoided ? true : !sale.isVoided
}

export async function getVehicleSaleCostPreview(vehicleId: string): Promise<SaleCostSnapshotDTO | null> {
  const session = await requireRole(SALE_READ_ROLES)
  if (!session) return null
  const previews = await getVehicleSaleCostPreviews([vehicleId])
  return previews.get(vehicleId) ?? null
}

export async function getVehicleSaleCostPreviews(
  vehicleIds: readonly string[],
): Promise<Map<string, SaleCostSnapshotDTO>> {
  const session = await requireRole(SALE_READ_ROLES)
  if (!session) return new Map()

  const [acquisition, repairs, expenses] = await Promise.all([
    getVehicleAcquisitionCostPreviews(vehicleIds),
    getVehicleRepairPreviews(vehicleIds),
    getVehicleExpensePreviews(vehicleIds),
  ])

  return new Map(
    vehicleIds.map((vehicleId) => {
      const purchase = acquisition.get(vehicleId) ?? { totalUsd: toMoney(0), purchaseCount: 0 }
      const repair = repairs.get(vehicleId) ?? { activeTotalUsd: toMoney(0), activeCount: 0 }
      const expense = expenses.get(vehicleId) ?? { activeTotalUsd: toMoney(0), activeCount: 0 }
      return [
        vehicleId,
        createSaleSnapshot(toMoney(0), {
          acquisitionCostUsd: purchase.totalUsd,
          repairCostUsd: repair.activeTotalUsd,
          vehicleExpenseCostUsd: expense.activeTotalUsd,
          acquisitionCount: purchase.purchaseCount,
          repairCount: repair.activeCount,
          vehicleExpenseCount: expense.activeCount,
        }),
      ]
    }),
  )
}

export async function listSales(filters: SaleFilters = {}): Promise<SaleListResponseDTO | null> {
  const session = await requireRole(SALE_READ_ROLES)
  if (!session) return null

  await dbConnect()
  const query: Record<string, unknown> = {}
  if (!filters.includeVoided) query.voidedAt = null
  const sales = (await Sale.find(query)
    .sort({ saleDate: -1, code: -1 })
    .lean()) as unknown as SaleLean[]
  const vehicles = await vehicleDescriptions(sales.map((sale) => sale.vehicleId))
  const rows = sales.map((sale) => toListItemDTO(sale, vehicles)).filter((sale) => matchesFilters(sale, filters))

  const activeRows = rows.filter((row) => !row.isVoided)
  const revenue = activeRows.reduce((sum, row) => sum + row.salePriceUsd.amount, 0)
  const totalCost = activeRows.reduce((sum, row) => sum + row.snapshot.totalCostUsd.amount, 0)
  const profit = activeRows.reduce((sum, row) => sum + row.snapshot.profitUsd.amount, 0)

  return {
    rows,
    summary: {
      activeRevenueUsd: toMoney(revenue),
      activeTotalCostUsd: toMoney(totalCost),
      activeProfitUsd: toMoney(profit),
      aggregateRoi: totalCost > 0 ? Math.round((profit / totalCost) * 10_000) / 100 : null,
      activeCount: activeRows.length,
    },
  }
}

export async function getSaleByCode(code: string): Promise<SaleDetailDTO | null> {
  const session = await requireRole(SALE_READ_ROLES)
  if (!session) return null

  await dbConnect()
  const sale = (await Sale.findOne({ code }).lean()) as unknown as SaleLean | null
  if (!sale) return null

  const [vehicles, userNames] = await Promise.all([
    vehicleDescriptions([sale.vehicleId]),
    userNamesById([sale.createdBy, sale.updatedBy, ...(sale.voidedBy ? [sale.voidedBy] : [])]),
  ])
  const listItem = toListItemDTO(sale, vehicles)

  return {
    ...listItem,
    terms: sale.terms,
    referenceNumber: sale.referenceNumber,
    notes: sale.notes,
    createdBy: String(sale.createdBy),
    createdByName: userNames.get(String(sale.createdBy)) ?? null,
    updatedBy: String(sale.updatedBy),
    updatedByName: userNames.get(String(sale.updatedBy)) ?? null,
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
    voidedAt: sale.voidedAt ? sale.voidedAt.toISOString() : null,
    voidedBy: sale.voidedBy ? String(sale.voidedBy) : null,
    voidedByName: sale.voidedBy ? (userNames.get(String(sale.voidedBy)) ?? null) : null,
    voidReason: sale.voidReason,
    canVoid: SALE_VOID_ROLES.includes(session.user.role),
  }
}

export async function listSaleCandidateVehicles(): Promise<SaleFormOptionsDTO["vehicles"]> {
  const session = await requireRole(SALE_READ_ROLES)
  if (!session) return []

  const [vehicles, activeSales] = await Promise.all([
    listVehicleOptions(),
    Sale.find({ voidedAt: null }).select({ vehicleId: 1 }).lean() as unknown as Promise<{ vehicleId: Types.ObjectId }[]>,
  ])

  const blockedIds = new Set(activeSales.map((sale) => String(sale.vehicleId)))
  return vehicles.filter((vehicle) => !blockedIds.has(vehicle.id))
}

export async function getSaleFormOptions(): Promise<SaleFormOptionsDTO> {
  const session = await requireRole(SALE_READ_ROLES)
  if (!session) return { vehicles: [] }
  return { vehicles: await listSaleCandidateVehicles() }
}

export async function getVehicleSaleSummary(vehicleId: string): Promise<VehicleSaleSummaryDTO | null> {
  const session = await requireRole(SALE_READ_ROLES)
  if (!session) return null
  if (!Types.ObjectId.isValid(vehicleId)) return null

  await dbConnect()
  const sales = (await Sale.find({ vehicleId: new Types.ObjectId(vehicleId) })
    .sort({ saleDate: -1, code: -1 })
    .lean()) as unknown as SaleLean[]
  const vehicles = await vehicleDescriptions([new Types.ObjectId(vehicleId)])
  const rows = sales.map((sale) => toListItemDTO(sale, vehicles))
  return {
    activeSale: rows.find((row) => !row.isVoided) ?? null,
    voidedSales: rows.filter((row) => row.isVoided),
  }
}

export async function findActiveSaleByVehicleId(vehicleId: string): Promise<{ id: string; code: string } | null> {
  const session = await requireRole(SALE_READ_ROLES)
  if (!session) return null
  if (!Types.ObjectId.isValid(vehicleId)) return null

  await dbConnect()
  const sale = await Sale.findOne({ vehicleId: new Types.ObjectId(vehicleId), voidedAt: null })
    .select({ _id: 1, code: 1 })
    .lean()
  if (!sale) return null
  return { id: String(sale._id), code: sale.code }
}
