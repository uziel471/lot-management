import Link from "next/link"
import { Building2, CircleUserRound, LogOut } from "lucide-react"

import { AppMobileMenu } from "@/components/app/app-mobile-menu"
import type { AppNavigationItem } from "@/components/app/app-navigation"
import { Button } from "@/components/ui/button"

export function AppHeader({
  items,
  userName,
  userRole,
  signOutAction,
}: {
  items: AppNavigationItem[]
  userName: string
  userRole: string
  signOutAction: () => Promise<void>
}) {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <AppMobileMenu
            items={items}
            userName={userName}
            userRole={userRole}
            signOutAction={signOutAction}
          />

          <div className="flex min-w-0 flex-col">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold md:hidden">
              <Building2 className="size-4" />
              <span>LOTE VEHICULOS</span>
            </Link>
            <p className="hidden text-sm font-medium md:block">Administracion del lote</p>
            <p className="text-xs text-muted-foreground">Operaciones autenticadas</p>
          </div>
        </div>

        <div className="hidden items-center gap-3 text-sm md:flex">
          <Button variant="ghost" size="sm" render={<Link href="/cuenta" />}>
            <CircleUserRound className="size-4" />
            <span className="max-w-52 truncate">{userName}</span>
            <span className="text-muted-foreground">{userRole}</span>
          </Button>
          <form action={signOutAction}>
            <Button type="submit" variant="outline" size="sm">
              <LogOut className="size-4" />
              <span>Cerrar sesion</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
