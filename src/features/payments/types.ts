import type { Currency, Money } from "@/types/money"
import type {
  PaymentEvidenceType,
  PaymentMethod,
  PaymentSourceType,
  PaymentStatus,
} from "./enums"

export type PaymentEvidenceDTO = {
  type: PaymentEvidenceType
  label: string | null
  url: string | null
  notes: string | null
}

export type PaymentApplicationDTO = {
  sourceType: PaymentSourceType
  sourceId: string
  sourceCode: string
  sourceLabel: string
  sourceHref: string
  appliedAmount: Money
  appliedUsd: Money
  sourceTotalUsdSnapshot: Money
  sourcePendingUsdSnapshot: Money
}

export type PaymentBalanceSummaryDTO = {
  paymentStatus: PaymentStatus
  paidUsd: Money
  pendingUsd: Money
  activeApplications: Array<{
    paymentCode: string
    paymentDate: string
    paymentHref: string
    sourceType: PaymentSourceType
    sourceId: string
    sourceCode: string
    appliedAmount: Money
    appliedUsd: Money
  }>
}

export type SourcePayableOptionDTO = {
  type: PaymentSourceType
  id: string
  code: string
  label: string
  href: string
  providerId: string | null
  providerName: string | null
  vehicleId: string | null
  vehicleCode: string | null
  vehicleDescription: string | null
  totalUsd: Money
  paymentStatus: PaymentStatus
  paidUsd: Money
  pendingUsd: Money
  isPayable: boolean
}

export type PaymentListItemDTO = {
  id: string
  code: string
  paymentDate: string
  providerId: string | null
  providerName: string | null
  currency: Currency
  exchangeRate: string
  amount: Money
  totalUsd: Money
  method: PaymentMethod
  applicationCount: number
  sourceTypes: PaymentSourceType[]
  status: "active" | "voided"
  isVoided: boolean
}

export type PaymentDetailDTO = PaymentListItemDTO & {
  referenceNumber: string | null
  accountLabel: string | null
  notes: string | null
  applications: PaymentApplicationDTO[]
  evidence: PaymentEvidenceDTO[]
  createdBy: string
  createdByName: string | null
  createdAt: string
  updatedAt: string
  voidedAt: string | null
  voidedBy: string | null
  voidedByName: string | null
  voidReason: string | null
}

export type PaymentFilters = {
  search?: string
  providerId?: string
  sourceType?: PaymentSourceType
  method?: PaymentMethod
  currency?: Currency
  status?: "active" | "voided"
  dateFrom?: Date
  dateTo?: Date
  includeVoided?: boolean
}
