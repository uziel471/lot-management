import type { Money } from "@/types/money"
import type { PaymentBalanceSummaryDTO } from "@/features/payments/types"
import type { CostComponentKey, PaymentMethod, SourceType, TxType } from "./enums"

/**
 * DTO serializables de compras. Nunca se pasa un documento de
 * Mongoose a un Client Component (ARCHITECTURE.md §6): las fechas
 * viajan como ISO, los ObjectId como cadenas y el tipo de cambio como
 * cadena decimal (nunca `number`, ver `lib/money.ts`).
 */

/** Fila del listado de compras. */
export type PurchaseListItemDTO = {
  id: string
  code: string
  vehicleId: string
  vehicleCode: string
  vehicleDescription: string
  vendorId: string
  vendorName: string
  purchaseDate: string
  sourceType: SourceType
  txType: TxType
  currency: "USD" | "MXN"
  exchangeRate: string
  totalOriginal: Money
  totalUsd: Money
  paymentStatus: PaymentBalanceSummaryDTO["paymentStatus"]
  paidUsd: Money
  pendingUsd: Money
  isVoided: boolean
}

/** Ficha completa de detalle de una compra. */
export type PurchaseDetailDTO = PurchaseListItemDTO & {
  components: Record<CostComponentKey, Money>
  paymentMethod: PaymentMethod | null
  referenceNumber: string | null
  lotNumber: string | null
  notes: string | null
  correctsPurchaseId: string | null
  correctsPurchaseCode: string | null
  correctedByPurchaseCode: string | null
  createdBy: string
  createdByName: string | null
  createdAt: string
  updatedAt: string
  voidedAt: string | null
  voidedBy: string | null
  voidedByName: string | null
  voidReason: string | null
  paymentSummary: PaymentBalanceSummaryDTO
}

/** Compra anulada de un vehículo, candidata para `correctsPurchaseId`. */
export type VoidedPurchaseOptionDTO = {
  id: string
  code: string
  txType: TxType
  totalOriginal: Money
  voidedAt: string | null
  voidReason: string | null
}

/** Costo de adquisición acumulado de un vehículo, con su desglose. */
export type VehicleAcquisitionCostDTO = {
  total: Money
  paidUsd: Money
  pendingUsd: Money
  components: Record<CostComponentKey, Money>
  purchaseCount: number
}

export type VehicleAcquisitionCostPreviewDTO = {
  totalUsd: Money
  purchaseCount: number
}

export type PurchaseFilters = {
  vehicleId?: string
  vendorId?: string
  txType?: TxType
  dateFrom?: Date
  dateTo?: Date
  includeVoided?: boolean
}
