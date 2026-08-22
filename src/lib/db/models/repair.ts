import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"
import { auditableFields, timestampsOption } from "../common-fields"
import {
  REPAIR_CATEGORY_VALUES,
  REPAIR_COST_COMPONENT_KEYS,
  REPAIR_STATUS_VALUES,
} from "@/features/repairs/enums"

const repairStatusHistoryEntrySchema = new Schema(
  {
    previousStatus: { type: String, enum: [...REPAIR_STATUS_VALUES], default: null },
    nextStatus: { type: String, enum: [...REPAIR_STATUS_VALUES], required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "user", required: true },
    changedAt: { type: Date, required: true, default: Date.now },
    note: { type: String, default: null, trim: true },
  },
  { _id: false },
)

const repairCostFields = Object.fromEntries(
  REPAIR_COST_COMPONENT_KEYS.map((key) => [key, { type: Number, required: true, default: 0 }]),
)

const repairSchema = new Schema(
  {
    ...auditableFields,
    vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", default: null },
    category: { type: String, enum: [...REPAIR_CATEGORY_VALUES], required: true },
    status: { type: String, enum: [...REPAIR_STATUS_VALUES], required: true },
    openedAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
    completedBy: { type: Schema.Types.ObjectId, ref: "user", default: null },
    completionNote: { type: String, default: null, trim: true },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "user", default: null },
    cancellationReason: { type: String, default: null, trim: true },
    currency: { type: String, enum: ["USD", "MXN"], required: true },
    exchangeRate: { type: Schema.Types.Decimal128, required: true },
    ...repairCostFields,
    description: { type: String, required: true, trim: true },
    referenceNumber: { type: String, default: null, trim: true },
    workOrderNumber: { type: String, default: null, trim: true },
    submissionToken: { type: String, default: null },
    notes: { type: String, default: null, trim: true },
    statusHistory: { type: [repairStatusHistoryEntrySchema], required: true, default: [] },
  },
  timestampsOption,
)

repairSchema.index({ vehicleId: 1, openedAt: -1 })
repairSchema.index({ vehicleId: 1, status: 1, openedAt: -1 })
repairSchema.index({ vendorId: 1, openedAt: -1 })
repairSchema.index({ status: 1, openedAt: -1 })
repairSchema.index({ category: 1, openedAt: -1 })
repairSchema.index({ submissionToken: 1 }, { unique: true, sparse: true })

export type RepairDocument = InferSchemaType<typeof repairSchema>

export const Repair =
  (mongoose.models.Repair as Model<RepairDocument> | undefined) ??
  mongoose.model<RepairDocument>("Repair", repairSchema, "repairs")
