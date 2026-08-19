import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"
import { catalogFields, timestampsOption } from "../common-fields"

/**
 * Proveedor. Código `VEND-####`.
 *
 * Los cuatro datos de contacto son opcionales y ninguno es único: dos
 * proveedores pueden compartir teléfono (una subasta con varias
 * cuentas) sin que eso signifique nada.
 */
const vendorSchema = new Schema(
  {
    ...catalogFields,
    phone: { type: String, default: null, trim: true },
    email: { type: String, default: null, trim: true },
    city: { type: String, default: null, trim: true },
    notes: { type: String, default: null, trim: true },
  },
  timestampsOption,
)

vendorSchema.index({ nameKey: 1 }, { unique: true })
vendorSchema.index({ isActive: 1, name: 1 })

export type VendorDocument = InferSchemaType<typeof vendorSchema>

export const Vendor =
  (mongoose.models.Vendor as Model<VendorDocument> | undefined) ??
  mongoose.model<VendorDocument>("Vendor", vendorSchema, "vendors")
