import { z } from "zod"
import {
  COST_COMPONENT_KEYS,
  PAYMENT_METHOD_VALUES,
  SOURCE_TYPE_VALUES,
  TX_TYPE_VALUES,
} from "./enums"
import { allowsNegativeAmounts, hasAnyAmount, requiresCorrectionTarget } from "./domain"

/**
 * Esquemas de entrada de compras. El mismo esquema valida en el
 * cliente (feedback inmediato) y en el servidor (la que decide),
 * conforme a ARCHITECTURE.md §6.
 */

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

/** Un importe de componente: entero de centavos, puede ser negativo (se valida por tipo abajo). */
const componentAmountField = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int({ error: "El importe debe ser un número entero de centavos." }).default(0),
)

const componentsShape = Object.fromEntries(
  COST_COMPONENT_KEYS.map((key) => [key, componentAmountField]),
) as Record<(typeof COST_COMPONENT_KEYS)[number], typeof componentAmountField>

/** Cadena decimal exacta y positiva, como la exige `convertToUsd` de `lib/money.ts`. */
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

export const purchaseCreateSchema = z
  .object({
    vehicleId: objectIdField("El vehículo"),
    vendorId: objectIdField("El proveedor"),
    purchaseDate: z.coerce
      .date({ error: "La fecha de compra es obligatoria." })
      .max(todayEndOfDay(), { error: "La fecha de compra no puede ser futura." }),
    sourceType: z.enum(SOURCE_TYPE_VALUES, { error: "El origen es obligatorio." }),

    currency: z.enum(["USD", "MXN"], { error: "La moneda es obligatoria." }),
    exchangeRate: exchangeRateField,

    ...componentsShape,

    txType: z.enum(TX_TYPE_VALUES, { error: "El tipo de compra es obligatorio." }),
    correctsPurchaseId: z.preprocess(emptyToUndefined, z.string().trim().optional()),

    paymentMethod: z.preprocess(emptyToUndefined, z.enum(PAYMENT_METHOD_VALUES).optional()),
    referenceNumber: optionalText(80),
    lotNumber: optionalText(40),

    submissionToken: z
      .string({ error: "Falta el token de envío del formulario." })
      .trim()
      .min(1, { error: "Falta el token de envío del formulario." }),

    notes: optionalText(1000),
  })
  .superRefine((data, ctx) => {
    // El tipo de cambio en USD debe ser exactamente 1.
    if (data.currency === "USD" && data.exchangeRate !== "1") {
      ctx.addIssue({
        code: "custom",
        message: "Para compras en USD el tipo de cambio debe ser exactamente 1.",
        path: ["exchangeRate"],
      })
    }

    // Control de signo por tipo de compra.
    if (!allowsNegativeAmounts(data.txType)) {
      for (const key of COST_COMPONENT_KEYS) {
        if (data[key] < 0) {
          ctx.addIssue({
            code: "custom",
            message: "Solo las compras de tipo Ajuste admiten componentes negativos.",
            path: [key],
          })
        }
      }
    }

    // `Correction` exige señalar la compra que corrige.
    if (requiresCorrectionTarget(data.txType) && !data.correctsPurchaseId) {
      ctx.addIssue({
        code: "custom",
        message: "Indica qué compra corrige esta corrección.",
        path: ["correctsPurchaseId"],
      })
    }

    // Al menos un importe distinto de cero.
    const components = Object.fromEntries(COST_COMPONENT_KEYS.map((key) => [key, data[key]])) as Record<
      (typeof COST_COMPONENT_KEYS)[number],
      number
    >
    if (!hasAnyAmount(components)) {
      ctx.addIssue({
        code: "custom",
        message: "La compra debe tener al menos un importe distinto de cero.",
        path: ["purchasePrice"],
      })
    }
  })

export type PurchaseInput = z.infer<typeof purchaseCreateSchema>

export const voidPurchaseSchema = z.object({
  reason: z
    .string({ error: "El motivo es obligatorio." })
    .trim()
    .min(3, { error: "Describe el motivo de la anulación." })
    .max(500, { error: "El motivo admite como máximo 500 caracteres." }),
})
export type VoidPurchaseInput = z.infer<typeof voidPurchaseSchema>

/** Filtros del listado de compras. Todos opcionales. */
export const purchaseFiltersSchema = z.object({
  vehicleId: z.preprocess(emptyToUndefined, z.string().optional()),
  vendorId: z.preprocess(emptyToUndefined, z.string().optional()),
  txType: z.preprocess(emptyToUndefined, z.enum(TX_TYPE_VALUES).optional()),
  dateFrom: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  dateTo: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  includeVoided: z.preprocess(
    (value) => (value === "on" || value === "true" ? true : value === undefined ? false : value),
    z.boolean().default(false),
  ),
})
export type PurchaseFiltersInput = z.infer<typeof purchaseFiltersSchema>
