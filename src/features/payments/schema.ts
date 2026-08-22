import { z } from "zod"
import {
  PAYMENT_EVIDENCE_TYPE_VALUES,
  PAYMENT_METHOD_VALUES,
  PAYMENT_SOURCE_TYPE_VALUES,
} from "./enums"

function emptyToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value
}

function optionalText(max: number) {
  return z.preprocess(
    emptyToUndefined,
    z.string().trim().max(max, { error: `Este campo admite como máximo ${max} caracteres.` }).optional(),
  )
}

const decimalExchangeRate = z
  .string({ error: "El tipo de cambio es obligatorio." })
  .trim()
  .regex(/^\d+(\.\d+)?$/, { error: "El tipo de cambio debe ser un número positivo." })
  .refine((value) => Number(value) > 0, { error: "El tipo de cambio debe ser mayor que cero." })

const paymentAmountField = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int({ error: "El importe debe ser un número entero de centavos." }).positive({
    error: "El importe debe ser mayor que cero.",
  }),
)

const applicationSchema = z.object({
  sourceType: z.enum(PAYMENT_SOURCE_TYPE_VALUES, { error: "El tipo de documento es obligatorio." }),
  sourceId: z.string({ error: "El documento origen es obligatorio." }).trim().min(1, {
    error: "El documento origen es obligatorio.",
  }),
  appliedAmount: paymentAmountField,
})

const todayEndOfDay = () => {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  return now
}

const evidenceSchema = z.object({
  type: z.enum(PAYMENT_EVIDENCE_TYPE_VALUES, { error: "El tipo de evidencia es obligatorio." }),
  label: optionalText(120),
  url: z.preprocess(emptyToUndefined, z.url({ error: "La liga debe ser una URL válida." }).optional()),
  notes: optionalText(500),
})

export const paymentCreateSchema = z
  .object({
    paymentDate: z.coerce.date({ error: "La fecha del pago es obligatoria." }).max(todayEndOfDay(), {
      error: "La fecha del pago no puede ser futura.",
    }),
    providerId: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    currency: z.enum(["USD", "MXN"], { error: "La moneda es obligatoria." }),
    exchangeRate: decimalExchangeRate,
    amount: paymentAmountField,
    method: z.enum(PAYMENT_METHOD_VALUES, { error: "El método de pago es obligatorio." }),
    applications: z.array(applicationSchema).min(1, { error: "Debes capturar al menos una aplicación." }),
    referenceNumber: optionalText(80),
    accountLabel: optionalText(120),
    evidence: z.array(evidenceSchema).default([]),
    notes: optionalText(1000),
    submissionToken: z.string({ error: "Falta el token de envío del formulario." }).trim().min(1, {
      error: "Falta el token de envío del formulario.",
    }),
  })
  .superRefine((data, ctx) => {
    if (data.currency === "USD" && data.exchangeRate !== "1") {
      ctx.addIssue({
        code: "custom",
        message: "Para pagos en USD el tipo de cambio debe ser exactamente 1.",
        path: ["exchangeRate"],
      })
    }

    const appliedTotal = data.applications.reduce((total, application) => total + application.appliedAmount, 0)
    if (appliedTotal !== data.amount) {
      ctx.addIssue({
        code: "custom",
        message: "La suma de las aplicaciones debe coincidir exactamente con el monto del pago.",
        path: ["applications"],
      })
    }
  })

export const voidPaymentSchema = z.object({
  reason: z.string({ error: "El motivo es obligatorio." }).trim().min(3, {
    error: "Describe el motivo de la anulación.",
  }).max(500, { error: "El motivo admite como máximo 500 caracteres." }),
})

export const paymentFiltersSchema = z.object({
  search: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  providerId: z.preprocess(emptyToUndefined, z.string().optional()),
  sourceType: z.preprocess(emptyToUndefined, z.enum(PAYMENT_SOURCE_TYPE_VALUES).optional()),
  method: z.preprocess(emptyToUndefined, z.enum(PAYMENT_METHOD_VALUES).optional()),
  currency: z.preprocess(emptyToUndefined, z.enum(["USD", "MXN"]).optional()),
  status: z.preprocess(emptyToUndefined, z.enum(["active", "voided"]).optional()),
  dateFrom: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  dateTo: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  includeVoided: z.preprocess(
    (value) => (value === "on" || value === "true" ? true : value === undefined ? false : value),
    z.boolean().default(false),
  ),
})

export type PaymentInput = z.infer<typeof paymentCreateSchema>
export type VoidPaymentInput = z.infer<typeof voidPaymentSchema>
export type PaymentFiltersInput = z.infer<typeof paymentFiltersSchema>
