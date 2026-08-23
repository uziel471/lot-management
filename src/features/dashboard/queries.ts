import "server-only"
import { Types } from "mongoose"
import { dbConnect } from "@/lib/db/client"
import { requireRole } from "@/lib/auth/dal"
import { DASHBOARD_READ_ROLES } from "@/lib/auth/permissions"
import { Expense } from "@/lib/db/models/expense"
import { Make } from "@/lib/db/models/make"
import { VehicleModel } from "@/lib/db/models/model"
import { Sale } from "@/lib/db/models/sale"
import { Vehicle } from "@/lib/db/models/vehicle"
import { expenseTotalUsd } from "@/features/expenses/domain"
import { getVehicleExpensePreviews } from "@/features/expenses/queries"
import { accumulateAcquisitionCost } from "@/features/purchases/domain"
import { getVehicleAcquisitionCostPreviews } from "@/features/purchases/queries"
import { accumulateActiveRepairCost } from "@/features/repairs/domain"
import { getVehicleRepairPreviews } from "@/features/repairs/queries"
import { describeVehicle, daysInInventory } from "@/features/vehicles/domain"
import {
  averageMoneyAmount,
  averageNumber,
  buildTimeSeriesBuckets,
  elevatedCostPct,
  grossMarginPct,
  inventoryAgingDistribution,
  isElevatedCost,
  isLowMarginSale,
  resolveDashboardPeriod,
  unavailable,
} from "./domain"
import type {
  DashboardPeriodInput,
  DashboardTimeSeriesPointDTO,
  ExecutiveDashboardAgedVehicleActionDTO,
  ExecutiveDashboardDTO,
  ExecutiveDashboardElevatedCostActionDTO,
  ExecutiveDashboardInventoryVehicleDTO,
  ExecutiveDashboardLowMarginSaleActionDTO,
} from "./types"

type SaleLean = {
  _id: Types.ObjectId
  code: string
  vehicleId: Types.ObjectId
  saleDate: Date
  salePriceUsd: number
  totalCostUsd: number
  profitUsd: number
  voidedAt: Date | null
}

type VehicleLean = {
  _id: Types.ObjectId
  code: string
  year: number
  makeId: Types.ObjectId
  modelId: Types.ObjectId
  dateReceived: Date
  voidedAt: Date | null
}

type ExpenseLean = {
  vehicleId: Types.ObjectId | null
  expenseDate: Date
  currency: "USD" | "MXN"
  exchangeRate: { toString(): string }
  amount: number
  tax: number
  fees: number
  discount: number
  adjustment: number
  voidedAt: Date | null
}

function toMoney(amount: number) {
  return { amount, currency: "USD" as const }
}

async function vehicleDetailsById(ids: readonly Types.ObjectId[]) {
  if (ids.length === 0) return new Map<string, { code: string; description: string }>()
  const vehicles = (await Vehicle.find({ _id: { $in: ids } })
    .select({ code: 1, year: 1, makeId: 1, modelId: 1 })
    .lean()) as unknown as {
    _id: Types.ObjectId
    code: string
    year: number
    makeId: Types.ObjectId
    modelId: Types.ObjectId
  }[]

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

function bucketSaleSeries(
  sales: readonly SaleLean[],
  grouping: ExecutiveDashboardDTO["period"]["grouping"],
  start: Date,
  end: Date,
) {
  const buckets = buildTimeSeriesBuckets(start, end, grouping)
  const index = new Map(buckets.map((bucket, position) => [bucket.key, position]))

  function bucketKey(date: Date) {
    if (grouping === "day") return date.toISOString().slice(0, 10)
    if (grouping === "month") return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString().slice(0, 10)
    const day = date.getUTCDay()
    const offset = day === 0 ? -6 : 1 - day
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + offset))
      .toISOString()
      .slice(0, 10)
  }

  for (const sale of sales) {
    const idx = index.get(bucketKey(sale.saleDate))
    if (idx === undefined) continue
    const current = buckets[idx] as DashboardTimeSeriesPointDTO
    current.revenueUsd = toMoney(current.revenueUsd.amount + sale.salePriceUsd)
    current.grossProfitUsd = toMoney(current.grossProfitUsd.amount + sale.profitUsd)
    current.vehiclesSold += 1
  }

  return buckets
}

export async function getExecutiveDashboard(
  input: DashboardPeriodInput = {},
): Promise<ExecutiveDashboardDTO | null> {
  const session = await requireRole(DASHBOARD_READ_ROLES)
  if (!session) return null

  await dbConnect()

  const period = resolveDashboardPeriod(input)
  const today = new Date()

  const [sales, allCurrentVehicles, periodGeneralExpenses, activeSales] = await Promise.all([
    Sale.find({
      voidedAt: null,
      saleDate: { $gte: period.start, $lte: period.end },
    })
      .select({ code: 1, vehicleId: 1, saleDate: 1, salePriceUsd: 1, totalCostUsd: 1, profitUsd: 1, voidedAt: 1 })
      .sort({ saleDate: 1, code: 1 })
      .lean() as unknown as Promise<SaleLean[]>,
    Vehicle.find({ voidedAt: null })
      .select({ code: 1, year: 1, makeId: 1, modelId: 1, dateReceived: 1, voidedAt: 1 })
      .sort({ dateReceived: 1, code: 1 })
      .lean() as unknown as Promise<VehicleLean[]>,
    Expense.find({
      voidedAt: null,
      vehicleId: null,
      expenseDate: { $gte: period.start, $lte: period.end },
    })
      .select({ vehicleId: 1, expenseDate: 1, currency: 1, exchangeRate: 1, amount: 1, tax: 1, fees: 1, discount: 1, adjustment: 1, voidedAt: 1 })
      .lean() as unknown as Promise<ExpenseLean[]>,
    Sale.find({ voidedAt: null }).select({ vehicleId: 1 }).lean() as unknown as Promise<{ vehicleId: Types.ObjectId }[]>,
  ])

  const soldVehicleIds = new Set(activeSales.map((sale) => String(sale.vehicleId)))
  const currentVehicles = allCurrentVehicles.filter((vehicle) => !soldVehicleIds.has(String(vehicle._id)))
  const currentVehicleIds = currentVehicles.map((vehicle) => String(vehicle._id))

  const [vehicleDescriptions, acquisitionPreviews, repairPreviews, expensePreviews] = await Promise.all([
    vehicleDetailsById(currentVehicles.map((vehicle) => vehicle._id).concat(sales.map((sale) => sale.vehicleId))),
    getVehicleAcquisitionCostPreviews(currentVehicleIds),
    getVehicleRepairPreviews(currentVehicleIds),
    getVehicleExpensePreviews(currentVehicleIds),
  ])

  const inventoryVehicles: ExecutiveDashboardInventoryVehicleDTO[] = currentVehicles.map((vehicle) => {
    const acquisition = acquisitionPreviews.get(String(vehicle._id))?.totalUsd.amount ?? 0
    const repair = repairPreviews.get(String(vehicle._id))?.activeTotalUsd.amount ?? 0
    const expense = expensePreviews.get(String(vehicle._id))?.activeTotalUsd.amount ?? 0
    const currentCost = acquisition + repair + expense
    const description = vehicleDescriptions.get(String(vehicle._id))

    return {
      vehicleId: String(vehicle._id),
      vehicleCode: description?.code ?? vehicle.code,
      vehicleDescription: description?.description ?? vehicle.code,
      vehicleHref: `/vehiculos/${vehicle.code}`,
      daysInInventory: daysInInventory(vehicle.dateReceived, today),
      currentCostUsd: toMoney(currentCost),
    }
  })

  const salesRevenueAmount = sales.reduce((sum, sale) => sum + sale.salePriceUsd, 0)
  const soldVehicleCostAmount = sales.reduce((sum, sale) => sum + sale.totalCostUsd, 0)
  const grossProfitAmount = sales.reduce((sum, sale) => sum + sale.profitUsd, 0)
  const averageSalePriceAmount = averageMoneyAmount(salesRevenueAmount, sales.length)
  const inventoryValueAmount = inventoryVehicles.reduce((sum, vehicle) => sum + vehicle.currentCostUsd.amount, 0)
  const averageInventoryCostAmount = averageMoneyAmount(inventoryValueAmount, inventoryVehicles.length)
  const inventoryDays = inventoryVehicles.map((vehicle) => vehicle.daysInInventory)
  const averageInventoryDays = averageNumber(inventoryDays)
  const generalExpensesAmount = periodGeneralExpenses.reduce((sum, expense) => {
    return (
      sum +
      expenseTotalUsd(
        {
          amount: expense.amount,
          tax: expense.tax,
          fees: expense.fees,
          discount: expense.discount,
          adjustment: expense.adjustment,
        },
        expense.currency,
        expense.exchangeRate.toString(),
      ).amount
    )
  }, 0)

  const agedVehicles: ExecutiveDashboardAgedVehicleActionDTO[] = inventoryVehicles
    .filter((vehicle) => vehicle.daysInInventory > 60)
    .map((vehicle) => ({
      ...vehicle,
      severity: vehicle.daysInInventory > 90 ? "destructive" : "warning",
      reason:
        vehicle.daysInInventory > 90
          ? "Más de 90 días en inventario."
          : "Más de 60 días en inventario.",
    }))

  const elevatedCostVehicles: ExecutiveDashboardElevatedCostActionDTO[] =
    averageInventoryCostAmount === null
      ? []
      : inventoryVehicles
          .filter((vehicle) => isElevatedCost(vehicle.currentCostUsd.amount, averageInventoryCostAmount))
          .map((vehicle) => ({
            ...vehicle,
            costVsAveragePct: elevatedCostPct(vehicle.currentCostUsd.amount, averageInventoryCostAmount),
            reason: "Costo actual por encima del 125% del costo promedio del inventario vigente.",
          }))

  const saleVehicleDescriptions = await vehicleDetailsById(sales.map((sale) => sale.vehicleId))
  const lowMarginSales: ExecutiveDashboardLowMarginSaleActionDTO[] = sales
    .filter((sale) => isLowMarginSale(sale.profitUsd, sale.salePriceUsd))
    .map((sale) => {
      const vehicle = saleVehicleDescriptions.get(String(sale.vehicleId))
      const margin = grossMarginPct(sale.profitUsd, sale.salePriceUsd)
      return {
        saleId: String(sale._id),
        saleCode: sale.code,
        saleHref: `/ventas/${sale.code}`,
        vehicleCode: vehicle?.code ?? "—",
        vehicleDescription: vehicle?.description ?? "—",
        saleDate: sale.saleDate.toISOString(),
        salePriceUsd: toMoney(sale.salePriceUsd),
        totalCostUsd: toMoney(sale.totalCostUsd),
        grossProfitUsd: toMoney(sale.profitUsd),
        grossMarginPct: margin,
        reason: sale.profitUsd < 0 ? "Venta con pérdida." : "Margen bruto por debajo del 10%.",
      }
    })

  const over30Count = inventoryVehicles.filter((vehicle) => vehicle.daysInInventory > 30).length
  const over60Count = inventoryVehicles.filter((vehicle) => vehicle.daysInInventory > 60).length
  const over90Count = inventoryVehicles.filter((vehicle) => vehicle.daysInInventory > 90).length

  return {
    period,
    kpis: {
      currentInventoryCount: inventoryVehicles.length,
      currentInventoryValueUsd: toMoney(inventoryValueAmount),
      vehiclesSold: sales.length,
      salesRevenueUsd: toMoney(salesRevenueAmount),
      soldVehicleCostUsd: toMoney(soldVehicleCostAmount),
      grossProfitUsd: toMoney(grossProfitAmount),
      averageGrossMarginPct: grossMarginPct(grossProfitAmount, salesRevenueAmount),
      averageGrossMarginNote:
        salesRevenueAmount > 0 ? null : unavailable("No hay ventas activas en el periodo seleccionado."),
      averageSalePriceUsd: averageSalePriceAmount === null ? null : toMoney(averageSalePriceAmount),
      averageSalePriceNote:
        sales.length > 0 ? null : unavailable("No hay ventas activas para calcular un precio promedio."),
      averageDaysInInventory: averageInventoryDays,
      averageDaysInInventoryNote:
        inventoryVehicles.length > 0 ? null : unavailable("No hay inventario vigente para calcular días promedio."),
      generalExpensesUsd: toMoney(generalExpensesAmount),
    },
    inventory: {
      totalAvailable: inventoryVehicles.length,
      currentInventoryValueUsd: toMoney(inventoryValueAmount),
      averageInventoryCostUsd: averageInventoryCostAmount === null ? null : toMoney(averageInventoryCostAmount),
      averageInventoryCostNote:
        inventoryVehicles.length > 0 ? null : unavailable("No hay inventario vigente para calcular un costo promedio."),
      averageDaysInInventory: averageInventoryDays,
      averageDaysInInventoryNote:
        inventoryVehicles.length > 0 ? null : unavailable("No hay inventario vigente para calcular días promedio."),
      over30Count,
      over60Count,
      over90Count,
      agingBuckets: inventoryAgingDistribution(inventoryDays),
    },
    charts: {
      sales: bucketSaleSeries(sales, period.grouping, period.start, period.end),
      inventoryAging: inventoryAgingDistribution(inventoryDays),
    },
    actionItems: {
      agedVehicles,
      elevatedCostVehicles,
      lowMarginSales,
    },
  }
}
