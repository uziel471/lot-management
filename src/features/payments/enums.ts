import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_OPTIONS, PAYMENT_METHOD_VALUES, type PaymentMethod } from "@/features/purchases/enums"

export type EnumOption<T extends string> = { value: T; label: string }

function values<T extends string>(options: readonly EnumOption<T>[]): readonly T[] {
  return options.map((option) => option.value) as readonly T[]
}

function labelLookup<T extends string>(options: readonly EnumOption<T>[]): Record<T, string> {
  return Object.fromEntries(options.map((option) => [option.value, option.label])) as Record<T, string>
}

export const PAYMENT_SOURCE_TYPE_OPTIONS = [
  { value: "purchase", label: "Compra" },
  { value: "expense", label: "Gasto" },
  { value: "repair", label: "Reparación" },
] as const satisfies readonly EnumOption<string>[]

export const PAYMENT_SOURCE_TYPE_VALUES = values(PAYMENT_SOURCE_TYPE_OPTIONS)
export type PaymentSourceType = (typeof PAYMENT_SOURCE_TYPE_VALUES)[number]
export const PAYMENT_SOURCE_TYPE_LABELS = labelLookup(PAYMENT_SOURCE_TYPE_OPTIONS)

export const PAYMENT_STATUS_OPTIONS = [
  { value: "unpaid", label: "Sin pagar" },
  { value: "partial", label: "Parcial" },
  { value: "paid", label: "Pagado" },
] as const satisfies readonly EnumOption<string>[]

export const PAYMENT_STATUS_VALUES = values(PAYMENT_STATUS_OPTIONS)
export type PaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number]
export const PAYMENT_STATUS_LABELS = labelLookup(PAYMENT_STATUS_OPTIONS)

export const PAYMENT_EVIDENCE_TYPE_OPTIONS = [
  { value: "receipt", label: "Recibo" },
  { value: "invoice", label: "Factura" },
  { value: "paymentProof", label: "Comprobante de pago" },
  { value: "checkImage", label: "Imagen de cheque" },
  { value: "other", label: "Otro" },
] as const satisfies readonly EnumOption<string>[]

export const PAYMENT_EVIDENCE_TYPE_VALUES = values(PAYMENT_EVIDENCE_TYPE_OPTIONS)
export type PaymentEvidenceType = (typeof PAYMENT_EVIDENCE_TYPE_VALUES)[number]
export const PAYMENT_EVIDENCE_TYPE_LABELS = labelLookup(PAYMENT_EVIDENCE_TYPE_OPTIONS)

export {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_METHOD_VALUES,
  type PaymentMethod,
}

export function paymentStatusTone(
  status: PaymentStatus,
): "neutral" | "success" | "warning" | "muted" | "destructive" {
  switch (status) {
    case "unpaid":
      return "muted"
    case "partial":
      return "warning"
    case "paid":
      return "success"
  }
}
