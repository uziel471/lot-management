import { addMoney } from "@/lib/money"
import type { Money } from "@/types/money"
import type { SaleResult } from "./enums"
import type { SaleCostSnapshotDTO } from "./types"

type CostPreview = {
  acquisitionCostUsd: Money
  repairCostUsd: Money
  vehicleExpenseCostUsd: Money
  acquisitionCount: number
  repairCount: number
  vehicleExpenseCount: number
}

function zeroUsd(): Money {
  return { amount: 0, currency: "USD" }
}

export function saleResultOf(profitUsd: Money): SaleResult {
  if (profitUsd.amount > 0) return "profit"
  if (profitUsd.amount < 0) return "loss"
  return "breakEven"
}

export function roiOf(profitUsdAmount: number, totalCostUsdAmount: number): number | null {
  if (totalCostUsdAmount <= 0) return null
  return Math.round((profitUsdAmount / totalCostUsdAmount) * 10_000) / 100
}

export function formatRoi(roi: number | null): string {
  if (roi === null) return "N/A"
  return `${roi.toFixed(2)}%`
}

export function createSaleSnapshot(
  salePriceUsd: Money,
  preview: CostPreview,
): SaleCostSnapshotDTO {
  const totalCostUsd = addMoney(
    addMoney(preview.acquisitionCostUsd, preview.repairCostUsd),
    preview.vehicleExpenseCostUsd,
  )
  const profitUsd = {
    amount: salePriceUsd.amount - totalCostUsd.amount,
    currency: "USD" as const,
  }
  const roi = roiOf(profitUsd.amount, totalCostUsd.amount)

  return {
    acquisitionCostUsd: preview.acquisitionCostUsd,
    repairCostUsd: preview.repairCostUsd,
    vehicleExpenseCostUsd: preview.vehicleExpenseCostUsd,
    totalCostUsd,
    profitUsd,
    roi,
    roiLabel: formatRoi(roi),
    acquisitionCount: preview.acquisitionCount,
    repairCount: preview.repairCount,
    vehicleExpenseCount: preview.vehicleExpenseCount,
  }
}

export function emptySaleSnapshot(): SaleCostSnapshotDTO {
  return {
    acquisitionCostUsd: zeroUsd(),
    repairCostUsd: zeroUsd(),
    vehicleExpenseCostUsd: zeroUsd(),
    totalCostUsd: zeroUsd(),
    profitUsd: zeroUsd(),
    roi: null,
    roiLabel: "N/A",
    acquisitionCount: 0,
    repairCount: 0,
    vehicleExpenseCount: 0,
  }
}
