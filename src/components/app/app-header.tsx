import Link from "next/link"
import { Suspense } from "react"
import { Building2, CircleUserRound, LogOut, Menu } from "lucide-react"

import { AppNavLinks } from "@/components/app/app-nav-links"
import type { AppNavigationItem } from "@/components/app/app-navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

function AppNavFallback({ items }: { items: AppNavigationItem[] }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Navegacion principal">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

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
          <Dialog>
            <DialogTrigger
              render={
                <Button variant="outline" size="icon-sm" className="md:hidden" aria-label="Abrir menu">
                  <Menu className="size-4" />
                </Button>
              }
            />
            <DialogContent className="top-0 left-0 h-dvh w-[min(20rem,calc(100vw-1rem))] translate-x-0 translate-y-0 rounded-none border-r p-0">
              <DialogHeader className="border-b px-4 py-4">
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="size-4" />
                  <span>LOTE VEHICULOS</span>
                </DialogTitle>
                <DialogDescription>Navegacion y cuenta.</DialogDescription>
              </DialogHeader>
              <div className="flex h-[calc(100dvh-5.25rem)] flex-col gap-4 overflow-y-auto px-3 py-4">
                <Suspense fallback={<AppNavFallback items={items} />}>
                  <AppNavLinks items={items} />
                </Suspense>
                <div className="mt-auto flex flex-col gap-3 border-t pt-4">
                  <Link
                    href="/cuenta"
                    className="rounded-lg text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <p className="font-medium">{userName}</p>
                    <p className="text-muted-foreground">{userRole}</p>
                  </Link>
                  <form action={signOutAction}>
                    <Button type="submit" variant="outline" size="sm" className="w-full">
                      <LogOut className="size-4" />
                      <span>Cerrar sesion</span>
                    </Button>
                  </form>
                </div>
              </div>
            </DialogContent>
          </Dialog>

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
