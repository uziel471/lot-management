import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Redirect optimista de rutas privadas: solo comprueba la presencia
 * de la cookie de sesión de Better Auth y redirige. NO consulta la
 * base de datos ni evalúa roles — la propia documentación de Next.js
 * advierte que el proxy no debe ser la solución de autorización. La
 * verificación real vive en `src/lib/auth/dal.ts` y se ejecuta junto
 * a cada consulta y cada escritura.
 */

const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Secure-better-auth.session_token" : "better-auth.session_token"

const PUBLIC_ROUTES = ["/login"]

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value)
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route)

  if (!hasSessionCookie && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", `${pathname}${search}`)
    return NextResponse.redirect(loginUrl)
  }

  if (hasSessionCookie && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Corre en todas las rutas excepto:
     * - api/auth (los propios endpoints de Better Auth)
     * - _next/static, _next/image (assets)
     * - favicon.ico y otros archivos con extensión en /public
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)",
  ],
}
