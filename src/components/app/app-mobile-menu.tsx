"use client"

import Link from "next/link"
import { useState } from "react"
import { Building2, LogOut, Menu } from "lucide-react"

import { AppNavLinks } from "@/components/app/app-nav-links"
import type { AppNavigationItem } from "@/components/app/app-navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function AppMobileMenu({
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
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="md:hidden"
        aria-label="Abrir menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu className="size-4" />
      </Button>
      <DialogContent className="top-0 left-0 h-dvh w-[min(20rem,calc(100vw-1rem))] translate-x-0 translate-y-0 rounded-none border-r p-0">
        <DialogHeader className="border-b px-4 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-4" />
            <span>LOTE VEHICULOS</span>
          </DialogTitle>
          <DialogDescription>Navegacion y cuenta.</DialogDescription>
        </DialogHeader>
        <div className="flex h-[calc(100dvh-5.25rem)] flex-col gap-4 overflow-y-auto px-3 py-4">
          <AppNavLinks items={items} onNavigate={() => setOpen(false)} />
          <div className="mt-auto flex flex-col gap-3 border-t pt-4">
            <Link
              href="/cuenta"
              onClick={() => setOpen(false)}
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
  )
}
