import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_METHOD_VALUES,
  type PaymentMethod,
} from "@/features/purchases/enums"

export type EnumOption<T extends string> = { value: T; label: string }

function values<T extends string>(options: readonly EnumOption<T>[]): readonly T[] {
  return options.map((option) => option.value) as readonly T[]
}

function labelLookup<T extends string>(options: readonly EnumOption<T>[]): Record<T, string> {
  return Object.fromEntries(options.map((option) => [option.value, option.label])) as Record<T, string>
}

export const EXPENSE_CATEGORY_OPTIONS = [
  { value: "documentation", label: "Documentación" },
  { value: "transport", label: "Transporte" },
  { value: "cleaning", label: "Limpieza" },
  { value: "fuel", label: "Combustible" },
  { value: "storage", label: "Almacenaje" },
  { value: "marketing", label: "Marketing" },
  { value: "administrative", label: "Administrativo" },
  { value: "other", label: "Otro" },
] as const satisfies readonly EnumOption<string>[]

export const EXPENSE_CATEGORY_VALUES = values(EXPENSE_CATEGORY_OPTIONS)
export type ExpenseCategory = (typeof EXPENSE_CATEGORY_VALUES)[number]
export const EXPENSE_CATEGORY_LABELS = labelLookup(EXPENSE_CATEGORY_OPTIONS)

export const EXPENSE_COMPONENTS = [
  { key: "amount", label: "Importe base" },
  { key: "tax", label: "Impuestos" },
  { key: "fees", label: "Comisiones y cargos" },
  { key: "discount", label: "Descuento" },
  { key: "adjustment", label: "Ajuste" },
] as const

export type ExpenseComponentKey = (typeof EXPENSE_COMPONENTS)[number]["key"]

export const EXPENSE_COMPONENT_KEYS = EXPENSE_COMPONENTS.map(
  (component) => component.key,
) as ExpenseComponentKey[]

export const EXPENSE_COMPONENT_LABELS = Object.fromEntries(
  EXPENSE_COMPONENTS.map((component) => [component.key, component.label]),
) as Record<ExpenseComponentKey, string>

export type ExpenseComponents = Record<ExpenseComponentKey, number>

export const EXPENSE_STATUS_OPTIONS = [
  { value: "active", label: "Vigente" },
  { value: "voided", label: "Anulado" },
] as const satisfies readonly EnumOption<string>[]

export const EXPENSE_STATUS_VALUES = values(EXPENSE_STATUS_OPTIONS)
export type ExpenseStatus = (typeof EXPENSE_STATUS_VALUES)[number]
export const EXPENSE_STATUS_LABELS = labelLookup(EXPENSE_STATUS_OPTIONS)

export const EXPENSE_EVIDENCE_TYPE_OPTIONS = [
  { value: "receipt", label: "Recibo" },
  { value: "invoice", label: "Factura" },
  { value: "paymentProof", label: "Comprobante de pago" },
  { value: "other", label: "Otro" },
] as const satisfies readonly EnumOption<string>[]

export const EXPENSE_EVIDENCE_TYPE_VALUES = values(EXPENSE_EVIDENCE_TYPE_OPTIONS)
export type ExpenseEvidenceType = (typeof EXPENSE_EVIDENCE_TYPE_VALUES)[number]
export const EXPENSE_EVIDENCE_TYPE_LABELS = labelLookup(EXPENSE_EVIDENCE_TYPE_OPTIONS)

export {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_METHOD_VALUES,
  type PaymentMethod,
}

export function expenseStatusTone(
  status: ExpenseStatus,
): "neutral" | "success" | "warning" | "muted" | "destructive" {
  switch (status) {
    case "active":
      return "success"
    case "voided":
      return "destructive"
  }
}
