import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"
import { auditableFields, timestampsOption } from "../common-fields"
import {
  COST_COMPONENT_KEYS,
  PAYMENT_METHOD_VALUES,
  SOURCE_TYPE_VALUES,
  TX_TYPE_VALUES,
} from "@/features/purchases/enums"

/**
 * Compra. Código `PUR-####`. Ver design.md de `add-purchases`:
 *
 * - Los ocho componentes del costo van como campos con nombre, no
 *   como arreglo posicional (evita que reordenarlos corrompa lo
 *   capturado en silencio).
 * - `exchangeRate` se guarda como `Decimal128`: el tipo de cambio
 *   viaja siempre como cadena decimal exacta, nunca como `number`.
 * - MUST NOT declarar ningún campo de total: los totales se calculan
 *   al leer, en `domain.ts`, nunca en el motor de base de datos.
 * - La compra es inmutable una vez creada; la única operación
 *   posterior es anularla (campos de `auditableFields`).
 */
const costComponentFields = Object.fromEntries(
  COST_COMPONENT_KEYS.map((key) => [key, { type: Number, required: true, default: 0 }]),
)

const purchaseSchema = new Schema(
  {
    ...auditableFields,

    vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    purchaseDate: { type: Date, required: true },
    sourceType: { type: String, enum: [...SOURCE_TYPE_VALUES], required: true },

    currency: { type: String, enum: ["USD", "MXN"], required: true },
    /** MXN por 1 USD, congelado al capturar. Exactamente 1 cuando `currency` es USD. */
    exchangeRate: { type: Schema.Types.Decimal128, required: true },

    ...costComponentFields,

    txType: { type: String, enum: [...TX_TYPE_VALUES], required: true },
    /** Solo presente en compras `Correction`: la compra anulada que corrige. */
    correctsPurchaseId: { type: Schema.Types.ObjectId, ref: "Purchase", default: null },

    paymentMethod: { type: String, enum: [...PAYMENT_METHOD_VALUES], default: null },
    referenceNumber: { type: String, default: null, trim: true },
    /** Clave normalizada de `referenceNumber` (ver `domain.ts`, `toReferenceKey`). */
    referenceKey: { type: String, default: null },
    lotNumber: { type: String, default: null, trim: true },

    /** Token del envío del formulario: protección contra el doble guardado. */
    submissionToken: { type: String, default: null },

    notes: { type: String, default: null, trim: true },
  },
  timestampsOption,
)

// `code` ya lleva su índice único en `auditableFields`.
purchaseSchema.index({ vehicleId: 1, purchaseDate: -1 })
purchaseSchema.index({ vendorId: 1 })

/** A lo sumo una compra `Initial` vigente por vehículo (ver design.md). */
purchaseSchema.index(
  { vehicleId: 1 },
  { unique: true, partialFilterExpression: { txType: "initial", voidedAt: null } },
)

/** Un mismo proveedor no puede tener dos compras vigentes con la misma referencia. */
purchaseSchema.index(
  { vendorId: 1, referenceKey: 1 },
  { unique: true, partialFilterExpression: { referenceKey: { $type: "string" }, voidedAt: null } },
)

/** Protección contra guardado doble: un token de envío no puede crear dos compras. */
purchaseSchema.index({ submissionToken: 1 }, { unique: true, sparse: true })

export type PurchaseDocument = InferSchemaType<typeof purchaseSchema>

// Evita redefinir el modelo en cada hot reload de `next dev`.
export const Purchase =
  (mongoose.models.Purchase as Model<PurchaseDocument> | undefined) ??
  mongoose.model<PurchaseDocument>("Purchase", purchaseSchema, "purchases")
