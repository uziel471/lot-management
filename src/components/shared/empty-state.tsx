import { cn } from "@/lib/utils"

/** Estado vacío de un listado: qué falta y qué se puede hacer al respecto. */
export function EmptyState({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
      ) : null}
      {children ? <div className="pt-1">{children}</div> : null}
    </div>
  )
}
