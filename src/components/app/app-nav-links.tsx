"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CarFront,
  CircleUserRound,
  FileBarChart2,
  LayoutDashboard,
  Landmark,
  ReceiptText,
  BadgeDollarSign,
  ShoppingCart,
  Tags,
  Users,
  Wrench,
} from "lucide-react"

import type { AppNavIcon, AppNavigationItem } from "@/components/app/app-navigation"
import { cn } from "@/lib/utils"

const iconMap: Record<AppNavIcon, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  reports: FileBarChart2,
  vehicles: CarFront,
  purchases: ShoppingCart,
  payments: Landmark,
  repairs: Wrench,
  expenses: ReceiptText,
  sales: BadgeDollarSign,
  catalogs: Tags,
  users: Users,
  account: CircleUserRound,
}

function isActive(pathname: string, item: AppNavigationItem) {
  if (item.match === "exact") {
    return pathname === item.href
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function AppNavLinks({
  items,
  className,
}: {
  items: AppNavigationItem[]
  className?: string
}) {
  const pathname = usePathname()

  return (
    <nav className={cn("flex flex-col gap-1", className)} aria-label="Navegacion principal">
      {items.map((item) => {
        const Icon = iconMap[item.icon]
        const active = isActive(pathname, item)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className="truncate">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
