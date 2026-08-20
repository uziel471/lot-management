/**
 * Las tres listas cerradas de compras: `sourceType`, `paymentMethod`
 * y `txType`. Viven en código, no como catálogos —misma decisión que
 * las cinco listas cerradas de vehículos (ver
 * `features/vehicles/enums.ts`)—: son cerradas, no cambian y no
 * necesitan código legible, retiro ni autoría.
 *
 * El valor almacenado va en inglés; la etiqueta de UI, en español
 * (ARCHITECTURE.md §6). Regla de evolución: un valor ya usado nunca
 * se renombra ni se elimina, solo se agregan valores nuevos.
 */

export type EnumOption<T extends string> = { value: T; label: string }

function values<T extends string>(options: readonly EnumOption<T>[]): readonly T[] {
  return options.map((option) => option.value) as T[]
}

function labelLookup<T extends string>(options: readonly EnumOption<T>[]): Record<T, string> {
  return Object.fromEntries(options.map((option) => [option.value, option.label])) as Record<
    T,
    string
  >
}

// --- Origen de la compra -----------------------------------------------

export const SOURCE_TYPE_OPTIONS = [
  { value: "auction", label: "Subasta" },
  { value: "dealer", label: "Agencia" },
  { value: "private", label: "Particular" },
  { value: "otherLot", label: "Otro lote" },
  { value: "other", label: "Otro" },
] as const satisfies readonly EnumOption<string>[]

export const SOURCE_TYPE_VALUES = values(SOURCE_TYPE_OPTIONS)
export type SourceType = (typeof SOURCE_TYPE_VALUES)[number]
export const SOURCE_TYPE_LABELS = labelLookup(SOURCE_TYPE_OPTIONS)

// --- Forma de pago -------------------------------------------------------

export const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Efectivo" },
  { value: "wire", label: "Transferencia" },
  { value: "check", label: "Cheque" },
  { value: "card", label: "Tarjeta" },
  { value: "financing", label: "Financiamiento" },
] as const satisfies readonly EnumOption<string>[]

export const PAYMENT_METHOD_VALUES = values(PAYMENT_METHOD_OPTIONS)
export type PaymentMethod = (typeof PAYMENT_METHOD_VALUES)[number]
export const PAYMENT_METHOD_LABELS = labelLookup(PAYMENT_METHOD_OPTIONS)

// --- Tipo de compra --------------------------------------------------------

export const TX_TYPE_OPTIONS = [
  { value: "initial", label: "Inicial" },
  { value: "adjustment", label: "Ajuste" },
  { value: "correction", label: "Corrección" },
  { value: "related", label: "Relacionada" },
] as const satisfies readonly EnumOption<string>[]

export const TX_TYPE_VALUES = values(TX_TYPE_OPTIONS)
export type TxType = (typeof TX_TYPE_VALUES)[number]
export const TX_TYPE_LABELS = labelLookup(TX_TYPE_OPTIONS)

/**
 * Los ocho componentes del costo de adquisición (ARCHITECTURE.md
 * §4.3), en orden, con su etiqueta de UI. Única fuente para el
 * esquema, el modelo, el formulario, la tabla de desglose y los
 * tests: agregar un componente es un solo cambio (ver design.md,
 * "Los ocho componentes son campos con nombre, no un arreglo").
 */
export const COST_COMPONENTS = [
  { key: "purchasePrice", label: "Precio del vehículo" },
  { key: "auctionFees", label: "Comisiones de subasta" },
  { key: "acquisitionTransportCost", label: "Transporte de adquisición" },
  { key: "titleDocFees", label: "Trámites y documentación de título" },
  { key: "purchaseTax", label: "Impuesto de compra" },
  { key: "importDuties", label: "Aranceles de importación" },
  { key: "customsBrokerFees", label: "Honorarios del agente aduanal" },
  { key: "otherAcquisitionCosts", label: "Otros costos de adquisición" },
] as const

export type CostComponentKey = (typeof COST_COMPONENTS)[number]["key"]

export const COST_COMPONENT_KEYS = COST_COMPONENTS.map((component) => component.key) as CostComponentKey[]

export const COST_COMPONENT_LABELS = Object.fromEntries(
  COST_COMPONENTS.map((component) => [component.key, component.label]),
) as Record<CostComponentKey, string>

/** Los ocho componentes de una compra, cada uno en centavos. */
export type CostComponents = Record<CostComponentKey, number>
