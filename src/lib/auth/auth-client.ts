"use client"

import { createAuthClient } from "better-auth/react"
import { adminClient } from "better-auth/client/plugins"

// Sin `baseURL`: el cliente usa el origen actual, que es correcto
// porque la API de Better Auth vive en la misma app Next.js.
export const authClient = createAuthClient({
  plugins: [adminClient()],
})

export const { signIn, signOut, useSession } = authClient
