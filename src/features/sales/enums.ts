export const SALE_RESULT_VALUES = ["profit", "loss", "breakEven"] as const
export type SaleResult = (typeof SALE_RESULT_VALUES)[number]

export const ROI_RANGE_VALUES = ["negative", "zeroTo50", "over50", "unavailable"] as const
export type RoiRange = (typeof ROI_RANGE_VALUES)[number]

export const SALE_RESULT_LABELS: Record<SaleResult, string> = {
  profit: "Ganancia",
  loss: "Pérdida",
  breakEven: "Sin margen",
}

export const ROI_RANGE_LABELS: Record<RoiRange, string> = {
  negative: "ROI negativo",
  zeroTo50: "0% a 50%",
  over50: "Mayor a 50%",
  unavailable: "N/A",
}
