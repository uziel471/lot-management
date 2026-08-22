import { cn } from "@/lib/utils"

export function PageToolbar({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3", className)}>
      {children}
    </div>
  )
}

export function PageToolbarGroup({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("flex flex-1 flex-wrap items-center gap-2", className)}>{children}</div>
}

export function PageToolbarActions({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>
}

export function PageToolbarSummary({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <p className={cn("text-xs text-muted-foreground", className)}>{children}</p>
}
