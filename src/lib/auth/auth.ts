import { betterAuth } from "better-auth"
import { mongodbAdapter } from "@better-auth/mongo-adapter"
import { admin } from "better-auth/plugins"
import { nextCookies } from "better-auth/next-js"
import { getMongoClient, getMongoDb } from "@/lib/db/client"
import { ac, roles } from "./permissions"

/**
 * `betterAuth()` necesita el `Db` nativo de MongoDB, que solo está
 * disponible después de que Mongoose termine de conectar. Por eso el
 * módulo expone `getAuth()` (lazy, cacheada) en lugar de construir la
 * instancia al importar el módulo: así las variables de entorno
 * (incluida la URI de `mongodb-memory-server` en los tests de
 * integración) solo se necesitan al momento de la primera llamada,
 * no al momento del `import`.
 *
 * El adaptador recibe el `MongoClient` que ya expone la conexión de
 * Mongoose (`mongoose.connection.getClient()`), para no abrir un
 * segundo pool contra el mismo clúster (ver design.md).
 *
 * `transaction: false` porque el despliegue de referencia (MongoDB
 * local sin replica set) no soporta transacciones multi-documento.
 * Si el clúster de producción es una replica set (p. ej. Atlas), se
 * puede cambiar a `transaction: true` con seguridad.
 */
async function buildAuth() {
  const [db, client] = await Promise.all([getMongoDb(), getMongoClient()])

  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    database: mongodbAdapter(db, { client, transaction: false }),
    emailAndPassword: {
      enabled: true,
      // No hay recuperación de contraseña por correo en esta fase
      // (ver design.md, Non-Goals): el restablecimiento lo hace un
      // admin desde /usuarios.
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 días
      updateAge: 60 * 60 * 24, // se renueva con actividad, una vez al día
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          input: false,
          defaultValue: "capturista",
        },
      },
    },
    plugins: [
      admin({
        defaultRole: "capturista",
        adminRoles: ["admin"],
        ac,
        roles,
        bannedUserMessage: "Este usuario está desactivado. Contacta a un administrador.",
      }),
      // Debe ser el último plugin: sincroniza las cookies que
      // devuelven los endpoints de Better Auth con `next/headers`
      // cuando se llaman desde Server Actions y Server Components.
      nextCookies(),
    ],
  })
}

type AuthInstance = Awaited<ReturnType<typeof buildAuth>>

// Cacheada en `globalThis` para reutilizar la misma instancia entre
// imports y sobrevivir al hot reload de `next dev`.
declare global {
  var __authPromise: Promise<AuthInstance> | undefined
}

export type Auth = AuthInstance

/** Devuelve la instancia de Better Auth, construyéndola de forma perezosa la primera vez. */
export async function getAuth(): Promise<Auth> {
  if (!globalThis.__authPromise) {
    globalThis.__authPromise = buildAuth().catch((error) => {
      // Si falló, no se cachea la promesa rechazada: la próxima
      // llamada puede reintentar (útil en tests, donde las variables
      // de entorno se fijan justo antes de la primera llamada).
      globalThis.__authPromise = undefined
      throw error
    })
  }
  return globalThis.__authPromise
}
