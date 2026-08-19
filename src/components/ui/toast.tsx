"use client"

import { Toast as ToastPrimitive } from "@base-ui/react/toast"

import { cn } from "@/lib/utils"

/**
 * Notificaciones de confirmación, sobre las primitivas de Base UI (ya
 * instalado con `@base-ui/react`: esta fase no agrega dependencias de
 * producción).
 *
 * `toastManager` es global, así que cualquier componente cliente
 * puede confirmar una operación sin recibir nada por props:
 *
 *     toastManager.add({ title: "Marca creada" })
 *
 * `<Toaster />` se monta una sola vez, en el layout de `(app)`.
 */
export const toastManager = ToastPrimitive.createToastManager()

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager()

  return toasts.map((toast) => (
    <ToastPrimitive.Root
      key={toast.id}
      toast={toast}
      className={cn(
        "absolute right-0 bottom-0 left-auto z-50 w-[min(20rem,calc(100vw-2rem))]",
        "rounded-lg border bg-background p-3 shadow-lg select-none",
        "transition-all [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+calc(var(--toast-index)*-15px)))_scale(calc(1-(var(--toast-index)*0.1)))]",
        "data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
      )}
    >
      <ToastPrimitive.Title className="text-sm font-medium" />
      <ToastPrimitive.Description className="text-sm text-muted-foreground" />
      <ToastPrimitive.Close
        className="absolute top-2 right-2 text-xs text-muted-foreground hover:text-foreground"
        aria-label="Cerrar"
      >
        ✕
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  ))
}

/** Contenedor de las notificaciones. Se monta una vez por aplicación. */
function Toaster() {
  return (
    <ToastPrimitive.Provider toastManager={toastManager}>
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport className="fixed right-4 bottom-4 z-50 flex w-[min(20rem,calc(100vw-2rem))]">
          <ToastList />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  )
}

export { Toaster }
