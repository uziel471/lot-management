import { Types } from "mongoose"
import { dbConnect } from "@/lib/db/client"
import { Expense } from "@/lib/db/models/expense"
import { Make } from "@/lib/db/models/make"
import { Payment } from "@/lib/db/models/payment"
import { Purchase } from "@/lib/db/models/purchase"
import { Repair } from "@/lib/db/models/repair"
import { Sale } from "@/lib/db/models/sale"
import { VehicleStatus } from "@/lib/db/models/vehicle-status"
import { Vehicle } from "@/lib/db/models/vehicle"
import { Vendor } from "@/lib/db/models/vendor"
import { VehicleModel } from "@/lib/db/models/model"
import { EXPENSE_CATEGORY_LABELS, type ExpenseCategory, type ExpenseComponents } from "@/features/expenses/enums"
import { expenseTotalUsd } from "@/features/expenses/domain"
import { PAYMENT_SOURCE_TYPE_LABELS, PAYMENT_STATUS_LABELS } from "@/features/payments/enums"
import { calculatePaidAndPending, paymentStatus as paymentStatusOfSource, paymentTotalUsd } from "@/features/payments/domain"
import { COST_COMPONENT_LABELS, type CostComponents } from "@/features/purchases/enums"
import { accumulateAcquisitionCost } from "@/features/purchases/domain"
import { REPAIR_CATEGORY_LABELS, REPAIR_STATUS_LABELS, type RepairCostComponents, type RepairStatus } from "@/features/repairs/enums"
import { accumulateActiveRepairCost, isActiveRepairStatus, repairTotalUsd } from "@/features/repairs/domain"
import { roiOf } from "@/features/sales/domain"
import { daysInInventory, describeVehicle } from "@/features/vehicles/domain"
import { money, availabilityNote, divideAsPercent } from "../domain"
import { getReportDefinition } from "../registry"
import type {
  ReportAvailabilityNote,
  ReportColumnDescriptor,
  ReportId,
  ReportResolvedFilters,
  ReportResult,
  ReportRowActionDescriptor,
  ReportRowDescriptor,
  ReportSummaryDescriptor,
} from "../types"

type LookupVehicle = {
  _id: Types.ObjectId
  code: string
  year: number
  makeId: Types.ObjectId
  modelId: Types.ObjectId
  statusId: Types.ObjectId
  vin: string | null
  stockNumber: string | null
  titleNumber: string | null
  titleInHand: boolean
  dateReceived: Date
  askingPrice: number | null
  voidedAt: Date | null
}

type LookupSale = {
  _id: Types.ObjectId
  code: string
  vehicleId: Types.ObjectId
  saleDate: Date
  buyerName: string
  salePriceUsd: number
  acquisitionCostUsd: number
  repairCostUsd: number
  vehicleExpenseCostUsd: number
  totalCostUsd: number
  profitUsd: number
  voidedAt: Date | null
  referenceNumber: string | null
}

type LookupPurchase = {
  _id: Types.ObjectId
  code: string
  vehicleId: Types.ObjectId
  vendorId: Types.ObjectId | null
  purchaseDate: Date
  currency: "USD" | "MXN"
  exchangeRate: { toString(): string }
  sourceType: string
  voidedAt: Date | null
  referenceNumber: string | null
} & CostComponents

type LookupRepair = {
  _id: Types.ObjectId
  code: string
  vehicleId: Types.ObjectId
  vendorId: Types.ObjectId | null
  category: string
  status: RepairStatus
  openedAt: Date
  currency: "USD" | "MXN"
  exchangeRate: { toString(): string }
  description: string
  voidedAt: Date | null
} & RepairCostComponents

type LookupExpense = {
  _id: Types.ObjectId
  code: string
  vehicleId: Types.ObjectId | null
  vendorId: Types.ObjectId | null
  category: ExpenseCategory
  expenseDate: Date
  currency: "USD" | "MXN"
  exchangeRate: { toString(): string }
  paymentMethod: string | null
  voidedAt: Date | null
} & ExpenseComponents

type LookupPayment = {
  _id: Types.ObjectId
  code: string
  paymentDate: Date
  providerId: Types.ObjectId | null
  currency: "USD" | "MXN"
  exchangeRate: { toString(): string }
  amount: number
  method: string
  applications: {
    sourceType: "purchase" | "repair" | "expense"
    sourceId: Types.ObjectId
    sourceCode: string
    appliedAmount: number
    appliedUsd: number
  }[]
  voidedAt: Date | null
}

type VehicleProjection = {
  id: string
  code: string
  description: string
  statusId: string
  statusName: string
  vin: string | null
  stockNumber: string | null
  titleNumber: string | null
  titleInHand: boolean
  dateReceived: string
  askingPriceUsd: number | null
  daysInInventory: number
  isVoided: boolean
}

type PayableDocument = {
  id: string
  type: "purchase" | "repair" | "expense"
  code: string
  date: Date
  vehicleId: string | null
  vehicleCode: string | null
  vehicleDescription: string | null
  providerId: string | null
  providerName: string | null
  originalUsd: number
  paidUsd: number
  pendingUsd: number
  status: "unpaid" | "partial" | "paid"
  sourceLabel: string
  href: string
}

export type ReportDataset = {
  generatedAt: string
  vehicles: VehicleProjection[]
  activeVehicles: VehicleProjection[]
  sales: LookupSale[]
  activeSales: LookupSale[]
  purchases: LookupPurchase[]
  repairs: LookupRepair[]
  expenses: LookupExpense[]
  payments: LookupPayment[]
  vendorNames: Map<string, string>
  vehicleById: Map<string, VehicleProjection>
  saleByVehicleId: Map<string, LookupSale>
  acquisitionByVehicleId: Map<string, { totalUsd: number; components: Record<string, number> }>
  repairByVehicleId: Map<string, { totalUsd: number; activeTotalUsd: number }>
  expenseByVehicleId: Map<string, { totalUsd: number; activeTotalUsd: number }>
  payables: PayableDocument[]
}

function hrefForSource(type: PayableDocument["type"], code: string) {
  if (type === "purchase") return `/compras/${code}`
  if (type === "repair") return `/reparaciones/${code}`
  return `/gastos/${code}`
}

function paymentSourceHref(type: LookupPayment["applications"][number]["sourceType"], code: string) {
  if (type === "purchase") return `/compras/${code}`
  if (type === "repair") return `/reparaciones/${code}`
  return `/gastos/${code}`
}

function vehicleHref(code: string) {
  return `/vehiculos/${code}`
}

function saleHref(code: string) {
  return `/ventas/${code}`
}

function paymentHref(code: string) {
  return `/pagos/${code}`
}

function purchaseComponents(purchase: LookupPurchase): CostComponents {
  return {
    purchasePrice: purchase.purchasePrice,
    auctionFees: purchase.auctionFees,
    acquisitionTransportCost: purchase.acquisitionTransportCost,
    titleDocFees: purchase.titleDocFees,
    purchaseTax: purchase.purchaseTax,
    importDuties: purchase.importDuties,
    customsBrokerFees: purchase.customsBrokerFees,
    otherAcquisitionCosts: purchase.otherAcquisitionCosts,
  }
}

function repairComponents(repair: LookupRepair): RepairCostComponents {
  return {
    laborCost: repair.laborCost,
    partsCost: repair.partsCost,
    taxCost: repair.taxCost,
    outsideServiceCost: repair.outsideServiceCost,
    otherCost: repair.otherCost,
  }
}

function expenseComponents(expense: LookupExpense): ExpenseComponents {
  return {
    amount: expense.amount,
    tax: expense.tax,
    fees: expense.fees,
    discount: expense.discount,
    adjustment: expense.adjustment,
  }
}

async function buildVehicleLookup(vehicles: LookupVehicle[], today: Date) {
  const [makeDocs, modelDocs, statusDocs] = await Promise.all([
    Make.find({ _id: { $in: vehicles.map((item) => item.makeId) } }).select({ name: 1 }).lean() as unknown as Promise<
      { _id: Types.ObjectId; name: string }[]
    >,
    VehicleModel.find({ _id: { $in: vehicles.map((item) => item.modelId) } }).select({ name: 1 }).lean() as unknown as Promise<
      { _id: Types.ObjectId; name: string }[]
    >,
    VehicleStatus.find({ _id: { $in: vehicles.map((item) => item.statusId) } }).select({ name: 1 }).lean() as unknown as Promise<
      { _id: Types.ObjectId; name: string }[]
    >,
  ])
  const makeNames = new Map(makeDocs.map((doc) => [String(doc._id), doc.name]))
  const modelNames = new Map(modelDocs.map((doc) => [String(doc._id), doc.name]))
  const statusNames = new Map(statusDocs.map((doc) => [String(doc._id), doc.name]))

  return vehicles.map((vehicle) => ({
    id: String(vehicle._id),
    code: vehicle.code,
    description: describeVehicle({
      year: vehicle.year,
      makeName: makeNames.get(String(vehicle.makeId)) ?? "—",
      modelName: modelNames.get(String(vehicle.modelId)) ?? "—",
    }),
    statusId: String(vehicle.statusId),
    statusName: statusNames.get(String(vehicle.statusId)) ?? "—",
    vin: vehicle.vin,
    stockNumber: vehicle.stockNumber,
    titleNumber: vehicle.titleNumber,
    titleInHand: vehicle.titleInHand,
    dateReceived: vehicle.dateReceived.toISOString(),
    askingPriceUsd: vehicle.askingPrice,
    daysInInventory: daysInInventory(vehicle.dateReceived, today),
    isVoided: Boolean(vehicle.voidedAt),
  }))
}

export async function loadReportDataset(filters: ReportResolvedFilters): Promise<ReportDataset> {
  await dbConnect()
  const today = new Date()
  const [vehicleDocs, sales, purchases, repairs, expenses, payments, vendors] = await Promise.all([
    Vehicle.find({})
      .select({
        code: 1,
        year: 1,
        makeId: 1,
        modelId: 1,
        statusId: 1,
        vin: 1,
        stockNumber: 1,
        titleNumber: 1,
        titleInHand: 1,
        dateReceived: 1,
        askingPrice: 1,
        voidedAt: 1,
      })
      .lean() as unknown as Promise<LookupVehicle[]>,
    Sale.find({})
      .select({
        code: 1,
        vehicleId: 1,
        saleDate: 1,
        buyerName: 1,
        salePriceUsd: 1,
        acquisitionCostUsd: 1,
        repairCostUsd: 1,
        vehicleExpenseCostUsd: 1,
        totalCostUsd: 1,
        profitUsd: 1,
        voidedAt: 1,
        referenceNumber: 1,
      })
      .sort({ saleDate: -1, code: -1 })
      .lean() as unknown as Promise<LookupSale[]>,
    Purchase.find({})
      .lean() as unknown as Promise<LookupPurchase[]>,
    Repair.find({})
      .lean() as unknown as Promise<LookupRepair[]>,
    Expense.find({})
      .lean() as unknown as Promise<LookupExpense[]>,
    Payment.find({})
      .select({
        code: 1,
        paymentDate: 1,
        providerId: 1,
        currency: 1,
        exchangeRate: 1,
        amount: 1,
        method: 1,
        applications: 1,
        voidedAt: 1,
      })
      .lean() as unknown as Promise<LookupPayment[]>,
    Vendor.find({}).select({ name: 1 }).lean() as unknown as Promise<{ _id: Types.ObjectId; name: string }[]>,
  ])

  const vehicles = await buildVehicleLookup(vehicleDocs, today)
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]))
  const vendorNames = new Map(vendors.map((vendor) => [String(vendor._id), vendor.name]))
  const activeSales = sales.filter((sale) => !sale.voidedAt)
  const soldVehicleIds = new Set(activeSales.map((sale) => String(sale.vehicleId)))
  const activeVehicles = vehicles.filter((vehicle) => !vehicle.isVoided && !soldVehicleIds.has(vehicle.id))
  const saleByVehicleId = new Map(activeSales.map((sale) => [String(sale.vehicleId), sale]))

  const acquisitionByVehicleId = new Map<string, { totalUsd: number; components: Record<string, number> }>()
  for (const purchase of purchases) {
    const vehicleId = String(purchase.vehicleId)
    const current = acquisitionByVehicleId.get(vehicleId)
    const accumulation = accumulateAcquisitionCost([...(current ? [] : []), { currency: purchase.currency, exchangeRate: purchase.exchangeRate.toString(), components: purchaseComponents(purchase), voidedAt: purchase.voidedAt }])
    const next = current ?? { totalUsd: 0, components: Object.fromEntries(Object.keys(COST_COMPONENT_LABELS).map((key) => [key, 0])) }
    if (!purchase.voidedAt) {
      next.totalUsd += accumulation.total.amount
      for (const [key, value] of Object.entries(accumulation.components)) {
        next.components[key] = (next.components[key] ?? 0) + value.amount
      }
    }
    acquisitionByVehicleId.set(vehicleId, next)
  }

  const repairByVehicleId = new Map<string, { totalUsd: number; activeTotalUsd: number }>()
  for (const repair of repairs) {
    const vehicleId = String(repair.vehicleId)
    const totalUsd = repairTotalUsd(repairComponents(repair), repair.currency, repair.exchangeRate.toString()).amount
    const current = repairByVehicleId.get(vehicleId) ?? { totalUsd: 0, activeTotalUsd: 0 }
    if (!repair.voidedAt) {
      current.totalUsd += totalUsd
      if (isActiveRepairStatus(repair.status)) current.activeTotalUsd += totalUsd
    }
    repairByVehicleId.set(vehicleId, current)
  }

  const expenseByVehicleId = new Map<string, { totalUsd: number; activeTotalUsd: number }>()
  for (const expense of expenses) {
    if (!expense.vehicleId) continue
    const vehicleId = String(expense.vehicleId)
    const totalUsd = expenseTotalUsd(expenseComponents(expense), expense.currency, expense.exchangeRate.toString()).amount
    const current = expenseByVehicleId.get(vehicleId) ?? { totalUsd: 0, activeTotalUsd: 0 }
    if (!expense.voidedAt) {
      current.totalUsd += totalUsd
      current.activeTotalUsd += totalUsd
    }
    expenseByVehicleId.set(vehicleId, current)
  }

  const paymentApplicationsBySource = new Map<string, { appliedUsd: number; paymentCode: string; paymentDate: string; paymentId: string; isVoided: boolean; sourceCode: string; sourceType: "purchase" | "repair" | "expense" }[]>()
  for (const payment of payments) {
    for (const application of payment.applications) {
      const key = `${application.sourceType}:${application.sourceId}`
      const current = paymentApplicationsBySource.get(key) ?? []
      current.push({
        appliedUsd: application.appliedUsd,
        paymentCode: payment.code,
        paymentDate: payment.paymentDate.toISOString(),
        paymentId: String(payment._id),
        isVoided: Boolean(payment.voidedAt),
        sourceCode: application.sourceCode,
        sourceType: application.sourceType,
      })
      paymentApplicationsBySource.set(key, current)
    }
  }

  const payables: PayableDocument[] = [
    ...purchases.filter((item) => filters.includeVoided || !item.voidedAt).map((purchase) => {
      const originalUsd = accumulateAcquisitionCost([
        {
          currency: purchase.currency,
          exchangeRate: purchase.exchangeRate.toString(),
          components: purchaseComponents(purchase),
          voidedAt: purchase.voidedAt,
        },
      ]).total.amount
      const applications = paymentApplicationsBySource.get(`purchase:${purchase._id}`) ?? []
      const balances = calculatePaidAndPending(
        originalUsd,
        applications.map((application) => ({ appliedUsd: application.appliedUsd, isVoided: application.isVoided })),
      )
      const vehicle = vehicleById.get(String(purchase.vehicleId)) ?? null
      return {
        id: String(purchase._id),
        type: "purchase" as const,
        code: purchase.code,
        date: purchase.purchaseDate,
        vehicleId: vehicle?.id ?? null,
        vehicleCode: vehicle?.code ?? null,
        vehicleDescription: vehicle?.description ?? null,
        providerId: purchase.vendorId ? String(purchase.vendorId) : null,
        providerName: purchase.vendorId ? (vendorNames.get(String(purchase.vendorId)) ?? null) : null,
        originalUsd,
        paidUsd: balances.paidUsd.amount,
        pendingUsd: balances.pendingUsd.amount,
        status: paymentStatusOfSource(
          originalUsd,
          applications.map((application) => ({ appliedUsd: application.appliedUsd, isVoided: application.isVoided })),
        ),
        sourceLabel: "Compra",
        href: hrefForSource("purchase", purchase.code),
      }
    }),
    ...repairs.filter((item) => filters.includeVoided || !item.voidedAt).map((repair) => {
      const originalUsd = repairTotalUsd(repairComponents(repair), repair.currency, repair.exchangeRate.toString()).amount
      const applications = paymentApplicationsBySource.get(`repair:${repair._id}`) ?? []
      const balances = calculatePaidAndPending(
        originalUsd,
        applications.map((application) => ({ appliedUsd: application.appliedUsd, isVoided: application.isVoided })),
      )
      const vehicle = vehicleById.get(String(repair.vehicleId)) ?? null
      return {
        id: String(repair._id),
        type: "repair" as const,
        code: repair.code,
        date: repair.openedAt,
        vehicleId: vehicle?.id ?? null,
        vehicleCode: vehicle?.code ?? null,
        vehicleDescription: vehicle?.description ?? null,
        providerId: repair.vendorId ? String(repair.vendorId) : null,
        providerName: repair.vendorId ? (vendorNames.get(String(repair.vendorId)) ?? null) : null,
        originalUsd,
        paidUsd: balances.paidUsd.amount,
        pendingUsd: balances.pendingUsd.amount,
        status: paymentStatusOfSource(
          originalUsd,
          applications.map((application) => ({ appliedUsd: application.appliedUsd, isVoided: application.isVoided })),
        ),
        sourceLabel: `Reparacion · ${REPAIR_CATEGORY_LABELS[repair.category as keyof typeof REPAIR_CATEGORY_LABELS] ?? repair.category}`,
        href: hrefForSource("repair", repair.code),
      }
    }),
    ...expenses.filter((item) => filters.includeVoided || !item.voidedAt).map((expense) => {
      const originalUsd = expenseTotalUsd(expenseComponents(expense), expense.currency, expense.exchangeRate.toString()).amount
      const applications = paymentApplicationsBySource.get(`expense:${expense._id}`) ?? []
      const balances = calculatePaidAndPending(
        originalUsd,
        applications.map((application) => ({ appliedUsd: application.appliedUsd, isVoided: application.isVoided })),
      )
      const vehicle = expense.vehicleId ? vehicleById.get(String(expense.vehicleId)) ?? null : null
      return {
        id: String(expense._id),
        type: "expense" as const,
        code: expense.code,
        date: expense.expenseDate,
        vehicleId: vehicle?.id ?? null,
        vehicleCode: vehicle?.code ?? null,
        vehicleDescription: vehicle?.description ?? null,
        providerId: expense.vendorId ? String(expense.vendorId) : null,
        providerName: expense.vendorId ? (vendorNames.get(String(expense.vendorId)) ?? null) : null,
        originalUsd,
        paidUsd: balances.paidUsd.amount,
        pendingUsd: balances.pendingUsd.amount,
        status: paymentStatusOfSource(
          originalUsd,
          applications.map((application) => ({ appliedUsd: application.appliedUsd, isVoided: application.isVoided })),
        ),
        sourceLabel: `Gasto · ${EXPENSE_CATEGORY_LABELS[expense.category]}`,
        href: hrefForSource("expense", expense.code),
      }
    }),
  ]

  return {
    generatedAt: new Date().toISOString(),
    vehicles,
    activeVehicles,
    sales,
    activeSales,
    purchases,
    repairs,
    expenses,
    payments,
    vendorNames,
    vehicleById,
    saleByVehicleId,
    acquisitionByVehicleId,
    repairByVehicleId,
    expenseByVehicleId,
    payables,
  }
}

export function applyVehicleFilters(dataset: ReportDataset, filters: ReportResolvedFilters) {
  return dataset.activeVehicles.filter((vehicle) => {
    if (filters.vehicleId && vehicle.id !== filters.vehicleId) return false
    if (filters.vehicleStatusId && vehicle.statusId !== filters.vehicleStatusId) return false
    if (filters.search) {
      const needle = filters.search.toLowerCase()
      const haystack = [vehicle.code, vehicle.description, vehicle.vin ?? "", vehicle.stockNumber ?? ""].join(" ").toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    return true
  })
}

export function applySalesFilters(dataset: ReportDataset, filters: ReportResolvedFilters) {
  return dataset.sales.filter((sale) => {
    if (!filters.includeVoided && sale.voidedAt) return false
    if (filters.start && sale.saleDate < filters.start) return false
    if (filters.end && sale.saleDate > filters.end) return false
    if (filters.vehicleId && String(sale.vehicleId) !== filters.vehicleId) return false
    if (filters.buyer && !sale.buyerName.toLowerCase().includes(filters.buyer.toLowerCase())) return false
    if (filters.search) {
      const vehicle = dataset.vehicleById.get(String(sale.vehicleId))
      const haystack = [sale.code, sale.buyerName, vehicle?.code ?? "", vehicle?.description ?? "", sale.referenceNumber ?? ""]
        .join(" ")
        .toLowerCase()
      if (!haystack.includes(filters.search.toLowerCase())) return false
    }
    return true
  })
}

export function applyExpenseFilters(dataset: ReportDataset, filters: ReportResolvedFilters, association: "general" | "vehicle" | "all") {
  return dataset.expenses.filter((expense) => {
    if (!filters.includeVoided && expense.voidedAt) return false
    if (filters.start && expense.expenseDate < filters.start) return false
    if (filters.end && expense.expenseDate > filters.end) return false
    if (association === "general" && expense.vehicleId) return false
    if (association === "vehicle" && !expense.vehicleId) return false
    if (filters.vehicleId && String(expense.vehicleId) !== filters.vehicleId) return false
    if (filters.providerId && String(expense.vendorId) !== filters.providerId) return false
    if (filters.category && expense.category !== filters.category) return false
    if (filters.search) {
      const vehicle = expense.vehicleId ? dataset.vehicleById.get(String(expense.vehicleId)) : null
      const haystack = [expense.code, EXPENSE_CATEGORY_LABELS[expense.category], vehicle?.code ?? "", vehicle?.description ?? ""].join(" ").toLowerCase()
      if (!haystack.includes(filters.search.toLowerCase())) return false
    }
    return true
  })
}

export function applyPaymentFilters(dataset: ReportDataset, filters: ReportResolvedFilters) {
  return dataset.payments.filter((payment) => {
    if (!filters.includeVoided && payment.voidedAt) return false
    if (filters.start && payment.paymentDate < filters.start) return false
    if (filters.end && payment.paymentDate > filters.end) return false
    if (filters.providerId && String(payment.providerId) !== filters.providerId) return false
    if (filters.paymentMethod && payment.method !== filters.paymentMethod) return false
    if (filters.search) {
      const providerName = payment.providerId ? dataset.vendorNames.get(String(payment.providerId)) ?? "" : ""
      const haystack = [payment.code, payment.method, providerName].join(" ").toLowerCase()
      if (!haystack.includes(filters.search.toLowerCase())) return false
    }
    return true
  })
}

export function applyPayableFilters(dataset: ReportDataset, filters: ReportResolvedFilters) {
  return dataset.payables.filter((payable) => {
    if (filters.start && payable.date < filters.start) return false
    if (filters.end && payable.date > filters.end) return false
    if (filters.providerId && payable.providerId !== filters.providerId) return false
    if (filters.reportStatus && payable.status !== filters.reportStatus) return false
    if (filters.search) {
      const haystack = [payable.code, payable.providerName ?? "", payable.vehicleCode ?? "", payable.vehicleDescription ?? ""].join(" ").toLowerCase()
      if (!haystack.includes(filters.search.toLowerCase())) return false
    }
    return true
  })
}

export function reportBase(
  reportId: ReportId,
  filters: ReportResolvedFilters,
  rows: ReportRowDescriptor[],
  columns: ReportColumnDescriptor[],
  summaries: ReportSummaryDescriptor[],
  formulas: string[],
  availabilityNotes: ReportAvailabilityNote[] = [],
): ReportResult {
  const definition = getReportDefinition(reportId)
  if (!definition) {
    throw new Error(`Unknown report: ${reportId}`)
  }
  return {
    metadata: {
      ...definition,
      exportDescriptors: definition.supportedExports.map((format) => ({
        format,
        label: format.toUpperCase(),
        maxRows: format === "csv" ? 5_000 : 500,
      })),
      generatedAt: new Date().toISOString(),
      lastGeneratedAt: new Date().toISOString(),
    },
    selectedFilters: filters,
    summaries,
    columns,
    rows,
    formulas,
    availabilityNotes: [...definition.availabilityNotes, ...availabilityNotes],
  }
}

export function rowAction(label: string, href: string): ReportRowActionDescriptor {
  return { label, href }
}

export function sourceActions(type: "sale" | "vehicle" | "payment" | "purchase" | "repair" | "expense", code: string) {
  if (type === "sale") return [rowAction("Venta", saleHref(code))]
  if (type === "vehicle") return [rowAction("Vehiculo", vehicleHref(code))]
  if (type === "payment") return [rowAction("Pago", paymentHref(code))]
  return [rowAction("Abrir", hrefForSource(type, code))]
}

export function saleVehicleActions(sale: LookupSale, dataset: ReportDataset) {
  const vehicle = dataset.vehicleById.get(String(sale.vehicleId))
  const actions: ReportRowActionDescriptor[] = [rowAction("Venta", saleHref(sale.code))]
  if (vehicle) actions.push(rowAction("Vehiculo", vehicleHref(vehicle.code)))
  return actions
}

export function payableActions(payable: PayableDocument) {
  const actions = [rowAction(payable.sourceLabel, payable.href)]
  if (payable.vehicleCode) actions.push(rowAction("Vehiculo", vehicleHref(payable.vehicleCode)))
  return actions
}

export function paymentApplicationActions(
  application: LookupPayment["applications"][number],
  payment: LookupPayment,
) {
  return [rowAction("Pago", paymentHref(payment.code)), rowAction("Origen", paymentSourceHref(application.sourceType, application.sourceCode))]
}

export function buildCurrentInventoryCost(dataset: ReportDataset, vehicleId: string) {
  const acquisition = dataset.acquisitionByVehicleId.get(vehicleId)?.totalUsd ?? 0
  const repair = dataset.repairByVehicleId.get(vehicleId)?.activeTotalUsd ?? 0
  const expense = dataset.expenseByVehicleId.get(vehicleId)?.activeTotalUsd ?? 0
  return {
    acquisition,
    repair,
    expense,
    total: acquisition + repair + expense,
  }
}

export function buildAvailabilityNotesForMissingData(rows: { providerName?: string | null; category?: string | null }[]) {
  const notes: ReportAvailabilityNote[] = []
  if (rows.some((row) => !row.providerName)) {
    notes.push(availabilityNote("missingProvider", "Algunos registros no tienen proveedor capturado."))
  }
  if (rows.some((row) => !row.category)) {
    notes.push(availabilityNote("missingCategory", "Algunos registros no tienen categoria valida capturada."))
  }
  return notes
}

export const COMMON_COLUMNS = {
  code: { key: "code", label: "Codigo", kind: "text" as const },
  vehicleCode: { key: "vehicleCode", label: "Vehiculo", kind: "text" as const },
  providerName: { key: "providerName", label: "Proveedor", kind: "text" as const },
  amountUsd: { key: "amountUsd", label: "USD", kind: "money" as const, align: "right" as const },
  pendingUsd: { key: "pendingUsd", label: "Saldo pendiente", kind: "money" as const, align: "right" as const },
  paidUsd: { key: "paidUsd", label: "Pagado", kind: "money" as const, align: "right" as const },
  date: { key: "date", label: "Fecha", kind: "date" as const },
  status: { key: "status", label: "Estatus", kind: "text" as const },
}
