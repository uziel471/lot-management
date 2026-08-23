import type { Money } from "@/types/money"

export const DASHBOARD_PERIOD_PRESETS = [
  "thisMonth",
  "lastMonth",
  "yearToDate",
  "last12Months",
  "custom",
] as const

export type DashboardPeriodPreset = (typeof DASHBOARD_PERIOD_PRESETS)[number]

export const DASHBOARD_CHART_GROUPINGS = ["day", "week", "month"] as const

export type DashboardChartGrouping = (typeof DASHBOARD_CHART_GROUPINGS)[number]

export type DashboardPeriodInput = {
  preset?: string | null
  startDate?: string | null
  endDate?: string | null
}

export type DashboardUnavailableNoteDTO = {
  reason: string
}

export type ExecutiveDashboardPeriodDTO = {
  preset: DashboardPeriodPreset
  label: string
  startDate: string
  endDate: string
  grouping: DashboardChartGrouping
  rangeDays: number
  isCustom: boolean
}

export type ExecutiveDashboardKpisDTO = {
  currentInventoryCount: number
  currentInventoryValueUsd: Money
  vehiclesSold: number
  salesRevenueUsd: Money
  soldVehicleCostUsd: Money
  grossProfitUsd: Money
  averageGrossMarginPct: number | null
  averageGrossMarginNote: DashboardUnavailableNoteDTO | null
  averageSalePriceUsd: Money | null
  averageSalePriceNote: DashboardUnavailableNoteDTO | null
  averageDaysInInventory: number | null
  averageDaysInInventoryNote: DashboardUnavailableNoteDTO | null
  generalExpensesUsd: Money
}

export type DashboardTimeSeriesPointDTO = {
  key: string
  label: string
  bucketStart: string
  bucketEnd: string
  revenueUsd: Money
  grossProfitUsd: Money
  vehiclesSold: number
}

export type DashboardBarPointDTO = {
  key: string
  label: string
  value: number
}

export type ExecutiveDashboardInventoryVehicleDTO = {
  vehicleId: string
  vehicleCode: string
  vehicleDescription: string
  vehicleHref: string
  daysInInventory: number
  currentCostUsd: Money
}

export type ExecutiveDashboardInventorySummaryDTO = {
  totalAvailable: number
  currentInventoryValueUsd: Money
  averageInventoryCostUsd: Money | null
  averageInventoryCostNote: DashboardUnavailableNoteDTO | null
  averageDaysInInventory: number | null
  averageDaysInInventoryNote: DashboardUnavailableNoteDTO | null
  over30Count: number
  over60Count: number
  over90Count: number
  agingBuckets: DashboardBarPointDTO[]
}

export type ExecutiveDashboardAgedVehicleActionDTO = ExecutiveDashboardInventoryVehicleDTO & {
  severity: "warning" | "destructive"
  reason: string
}

export type ExecutiveDashboardElevatedCostActionDTO = ExecutiveDashboardInventoryVehicleDTO & {
  costVsAveragePct: number
  reason: string
}

export type ExecutiveDashboardLowMarginSaleActionDTO = {
  saleId: string
  saleCode: string
  saleHref: string
  vehicleCode: string
  vehicleDescription: string
  saleDate: string
  salePriceUsd: Money
  totalCostUsd: Money
  grossProfitUsd: Money
  grossMarginPct: number | null
  reason: string
}

export type ExecutiveDashboardActionItemsDTO = {
  agedVehicles: ExecutiveDashboardAgedVehicleActionDTO[]
  elevatedCostVehicles: ExecutiveDashboardElevatedCostActionDTO[]
  lowMarginSales: ExecutiveDashboardLowMarginSaleActionDTO[]
}

export type ExecutiveDashboardChartsDTO = {
  sales: DashboardTimeSeriesPointDTO[]
  inventoryAging: DashboardBarPointDTO[]
}

export type ExecutiveDashboardDTO = {
  period: ExecutiveDashboardPeriodDTO
  kpis: ExecutiveDashboardKpisDTO
  inventory: ExecutiveDashboardInventorySummaryDTO
  charts: ExecutiveDashboardChartsDTO
  actionItems: ExecutiveDashboardActionItemsDTO
}
