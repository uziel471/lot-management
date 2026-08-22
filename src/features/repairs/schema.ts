import { z } from "zod"
import {
  REPAIR_ACTIVE_STATUS_VALUES,
  REPAIR_CATEGORY_VALUES,
  REPAIR_COST_COMPONENT_KEYS,
  REPAIR_STATUS_VALUES,
} from "./enums"
import { hasPositiveRepairAmount } from "./domain"

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

const objectIdField = (label: string) =>
  z
    .string({ error: `${label} es obligatorio.` })
    .trim()
    .min(1, { error: `${label} es obligatorio.` })

const componentAmountField = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int({ error: "El importe debe ser un número entero de centavos." }).min(0, {
    error: "El importe no puede ser negativo.",
  }).default(0),
)

const componentsShape = Object.fromEntries(
  REPAIR_COST_COMPONENT_KEYS.map((key) => [key, componentAmountField]),
) as Record<(typeof REPAIR_COST_COMPONENT_KEYS)[number], typeof componentAmountField>

const exchangeRateField = z
  .string({ error: "El tipo de cambio es obligatorio." })
  .trim()
  .regex(/^\d+(\.\d+)?$/, { error: "El tipo de cambio debe ser un número positivo." })
  .refine((value) => Number(value) > 0, { error: "El tipo de cambio debe ser mayor que cero." })

const todayEndOfDay = () => {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  return now
}

export const repairCreateSchema = z
  .object({
    vehicleId: objectIdField("El vehículo"),
    vendorId: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    category: z.enum(REPAIR_CATEGORY_VALUES, { error: "La categoría es obligatoria." }),
    openedAt: z.coerce.date({ error: "La fecha de apertura es obligatoria." }).max(todayEndOfDay(), {
      error: "La fecha de apertura no puede ser futura.",
    }),
    currency: z.enum(["USD", "MXN"], { error: "La moneda es obligatoria." }),
    exchangeRate: exchangeRateField,
    ...componentsShape,
    description: z
      .string({ error: "La descripción del trabajo es obligatoria." })
      .trim()
      .min(1, { error: "La descripción del trabajo es obligatoria." })
      .max(2000, { error: "La descripción admite como máximo 2000 caracteres." }),
    referenceNumber: optionalText(80),
    workOrderNumber: optionalText(80),
    notes: optionalText(1000),
    submissionToken: z
      .string({ error: "Falta el token de envío del formulario." })
      .trim()
      .min(1, { error: "Falta el token de envío del formulario." }),
  })
  .superRefine((data, ctx) => {
    if (data.currency === "USD" && data.exchangeRate !== "1") {
      ctx.addIssue({
        code: "custom",
        message: "Para reparaciones en USD el tipo de cambio debe ser exactamente 1.",
        path: ["exchangeRate"],
      })
    }

    const components = Object.fromEntries(
      REPAIR_COST_COMPONENT_KEYS.map((key) => [key, data[key]]),
    ) as Record<(typeof REPAIR_COST_COMPONENT_KEYS)[number], number>

    if (!hasPositiveRepairAmount(components)) {
      ctx.addIssue({
        code: "custom",
        message: "La reparación debe tener al menos un importe mayor que cero.",
        path: ["laborCost"],
      })
    }
  })

export type RepairInput = z.infer<typeof repairCreateSchema>

export const repairStatusChangeSchema = z.object({
  nextStatus: z.enum(REPAIR_ACTIVE_STATUS_VALUES, { error: "El estatus destino no es válido." }),
  note: optionalText(500),
})

export const completeRepairSchema = z.object({
  completedAt: z.coerce.date({ error: "La fecha de conclusión es obligatoria." }).max(todayEndOfDay(), {
    error: "La fecha de conclusión no puede ser futura.",
  }),
  note: optionalText(500),
})

export const cancelRepairSchema = z.object({
  reason: z
    .string({ error: "El motivo es obligatorio." })
    .trim()
    .min(3, { error: "Describe el motivo de la cancelación." })
    .max(500, { error: "El motivo admite como máximo 500 caracteres." }),
})

export const voidRepairSchema = z.object({
  reason: z
    .string({ error: "El motivo es obligatorio." })
    .trim()
    .min(3, { error: "Describe el motivo de la anulación." })
    .max(500, { error: "El motivo admite como máximo 500 caracteres." }),
})

export const repairFiltersSchema = z.object({
  search: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  vehicleId: z.preprocess(emptyToUndefined, z.string().optional()),
  vendorId: z.preprocess(emptyToUndefined, z.string().optional()),
  status: z.preprocess(emptyToUndefined, z.enum(REPAIR_STATUS_VALUES).optional()),
  category: z.preprocess(emptyToUndefined, z.enum(REPAIR_CATEGORY_VALUES).optional()),
  currency: z.preprocess(emptyToUndefined, z.enum(["USD", "MXN"]).optional()),
  dateFrom: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  dateTo: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  includeVoided: z.preprocess(
    (value) => (value === "on" || value === "true" ? true : value === undefined ? false : value),
    z.boolean().default(false),
  ),
})

export type RepairFiltersInput = z.infer<typeof repairFiltersSchema>
