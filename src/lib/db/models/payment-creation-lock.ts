import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"

const paymentCreationLockSchema = new Schema(
  {
    sourceKey: { type: String, required: true, trim: true },
    token: { type: String, required: true, trim: true },
    expiresAt: { type: Date, required: true },
  },
  {
    versionKey: false,
    timestamps: { createdAt: true, updatedAt: false },
  },
)

paymentCreationLockSchema.index({ sourceKey: 1 }, { unique: true })
paymentCreationLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export type PaymentCreationLockDocument = InferSchemaType<typeof paymentCreationLockSchema>

export const PaymentCreationLock =
  (mongoose.models.PaymentCreationLock as Model<PaymentCreationLockDocument> | undefined) ??
  mongoose.model<PaymentCreationLockDocument>(
    "PaymentCreationLock",
    paymentCreationLockSchema,
    "payment_creation_locks",
  )
