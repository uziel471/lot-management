import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"
import { timestampsOption } from "../common-fields"

const vehicleImageSchema = new Schema(
  {
    vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true },
    storageBucket: { type: String, required: true, trim: true },
    storagePath: { type: String, required: true, trim: true },
    originalFileName: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    byteSize: { type: Number, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "user", required: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "user", default: null },
    deleteError: { type: String, default: null, trim: true },
  },
  timestampsOption,
)

vehicleImageSchema.index({ vehicleId: 1, deletedAt: 1, createdAt: -1 })
vehicleImageSchema.index({ vehicleId: 1, storagePath: 1 }, { unique: true })

export type VehicleImageDocument = InferSchemaType<typeof vehicleImageSchema>

export const VehicleImage =
  (mongoose.models.VehicleImage as Model<VehicleImageDocument> | undefined) ??
  mongoose.model<VehicleImageDocument>("VehicleImage", vehicleImageSchema, "vehicleImages")
