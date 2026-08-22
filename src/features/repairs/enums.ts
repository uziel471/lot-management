export type EnumOption<T extends string> = { value: T; label: string }

function values<T extends string>(options: readonly EnumOption<T>[]): readonly T[] {
  return options.map((option) => option.value) as T[]
}

function labelLookup<T extends string>(options: readonly EnumOption<T>[]): Record<T, string> {
  return Object.fromEntries(options.map((option) => [option.value, option.label])) as Record<T, string>
}

export const REPAIR_STATUS_OPTIONS = [
  { value: "requested", label: "Solicitada" },
  { value: "quoted", label: "Cotizada" },
  { value: "inProgress", label: "En progreso" },
  { value: "completed", label: "Completada" },
  { value: "cancelled", label: "Cancelada" },
  { value: "voided", label: "Anulada" },
] as const satisfies readonly EnumOption<string>[]

export const REPAIR_STATUS_VALUES = values(REPAIR_STATUS_OPTIONS)
export type RepairStatus = (typeof REPAIR_STATUS_VALUES)[number]
export const REPAIR_STATUS_LABELS = labelLookup(REPAIR_STATUS_OPTIONS)

export const REPAIR_ACTIVE_STATUS_VALUES = ["requested", "quoted", "inProgress"] as const satisfies readonly RepairStatus[]
export const REPAIR_TERMINAL_STATUS_VALUES = ["completed", "cancelled", "voided"] as const satisfies readonly RepairStatus[]

export const REPAIR_CATEGORY_OPTIONS = [
  { value: "diagnostic", label: "Diagnóstico" },
  { value: "mechanical", label: "Mecánica" },
  { value: "electrical", label: "Eléctrica" },
  { value: "body", label: "Carrocería" },
  { value: "paint", label: "Pintura" },
  { value: "glass", label: "Cristales" },
  { value: "tires", label: "Llantas" },
  { value: "detailing", label: "Estética" },
  { value: "other", label: "Otra" },
] as const satisfies readonly EnumOption<string>[]

export const REPAIR_CATEGORY_VALUES = values(REPAIR_CATEGORY_OPTIONS)
export type RepairCategory = (typeof REPAIR_CATEGORY_VALUES)[number]
export const REPAIR_CATEGORY_LABELS = labelLookup(REPAIR_CATEGORY_OPTIONS)

export const REPAIR_COST_COMPONENTS = [
  { key: "laborCost", label: "Mano de obra" },
  { key: "partsCost", label: "Partes" },
  { key: "taxCost", label: "Impuestos" },
  { key: "outsideServiceCost", label: "Servicio externo" },
  { key: "otherCost", label: "Otros costos" },
] as const

export type RepairCostComponentKey = (typeof REPAIR_COST_COMPONENTS)[number]["key"]

export const REPAIR_COST_COMPONENT_KEYS = REPAIR_COST_COMPONENTS.map(
  (component) => component.key,
) as RepairCostComponentKey[]

export const REPAIR_COST_COMPONENT_LABELS = Object.fromEntries(
  REPAIR_COST_COMPONENTS.map((component) => [component.key, component.label]),
) as Record<RepairCostComponentKey, string>

export type RepairCostComponents = Record<RepairCostComponentKey, number>

export function repairStatusTone(
  status: RepairStatus,
): "neutral" | "success" | "warning" | "muted" | "destructive" {
  switch (status) {
    case "requested":
      return "muted"
    case "quoted":
      return "warning"
    case "inProgress":
      return "neutral"
    case "completed":
      return "success"
    case "cancelled":
      return "muted"
    case "voided":
      return "destructive"
  }
}
