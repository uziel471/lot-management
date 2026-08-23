import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"
import { auditableFields, timestampsOption } from "../common-fields"
import {
  BODY_STYLE_VALUES,
  DRIVETRAIN_VALUES,
  FUEL_TYPE_VALUES,
  MILEAGE_UNIT_VALUES,
  TITLE_STATUS_VALUES,
  TRANSMISSION_VALUES,
} from "@/features/vehicles/enums"

/**
 * Historial de cambios de estatus, embebido en el vehículo (ver
 * design.md, "El historial de estatus va embebido en el vehículo"):
 * acotado, siempre leído junto a su padre, nunca consultado por
 * separado. La entrada inicial se crea en la misma alta, con
 * `previousStatusId` en `null`.
 */
const statusHistoryEntrySchema = new Schema(
  {
    previousStatusId: { type: Schema.Types.ObjectId, ref: "VehicleStatus", default: null },
    newStatusId: { type: Schema.Types.ObjectId, ref: "VehicleStatus", required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "user", required: true },
    changedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
)

/**
 * Vehículo. Código `VEH-####`. Veintitrés campos de captura (ver
 * proposal.md), de los cuales solo cinco son obligatorios: `makeId`,
 * `modelId`, `year`, `statusId` y `dateReceived`. El resto se completa
 * después, sin fricción, incluidos el VIN y el número de inventario.
 */
const vehicleSchema = new Schema(
  {
    ...auditableFields,

    // Identificación (5)
    makeId: { type: Schema.Types.ObjectId, ref: "Make", required: true },
    modelId: { type: Schema.Types.ObjectId, ref: "Model", required: true },
    year: { type: Number, required: true },
    vin: { type: String, default: null },
    stockNumber: { type: String, default: null },

    // Ficha técnica (9)
    trim: { type: String, default: null, trim: true },
    bodyStyle: { type: String, enum: [...BODY_STYLE_VALUES], default: null },
    exteriorColor: { type: String, default: null, trim: true },
    interiorColor: { type: String, default: null, trim: true },
    mileage: { type: Number, default: null },
    mileageUnit: { type: String, enum: [...MILEAGE_UNIT_VALUES], default: null },
    transmission: { type: String, enum: [...TRANSMISSION_VALUES], default: null },
    fuelType: { type: String, enum: [...FUEL_TYPE_VALUES], default: null },
    drivetrain: { type: String, enum: [...DRIVETRAIN_VALUES], default: null },

    // Título (3)
    titleStatus: { type: String, enum: [...TITLE_STATUS_VALUES], default: null },
    titleNumber: { type: String, default: null, trim: true },
    titleInHand: { type: Boolean, required: true, default: false },

    // Inventario y ubicación (4, más el historial)
    statusId: { type: Schema.Types.ObjectId, ref: "VehicleStatus", required: true },
    statusHistory: { type: [statusHistoryEntrySchema], required: true, default: [] },
    dateReceived: { type: Date, required: true },
    dateListed: { type: Date, default: null },
    lotLocation: { type: String, default: null, trim: true },

    // Precio y notas (2)
    /** Centavos de dólar (ver `lib/money.ts`). Sin tipo de cambio: no es una transacción. */
    askingPrice: { type: Number, default: null },
    askingPriceUpdatedAt: { type: Date, default: null },
    askingPriceUpdatedBy: { type: Schema.Types.ObjectId, ref: "user", default: null },
    notes: { type: String, default: null, trim: true },
  },
  timestampsOption,
)

// `code` ya lleva su índice único en `auditableFields`.
vehicleSchema.index(
  { vin: 1 },
  { unique: true, partialFilterExpression: { vin: { $type: "string" } } },
)
vehicleSchema.index(
  { stockNumber: 1 },
  { unique: true, partialFilterExpression: { stockNumber: { $type: "string" } } },
)
vehicleSchema.index({ statusId: 1, dateReceived: -1 })
vehicleSchema.index({ makeId: 1, modelId: 1 })
vehicleSchema.index({ voidedAt: 1, dateReceived: -1 })

export type VehicleDocument = InferSchemaType<typeof vehicleSchema>

// Evita redefinir el modelo en cada hot reload de `next dev`.
export const Vehicle =
  (mongoose.models.Vehicle as Model<VehicleDocument> | undefined) ??
  mongoose.model<VehicleDocument>("Vehicle", vehicleSchema, "vehicles")
