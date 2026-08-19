import { cn } from "@/lib/utils"

/**
 * Desplegable nativo con la apariencia del resto de los controles.
 *
 * Se usa el `<select>` del navegador y no el compuesto de Base UI:
 * los desplegables de esta fase son listas cortas dentro de un
 * diálogo, y el nativo trae gratis el teclado, el móvil y el
 * autocompletado. Cuando un desplegable necesite búsqueda o grupos,
 * se cambia ese caso, no todos.
 */
function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "flex h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm shadow-xs transition-[color,box-shadow] outline-none",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        "dark:bg-input/30",
        className,
      )}
      {...props}
    />
  )
}

export { Select }
