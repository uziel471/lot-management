import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"
import { catalogFields, timestampsOption } from "../common-fields"

/**
 * Estatus de vehículo. Código `STATUS-####`.
 *
 * `sortOrder` es el orden real de presentación, independiente del
 * código y de la fecha de alta: los diez estatus del sistema anterior
 * van de 10 en 10 justamente para poder intercalar (el 45 de "On
 * Hold", que fue el último dado de alta, va entre el 40 y el 50).
 * Dos estatus pueden compartir orden; en ese caso desempata el
 * nombre, y por eso el índice es compuesto.
 */
const vehicleStatusSchema = new Schema(
  {
    ...catalogFields,
    sortOrder: { type: Number, required: true },
    description: { type: String, default: null, trim: true },
  },
  timestampsOption,
)

vehicleStatusSchema.index({ nameKey: 1 }, { unique: true })
vehicleStatusSchema.index({ sortOrder: 1, name: 1 })

export type VehicleStatusDocument = InferSchemaType<typeof vehicleStatusSchema>

export const VehicleStatus =
  (mongoose.models.VehicleStatus as Model<VehicleStatusDocument> | undefined) ??
  mongoose.model<VehicleStatusDocument>("VehicleStatus", vehicleStatusSchema, "vehiclestatuses")
