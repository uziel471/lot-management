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
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  )
}
