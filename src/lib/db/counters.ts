import mongoose, { Schema } from "mongoose"
import { dbConnect } from "./client"

interface CounterDocument {
  _id: string
  seq: number
}

const counterSchema = new Schema<CounterDocument>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false },
)

// Evita redefinir el modelo en cada hot reload de `next dev`.
export const Counter =
  (mongoose.models.Counter as mongoose.Model<CounterDocument> | undefined) ??
  mongoose.model<CounterDocument>("Counter", counterSchema, "counters")

const CODE_DIGITS = 4

/**
 * Emite el siguiente código legible de una secuencia, con la forma
 * `<PREFIJO>-<NNNN>`. Atómico: usa `findOneAndUpdate` + `$inc` sobre
 * la colección `counters`, que el motor de MongoDB garantiza atómico
 * sin necesidad de locks ni transacciones.
 *
 * Debe invocarse solo dentro de la operación que persiste el
 * registro, después de validar: si la validación falla antes de
 * llamar a `nextCode`, no se consume ningún número.
 */
export async function nextCode(prefix: string): Promise<string> {
  await dbConnect()
  const counter = await Counter.findOneAndUpdate(
    { _id: prefix },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  ).lean()

  const seq = counter!.seq
  const padded = String(seq).padStart(CODE_DIGITS, "0")
  return `${prefix}-${padded}`
}
