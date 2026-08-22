import Link from "next/link"
import { Suspense } from "react"
import { Building2 } from "lucide-react"

import { AppNavLinks } from "@/components/app/app-nav-links"
import type { AppNavigationItem } from "@/components/app/app-navigation"
import { cn } from "@/lib/utils"

function AppNavFallback({ items }: { items: AppNavigationItem[] }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Navegacion principal">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <span className="truncate">{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}

export function AppSidebar({
  items,
  className,
}: {
  items: AppNavigationItem[]
  className?: string
}) {
  return (
    <aside
      className={cn(
        "hidden w-64 shrink-0 border-r bg-sidebar md:flex md:min-h-screen md:flex-col",
        className,
      )}
    >
      <div className="border-b px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold">
          <Building2 className="size-4" />
          <span>LOTE VEHICULOS</span>
        </Link>
      </div>
      <div className="flex flex-1 flex-col px-3 py-4">
        <Suspense fallback={<AppNavFallback items={items} />}>
          <AppNavLinks items={items} />
        </Suspense>
      </div>
    </aside>
  )
}
