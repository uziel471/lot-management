import "server-only"
import { Types } from "mongoose"
import { dbConnect } from "@/lib/db/client"
import { requireRole } from "@/lib/auth/dal"
import { EXPENSE_READ_ROLES } from "@/lib/auth/permissions"
import { Expense } from "@/lib/db/models/expense"
import { Vehicle } from "@/lib/db/models/vehicle"
import { Vendor } from "@/lib/db/models/vendor"
import { Make } from "@/lib/db/models/make"
import { VehicleModel } from "@/lib/db/models/model"
import { describeVehicle } from "@/features/vehicles/domain"
import { calculatePaidAndPending, paymentStatus as paymentStatusOfSource } from "@/features/payments/domain"
import { listActivePaymentApplicationsBySource } from "@/features/payments/queries"
import { listActiveOptions } from "@/features/catalogs/queries"
import { listVehicleOptions } from "@/features/vehicles/queries"
import type { CatalogOption } from "@/features/catalogs/types"
import type { VehicleOption } from "@/features/vehicles/types"
import type { Money } from "@/types/money"
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_COMPONENT_KEYS,
  type ExpenseCategory,
  type ExpenseComponentKey,
  type ExpenseComponents,
} from "./enums"
import { expenseTotalOriginal, expenseTotalUsd, summarizeVehicleExpenses } from "./domain"
import type {
  ExpenseDetailDTO,
  ExpenseFilters,
  ExpenseListItemDTO,
  VehicleExpenseCategorySummaryDTO,
  VehicleExpenseSummaryDTO,
} from "./types"

type ExpenseLean = {
  _id: Types.ObjectId
  code: string
  vehicleId: Types.ObjectId | null
  vendorId: Types.ObjectId | null
  category: ExpenseCategory
  expenseDate: Date
  currency: "USD" | "MXN"
  exchangeRate: unknown
  paymentMethod: ExpenseListItemDTO["paymentMethod"]
  referenceNumber: string | null
  evidence: {
    type: ExpenseDetailDTO["evidenceType"]
    label: string | null
    url: string | null
  }
  notes: string | null
  createdBy: Types.ObjectId
  updatedBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
  voidedAt: Date | null
  voidedBy: Types.ObjectId | null
  voidReason: string | null
} & ExpenseComponents

function exchangeRateToString(value: unknown): string {
  return (value as { toString(): string }).toString()
}

function componentsOf(expense: ExpenseLean): ExpenseComponents {
  return Object.fromEntries(
    EXPENSE_COMPONENT_KEYS.map((key) => [key, expense[key] ?? 0]),
  ) as ExpenseComponents
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

function toExpenseListItemDTO(
  expense: ExpenseLean,
  vehicles: Map<string, { code: string; description: string }>,
  vendors: Map<string, string>,
  paymentSummary: Pick<ExpenseListItemDTO, "paymentStatus" | "paidUsd" | "pendingUsd">,
): ExpenseListItemDTO {
  const rate = exchangeRateToString(expense.exchangeRate)
  const vehicle = expense.vehicleId ? vehicles.get(String(expense.vehicleId)) : null
  const components = componentsOf(expense)

  return {
    id: String(expense._id),
    code: expense.code,
    vehicleId: expense.vehicleId ? String(expense.vehicleId) : null,
    vehicleCode: vehicle?.code ?? null,
    vehicleDescription: vehicle?.description ?? null,
    vendorId: expense.vendorId ? String(expense.vendorId) : null,
    vendorName: expense.vendorId ? (vendors.get(String(expense.vendorId)) ?? "—") : null,
    isGeneral: !expense.vehicleId,
    category: expense.category,
    expenseDate: expense.expenseDate.toISOString(),
    currency: expense.currency,
    exchangeRate: rate,
    paymentMethod: expense.paymentMethod,
    totalOriginal: expenseTotalOriginal(components, expense.currency),
    totalUsd: expenseTotalUsd(components, expense.currency, rate),
    paymentStatus: paymentSummary.paymentStatus,
    paidUsd: paymentSummary.paidUsd,
    pendingUsd: paymentSummary.pendingUsd,
    isVoided: Boolean(expense.voidedAt),
  }
}

export async function listExpenses(filters: ExpenseFilters = {}): Promise<ExpenseListItemDTO[] | null> {
  const session = await requireRole(EXPENSE_READ_ROLES)
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
  if (filters.category) query.category = filters.category
  if (filters.currency) query.currency = filters.currency
  if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod
  if (filters.association === "general") query.vehicleId = null
  if (filters.association === "vehicle") query.vehicleId = { $ne: null }
  if (filters.dateFrom || filters.dateTo) {
    const range: Record<string, Date> = {}
    if (filters.dateFrom) range.$gte = filters.dateFrom
    if (filters.dateTo) range.$lte = filters.dateTo
    query.expenseDate = range
  }

  const expenses = (await Expense.find(query)
    .sort({ expenseDate: -1, code: -1 })
    .lean()) as unknown as ExpenseLean[]

  const [vehicles, vendors, paymentApplications] = await Promise.all([
    vehicleDescriptions(expenses.flatMap((expense) => (expense.vehicleId ? [expense.vehicleId] : []))),
    vendorNames(expenses.flatMap((expense) => (expense.vendorId ? [expense.vendorId] : []))),
    listActivePaymentApplicationsBySource(
      expenses.map((expense) => ({ type: "expense" as const, id: String(expense._id) })),
    ),
  ])

  const rows = expenses.map((expense) => {
    const totalUsd = expenseTotalUsd(componentsOf(expense), expense.currency, exchangeRateToString(expense.exchangeRate))
    const applications = paymentApplications.get(`expense:${expense._id}`) ?? []
    const balances = calculatePaidAndPending(
      totalUsd.amount,
      applications.map((application) => ({ appliedUsd: application.appliedUsd })),
    )
    return toExpenseListItemDTO(expense, vehicles, vendors, {
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
  return rows.filter((expense) =>
    [
      expense.code,
      expense.vehicleCode ?? "Gasto general",
      expense.vehicleDescription ?? "",
      expense.vendorName ?? "Sin proveedor",
      EXPENSE_CATEGORY_LABELS[expense.category],
    ]
      .join(" ")
      .toLowerCase()
      .includes(needle),
  )
}

export async function getExpenseByCode(code: string): Promise<ExpenseDetailDTO | null> {
  const session = await requireRole(EXPENSE_READ_ROLES)
  if (!session) return null

  await dbConnect()
  const expense = (await Expense.findOne({ code }).lean()) as unknown as ExpenseLean | null
  if (!expense) return null

  const [vehicles, vendors, paymentApplications] = await Promise.all([
    vehicleDescriptions(expense.vehicleId ? [expense.vehicleId] : []),
    vendorNames(expense.vendorId ? [expense.vendorId] : []),
    listActivePaymentApplicationsBySource([{ type: "expense", id: String(expense._id) }]),
  ])

  const totalUsd = expenseTotalUsd(componentsOf(expense), expense.currency, exchangeRateToString(expense.exchangeRate))
  const applications = paymentApplications.get(`expense:${expense._id}`) ?? []
  const balances = calculatePaidAndPending(
    totalUsd.amount,
    applications.map((application) => ({ appliedUsd: application.appliedUsd })),
  )
  const listItem = toExpenseListItemDTO(expense, vehicles, vendors, {
    paymentStatus: paymentStatusOfSource(
      totalUsd.amount,
      applications.map((application) => ({ appliedUsd: application.appliedUsd })),
    ),
    paidUsd: balances.paidUsd,
    pendingUsd: balances.pendingUsd,
  })
  const components = componentsOf(expense)
  const componentMoney = Object.fromEntries(
    EXPENSE_COMPONENT_KEYS.map((key) => [
      key,
      { amount: components[key], currency: expense.currency } satisfies Money,
    ]),
  ) as Record<ExpenseComponentKey, Money>

  const userIds = [expense.createdBy, ...(expense.voidedBy ? [expense.voidedBy] : [])]
  const userNames = await userNamesById(userIds)

  return {
    ...listItem,
    components: componentMoney,
    referenceNumber: expense.referenceNumber,
    evidenceType: expense.evidence?.type ?? null,
    evidenceLabel: expense.evidence?.label ?? null,
    evidenceUrl: expense.evidence?.url ?? null,
    notes: expense.notes,
    createdBy: String(expense.createdBy),
    createdByName: userNames.get(String(expense.createdBy)) ?? null,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
    voidedAt: expense.voidedAt ? expense.voidedAt.toISOString() : null,
    voidedBy: expense.voidedBy ? String(expense.voidedBy) : null,
    voidedByName: expense.voidedBy ? (userNames.get(String(expense.voidedBy)) ?? null) : null,
    voidReason: expense.voidReason,
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
        appliedAmount: { amount: application.appliedAmount, currency: expense.currency },
        appliedUsd: { amount: application.appliedUsd, currency: "USD" },
      })),
    },
  }
}

export async function getExpenseFormOptions(): Promise<{
  vehicles: VehicleOption[]
  vendors: CatalogOption[]
}> {
  const session = await requireRole(EXPENSE_READ_ROLES)
  if (!session) return { vehicles: [], vendors: [] }

  const [vehicles, vendors] = await Promise.all([
    listVehicleOptions(),
    listActiveOptions("vendors"),
  ])

  return { vehicles, vendors }
}

export async function getVehicleExpenseSummary(vehicleId: string): Promise<VehicleExpenseSummaryDTO | null> {
  const session = await requireRole(EXPENSE_READ_ROLES)
  if (!session) return null
  if (!Types.ObjectId.isValid(vehicleId)) return null

  await dbConnect()
  const expenses = (await Expense.find({ vehicleId: new Types.ObjectId(vehicleId) })
    .sort({ expenseDate: -1, code: -1 })
    .lean()) as unknown as ExpenseLean[]

  const [vehicles, vendors, paymentApplications] = await Promise.all([
    vehicleDescriptions(expenses.flatMap((expense) => (expense.vehicleId ? [expense.vehicleId] : []))),
    vendorNames(expenses.flatMap((expense) => (expense.vendorId ? [expense.vendorId] : []))),
    listActivePaymentApplicationsBySource(
      expenses.map((expense) => ({ type: "expense" as const, id: String(expense._id) })),
    ),
  ])

  const rows = expenses.map((expense) => {
    const totalUsd = expenseTotalUsd(componentsOf(expense), expense.currency, exchangeRateToString(expense.exchangeRate))
    const applications = paymentApplications.get(`expense:${expense._id}`) ?? []
    const balances = calculatePaidAndPending(
      totalUsd.amount,
      applications.map((application) => ({ appliedUsd: application.appliedUsd })),
    )
    return toExpenseListItemDTO(expense, vehicles, vendors, {
      paymentStatus: paymentStatusOfSource(
        totalUsd.amount,
        applications.map((application) => ({ appliedUsd: application.appliedUsd })),
      ),
      paidUsd: balances.paidUsd,
      pendingUsd: balances.pendingUsd,
    })
  })
  const accumulation = summarizeVehicleExpenses(
    expenses.map((expense) => ({
      category: expense.category,
      currency: expense.currency,
      exchangeRate: exchangeRateToString(expense.exchangeRate),
      components: componentsOf(expense),
      voidedAt: expense.voidedAt,
    })),
  )
  const paidUsdAmount = expenses
    .filter((expense) => !expense.voidedAt)
    .reduce((total, expense) => {
      const applications = paymentApplications.get(`expense:${expense._id}`) ?? []
      return total + applications.reduce((subtotal, application) => subtotal + application.appliedUsd, 0)
    }, 0)

  const categorySummary: VehicleExpenseCategorySummaryDTO[] = accumulation.categories
    .map((entry) => ({
      category: entry.category,
      label: EXPENSE_CATEGORY_LABELS[entry.category],
      count: entry.count,
      activeTotalUsd: entry.totalUsd,
    }))
    .sort((a, b) => b.activeTotalUsd.amount - a.activeTotalUsd.amount || a.label.localeCompare(b.label))

  return {
    activeTotalUsd: accumulation.totalUsd,
    activePaidUsd: { amount: paidUsdAmount, currency: "USD" },
    activePendingUsd: { amount: Math.max(0, accumulation.totalUsd.amount - paidUsdAmount), currency: "USD" },
    activeCount: rows.filter((expense) => !expense.isVoided).length,
    rows,
    categorySummary,
  }
}
