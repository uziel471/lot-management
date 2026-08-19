import { Schema } from "mongoose"

/**
 * Campos comunes de todo documento transaccional (ver ARCHITECTURE.md
 * §4.1): código legible, autoría y anulación (nunca borrado físico).
 * Se mezclan en el esquema de cada modelo de negocio con
 * `new Schema({ ...auditableFields, ...camposPropios }, timestampsOption)`.
 */
export const auditableFields = {
  code: { type: String, required: true, unique: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "user", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "user", required: true },
  voidedAt: { type: Date, default: null },
  voidedBy: { type: Schema.Types.ObjectId, ref: "user", default: null },
  voidReason: { type: String, default: null },
} as const

/** Campos comunes de todo documento de catálogo: código, nombre y estado. */
export const catalogFields = {
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  isActive: { type: Boolean, required: true, default: true },
} as const

export const timestampsOption = { timestamps: true } as const
