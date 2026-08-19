import mongoose from "mongoose"

type MongooseCache = {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

// Cacheado en `globalThis` para sobrevivir al hot reload de `next dev`,
// que de otra forma reejecutaría este módulo en cada recarga y abriría
// una conexión nueva por cada una.
declare global {
  var __mongooseCache: MongooseCache | undefined
}

const cache: MongooseCache = globalThis.__mongooseCache ?? { conn: null, promise: null }
if (process.env.NODE_ENV !== "production") {
  globalThis.__mongooseCache = cache
}

function readEnv() {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB
  if (!uri) {
    throw new Error("Falta la variable de entorno MONGODB_URI.")
  }
  if (!dbName) {
    throw new Error("Falta la variable de entorno MONGODB_DB.")
  }
  return { uri, dbName }
}

/**
 * Conecta (o reutiliza la conexión cacheada) a MongoDB vía Mongoose.
 *
 * Las variables de entorno se leen dentro de la función, no al
 * importar el módulo: así los tests pueden fijar `MONGODB_URI` en un
 * `beforeAll` (con el URI de `mongodb-memory-server`) antes de la
 * primera conexión, sin depender del orden de evaluación de imports.
 */
export async function dbConnect(): Promise<typeof mongoose> {
  if (cache.conn) {
    return cache.conn
  }

  if (!cache.promise) {
    const { uri, dbName } = readEnv()
    cache.promise = mongoose
      .connect(uri, { dbName, bufferCommands: false })
      .then((m) => m)
      .catch((error) => {
        cache.promise = null
        throw error
      })
  }

  cache.conn = await cache.promise
  return cache.conn
}

/**
 * Expone el `MongoClient` nativo que ya usa Mongoose, para que Better
 * Auth (cuyo adaptador de Mongo usa el driver nativo) no abra una
 * segunda conexión al mismo clúster.
 */
export async function getMongoClient() {
  const m = await dbConnect()
  return m.connection.getClient()
}

/** Expone la base de datos nativa (`Db`) que usa el adaptador de Better Auth. */
export async function getMongoDb() {
  const { dbName } = readEnv()
  const client = await getMongoClient()
  return client.db(dbName)
}
