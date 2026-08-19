import { toNextJsHandler } from "better-auth/next-js"
import { getAuth } from "@/lib/auth/auth"

/**
 * Único handler REST que necesita esta fase: expone todos los
 * endpoints de Better Auth (`/api/auth/sign-in/email`,
 * `/api/auth/sign-out`, `/api/auth/admin/*`, etc.) bajo un solo
 * catch-all, tal como recomienda su integración con Next.js.
 */
async function handler(request: Request) {
  const auth = await getAuth()
  const { GET, POST } = toNextJsHandler(auth)
  return request.method === "GET" ? GET(request) : POST(request)
}

export { handler as GET, handler as POST }
