import { EXPENSE_CATEGORY_LABELS } from "@/features/expenses/enums"
import { expenseTotalUsd } from "@/features/expenses/domain"
import { money } from "../domain"
import { applyExpenseFilters, buildAvailabilityNotesForMissingData, reportBase } from "./common"
import type { ReportId, ReportResolvedFilters, ReportResult } from "../types"
import type { ReportDataset } from "./common"

export function buildExpenseReport(
  reportId: Extract<
    ReportId,
    "general-expenses" | "vehicle-expenses" | "expenses-by-category" | "expenses-by-provider" | "deduction-preparation"
  >,
  dataset: ReportDataset,
  filters: ReportResolvedFilters,
): ReportResult {
  if (reportId === "expenses-by-category") {
    const expenses = applyExpenseFilters(dataset, filters, "all")
    const grouped = new Map<string, { count: number; totalUsd: number }>()
    for (const expense of expenses) {
      const key = expense.category ?? "missing"
      const totalUsd = expenseTotalUsd(
        { amount: expense.amount, tax: expense.tax, fees: expense.fees, discount: expense.discount, adjustment: expense.adjustment },
        expense.currency,
        expense.exchangeRate.toString(),
      ).amount
      const current = grouped.get(key) ?? { count: 0, totalUsd: 0 }
      current.count += 1
      current.totalUsd += totalUsd
      grouped.set(key, current)
    }
    const rows = Array.from(grouped.entries()).map(([category, summary]) => ({
      id: category,
      values: {
        category: EXPENSE_CATEGORY_LABELS[category as keyof typeof EXPENSE_CATEGORY_LABELS] ?? "Sin categoria",
        sourceCount: summary.count,
        totalUsd: money(summary.totalUsd),
      },
      actions: [],
    }))
    return reportBase(
      reportId,
      filters,
      rows,
      [
        { key: "category", label: "Categoria", kind: "text" },
        { key: "sourceCount", label: "Registros", kind: "number", align: "right" },
        { key: "totalUsd", label: "USD", kind: "money", align: "right" },
      ],
      [{ key: "categories", label: "Categorias", kind: "number", value: rows.length }],
      ["Agrupa gasto total por categoria sin duplicar costos capitalizados."],
      buildAvailabilityNotesForMissingData(rows.map((row) => ({ category: String(row.values.category) }))),
    )
  }

  if (reportId === "expenses-by-provider") {
    const expenses = applyExpenseFilters(dataset, filters, "all")
    const grouped = new Map<string, { providerName: string; count: number; totalUsd: number }>()
    for (const expense of expenses) {
      const key = expense.vendorId ? String(expense.vendorId) : "missing"
      const totalUsd = expenseTotalUsd(
        { amount: expense.amount, tax: expense.tax, fees: expense.fees, discount: expense.discount, adjustment: expense.adjustment },
        expense.currency,
        expense.exchangeRate.toString(),
      ).amount
      const current = grouped.get(key) ?? {
        providerName: expense.vendorId ? (dataset.vendorNames.get(String(expense.vendorId)) ?? "Sin proveedor") : "Sin proveedor",
        count: 0,
        totalUsd: 0,
      }
      current.count += 1
      current.totalUsd += totalUsd
      grouped.set(key, current)
    }
    const rows = Array.from(grouped.entries()).map(([providerId, summary]) => ({
      id: providerId,
      values: {
        providerName: summary.providerName,
        sourceCount: summary.count,
        totalUsd: money(summary.totalUsd),
      },
      actions: [],
    }))
    return reportBase(
      reportId,
      filters,
      rows,
      [
        { key: "providerName", label: "Proveedor", kind: "text" },
        { key: "sourceCount", label: "Registros", kind: "number", align: "right" },
        { key: "totalUsd", label: "USD", kind: "money", align: "right" },
      ],
      [{ key: "providers", label: "Proveedores", kind: "number", value: rows.length }],
      ["Agrupa gasto total por proveedor capturado."],
      buildAvailabilityNotesForMissingData(rows.map((row) => ({ providerName: String(row.values.providerName) }))),
    )
  }

  const association = reportId === "general-expenses" ? "general" : reportId === "vehicle-expenses" ? "vehicle" : "all"
  const expenses = applyExpenseFilters(dataset, filters, association)
  const rows = expenses.map((expense) => {
    const vehicle = expense.vehicleId ? dataset.vehicleById.get(String(expense.vehicleId)) : null
    const totalUsd = expenseTotalUsd(
      { amount: expense.amount, tax: expense.tax, fees: expense.fees, discount: expense.discount, adjustment: expense.adjustment },
      expense.currency,
      expense.exchangeRate.toString(),
    ).amount
    return {
      id: String(expense._id),
      values: {
        code: expense.code,
        expenseDate: expense.expenseDate.toISOString(),
        category: EXPENSE_CATEGORY_LABELS[expense.category],
        providerName: expense.vendorId ? (dataset.vendorNames.get(String(expense.vendorId)) ?? "Sin proveedor") : "Sin proveedor",
        vehicleCode: vehicle?.code ?? null,
        totalUsd: money(totalUsd),
        status: expense.voidedAt ? "Anulado" : "Activo",
      },
      actions: [{ label: "Gasto", href: `/gastos/${expense.code}` }, ...(vehicle ? [{ label: "Vehiculo", href: `/vehiculos/${vehicle.code}` }] : [])],
    }
  })
  return reportBase(
    reportId,
    filters,
    rows,
    [
      { key: "code", label: "Gasto", kind: "text" },
      { key: "expenseDate", label: "Fecha", kind: "date" },
      { key: "category", label: "Categoria", kind: "text" },
      { key: "providerName", label: "Proveedor", kind: "text" },
      { key: "vehicleCode", label: "Vehiculo", kind: "text" },
      { key: "totalUsd", label: "USD", kind: "money", align: "right" },
      { key: "status", label: "Estatus", kind: "text" },
    ],
    [
      { key: "count", label: "Registros", kind: "number", value: rows.length },
      { key: "total", label: "Total USD", kind: "money", value: money(rows.reduce((sum, row) => sum + ((row.values.totalUsd as ReturnType<typeof money>)?.amount ?? 0), 0)) },
    ],
    [
      reportId === "deduction-preparation"
        ? "La deducibilidad no se infiere; se usa solo la categoria capturada y se separa costo capitalizado."
        : "Los gastos asociados a vehiculo se muestran separados de los gastos generales para evitar doble conteo.",
    ],
    buildAvailabilityNotesForMissingData(rows.map((row) => ({ providerName: String(row.values.providerName), category: String(row.values.category) }))),
  )
}
