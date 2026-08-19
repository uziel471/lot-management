/**
 * Realinea cada contador de código con el código más alto que existe
 * de verdad en su colección.
 *
 * Existe porque la carga inicial de datos entra directo a la base y no
 * pasa por `nextCode()`: sin esto, `counters` se queda en cero
 * mientras la colección ya tiene `MAKE-0011`, y la primera alta hecha
 * desde la interfaz pide `MAKE-0001` y muere contra el índice único
 * con un error del motor que no explica nada.
 *
 * No lleva ningún número escrito a mano: los deriva de la base, así
 * que correrlo dos veces no cambia nada y nunca baja un contador que
 * ya esté por encima.
 *
 * Uso:
 *   pnpm seed:counters
 */
import "dotenv/config"
import mongoose from "mongoose"
import { dbConnect } from "../src/lib/db/client"
import { Counter } from "../src/lib/db/counters"
import { listCatalogs } from "../src/features/catalogs/registry"
import { Vehicle } from "../src/lib/db/models/vehicle"

/** Prefijo del contador de vehículos, fuera del registro de catálogos. */
const VEHICLE_CODE_PREFIX = "VEH"

/** Extrae el número de un código `PREFIJO-NNNN`. Devuelve 0 si no encaja. */
function sequenceOf(code: string, prefix: string): number {
  if (!code.startsWith(`${prefix}-`)) return 0
  const parsed = Number.parseInt(code.slice(prefix.length + 1), 10)
  return Number.isFinite(parsed) ? parsed : 0
}

export type CounterRealignment = {
  prefix: string
  previous: number
  highest: number
  updated: boolean
  documents: number
}

/**
 * Deja cada contador de catálogo en el código más alto realmente
 * presente, sin bajarlo nunca. Se exporta para poder probarlo.
 */
export async function realignCounters(): Promise<CounterRealignment[]> {
  await dbConnect()
  const report: CounterRealignment[] = []

  for (const definition of listCatalogs()) {
    const documents = (await definition.model
      .find({})
      .select({ code: 1 })
      .lean()) as unknown as { code: string }[]

    const highest = documents.reduce(
      (max, document) => Math.max(max, sequenceOf(document.code, definition.codePrefix)),
      0,
    )

    const counter = await Counter.findById(definition.codePrefix).lean()
    const current = counter?.seq ?? 0

    if (highest > current) {
      await Counter.updateOne(
        { _id: definition.codePrefix },
        { $set: { seq: highest } },
        { upsert: true },
      )
    }

    report.push({
      prefix: definition.codePrefix,
      previous: current,
      highest,
      updated: highest > current,
      documents: documents.length,
    })
  }

  // `vehicles` no vive en el registro de catálogos (no es un
  // catálogo), así que se realinea aparte con la misma lógica.
  const vehicleDocuments = (await Vehicle.find({})
    .select({ code: 1 })
    .lean()) as unknown as { code: string }[]

  const highestVehicle = vehicleDocuments.reduce(
    (max, document) => Math.max(max, sequenceOf(document.code, VEHICLE_CODE_PREFIX)),
    0,
  )
  const vehicleCounter = await Counter.findById(VEHICLE_CODE_PREFIX).lean()
  const currentVehicle = vehicleCounter?.seq ?? 0

  if (highestVehicle > currentVehicle) {
    await Counter.updateOne(
      { _id: VEHICLE_CODE_PREFIX },
      { $set: { seq: highestVehicle } },
      { upsert: true },
    )
  }

  report.push({
    prefix: VEHICLE_CODE_PREFIX,
    previous: currentVehicle,
    highest: highestVehicle,
    updated: highestVehicle > currentVehicle,
    documents: vehicleDocuments.length,
  })

  return report
}

async function main() {
  const report = await realignCounters()

  for (const line of report) {
    console.log(
      line.updated
        ? `${line.prefix}: contador ${line.previous} → ${line.highest} (${line.documents} registros)`
        : `${line.prefix}: contador ya en ${line.previous}, código más alto presente ${line.highest}. Sin cambios.`,
    )
  }

  await mongoose.disconnect()
}

// Solo se ejecuta cuando se invoca el script; importarlo desde un
// test no dispara nada.
if (process.argv[1]?.includes("seed-counters")) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
