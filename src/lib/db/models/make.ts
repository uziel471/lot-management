import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"
import { catalogFields, timestampsOption } from "../common-fields"

/** Marca de vehículo. Código `MAKE-####`. */
const makeSchema = new Schema({ ...catalogFields }, timestampsOption)

// `code` ya lleva su índice único en `catalogFields` (declararlo otra
// vez aquí generaría un índice duplicado). Falta el de nombre.
makeSchema.index({ nameKey: 1 }, { unique: true })
makeSchema.index({ isActive: 1, name: 1 })

export type MakeDocument = InferSchemaType<typeof makeSchema>

// Evita redefinir el modelo en cada hot reload de `next dev`.
export const Make =
  (mongoose.models.Make as Model<MakeDocument> | undefined) ??
  mongoose.model<MakeDocument>("Make", makeSchema, "makes")
