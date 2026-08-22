import { cn } from "@/lib/utils"

/**
 * Encabezado de una vista: título, descripción y espacio para la
 * acción principal. Es el primer componente compartido de la
 * aplicación y lo que fija la forma de todas las pantallas de
 * administración que siguen.
 */
export function PageHeader({
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
    <div className={cn("flex flex-wrap items-start justify-between gap-3 sm:items-end", className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center justify-end gap-2">{children}</div> : null}
    </div>
  )
}
