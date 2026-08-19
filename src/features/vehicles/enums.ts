/**
 * Las cinco listas cerradas de la ficha técnica del vehículo:
 * `bodyStyle`, `transmission`, `fuelType`, `drivetrain` y
 * `titleStatus`. Viven en código, no como catálogos (ver design.md,
 * "Enumeraciones en código para las cinco listas cerradas"): son
 * cerradas, no cambian y no necesitan código legible, retiro ni
 * autoría.
 *
 * El valor almacenado va en inglés; la etiqueta de UI, en español
 * (ARCHITECTURE.md §6). El tipo de TypeScript y el `z.enum` del
 * esquema salen de la misma lista de valores, así que nunca se
 * desincronizan.
 *
 * Regla de evolución, la que hace esto seguro: **un valor ya usado
 * nunca se renombra ni se elimina, solo se agregan valores nuevos.**
 * Renombrar "Automatic" a "AUTO" deja huérfanos todos los vehículos
 * capturados con ese valor. La etiqueta en español sí puede cambiar
 * libremente, porque no está en la base.
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

// --- Estilo de carrocería -------------------------------------------------

export const BODY_STYLE_OPTIONS = [
  { value: "sedan", label: "Sedán" },
  { value: "suv", label: "SUV" },
  { value: "truck", label: "Pickup" },
  { value: "coupe", label: "Coupé" },
  { value: "hatchback", label: "Hatchback" },
  { value: "minivan", label: "Minivan" },
  { value: "wagon", label: "Wagon" },
  { value: "convertible", label: "Convertible" },
  { value: "van", label: "Van de carga" },
] as const satisfies readonly EnumOption<string>[]

export const BODY_STYLE_VALUES = values(BODY_STYLE_OPTIONS)
export type BodyStyle = (typeof BODY_STYLE_VALUES)[number]
export const BODY_STYLE_LABELS = labelLookup(BODY_STYLE_OPTIONS)

// --- Transmisión ------------------------------------------------------------

export const TRANSMISSION_OPTIONS = [
  { value: "automatic", label: "Automática" },
  { value: "manual", label: "Manual" },
  { value: "cvt", label: "CVT" },
] as const satisfies readonly EnumOption<string>[]

export const TRANSMISSION_VALUES = values(TRANSMISSION_OPTIONS)
export type Transmission = (typeof TRANSMISSION_VALUES)[number]
export const TRANSMISSION_LABELS = labelLookup(TRANSMISSION_OPTIONS)

// --- Combustible -------------------------------------------------------------

export const FUEL_TYPE_OPTIONS = [
  { value: "gasoline", label: "Gasolina" },
  { value: "diesel", label: "Diésel" },
  { value: "hybrid", label: "Híbrido" },
  { value: "electric", label: "Eléctrico" },
  { value: "flexFuel", label: "Flex fuel" },
] as const satisfies readonly EnumOption<string>[]

export const FUEL_TYPE_VALUES = values(FUEL_TYPE_OPTIONS)
export type FuelType = (typeof FUEL_TYPE_VALUES)[number]
export const FUEL_TYPE_LABELS = labelLookup(FUEL_TYPE_OPTIONS)

// --- Tracción ------------------------------------------------------------

export const DRIVETRAIN_OPTIONS = [
  { value: "fwd", label: "Delantera (FWD)" },
  { value: "rwd", label: "Trasera (RWD)" },
  { value: "awd", label: "Integral (AWD)" },
  { value: "fourWd", label: "4x4" },
] as const satisfies readonly EnumOption<string>[]

export const DRIVETRAIN_VALUES = values(DRIVETRAIN_OPTIONS)
export type Drivetrain = (typeof DRIVETRAIN_VALUES)[number]
export const DRIVETRAIN_LABELS = labelLookup(DRIVETRAIN_OPTIONS)

// --- Situación del título -------------------------------------------------

export const TITLE_STATUS_OPTIONS = [
  { value: "clean", label: "Limpio" },
  { value: "salvage", label: "Salvage" },
  { value: "rebuilt", label: "Reconstruido" },
  { value: "lien", label: "Con gravamen" },
  { value: "other", label: "Otro" },
] as const satisfies readonly EnumOption<string>[]

export const TITLE_STATUS_VALUES = values(TITLE_STATUS_OPTIONS)
export type TitleStatus = (typeof TITLE_STATUS_VALUES)[number]
export const TITLE_STATUS_LABELS = labelLookup(TITLE_STATUS_OPTIONS)

// --- Unidad de kilometraje --------------------------------------------------

export const MILEAGE_UNIT_OPTIONS = [
  { value: "mi", label: "Millas" },
  { value: "km", label: "Kilómetros" },
] as const satisfies readonly EnumOption<string>[]

export const MILEAGE_UNIT_VALUES = values(MILEAGE_UNIT_OPTIONS)
export type MileageUnit = (typeof MILEAGE_UNIT_VALUES)[number]
export const MILEAGE_UNIT_LABELS = labelLookup(MILEAGE_UNIT_OPTIONS)
