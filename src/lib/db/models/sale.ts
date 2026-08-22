import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"
import { auditableFields, timestampsOption } from "../common-fields"

const saleSchema = new Schema(
  {
    ...auditableFields,
    vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true },
    saleDate: { type: Date, required: true },
    buyerName: { type: String, required: true, trim: true },
    buyerPhone: { type: String, default: null, trim: true },
    buyerEmail: { type: String, default: null, trim: true },
    salePriceUsd: { type: Number, required: true },
    terms: { type: String, default: null, trim: true },
    referenceNumber: { type: String, default: null, trim: true },
    notes: { type: String, default: null, trim: true },
    submissionToken: { type: String, default: null },
    acquisitionCostUsd: { type: Number, required: true, default: 0 },
    repairCostUsd: { type: Number, required: true, default: 0 },
    vehicleExpenseCostUsd: { type: Number, required: true, default: 0 },
    totalCostUsd: { type: Number, required: true, default: 0 },
    profitUsd: { type: Number, required: true, default: 0 },
    roiNumerator: { type: Number, default: null },
    roiDenominator: { type: Number, default: null },
    acquisitionCount: { type: Number, required: true, default: 0 },
    repairCount: { type: Number, required: true, default: 0 },
    vehicleExpenseCount: { type: Number, required: true, default: 0 },
  },
  timestampsOption,
)

saleSchema.index({ vehicleId: 1, saleDate: -1 })
saleSchema.index({ saleDate: -1, code: -1 })
saleSchema.index({ buyerName: 1, saleDate: -1 })
saleSchema.index(
  { vehicleId: 1 },
  { unique: true, partialFilterExpression: { voidedAt: null } },
)
saleSchema.index({ submissionToken: 1 }, { unique: true, sparse: true })
saleSchema.index({ voidedAt: 1, saleDate: -1 })

export type SaleDocument = InferSchemaType<typeof saleSchema>

export const Sale =
  (mongoose.models.Sale as Model<SaleDocument> | undefined) ??
  mongoose.model<SaleDocument>("Sale", saleSchema, "sales")
