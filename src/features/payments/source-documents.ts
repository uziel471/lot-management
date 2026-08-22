import "server-only"
import { Types } from "mongoose"
import { dbConnect } from "@/lib/db/client"
import { Expense } from "@/lib/db/models/expense"
import { Make } from "@/lib/db/models/make"
import { VehicleModel } from "@/lib/db/models/model"
import { Purchase } from "@/lib/db/models/purchase"
import { Repair } from "@/lib/db/models/repair"
import { Vehicle } from "@/lib/db/models/vehicle"
import { Vendor } from "@/lib/db/models/vendor"
import { expenseTotalUsd } from "@/features/expenses/domain"
import { describeVehicle } from "@/features/vehicles/domain"
import { totalUsd as purchaseTotalUsd } from "@/features/purchases/domain"
import { repairTotalUsd } from "@/features/repairs/domain"
import type { Money } from "@/types/money"
import { PAYMENT_SOURCE_TYPE_LABELS, type PaymentSourceType } from "./enums"

type PurchaseLean = {
  _id: Types.ObjectId
  code: string
  vehicleId: Types.ObjectId
  vendorId: Types.ObjectId
  currency: "USD" | "MXN"
  exchangeRate: { toString(): string }
  voidedAt: Date | null
  purchasePrice?: number
  auctionFees?: number
  acquisitionTransportCost?: number
  titleDocFees?: number
  purchaseTax?: number
  importDuties?: number
  customsBrokerFees?: number
  otherAcquisitionCosts?: number
}

type ExpenseLean = {
  _id: Types.ObjectId
  code: string
  vehicleId: Types.ObjectId | null
  vendorId: Types.ObjectId | null
  currency: "USD" | "MXN"
  exchangeRate: { toString(): string }
  voidedAt: Date | null
  amount?: number
  tax?: number
  fees?: number
  discount?: number
  adjustment?: number
}

type RepairLean = {
  _id: Types.ObjectId
  code: string
  vehicleId: Types.ObjectId
  vendorId: Types.ObjectId | null
  currency: "USD" | "MXN"
  exchangeRate: { toString(): string }
  status: string
  voidedAt: Date | null
  laborCost?: number
  partsCost?: number
  taxCost?: number
  outsideServiceCost?: number
  otherCost?: number
}

export type PaymentSourceRef = {
  type: PaymentSourceType
  id: string
}

export type PayableSourceDocument = {
  type: PaymentSourceType
  id: string
  code: string
  label: string
  href: string
  providerId: string | null
  providerName: string | null
  vehicleId: string | null
  vehicleCode: string | null
  vehicleDescription: string | null
  totalUsd: Money
  isPayable: boolean
}

type VehicleLookup = { code: string; description: string }

function money(amount: number): Money {
  return { amount, currency: "USD" }
}

function exchangeRateToString(value: { toString(): string }): string {
  return value.toString()
}

function purchaseHref(code: string) {
  return `/compras/${code}`
}

function expenseHref(code: string) {
  return `/gastos/${code}`
}

function repairHref(code: string) {
  return `/reparaciones/${code}`
}

async function vehicleDescriptions(ids: Types.ObjectId[]): Promise<Map<string, VehicleLookup>> {
  if (ids.length === 0) return new Map()
  const vehicles = (await Vehicle.find({ _id: { $in: ids } })
    .select({ code: 1, year: 1, makeId: 1, modelId: 1 })
    .lean()) as unknown as { _id: Types.ObjectId; code: string; year: number; makeId: Types.ObjectId; modelId: Types.ObjectId }[]

  const [makes, models] = await Promise.all([
    Make.find({ _id: { $in: vehicles.map((vehicle) => vehicle.makeId) } }).select({ name: 1 }).lean() as unknown as Promise<{ _id: Types.ObjectId; name: string }[]>,
    VehicleModel.find({ _id: { $in: vehicles.map((vehicle) => vehicle.modelId) } }).select({ name: 1 }).lean() as unknown as Promise<{ _id: Types.ObjectId; name: string }[]>,
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
  const vendors = (await Vendor.find({ _id: { $in: ids } }).select({ name: 1 }).lean()) as unknown as {
    _id: Types.ObjectId
    name: string
  }[]
  return new Map(vendors.map((vendor) => [String(vendor._id), vendor.name]))
}

function purchaseTotal(document: PurchaseLean): Money {
  return purchaseTotalUsd(
    {
      purchasePrice: document.purchasePrice ?? 0,
      auctionFees: document.auctionFees ?? 0,
      acquisitionTransportCost: document.acquisitionTransportCost ?? 0,
      titleDocFees: document.titleDocFees ?? 0,
      purchaseTax: document.purchaseTax ?? 0,
      importDuties: document.importDuties ?? 0,
      customsBrokerFees: document.customsBrokerFees ?? 0,
      otherAcquisitionCosts: document.otherAcquisitionCosts ?? 0,
    },
    document.currency,
    exchangeRateToString(document.exchangeRate),
  )
}

function expenseTotal(document: ExpenseLean): Money {
  return expenseTotalUsd(
    {
      amount: document.amount ?? 0,
      tax: document.tax ?? 0,
      fees: document.fees ?? 0,
      discount: document.discount ?? 0,
      adjustment: document.adjustment ?? 0,
    },
    document.currency,
    exchangeRateToString(document.exchangeRate),
  )
}

function repairTotal(document: RepairLean): Money {
  return repairTotalUsd(
    {
      laborCost: document.laborCost ?? 0,
      partsCost: document.partsCost ?? 0,
      taxCost: document.taxCost ?? 0,
      outsideServiceCost: document.outsideServiceCost ?? 0,
      otherCost: document.otherCost ?? 0,
    },
    document.currency,
    exchangeRateToString(document.exchangeRate),
  )
}

function repairIsPayable(repair: RepairLean): boolean {
  return !repair.voidedAt && repair.status !== "cancelled" && repair.status !== "voided"
}

function sourceLabel(type: PaymentSourceType, code: string) {
  return `${PAYMENT_SOURCE_TYPE_LABELS[type]} ${code}`
}

export async function getPayableSourceDocuments(
  sourceRefs: PaymentSourceRef[],
): Promise<Map<string, PayableSourceDocument>> {
  await dbConnect()

  const purchaseIds = sourceRefs.filter((ref) => ref.type === "purchase" && Types.ObjectId.isValid(ref.id)).map((ref) => new Types.ObjectId(ref.id))
  const expenseIds = sourceRefs.filter((ref) => ref.type === "expense" && Types.ObjectId.isValid(ref.id)).map((ref) => new Types.ObjectId(ref.id))
  const repairIds = sourceRefs.filter((ref) => ref.type === "repair" && Types.ObjectId.isValid(ref.id)).map((ref) => new Types.ObjectId(ref.id))

  const [purchases, expenses, repairs] = await Promise.all([
    purchaseIds.length > 0 ? Purchase.find({ _id: { $in: purchaseIds } }).lean() as unknown as Promise<PurchaseLean[]> : Promise.resolve([]),
    expenseIds.length > 0 ? Expense.find({ _id: { $in: expenseIds } }).lean() as unknown as Promise<ExpenseLean[]> : Promise.resolve([]),
    repairIds.length > 0 ? Repair.find({ _id: { $in: repairIds } }).lean() as unknown as Promise<RepairLean[]> : Promise.resolve([]),
  ])

  const [vehicles, vendors] = await Promise.all([
    vehicleDescriptions([
      ...purchases.map((purchase) => purchase.vehicleId),
      ...expenses.flatMap((expense) => (expense.vehicleId ? [expense.vehicleId] : [])),
      ...repairs.map((repair) => repair.vehicleId),
    ]),
    vendorNames([
      ...purchases.map((purchase) => purchase.vendorId),
      ...expenses.flatMap((expense) => (expense.vendorId ? [expense.vendorId] : [])),
      ...repairs.flatMap((repair) => (repair.vendorId ? [repair.vendorId] : [])),
    ]),
  ])

  const results = new Map<string, PayableSourceDocument>()

  for (const purchase of purchases) {
    const vehicle = vehicles.get(String(purchase.vehicleId))
    results.set(`purchase:${purchase._id}`, {
      type: "purchase",
      id: String(purchase._id),
      code: purchase.code,
      label: sourceLabel("purchase", purchase.code),
      href: purchaseHref(purchase.code),
      providerId: String(purchase.vendorId),
      providerName: vendors.get(String(purchase.vendorId)) ?? "—",
      vehicleId: String(purchase.vehicleId),
      vehicleCode: vehicle?.code ?? "—",
      vehicleDescription: vehicle?.description ?? "—",
      totalUsd: purchaseTotal(purchase),
      isPayable: !purchase.voidedAt,
    })
  }

  for (const expense of expenses) {
    const vehicle = expense.vehicleId ? vehicles.get(String(expense.vehicleId)) : null
    const providerId = expense.vendorId ? String(expense.vendorId) : null
    results.set(`expense:${expense._id}`, {
      type: "expense",
      id: String(expense._id),
      code: expense.code,
      label: sourceLabel("expense", expense.code),
      href: expenseHref(expense.code),
      providerId,
      providerName: expense.vendorId ? (vendors.get(String(expense.vendorId)) ?? "—") : null,
      vehicleId: expense.vehicleId ? String(expense.vehicleId) : null,
      vehicleCode: vehicle?.code ?? null,
      vehicleDescription: vehicle?.description ?? null,
      totalUsd: expenseTotal(expense),
      isPayable: !expense.voidedAt,
    })
  }

  for (const repair of repairs) {
    const vehicle = vehicles.get(String(repair.vehicleId))
    const providerId = repair.vendorId ? String(repair.vendorId) : null
    results.set(`repair:${repair._id}`, {
      type: "repair",
      id: String(repair._id),
      code: repair.code,
      label: sourceLabel("repair", repair.code),
      href: repairHref(repair.code),
      providerId,
      providerName: repair.vendorId ? (vendors.get(String(repair.vendorId)) ?? "—") : null,
      vehicleId: String(repair.vehicleId),
      vehicleCode: vehicle?.code ?? "—",
      vehicleDescription: vehicle?.description ?? "—",
      totalUsd: repairTotal(repair),
      isPayable: repairIsPayable(repair),
    })
  }

  return results
}

export async function searchPayableSourceDocuments(filters: {
  providerId?: string
  sourceType?: PaymentSourceType
  code?: string
  vehicleId?: string
}): Promise<PayableSourceDocument[]> {
  await dbConnect()

  const purchaseQuery: Record<string, unknown> = { voidedAt: null }
  const expenseQuery: Record<string, unknown> = { voidedAt: null }
  const repairQuery: Record<string, unknown> = { voidedAt: null, status: { $nin: ["cancelled", "voided"] } }
  const escaped = filters.code?.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const codePattern = escaped ? new RegExp(escaped, "i") : null

  if (filters.providerId && Types.ObjectId.isValid(filters.providerId)) {
    const providerObjectId = new Types.ObjectId(filters.providerId)
    purchaseQuery.vendorId = providerObjectId
    expenseQuery.vendorId = providerObjectId
    repairQuery.vendorId = providerObjectId
  }
  if (filters.vehicleId && Types.ObjectId.isValid(filters.vehicleId)) {
    const vehicleObjectId = new Types.ObjectId(filters.vehicleId)
    purchaseQuery.vehicleId = vehicleObjectId
    expenseQuery.vehicleId = vehicleObjectId
    repairQuery.vehicleId = vehicleObjectId
  }
  if (codePattern) {
    purchaseQuery.code = codePattern
    expenseQuery.code = codePattern
    repairQuery.code = codePattern
  }

  const [purchases, expenses, repairs] = await Promise.all([
    !filters.sourceType || filters.sourceType === "purchase"
      ? Purchase.find(purchaseQuery).sort({ purchaseDate: -1, code: -1 }).lean() as unknown as Promise<PurchaseLean[]>
      : Promise.resolve([]),
    !filters.sourceType || filters.sourceType === "expense"
      ? Expense.find(expenseQuery).sort({ expenseDate: -1, code: -1 }).lean() as unknown as Promise<ExpenseLean[]>
      : Promise.resolve([]),
    !filters.sourceType || filters.sourceType === "repair"
      ? Repair.find(repairQuery).sort({ openedAt: -1, code: -1 }).lean() as unknown as Promise<RepairLean[]>
      : Promise.resolve([]),
  ])

  const rows = await getPayableSourceDocuments([
    ...purchases.map((purchase) => ({ type: "purchase" as const, id: String(purchase._id) })),
    ...expenses.map((expense) => ({ type: "expense" as const, id: String(expense._id) })),
    ...repairs.map((repair) => ({ type: "repair" as const, id: String(repair._id) })),
  ])

  return Array.from(rows.values()).filter((row) => row.isPayable)
}

export function emptyBalanceSummary() {
  return {
    paymentStatus: "unpaid" as const,
    paidUsd: money(0),
    pendingUsd: money(0),
    activeApplications: [],
  }
}
