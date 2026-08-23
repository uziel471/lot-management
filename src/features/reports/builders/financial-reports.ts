import { COMMON_COLUMNS, applyPaymentFilters, applySalesFilters, buildCurrentInventoryCost, reportBase, saleVehicleActions } from "./common"
import { divideAsPercent, money } from "../domain"
import { roiOf } from "@/features/sales/domain"
import { paymentTotalUsd } from "@/features/payments/domain"
import { expenseTotalUsd } from "@/features/expenses/domain"
import type { ReportId, ReportResolvedFilters, ReportResult } from "../types"
import type { ReportDataset } from "./common"

export function buildFinancialReport(
  reportId: Extract<
    ReportId,
    "profit-loss" | "sales-profitability" | "gross-margin-by-vehicle" | "inventory-value" | "cost-breakdown-by-vehicle" | "cash-activity"
  >,
  dataset: ReportDataset,
  filters: ReportResolvedFilters,
): ReportResult {
  if (reportId === "profit-loss") {
    const sales = applySalesFilters(dataset, filters).filter((sale) => !sale.voidedAt)
    const generalExpenses = dataset.expenses.filter((expense) => {
      if (expense.vehicleId) return false
      if (expense.voidedAt) return false
      if (filters.start && expense.expenseDate < filters.start) return false
      if (filters.end && expense.expenseDate > filters.end) return false
      return true
    })
    const revenue = sales.reduce((sum, sale) => sum + sale.salePriceUsd, 0)
    const soldCost = sales.reduce((sum, sale) => sum + sale.totalCostUsd, 0)
    const profit = sales.reduce((sum, sale) => sum + sale.profitUsd, 0)
    const expenseTotal = generalExpenses.reduce((sum, expense) => {
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
    const net = profit - expenseTotal
    return reportBase(
      reportId,
      filters,
      [
        {
          id: "pnl",
          values: {
            revenueUsd: money(revenue),
            soldCostUsd: money(soldCost),
            grossProfitUsd: money(profit),
            generalExpenseUsd: money(expenseTotal),
            netOperatingUsd: money(net),
            unitsSold: sales.length,
            averageSaleUsd: sales.length ? money(Math.round(revenue / sales.length)) : null,
            grossMarginPct: divideAsPercent(profit, revenue),
          },
          actions: [],
        },
      ],
      [
        { key: "revenueUsd", label: "Ingresos", kind: "money", align: "right" },
        { key: "soldCostUsd", label: "Costo vendido", kind: "money", align: "right" },
        { key: "grossProfitUsd", label: "Gross profit", kind: "money", align: "right" },
        { key: "generalExpenseUsd", label: "Gastos generales", kind: "money", align: "right" },
        { key: "netOperatingUsd", label: "Resultado operativo", kind: "money", align: "right" },
        { key: "unitsSold", label: "Unidades", kind: "number", align: "right" },
        { key: "averageSaleUsd", label: "Promedio venta", kind: "money", align: "right" },
        { key: "grossMarginPct", label: "Margen bruto", kind: "percent", align: "right" },
      ],
      [
        { key: "revenue", label: "Ventas", kind: "money", value: money(revenue) },
        { key: "profit", label: "Gross profit", kind: "money", value: money(profit) },
        { key: "net", label: "Resultado operativo", kind: "money", value: money(net) },
      ],
      [
        "Gross profit = precio de venta - costo total congelado en la venta.",
        "Resultado operativo = gross profit - gastos generales del periodo.",
      ],
    )
  }

  if (reportId === "sales-profitability" || reportId === "gross-margin-by-vehicle") {
    const sales = applySalesFilters(dataset, filters)
    const rows = sales.map((sale) => {
      const vehicle = dataset.vehicleById.get(String(sale.vehicleId))
      return {
        id: String(sale._id),
        values: {
          code: sale.code,
          saleDate: sale.saleDate.toISOString(),
          vehicleCode: vehicle?.code ?? "—",
          vehicleDescription: vehicle?.description ?? "—",
          buyerName: sale.buyerName,
          salePriceUsd: money(sale.salePriceUsd),
          acquisitionCostUsd: money(sale.acquisitionCostUsd),
          repairCostUsd: money(sale.repairCostUsd),
          vehicleExpenseCostUsd: money(sale.vehicleExpenseCostUsd),
          totalCostUsd: money(sale.totalCostUsd),
          grossProfitUsd: money(sale.profitUsd),
          grossMarginPct: divideAsPercent(sale.profitUsd, sale.salePriceUsd),
          roiPct: roiOf(sale.profitUsd, sale.totalCostUsd),
          status: sale.voidedAt ? "Anulada" : "Activa",
        },
        actions: saleVehicleActions(sale, dataset),
      }
    })
    return reportBase(
      reportId,
      filters,
      rows,
      [
        { key: "code", label: "Venta", kind: "text" },
        { key: "saleDate", label: "Fecha", kind: "date" },
        { key: "vehicleCode", label: "Vehiculo", kind: "text" },
        { key: "buyerName", label: "Comprador", kind: "text" },
        { key: "salePriceUsd", label: "Precio", kind: "money", align: "right" },
        { key: "acquisitionCostUsd", label: "Compra", kind: "money", align: "right" },
        { key: "repairCostUsd", label: "Reparacion", kind: "money", align: "right" },
        { key: "vehicleExpenseCostUsd", label: "Gasto vehiculo", kind: "money", align: "right" },
        { key: "totalCostUsd", label: "Costo total", kind: "money", align: "right" },
        { key: "grossProfitUsd", label: "Profit", kind: "money", align: "right" },
        { key: "grossMarginPct", label: "Margen", kind: "percent", align: "right" },
        { key: "roiPct", label: "ROI", kind: "percent", align: "right" },
        { key: "status", label: "Estatus", kind: "text" },
      ],
      [
        {
          key: "revenue",
          label: "Ventas activas",
          kind: "money",
          value: money(rows.filter((row) => row.values.status === "Activa").reduce((sum, row) => sum + ((row.values.salePriceUsd as ReturnType<typeof money>)?.amount ?? 0), 0)),
        },
        {
          key: "profit",
          label: "Profit activo",
          kind: "money",
          value: money(rows.filter((row) => row.values.status === "Activa").reduce((sum, row) => sum + ((row.values.grossProfitUsd as ReturnType<typeof money>)?.amount ?? 0), 0)),
        },
      ],
      [
        "Profit = snapshot de venta congelado al momento de registrar la venta.",
        "ROI = profit / costo total congelado.",
      ],
    )
  }

  if (reportId === "inventory-value" || reportId === "cost-breakdown-by-vehicle") {
    const vehicles = dataset.activeVehicles.filter((vehicle) => {
      if (filters.vehicleId && vehicle.id !== filters.vehicleId) return false
      if (filters.vehicleStatusId && vehicle.statusId !== filters.vehicleStatusId) return false
      if (filters.search) {
        const haystack = [vehicle.code, vehicle.description, vehicle.vin ?? "", vehicle.stockNumber ?? ""].join(" ").toLowerCase()
        if (!haystack.includes(filters.search.toLowerCase())) return false
      }
      return true
    })
    const rows = vehicles.map((vehicle) => {
      const cost = buildCurrentInventoryCost(dataset, vehicle.id)
      return {
        id: vehicle.id,
        values: {
          code: vehicle.code,
          description: vehicle.description,
          status: vehicle.statusName,
          daysInInventory: vehicle.daysInInventory,
          acquisitionUsd: money(cost.acquisition),
          repairUsd: money(cost.repair),
          vehicleExpenseUsd: money(cost.expense),
          totalCostUsd: money(cost.total),
          askingPriceUsd: vehicle.askingPriceUsd === null ? null : money(vehicle.askingPriceUsd),
        },
        actions: [{ label: "Vehiculo", href: `/vehiculos/${vehicle.code}` }],
      }
    })
    return reportBase(
      reportId,
      filters,
      rows,
      [
        { key: "code", label: "Vehiculo", kind: "text" },
        { key: "description", label: "Descripcion", kind: "text" },
        { key: "status", label: "Estatus", kind: "text" },
        { key: "daysInInventory", label: "Dias", kind: "number", align: "right" },
        { key: "acquisitionUsd", label: "Compra", kind: "money", align: "right" },
        { key: "repairUsd", label: "Reparacion", kind: "money", align: "right" },
        { key: "vehicleExpenseUsd", label: "Gasto vehiculo", kind: "money", align: "right" },
        { key: "totalCostUsd", label: "Costo actual", kind: "money", align: "right" },
        { key: "askingPriceUsd", label: "Precio lista", kind: "money", align: "right" },
      ],
      [
        {
          key: "total",
          label: "Valor inventario",
          kind: "money",
          value: money(rows.reduce((sum, row) => sum + ((row.values.totalCostUsd as ReturnType<typeof money>)?.amount ?? 0), 0)),
        },
        { key: "units", label: "Unidades", kind: "number", value: rows.length },
      ],
      [
        "Costo actual = compras activas + reparaciones activas + gastos asociados activos.",
      ],
    )
  }

  const payments = applyPaymentFilters(dataset, filters)
  const paymentRows = payments.map((payment) => ({
    id: String(payment._id),
    values: {
      code: payment.code,
      paymentDate: payment.paymentDate.toISOString(),
      providerName: payment.providerId ? (dataset.vendorNames.get(String(payment.providerId)) ?? "Sin proveedor") : "Sin proveedor",
      method: payment.method,
      originalAmount: money(payment.amount),
      usdAmount: paymentTotalUsd(payment.amount, payment.currency, payment.exchangeRate.toString()),
      status: payment.voidedAt ? "Anulado" : "Activo",
      applicationCount: payment.applications.length,
    },
    actions: [{ label: "Pago", href: `/pagos/${payment.code}` }],
  }))
  const outgoing = paymentRows.filter((row) => row.values.status === "Activo").reduce((sum, row) => sum + ((row.values.usdAmount as ReturnType<typeof money>)?.amount ?? 0), 0)
  const incoming = applySalesFilters(dataset, filters)
    .filter((sale) => !sale.voidedAt)
    .reduce((sum, sale) => sum + sale.salePriceUsd, 0)
  return reportBase(
    reportId,
    filters,
    paymentRows,
    [
      { key: "code", label: "Pago", kind: "text" },
      { key: "paymentDate", label: "Fecha", kind: "date" },
      { key: "providerName", label: "Proveedor", kind: "text" },
      { key: "method", label: "Metodo", kind: "text" },
      { key: "originalAmount", label: "Importe original", kind: "money", align: "right" },
      { key: "usdAmount", label: "USD", kind: "money", align: "right" },
      { key: "applicationCount", label: "Aplicaciones", kind: "number", align: "right" },
      { key: "status", label: "Estatus", kind: "text" },
    ],
    [
      { key: "salesIn", label: "Ventas activas", kind: "money", value: money(incoming) },
      { key: "paymentsOut", label: "Pagos activos", kind: "money", value: money(outgoing) },
      { key: "net", label: "Flujo neto", kind: "money", value: money(incoming - outgoing) },
    ],
    ["Flujo neto = ventas activas del periodo - pagos activos del periodo."],
  )
}
