"use client"

import { useState, useTransition } from "react"

import { KeyRound, PencilLine, RotateCcw, ShieldOff } from "lucide-react"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toastManager } from "@/components/ui/toast"
import { deactivateUserAction, reactivateUserAction, resetPasswordAction } from "../actions"
import type { UserDTO } from "../types"
import { UserFormDialog } from "./create-user-form"

export function UserRowActions({
  user,
  currentUserId,
  activeAdminCount,
}: {
  user: UserDTO
  currentUserId: string
  activeAdminCount: number
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isSelf = user.id === currentUserId
  const isLastActiveAdmin = user.isActive && user.role === "admin" && activeAdminCount === 1
  const deactivateDisabledReason = isSelf
    ? "No puedes desactivar tu propia cuenta."
    : isLastActiveAdmin
      ? "Debe existir al menos un administrador activo."
      : null

  function handleToggleActive() {
    setError(null)
    startTransition(async () => {
      const action = user.isActive ? deactivateUserAction : reactivateUserAction
      const result = await action({ userId: user.id })
      if (!result.ok) {
        setError(result.error)
        return
      }

      toastManager.add({
        title: user.isActive ? "Usuario desactivado" : "Usuario reactivado",
        description: user.isActive
          ? `${user.name} perdera acceso hasta que se reactive.`
          : `${user.name} vuelve a estar disponible con su mismo rol.`,
      })
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <UserFormDialog
          user={user}
          currentUserId={currentUserId}
          activeAdminCount={activeAdminCount}
          trigger={
            <Button size="xs" variant="outline" data-icon="inline-start" disabled={pending}>
              <PencilLine />
              Editar
            </Button>
          }
        />

        {user.isActive ? (
          <ConfirmDialog
            trigger={
              <Button
                size="xs"
                variant="destructive"
                data-icon="inline-start"
                disabled={Boolean(deactivateDisabledReason) || pending}
                title={deactivateDisabledReason ?? undefined}
              >
                <ShieldOff />
                Desactivar
              </Button>
            }
            title={`Desactivar a ${user.name}`}
            description="Perdera acceso al sistema de inmediato, sus sesiones activas se revocaran y su autoria historica se conserva."
            confirmLabel="Desactivar"
            cancelLabel="Cancelar"
            variant="destructive"
            onConfirm={handleToggleActive}
          />
        ) : (
          <ConfirmDialog
            trigger={
              <Button size="xs" variant="outline" data-icon="inline-start" disabled={pending}>
                <RotateCcw />
                Reactivar
              </Button>
            }
            title={`Reactivar a ${user.name}`}
            description="Recuperara acceso con el mismo rol que ya tenia asignado."
            confirmLabel="Reactivar"
            cancelLabel="Cancelar"
            onConfirm={handleToggleActive}
          />
        )}

        <ResetPasswordDialog user={user} disabled={pending} />
      </div>

      {deactivateDisabledReason && user.isActive ? (
        <p className="text-right text-xs text-muted-foreground">{deactivateDisabledReason}</p>
      ) : null}

      {error ? (
        <p className="text-right text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function ResetPasswordDialog({
  user,
  disabled,
}: {
  user: UserDTO
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  function handleSubmit(formData: FormData) {
    setError(null)
    setFieldErrors({})

    const newPassword = String(formData.get("newPassword") ?? "")
    const confirmPassword = String(formData.get("confirmPassword") ?? "")
    if (newPassword !== confirmPassword) {
      setError("La confirmacion no coincide con la nueva contrasena.")
      setFieldErrors({ confirmPassword: ["La confirmacion no coincide con la nueva contrasena."] })
      return
    }

    startTransition(async () => {
      const result = await resetPasswordAction({ userId: user.id, newPassword })
      if (!result.ok) {
        setError(result.error)
        setFieldErrors(result.fieldErrors ?? {})
        return
      }

      toastManager.add({
        title: "Contrasena restablecida",
        description: `${user.name} debe iniciar sesion con la nueva contrasena.`,
      })
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="xs" variant="ghost" data-icon="inline-start" disabled={disabled}>
            <KeyRound />
            Restablecer contrasena
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restablecer contrasena</DialogTitle>
          <DialogDescription>
            Se aplica a {user.name}. Las sesiones activas de esta cuenta se revocaran al guardar.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="grid gap-4">
          <PasswordField
            id="reset-user-password"
            name="newPassword"
            label="Nueva contrasena"
            error={fieldErrors.newPassword?.[0]}
          />
          <PasswordField
            id="reset-user-password-confirm"
            name="confirmPassword"
            label="Confirmar contrasena"
            error={fieldErrors.confirmPassword?.[0]}
          />

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" size="sm" disabled={pending}>
                  Cancelar
                </Button>
              }
            />
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Guardando..." : "Guardar nueva contrasena"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PasswordField({
  id,
  name,
  label,
  error,
}: {
  id: string
  name: string
  label: string
  error?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>
        {label}
        <span className="text-destructive"> *</span>
      </Label>
      <Input
        id={id}
        name={name}
        type="password"
        required
        minLength={8}
        aria-invalid={Boolean(error)}
      />
      <p className="text-xs text-muted-foreground">Minimo 8 caracteres.</p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
