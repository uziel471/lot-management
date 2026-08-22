import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"
import { auditableFields, timestampsOption } from "../common-fields"
import {
  PAYMENT_EVIDENCE_TYPE_VALUES,
  PAYMENT_METHOD_VALUES,
  PAYMENT_SOURCE_TYPE_VALUES,
} from "@/features/payments/enums"

const paymentEvidenceSchema = new Schema(
  {
    type: { type: String, enum: [...PAYMENT_EVIDENCE_TYPE_VALUES], required: true },
    label: { type: String, default: null, trim: true },
    url: { type: String, default: null, trim: true },
    notes: { type: String, default: null, trim: true },
  },
  { _id: false },
)

const paymentApplicationSchema = new Schema(
  {
    sourceType: { type: String, enum: [...PAYMENT_SOURCE_TYPE_VALUES], required: true },
    sourceId: { type: Schema.Types.ObjectId, required: true },
    sourceCode: { type: String, required: true, trim: true },
    appliedAmount: { type: Number, required: true },
    appliedUsd: { type: Number, required: true },
    sourceTotalUsdSnapshot: { type: Number, required: true },
    sourcePendingUsdSnapshot: { type: Number, required: true },
  },
  { _id: false },
)

const paymentSchema = new Schema(
  {
    ...auditableFields,
    paymentDate: { type: Date, required: true },
    providerId: { type: Schema.Types.ObjectId, ref: "Vendor", default: null },
    currency: { type: String, enum: ["USD", "MXN"], required: true },
    exchangeRate: { type: Schema.Types.Decimal128, required: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: [...PAYMENT_METHOD_VALUES], required: true },
    referenceNumber: { type: String, default: null, trim: true },
    accountLabel: { type: String, default: null, trim: true },
    submissionToken: { type: String, default: null },
    evidence: { type: [paymentEvidenceSchema], required: true, default: [] },
    applications: { type: [paymentApplicationSchema], required: true, default: [] },
    notes: { type: String, default: null, trim: true },
  },
  timestampsOption,
)

paymentSchema.index({ paymentDate: -1 })
paymentSchema.index({ providerId: 1 })
paymentSchema.index({ "applications.sourceType": 1, "applications.sourceId": 1 })
paymentSchema.index({ voidedAt: 1 })
paymentSchema.index({ submissionToken: 1 }, { unique: true, sparse: true })

export type PaymentDocument = InferSchemaType<typeof paymentSchema>

export const Payment =
  (mongoose.models.Payment as Model<PaymentDocument> | undefined) ??
  mongoose.model<PaymentDocument>("Payment", paymentSchema, "payments")
