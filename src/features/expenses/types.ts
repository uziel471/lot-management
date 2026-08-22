import type { Money } from "@/types/money"
import type {
  ExpenseCategory,
  ExpenseComponentKey,
  ExpenseEvidenceType,
  PaymentMethod,
} from "./enums"

export type ExpenseListItemDTO = {
  id: string
  code: string
  vehicleId: string | null
  vehicleCode: string | null
  vehicleDescription: string | null
  vendorId: string | null
  vendorName: string | null
  isGeneral: boolean
  category: ExpenseCategory
  expenseDate: string
  currency: "USD" | "MXN"
  exchangeRate: string
  paymentMethod: PaymentMethod | null
  totalOriginal: Money
  totalUsd: Money
  isVoided: boolean
}

export type ExpenseDetailDTO = ExpenseListItemDTO & {
  components: Record<ExpenseComponentKey, Money>
  referenceNumber: string | null
  evidenceType: ExpenseEvidenceType | null
  evidenceLabel: string | null
  evidenceUrl: string | null
  notes: string | null
  createdBy: string
  createdByName: string | null
  createdAt: string
  updatedAt: string
  voidedAt: string | null
  voidedBy: string | null
  voidedByName: string | null
  voidReason: string | null
}

export type ExpenseFilters = {
  search?: string
  vehicleId?: string
  vendorId?: string
  category?: ExpenseCategory
  currency?: "USD" | "MXN"
  paymentMethod?: PaymentMethod
  association?: "general" | "vehicle"
  dateFrom?: Date
  dateTo?: Date
  includeVoided?: boolean
}

export type VehicleExpenseCategorySummaryDTO = {
  category: ExpenseCategory
  label: string
  count: number
  activeTotalUsd: Money
}

export type VehicleExpenseSummaryDTO = {
  activeTotalUsd: Money
  activeCount: number
  rows: ExpenseListItemDTO[]
  categorySummary: VehicleExpenseCategorySummaryDTO[]
}
