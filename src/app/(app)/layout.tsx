import { verifySession } from "@/lib/auth/dal"
import { signOutAction } from "@/features/auth/actions"
import { AppHeader } from "@/components/app/app-header"
import { AppShell } from "@/components/app/app-shell"
import { getAppNavigation } from "@/components/app/app-navigation"
import { AppSidebar } from "@/components/app/app-sidebar"
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
  const navigationItems = getAppNavigation(user.role)

  return (
    <>
      <AppShell
        sidebar={<AppSidebar items={navigationItems} />}
        header={
          <AppHeader
            items={navigationItems}
            userName={user.name}
            userRole={user.role}
            signOutAction={signOutAction}
          />
        }
      >
        {children}
      </AppShell>
      <Toaster />
    </>
  )
}
