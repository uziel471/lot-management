import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"
import { auditableFields, timestampsOption } from "../common-fields"
import {
  EXPENSE_CATEGORY_VALUES,
  EXPENSE_COMPONENT_KEYS,
  EXPENSE_EVIDENCE_TYPE_VALUES,
  PAYMENT_METHOD_VALUES,
} from "@/features/expenses/enums"

const expenseComponentFields = Object.fromEntries(
  EXPENSE_COMPONENT_KEYS.map((key) => [key, { type: Number, required: true, default: 0 }]),
)

const evidenceSchema = new Schema(
  {
    type: { type: String, enum: [...EXPENSE_EVIDENCE_TYPE_VALUES], default: null },
    label: { type: String, default: null, trim: true },
    url: { type: String, default: null, trim: true },
  },
  { _id: false },
)

const expenseSchema = new Schema(
  {
    ...auditableFields,
    vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", default: null },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", default: null },
    category: { type: String, enum: [...EXPENSE_CATEGORY_VALUES], required: true },
    expenseDate: { type: Date, required: true },
    currency: { type: String, enum: ["USD", "MXN"], required: true },
    exchangeRate: { type: Schema.Types.Decimal128, required: true },
    ...expenseComponentFields,
    paymentMethod: { type: String, enum: [...PAYMENT_METHOD_VALUES], default: null },
    referenceNumber: { type: String, default: null, trim: true },
    evidence: { type: evidenceSchema, required: true, default: () => ({ type: null, label: null, url: null }) },
    submissionToken: { type: String, default: null },
    notes: { type: String, default: null, trim: true },
  },
  timestampsOption,
)

expenseSchema.index({ expenseDate: -1, code: -1 })
expenseSchema.index({ vehicleId: 1, expenseDate: -1 })
expenseSchema.index({ vendorId: 1, expenseDate: -1 })
expenseSchema.index({ category: 1, expenseDate: -1 })
expenseSchema.index({ paymentMethod: 1, expenseDate: -1 })
expenseSchema.index({ submissionToken: 1 }, { unique: true, sparse: true })

export type ExpenseDocument = InferSchemaType<typeof expenseSchema>

export const Expense =
  (mongoose.models.Expense as Model<ExpenseDocument> | undefined) ??
  mongoose.model<ExpenseDocument>("Expense", expenseSchema, "expenses")
