import type { Money } from "@/types/money"
import type { RoiRange, SaleResult } from "./enums"

export type SaleCostSnapshotDTO = {
  acquisitionCostUsd: Money
  repairCostUsd: Money
  vehicleExpenseCostUsd: Money
  totalCostUsd: Money
  profitUsd: Money
  roi: number | null
  roiLabel: string
  acquisitionCount: number
  repairCount: number
  vehicleExpenseCount: number
}

export type SaleListItemDTO = {
  id: string
  code: string
  vehicleId: string
  vehicleCode: string
  vehicleDescription: string
  buyerName: string
  buyerPhone: string | null
  buyerEmail: string | null
  saleDate: string
  salePriceUsd: Money
  snapshot: SaleCostSnapshotDTO
  result: SaleResult
  isVoided: boolean
}

export type SaleDetailDTO = SaleListItemDTO & {
  terms: string | null
  referenceNumber: string | null
  notes: string | null
  createdBy: string
  createdByName: string | null
  updatedBy: string
  updatedByName: string | null
  createdAt: string
  updatedAt: string
  voidedAt: string | null
  voidedBy: string | null
  voidedByName: string | null
  voidReason: string | null
  canVoid: boolean
}

export type SaleFilters = {
  search?: string
  vehicleId?: string
  dateFrom?: Date
  dateTo?: Date
  result?: SaleResult
  roiRange?: RoiRange
  includeVoided?: boolean
}

export type SaleListSummaryDTO = {
  activeRevenueUsd: Money
  activeTotalCostUsd: Money
  activeProfitUsd: Money
  aggregateRoi: number | null
  activeCount: number
}

export type SaleListResponseDTO = {
  rows: SaleListItemDTO[]
  summary: SaleListSummaryDTO
}

export type SaleVehicleOptionDTO = {
  id: string
  code: string
  description: string
}

export type SaleFormOptionsDTO = {
  vehicles: SaleVehicleOptionDTO[]
}

export type VehicleSaleSummaryDTO = {
  activeSale: SaleListItemDTO | null
  voidedSales: SaleListItemDTO[]
}
