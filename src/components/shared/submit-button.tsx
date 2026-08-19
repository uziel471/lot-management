"use client"

import { useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"

/**
 * Botón de envío de un formulario de Server Action. Se deshabilita
 * mientras la acción está en vuelo, que es también la defensa contra
 * el doble submit: sin esto, dos clics rápidos consumen dos códigos
 * de la secuencia.
 */
export function SubmitButton({
  children,
  pendingLabel = "Guardando…",
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  )
}
