import { z } from "zod"
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH, isUsableName } from "./domain"

/**
 * Esquemas de entrada de los cuatro catálogos. El mismo esquema
 * valida en el cliente (feedback inmediato) y en el servidor (la
 * única que decide), conforme a ARCHITECTURE.md §6.
 */

/** Convierte la cadena vacía de un campo opcional de formulario en `undefined`. */
function emptyToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value
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

/** Nombre: común a los cuatro catálogos. Se guarda tal como se capturó. */
export const catalogNameSchema = z
  .string({ error: "El nombre es obligatorio." })
  .trim()
  .min(NAME_MIN_LENGTH, { error: `El nombre debe tener al menos ${NAME_MIN_LENGTH} caracteres.` })
  .max(NAME_MAX_LENGTH, { error: `El nombre admite como máximo ${NAME_MAX_LENGTH} caracteres.` })
  .refine(isUsableName, { error: "El nombre no puede ser solo espacios." })

/** Base común: lo único que comparten los cuatro es el nombre. */
export const baseCatalogSchema = z.object({
  name: catalogNameSchema,
})

/** Marcas: solo el nombre. */
export const makeSchema = baseCatalogSchema

/** Modelos: nombre y marca, que es obligatoria. */
export const modelSchema = baseCatalogSchema.extend({
  makeId: z
    .string({ error: "La marca es obligatoria." })
    .trim()
    .min(1, { error: "La marca es obligatoria." }),
})

/** Estatus de vehículo: orden entero obligatorio y descripción opcional. */
export const vehicleStatusSchema = baseCatalogSchema.extend({
  sortOrder: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: "El orden es obligatorio y debe ser un número." })
      .int({ error: "El orden debe ser un número entero." })
      .min(0, { error: "El orden no puede ser negativo." })
      .max(100_000, { error: "El orden es demasiado grande." }),
  ),
  description: optionalText(300),
})

/** Proveedores: los cuatro datos de contacto, todos opcionales. */
export const vendorSchema = baseCatalogSchema.extend({
  phone: optionalText(40),
  email: z.preprocess(
    emptyToUndefined,
    z.email({ error: "Ingresa un correo válido." }).optional(),
  ),
  city: optionalText(80),
  notes: optionalText(500),
})

export type MakeInput = z.infer<typeof makeSchema>
export type ModelInput = z.infer<typeof modelSchema>
export type VehicleStatusInput = z.infer<typeof vehicleStatusSchema>
export type VendorInput = z.infer<typeof vendorSchema>

/** Entrada de cualquier catálogo, ya validada. */
export type CatalogInput = MakeInput | ModelInput | VehicleStatusInput | VendorInput

/** Identificación de la entrada sobre la que opera una escritura. */
export const catalogEntryRefSchema = z.object({
  code: z.string().trim().min(1, { error: "Falta el código de la entrada." }),
})

/** Cambio de estado (desactivar / reactivar). */
export const setActiveSchema = catalogEntryRefSchema.extend({
  isActive: z.boolean(),
})
