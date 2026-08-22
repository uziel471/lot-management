import { z } from "zod"
import {
  EXPENSE_CATEGORY_VALUES,
  EXPENSE_COMPONENT_KEYS,
  EXPENSE_EVIDENCE_TYPE_VALUES,
  PAYMENT_METHOD_VALUES,
} from "./enums"
import {
  hasInvalidNegativeExpenseComponent,
  hasPositiveExpenseTotal,
} from "./domain"

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

const optionalObjectIdField = z.preprocess(emptyToUndefined, z.string().trim().optional())

const componentAmountField = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int({ error: "El importe debe ser un número entero de centavos." }).default(0),
)

const componentsShape = Object.fromEntries(
  EXPENSE_COMPONENT_KEYS.map((key) => [key, componentAmountField]),
) as Record<(typeof EXPENSE_COMPONENT_KEYS)[number], typeof componentAmountField>

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

export const expenseCreateSchema = z
  .object({
    category: z.enum(EXPENSE_CATEGORY_VALUES, { error: "La categoría es obligatoria." }),
    expenseDate: z.coerce.date({ error: "La fecha del gasto es obligatoria." }).max(todayEndOfDay(), {
      error: "La fecha del gasto no puede ser futura.",
    }),
    vehicleId: optionalObjectIdField,
    vendorId: optionalObjectIdField,
    currency: z.enum(["USD", "MXN"], { error: "La moneda es obligatoria." }),
    exchangeRate: exchangeRateField,
    ...componentsShape,
    paymentMethod: z.preprocess(emptyToUndefined, z.enum(PAYMENT_METHOD_VALUES).optional()),
    referenceNumber: optionalText(80),
    evidenceType: z.preprocess(emptyToUndefined, z.enum(EXPENSE_EVIDENCE_TYPE_VALUES).optional()),
    evidenceLabel: optionalText(120),
    evidenceUrl: z.preprocess(
      emptyToUndefined,
      z.url({ error: "La liga de evidencia debe ser una URL válida." }).optional(),
    ),
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
        message: "Para gastos en USD el tipo de cambio debe ser exactamente 1.",
        path: ["exchangeRate"],
      })
    }

    const components = Object.fromEntries(
      EXPENSE_COMPONENT_KEYS.map((key) => [key, data[key]]),
    ) as Record<(typeof EXPENSE_COMPONENT_KEYS)[number], number>

    if (hasInvalidNegativeExpenseComponent(components)) {
      ctx.addIssue({
        code: "custom",
        message: "Los importes del gasto no pueden ser negativos.",
        path: ["amount"],
      })
    }

    if (!hasPositiveExpenseTotal(components)) {
      ctx.addIssue({
        code: "custom",
        message: "El gasto debe tener un total final mayor que cero.",
        path: ["amount"],
      })
    }

    if ((data.evidenceLabel || data.evidenceUrl) && !data.evidenceType) {
      ctx.addIssue({
        code: "custom",
        message: "Selecciona el tipo de evidencia.",
        path: ["evidenceType"],
      })
    }
  })

export type ExpenseInput = z.infer<typeof expenseCreateSchema>

export const voidExpenseSchema = z.object({
  reason: z
    .string({ error: "El motivo es obligatorio." })
    .trim()
    .min(3, { error: "Describe el motivo de la anulación." })
    .max(500, { error: "El motivo admite como máximo 500 caracteres." }),
})

export type VoidExpenseInput = z.infer<typeof voidExpenseSchema>

export const expenseFiltersSchema = z.object({
  search: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  vehicleId: z.preprocess(emptyToUndefined, z.string().optional()),
  vendorId: z.preprocess(emptyToUndefined, z.string().optional()),
  category: z.preprocess(emptyToUndefined, z.enum(EXPENSE_CATEGORY_VALUES).optional()),
  currency: z.preprocess(emptyToUndefined, z.enum(["USD", "MXN"]).optional()),
  paymentMethod: z.preprocess(emptyToUndefined, z.enum(PAYMENT_METHOD_VALUES).optional()),
  association: z.preprocess(emptyToUndefined, z.enum(["general", "vehicle"]).optional()),
  dateFrom: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  dateTo: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  includeVoided: z.preprocess(
    (value) => (value === "on" || value === "true" ? true : value === undefined ? false : value),
    z.boolean().default(false),
  ),
})

export type ExpenseFiltersInput = z.infer<typeof expenseFiltersSchema>
