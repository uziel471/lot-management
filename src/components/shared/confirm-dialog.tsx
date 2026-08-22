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
  body,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  onConfirm,
}: {
  trigger: React.ReactElement
  title: string
  description?: string
  body?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: React.ComponentProps<typeof Button>["variant"]
  onConfirm: (formData?: FormData) => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleConfirm(formData?: FormData) {
    startTransition(async () => {
      await onConfirm(formData)
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        {body ? (
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              handleConfirm(new FormData(event.currentTarget))
            }}
          >
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              {description ? <DialogDescription>{description}</DialogDescription> : null}
            </DialogHeader>
            {body}
            <DialogFooter>
              <DialogClose
                render={
                  <Button variant="outline" size="sm" disabled={pending} type="button">
                    {cancelLabel}
                  </Button>
                }
              />
              <Button variant={variant} size="sm" disabled={pending} type="submit">
                {pending ? "Aplicando…" : confirmLabel}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              {description ? <DialogDescription>{description}</DialogDescription> : null}
            </DialogHeader>
            <DialogFooter>
              <DialogClose
                render={
                  <Button variant="outline" size="sm" disabled={pending} type="button">
                    {cancelLabel}
                  </Button>
                }
              />
              <Button variant={variant} size="sm" disabled={pending} onClick={() => handleConfirm()}>
                {pending ? "Aplicando…" : confirmLabel}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
