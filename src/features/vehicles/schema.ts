import { z } from "zod"
import {
  BODY_STYLE_VALUES,
  DRIVETRAIN_VALUES,
  FUEL_TYPE_VALUES,
  MILEAGE_UNIT_VALUES,
  TITLE_STATUS_VALUES,
  TRANSMISSION_VALUES,
} from "./enums"
import {
  isValidVehicleYear,
  isValidVinFormat,
  maxVehicleYear,
  normalizeVin,
} from "./domain"

/**
 * Esquemas de entrada del vehículo. El mismo esquema valida en el
 * cliente (feedback inmediato) y en el servidor (la que decide),
 * conforme a ARCHITECTURE.md §6. Solo cinco campos son obligatorios;
 * el resto se captura después (ver proposal.md).
 */

function emptyToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value
}

/** Convierte el valor de un checkbox de `FormData` ("on" / ausente) a booleano. */
function checkboxToBoolean(value: unknown): unknown {
  if (typeof value === "boolean") return value
  if (value === "on" || value === "true") return true
  if (value === undefined || value === null || value === "" || value === "false") return false
  return value
}

function optionalText(max: number) {
  return z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(max, { error: `Este campo admite como máximo ${max} caracteres.` })
      .optional(),
  )
}

function optionalNonNegativeInt(label: string) {
  return z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: `${label} debe ser un número.` })
      .int({ error: `${label} debe ser un número entero.` })
      .min(0, { error: `${label} no puede ser negativo.` })
      .optional(),
  )
}

const objectIdField = (label: string) =>
  z
    .string({ error: `${label} es obligatoria.` })
    .trim()
    .min(1, { error: `${label} es obligatoria.` })

const vinField = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .transform((value) => normalizeVin(value))
    .refine(isValidVinFormat, {
      error: "El VIN debe tener 17 caracteres alfanuméricos y no incluir I, O ni Q.",
    })
    .optional(),
)

/** Base común de alta y edición: los mismos veintitrés campos de captura. */
export const vehicleInputSchema = z
  .object({
    // Identificación
    makeId: objectIdField("La marca"),
    modelId: objectIdField("El modelo"),
    year: z.coerce
      .number({ error: "El año es obligatorio y debe ser un número." })
      .int({ error: "El año debe ser un número entero." })
      .refine((year) => isValidVehicleYear(year, new Date()), {
        error: `El año admitido va de 1950 a ${maxVehicleYear(new Date())}.`,
      }),
    vin: vinField,
    stockNumber: optionalText(40),

    // Ficha técnica
    trim: optionalText(60),
    bodyStyle: z.preprocess(emptyToUndefined, z.enum(BODY_STYLE_VALUES).optional()),
    exteriorColor: optionalText(40),
    interiorColor: optionalText(40),
    mileage: optionalNonNegativeInt("El kilometraje"),
    mileageUnit: z.preprocess(emptyToUndefined, z.enum(MILEAGE_UNIT_VALUES).optional()),
    transmission: z.preprocess(emptyToUndefined, z.enum(TRANSMISSION_VALUES).optional()),
    fuelType: z.preprocess(emptyToUndefined, z.enum(FUEL_TYPE_VALUES).optional()),
    drivetrain: z.preprocess(emptyToUndefined, z.enum(DRIVETRAIN_VALUES).optional()),

    // Título
    titleStatus: z.preprocess(emptyToUndefined, z.enum(TITLE_STATUS_VALUES).optional()),
    titleNumber: optionalText(60),
    titleInHand: z.preprocess(checkboxToBoolean, z.boolean().default(false)),

    // Inventario y ubicación
    statusId: objectIdField("El estatus"),
    dateReceived: z.coerce.date({ error: "La fecha de recepción es obligatoria." }),
    dateListed: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
    lotLocation: optionalText(80),

    // Precio y notas
    askingPrice: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({ error: "El precio de lista debe ser un número." })
        .min(0, { error: "El precio de lista no puede ser negativo." })
        .optional(),
    ),
    notes: optionalText(1000),
  })
  .refine((data) => !data.mileage || data.mileageUnit, {
    error: "Si capturas kilometraje, indica la unidad (millas o kilómetros).",
    path: ["mileageUnit"],
  })

export type VehicleInput = z.infer<typeof vehicleInputSchema>

/** Alta: mismo esquema que la edición (ver design.md, "Cinco campos obligatorios"). */
export const vehicleCreateSchema = vehicleInputSchema

/** Edición: idéntico a la alta. El `code` no viaja aquí; se resuelve por la ruta. */
export const vehicleUpdateSchema = vehicleInputSchema

export const changeVehicleStatusSchema = z.object({
  statusId: objectIdField("El estatus"),
})
export type ChangeVehicleStatusInput = z.infer<typeof changeVehicleStatusSchema>

export const changeAskingPriceSchema = z.object({
  askingPrice: z.coerce
    .number({ error: "El precio de lista es obligatorio y debe ser un número." })
    .min(0, { error: "El precio de lista no puede ser negativo." }),
})
export type ChangeAskingPriceInput = z.infer<typeof changeAskingPriceSchema>

export const voidVehicleSchema = z.object({
  reason: z
    .string({ error: "El motivo es obligatorio." })
    .trim()
    .min(3, { error: "Describe el motivo de la anulación." })
    .max(500, { error: "El motivo admite como máximo 500 caracteres." }),
})
export type VoidVehicleInput = z.infer<typeof voidVehicleSchema>

export const uploadVehicleImageSchema = z.object({
  vehicleId: objectIdField("El vehículo"),
})
export type UploadVehicleImageInput = z.infer<typeof uploadVehicleImageSchema>

export const deleteVehicleImageSchema = z.object({
  vehicleId: objectIdField("El vehículo"),
  imageId: objectIdField("La imagen"),
})
export type DeleteVehicleImageInput = z.infer<typeof deleteVehicleImageSchema>

/** Filtros del listado de inventario. Todos opcionales. */
export const vehicleFiltersSchema = z.object({
  statusId: z.preprocess(emptyToUndefined, z.string().optional()),
  makeId: z.preprocess(emptyToUndefined, z.string().optional()),
  dateReceivedFrom: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  dateReceivedTo: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  search: z.preprocess(emptyToUndefined, z.string().trim().max(60).optional()),
  includeVoided: z.preprocess(checkboxToBoolean, z.boolean().default(false)),
})
export type VehicleFiltersInput = z.infer<typeof vehicleFiltersSchema>
