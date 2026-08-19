"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

/**
 * Confirmación de una operación que el usuario debería mirar dos
 * veces —desactivar y reactivar, por ahora—. La operación se ejecuta
 * dentro de una transición: el diálogo queda deshabilitado mientras
 * corre y se cierra solo al terminar.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  onConfirm,
}: {
  trigger: React.ReactElement
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: React.ComponentProps<typeof Button>["variant"]
  onConfirm: () => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      await onConfirm()
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline" size="sm" disabled={pending}>
                {cancelLabel}
              </Button>
            }
          />
          <Button variant={variant} size="sm" disabled={pending} onClick={handleConfirm}>
            {pending ? "Aplicando…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
