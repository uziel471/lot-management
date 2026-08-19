/**
 * Alta del primer usuario `admin` sobre una base de datos vacía.
 * Idempotente: si ya existe un admin, no crea uno segundo.
 *
 * Uso:
 *   SEED_ADMIN_NAME="Nombre" SEED_ADMIN_EMAIL="admin@lote.com" \
 *   SEED_ADMIN_PASSWORD="contraseña-segura" pnpm seed:admin
 */
import "dotenv/config"
import mongoose from "mongoose"
import { dbConnect } from "../src/lib/db/client"
import { getAuth } from "../src/lib/auth/auth"

async function main() {
  const name = process.env.SEED_ADMIN_NAME
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD

  if (!name || !email || !password) {
    console.error(
      "Faltan variables. Define SEED_ADMIN_NAME, SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD antes de ejecutar este script.",
    )
    process.exitCode = 1
    return
  }

  if (password.length < 8) {
    console.error("SEED_ADMIN_PASSWORD debe tener al menos 8 caracteres.")
    process.exitCode = 1
    return
  }

  await dbConnect()

  // Se consulta la colección nativa de Better Auth directamente: no
  // hay sesión (es un script de arranque), y `auth.api.listUsers`
  // exige una sesión de admin, que todavía no existe.
  const existingAdmin = await mongoose.connection.collection("user").findOne({
    role: "admin",
    banned: { $ne: true },
  })

  if (existingAdmin) {
    console.log("Ya existe un administrador activo. No se creó ningún usuario.")
    await mongoose.disconnect()
    return
  }

  const auth = await getAuth()
  // Llamado sin `headers`: `auth.api.createUser` permite crear el
  // primer usuario sin sesión cuando no hay contexto de petición.
  await auth.api.createUser({
    body: { name, email, password, role: "admin" },
  })

  console.log(`Administrador creado: ${email}`)
  await mongoose.disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
