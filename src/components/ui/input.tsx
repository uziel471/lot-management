import { cn } from "@/lib/utils"

/**
 * Campo de texto de una línea.
 *
 * Escrito a mano con las mismas clases que el resto de la UI en vez
 * de generado con `shadcn add`: el registro de shadcn no era
 * alcanzable al construir esta fase. Volver a generarlo con el CLI lo
 * reemplaza sin que nada más cambie.
 */
function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        "flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none",
        "file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
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

export { Input }
