import type { Money } from "@/types/money"
import type {
  RepairCategory,
  RepairCostComponentKey,
  RepairStatus,
} from "./enums"

export type RepairStatusHistoryEntryDTO = {
  previousStatus: RepairStatus | null
  previousStatusLabel: string | null
  nextStatus: RepairStatus
  nextStatusLabel: string
  changedBy: string
  changedByName: string | null
  changedAt: string
  note: string | null
}

export type RepairListItemDTO = {
  id: string
  code: string
  vehicleId: string
  vehicleCode: string
  vehicleDescription: string
  vendorId: string | null
  vendorName: string | null
  isInternal: boolean
  category: RepairCategory
  status: RepairStatus
  openedAt: string
  completedAt: string | null
  currency: "USD" | "MXN"
  exchangeRate: string
  totalOriginal: Money
  totalUsd: Money
  isVoided: boolean
}

export type RepairDetailDTO = RepairListItemDTO & {
  components: Record<RepairCostComponentKey, Money>
  description: string
  referenceNumber: string | null
  workOrderNumber: string | null
  notes: string | null
  statusHistory: RepairStatusHistoryEntryDTO[]
  createdBy: string
  createdByName: string | null
  createdAt: string
  updatedAt: string
  completedBy: string | null
  completedByName: string | null
  completionNote: string | null
  cancelledAt: string | null
  cancelledBy: string | null
  cancelledByName: string | null
  cancellationReason: string | null
  voidedAt: string | null
  voidedBy: string | null
  voidedByName: string | null
  voidReason: string | null
}

export type RepairFilters = {
  search?: string
  vehicleId?: string
  vendorId?: string
  status?: RepairStatus
  category?: RepairCategory
  currency?: "USD" | "MXN"
  dateFrom?: Date
  dateTo?: Date
  includeVoided?: boolean
}

export type VehicleRepairStatusSummaryDTO = {
  status: RepairStatus
  label: string
  count: number
}

export type VehicleRepairSummaryDTO = {
  activeTotalUsd: Money
  activeCount: number
  rows: RepairListItemDTO[]
  statusSummary: VehicleRepairStatusSummaryDTO[]
}
