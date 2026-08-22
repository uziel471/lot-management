import { z } from "zod"
import { ROI_RANGE_VALUES, SALE_RESULT_VALUES } from "./enums"

function emptyToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value
}

function optionalText(max: number) {
  return z.preprocess(
    emptyToUndefined,
    z.string().trim().max(max, { error: `Este campo admite como máximo ${max} caracteres.` }).optional(),
  )
}

const objectIdField = (label: string) =>
  z.string({ error: `${label} es obligatorio.` }).trim().min(1, { error: `${label} es obligatorio.` })

const todayEndOfDay = () => {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  return now
}

export const saleCreateSchema = z.object({
  vehicleId: objectIdField("El vehículo"),
  saleDate: z.coerce.date({ error: "La fecha de venta es obligatoria." }).max(todayEndOfDay(), {
    error: "La fecha de venta no puede ser futura.",
  }),
  buyerName: z.string({ error: "El comprador es obligatorio." }).trim().min(1, {
    error: "El comprador es obligatorio.",
  }).max(120, { error: "El comprador admite como máximo 120 caracteres." }),
  buyerPhone: optionalText(40),
  buyerEmail: z.preprocess(
    emptyToUndefined,
    z.email({ error: "El correo del comprador debe ser válido." }).optional(),
  ),
  salePriceUsd: z.coerce.number({ error: "El precio es obligatorio." }).int({
    error: "El precio debe ser un entero de centavos.",
  }).positive({ error: "El precio de venta debe ser mayor que cero." }),
  terms: optionalText(120),
  referenceNumber: optionalText(80),
  notes: optionalText(1000),
  submissionToken: z.string({ error: "Falta el token de envío del formulario." }).trim().min(1, {
    error: "Falta el token de envío del formulario.",
  }),
})

export type SaleInput = z.infer<typeof saleCreateSchema>

export const voidSaleSchema = z.object({
  reason: z.string({ error: "El motivo es obligatorio." }).trim().min(3, {
    error: "Describe el motivo de la anulación.",
  }).max(500, { error: "El motivo admite como máximo 500 caracteres." }),
})

export const saleFiltersSchema = z.object({
  search: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  vehicleId: z.preprocess(emptyToUndefined, z.string().optional()),
  dateFrom: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  dateTo: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  result: z.preprocess(emptyToUndefined, z.enum(SALE_RESULT_VALUES).optional()),
  roiRange: z.preprocess(emptyToUndefined, z.enum(ROI_RANGE_VALUES).optional()),
  includeVoided: z.preprocess(
    (value) => (value === "on" || value === "true" ? true : value === undefined ? false : value),
    z.boolean().default(false),
  ),
})
