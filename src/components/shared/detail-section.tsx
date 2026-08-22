import { cn } from "@/lib/utils"

export function DetailSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}

export function DetailGrid({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <dl className={cn("grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2", className)}>{children}</dl>
}

export function DetailItem({
  label,
  value,
  mono = false,
  emptyValue = "—",
}: {
  label: string
  value?: React.ReactNode
  mono?: boolean
  emptyValue?: React.ReactNode
}) {
  const resolvedValue = value ?? emptyValue

  return (
    <div className="grid gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={cn("min-h-5", mono && "font-mono text-xs sm:text-sm")}>{resolvedValue}</dd>
    </div>
  )
}
