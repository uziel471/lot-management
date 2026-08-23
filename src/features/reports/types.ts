import type { Money } from "@/types/money"
import type { Role } from "@/types/role"

export const REPORT_IDS = [
  "profit-loss",
  "sales-profitability",
  "gross-margin-by-vehicle",
  "inventory-value",
  "cost-breakdown-by-vehicle",
  "cash-activity",
  "current-inventory",
  "inventory-aging",
  "vehicles-by-status",
  "vehicles-without-title",
  "inventory-without-list-price",
  "missing-identifiers",
  "accounts-payable",
  "payment-history",
  "unpaid-obligations",
  "partially-paid-obligations",
  "paid-obligations",
  "provider-balances",
  "payment-applications",
  "general-expenses",
  "vehicle-expenses",
  "expenses-by-category",
  "expenses-by-provider",
  "deduction-preparation",
  "sales-register",
  "sales-tax-preparation",
  "vendor-payments",
  "administrative-exceptions",
] as const

export type ReportId = (typeof REPORT_IDS)[number]

export const REPORT_CATEGORY_VALUES = [
  "financial",
  "inventory",
  "sales",
  "payablesPayments",
  "expenses",
  "operations",
  "taxPreparation",
  "audit",
] as const

export type ReportCategory = (typeof REPORT_CATEGORY_VALUES)[number]

export const REPORT_AVAILABILITY_VALUES = ["available", "partial", "unavailable"] as const
export type ReportAvailability = (typeof REPORT_AVAILABILITY_VALUES)[number]

export const REPORT_EXPORT_FORMATS = ["csv", "pdf"] as const
export type ReportExportFormat = (typeof REPORT_EXPORT_FORMATS)[number]

export const REPORT_PERIOD_PRESETS = [
  "thisMonth",
  "lastMonth",
  "yearToDate",
  "last12Months",
  "allTime",
  "custom",
] as const

export type ReportPeriodPreset = (typeof REPORT_PERIOD_PRESETS)[number]

export const REPORT_DATE_BASIS_VALUES = [
  "saleDate",
  "paymentDate",
  "expenseDate",
  "purchaseDate",
  "repairOpenedAt",
  "dateReceived",
  "currentState",
] as const

export type ReportDateBasis = (typeof REPORT_DATE_BASIS_VALUES)[number]

export const REPORT_FILTER_KEYS = [
  "preset",
  "startDate",
  "endDate",
  "vehicleId",
  "vehicleStatusId",
  "providerId",
  "buyer",
  "paymentMethod",
  "category",
  "reportStatus",
  "includeVoided",
  "search",
  "missingField",
] as const

export type ReportFilterKey = (typeof REPORT_FILTER_KEYS)[number]

export type ReportFilterValue = {
  preset?: ReportPeriodPreset
  startDate?: string
  endDate?: string
  vehicleId?: string
  vehicleStatusId?: string
  providerId?: string
  buyer?: string
  paymentMethod?: string
  category?: string
  reportStatus?: string
  includeVoided?: boolean
  search?: string
  missingField?: string
}

export type ReportResolvedFilters = ReportFilterValue & {
  preset: ReportPeriodPreset
  includeVoided: boolean
  start: Date | null
  end: Date | null
}

export type ReportAvailabilityNote = {
  code:
    | "uncapturedSalesTax"
    | "uncapturedJurisdiction"
    | "uncapturedExemptionStatus"
    | "uncapturedFilingTreatment"
    | "uncapturedDueDate"
    | "missingProvider"
    | "missingCategory"
    | "missingBuyer"
    | "currentStateOnly"
    | "exportLimit"
  reason: string
}

export type ReportSummaryDescriptor = {
  key: string
  label: string
  kind: "money" | "number" | "percent" | "text"
  value: Money | number | string | null
  note?: ReportAvailabilityNote | null
}

export type ReportColumnDescriptor = {
  key: string
  label: string
  kind: "text" | "money" | "number" | "percent" | "date" | "boolean"
  align?: "left" | "right" | "center"
}

export type ReportRowActionDescriptor = {
  label: string
  href: string
}

export type ReportRowValue = Money | number | string | boolean | null

export type ReportRowDescriptor = {
  id: string
  values: Record<string, ReportRowValue>
  actions: ReportRowActionDescriptor[]
}

export type ReportExportDescriptor = {
  format: ReportExportFormat
  label: string
  maxRows: number
}

export type ReportDefinition = {
  id: ReportId
  category: ReportCategory
  title: string
  description: string
  dateBasis: ReportDateBasis
  supportedFilters: readonly ReportFilterKey[]
  supportedExports: readonly ReportExportFormat[]
  roles: readonly Role[]
  availability: ReportAvailability
  availabilityNotes: readonly ReportAvailabilityNote[]
}

export type ReportCatalogItem = ReportDefinition & {
  exportDescriptors: ReportExportDescriptor[]
  lastGeneratedAt: string | null
}

export type ReportMetadata = ReportCatalogItem & {
  generatedAt: string
}

export type ReportResult = {
  metadata: ReportMetadata
  selectedFilters: ReportResolvedFilters
  summaries: ReportSummaryDescriptor[]
  columns: ReportColumnDescriptor[]
  rows: ReportRowDescriptor[]
  formulas: string[]
  availabilityNotes: ReportAvailabilityNote[]
}

export type ReportExportPayload = {
  fileName: string
  contentType: string
  body: string | Uint8Array
}

export type ReportFilterOption = {
  value: string
  label: string
}

export type ReportFilterOptions = {
  vehicles: ReportFilterOption[]
  statuses: ReportFilterOption[]
  providers: ReportFilterOption[]
  paymentMethods: ReportFilterOption[]
  categories: ReportFilterOption[]
  missingFields: ReportFilterOption[]
}
