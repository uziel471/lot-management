import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"
import { catalogFields, timestampsOption } from "../common-fields"

/**
 * Modelo de vehículo. Código `MODEL-####`. Pertenece a exactamente
 * una marca: la unicidad de nombre se evalúa dentro de ella, no en
 * todo el catálogo ("Sonata" puede existir bajo dos marcas).
 */
const modelSchema = new Schema(
  {
    ...catalogFields,
    makeId: { type: Schema.Types.ObjectId, ref: "Make", required: true },
  },
  timestampsOption,
)

modelSchema.index({ makeId: 1, nameKey: 1 }, { unique: true })
modelSchema.index({ makeId: 1, isActive: 1, name: 1 })

export type ModelDocument = InferSchemaType<typeof modelSchema>

export const VehicleModel =
  (mongoose.models.Model as Model<ModelDocument> | undefined) ??
  mongoose.model<ModelDocument>("Model", modelSchema, "models")
