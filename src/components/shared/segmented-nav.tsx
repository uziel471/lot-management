import Link from "next/link"

import { cn } from "@/lib/utils"

export type SegmentedNavItem = {
  href: string
  label: string
  description?: string
  isActive?: boolean
}

export function SegmentedNav({
  items,
  className,
}: {
  items: SegmentedNavItem[]
  className?: string
}) {
  return (
    <nav aria-label="Navegacion de catalogos" className={cn("overflow-x-auto", className)}>
      <div className="inline-flex min-w-full gap-1 rounded-lg border bg-muted/30 p-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.isActive ? "page" : undefined}
            className={cn(
              "min-w-36 rounded-md px-3 py-2 text-left transition-colors",
              item.isActive
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
            )}
          >
            <span className="block text-sm font-medium text-foreground">{item.label}</span>
            {item.description ? (
              <span className="mt-1 block text-xs text-muted-foreground">{item.description}</span>
            ) : null}
          </Link>
        ))}
      </div>
    </nav>
  )
}
