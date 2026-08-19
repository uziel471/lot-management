import Link from "next/link"
import { verifySession } from "@/lib/auth/dal"
import { signOutAction } from "@/features/auth/actions"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/toast"

/**
 * Shell de todo lo que exige sesión. Ejecuta `verifySession()` una
 * sola vez para el árbol completo (no decide permisos por recurso:
 * eso lo hace cada `queries.ts`/`actions.ts` con `requireRole()`).
 *
 * Forzado a dinámico: es un panel privado por usuario (ver
 * ARCHITECTURE.md §6, "Caché"), y sin esto Next intentaría
 * pre-renderizar estas rutas en build, ejecutando `verifySession()`
 * (y su conexión a MongoDB) durante el build en lugar de en cada
 * petición.
 */
export const dynamic = "force-dynamic"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await verifySession()
  const isAdmin = user.role === "admin"

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="font-semibold">
            LOTE VEHICULOS
          </Link>
          <Link href="/vehiculos" className="text-muted-foreground hover:text-foreground">
            Vehículos
          </Link>
          <Link href="/catalogos" className="text-muted-foreground hover:text-foreground">
            Catálogos
          </Link>
          {isAdmin ? (
            <Link href="/usuarios" className="text-muted-foreground hover:text-foreground">
              Usuarios
            </Link>
          ) : null}
          <Link href="/cuenta" className="text-muted-foreground hover:text-foreground">
            Mi cuenta
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            {user.name} · {user.role}
          </span>
          <form action={signOutAction}>
            <Button type="submit" variant="outline" size="sm">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-4">{children}</main>
      <Toaster />
    </div>
  )
}
