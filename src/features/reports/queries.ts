import "server-only"
import { unauthorized } from "next/navigation"
import { requireRole } from "@/lib/auth/dal"
import { VehicleStatus } from "@/lib/db/models/vehicle-status"
import { listActiveOptions } from "@/features/catalogs/queries"
import { listVehicleOptions } from "@/features/vehicles/queries"
import { PAYMENT_METHOD_OPTIONS } from "@/features/payments/enums"
import { EXPENSE_CATEGORY_OPTIONS } from "@/features/expenses/enums"
import { styledPdfFromReport, toCsv, truncateReportRows, REPORT_EXPORT_LIMITS, REPORT_EXPORT_ROLES, REPORT_READ_ROLES, resolveReportFilters } from "./domain"
import { buildAdminReport } from "./builders/admin-reports"
import { buildExpenseReport } from "./builders/expense-reports"
import { buildFinancialReport } from "./builders/financial-reports"
import { buildInventoryReport } from "./builders/inventory-reports"
import { buildPayablesReport } from "./builders/payables-reports"
import { loadReportDataset } from "./builders/common"
import { getReportDefinition, listReportCatalogItems } from "./registry"
import type {
  ReportExportFormat,
  ReportExportPayload,
  ReportFilterOptions,
  ReportFilterValue,
  ReportId,
  ReportResult,
} from "./types"

const MISSING_FIELD_OPTIONS = [
  { value: "vin", label: "VIN" },
  { value: "stockNumber", label: "Numero de inventario" },
  { value: "titleNumber", label: "Numero de titulo" },
  { value: "askingPrice", label: "Precio de lista" },
] as const

export async function listReportCatalog() {
  const session = await requireRole(REPORT_READ_ROLES)
  if (!session) return null
  return listReportCatalogItems()
}

export async function getReportFilterOptions(): Promise<ReportFilterOptions> {
  const session = await requireRole(REPORT_READ_ROLES)
  if (!session) {
    return {
      vehicles: [],
      statuses: [],
      providers: [],
      paymentMethods: [],
      categories: [],
      missingFields: MISSING_FIELD_OPTIONS.map((option) => ({ ...option })),
    }
  }

  const [vehicles, providers, statuses] = await Promise.all([
    listVehicleOptions(),
    listActiveOptions("vendors"),
    VehicleStatus.find({ isActive: true }).select({ name: 1 }).sort({ sortOrder: 1, name: 1 }).lean() as unknown as Promise<
      { _id: { toString(): string }; name: string }[]
    >,
  ])

  return {
    vehicles: vehicles.map((vehicle) => ({ value: vehicle.id, label: `${vehicle.code} · ${vehicle.description}` })),
    statuses: statuses.map((status) => ({ value: status._id.toString(), label: status.name })),
    providers: providers.map((provider) => ({ value: provider.id, label: provider.name })),
    paymentMethods: PAYMENT_METHOD_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
    categories: EXPENSE_CATEGORY_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
    missingFields: MISSING_FIELD_OPTIONS.map((option) => ({ ...option })),
  }
}

export async function getReportResult(
  reportId: ReportId,
  rawFilters: ReportFilterValue,
): Promise<{ result: ReportResult; error: string | null } | null> {
  const session = await requireRole(REPORT_READ_ROLES)
  if (!session) return null

  const definition = getReportDefinition(reportId)
  if (!definition) return null

  const { filters, error } = resolveReportFilters(rawFilters, definition.supportedFilters)
  const dataset = await loadReportDataset(filters)

  let result: ReportResult
  if (
    reportId === "profit-loss" ||
    reportId === "sales-profitability" ||
    reportId === "gross-margin-by-vehicle" ||
    reportId === "inventory-value" ||
    reportId === "cost-breakdown-by-vehicle" ||
    reportId === "cash-activity"
  ) {
    result = buildFinancialReport(reportId, dataset, filters)
  } else if (
    reportId === "current-inventory" ||
    reportId === "inventory-aging" ||
    reportId === "vehicles-by-status" ||
    reportId === "vehicles-without-title" ||
    reportId === "inventory-without-list-price" ||
    reportId === "missing-identifiers"
  ) {
    result = buildInventoryReport(reportId, dataset, filters)
  } else if (
    reportId === "accounts-payable" ||
    reportId === "payment-history" ||
    reportId === "unpaid-obligations" ||
    reportId === "partially-paid-obligations" ||
    reportId === "paid-obligations" ||
    reportId === "provider-balances" ||
    reportId === "payment-applications"
  ) {
    result = buildPayablesReport(reportId, dataset, filters)
  } else if (
    reportId === "general-expenses" ||
    reportId === "vehicle-expenses" ||
    reportId === "expenses-by-category" ||
    reportId === "expenses-by-provider" ||
    reportId === "deduction-preparation"
  ) {
    result = buildExpenseReport(reportId, dataset, filters)
  } else {
    result = buildAdminReport(reportId, dataset, filters)
  }

  return { result, error }
}

export async function getReportExport(
  reportId: ReportId,
  rawFilters: ReportFilterValue,
  format: ReportExportFormat,
): Promise<ReportExportPayload | null> {
  const session = await requireRole(REPORT_EXPORT_ROLES)
  if (!session) return null

  const report = await getReportResult(reportId, rawFilters)
  if (!report) return null
  const limit = REPORT_EXPORT_LIMITS[format]
  const result = truncateReportRows(report.result, limit)
  const safeName = `${reportId}-${new Date().toISOString().slice(0, 10)}`

  if (format === "csv") {
    return {
      fileName: `${safeName}.csv`,
      contentType: "text/csv; charset=utf-8",
      body: toCsv(result, limit),
    }
  }

  return {
    fileName: `${safeName}.pdf`,
    contentType: "application/pdf",
    body: styledPdfFromReport(result),
  }
}

export async function requireReportPageAccess() {
  const session = await requireRole(REPORT_READ_ROLES)
  if (!session) unauthorized()
  return session
}
