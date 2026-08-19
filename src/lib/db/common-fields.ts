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

/**
 * Campos comunes de todo documento de catálogo: código, nombre, clave
 * de nombre normalizada, estado, autoría y retiro.
 *
 * `nameKey` es un campo derivado de `name` (ver
 * `features/catalogs/domain.ts`): recorta, colapsa espacios internos,
 * quita acentos y pasa a minúsculas. La unicidad de nombre se
 * garantiza con un índice único sobre él —compuesto con `makeId` en
 * el caso de modelos—, no con una collation, que resolvería
 * mayúsculas y acentos pero no los espacios sobrantes.
 *
 * `deactivatedAt` / `deactivatedBy` son al retiro de un catálogo lo
 * que `voidedAt` / `voidedBy` son a la anulación de una transacción:
 * una entrada de catálogo no se anula ni se borra, se retira. Por eso
 * no se reutiliza `auditableFields` tal cual: `voidReason` nombraría
 * mal lo que aquí es un retiro.
 *
 * Se combinan siempre con `timestampsOption`, que es lo que completa
 * la regla de trazabilidad del spec `project` (quién y cuándo).
 */
export const catalogFields = {
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  nameKey: { type: String, required: true },
  isActive: { type: Boolean, required: true, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "user", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "user", required: true },
  deactivatedAt: { type: Date, default: null },
  deactivatedBy: { type: Schema.Types.ObjectId, ref: "user", default: null },
} as const

export const timestampsOption = { timestamps: true } as const
