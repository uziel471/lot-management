import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose from "mongoose"
import { afterAll, afterEach, beforeAll } from "vitest"

/**
 * Levanta un MongoDB en memoria para las pruebas de integración y lo
 * tumba al terminar. Los tests unitarios puros (money.test.ts) no
 * usan la base y no se ven afectados por este setup.
 */

let mongod: MongoMemoryServer | undefined

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  const uri = mongod.getUri()
  process.env.MONGODB_URI = uri
  process.env.MONGODB_DB = "lotManagement_test"
  process.env.BETTER_AUTH_SECRET ??= "test-secret-do-not-use-in-production"
  process.env.BETTER_AUTH_URL ??= "http://localhost:3000"

  await mongoose.connect(uri, { dbName: "lotManagement_test" })
}, 60_000)

afterEach(async () => {
  const collections = mongoose.connection.collections
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})))
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod?.stop()
})
