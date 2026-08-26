"use client"

import { useActionState } from "react"
import { changeOwnPasswordAction, type ChangeOwnPasswordState } from "../actions"
import { SubmitButton } from "@/components/shared/submit-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState: ChangeOwnPasswordState = undefined

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changeOwnPasswordAction, initialState)
  const fieldErrors = state?.fieldErrors ?? {}

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <PasswordField
          id="currentPassword"
          name="currentPassword"
          label="Contrasena actual"
          autoComplete="current-password"
          error={fieldErrors.currentPassword?.[0]}
          className="md:col-span-2"
        />
        <PasswordField
          id="newPassword"
          name="newPassword"
          label="Nueva contrasena"
          autoComplete="new-password"
          minLength={8}
          help="Minimo 8 caracteres."
          error={fieldErrors.newPassword?.[0]}
        />
        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirmar nueva contrasena"
          autoComplete="new-password"
          minLength={8}
          error={fieldErrors.confirmPassword?.[0]}
        />
      </div>

      {state?.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300" role="status">
          Contrasena actualizada. Tus otras sesiones activas fueron revocadas.
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="reset" variant="outline" disabled={pending}>
          Cancelar
        </Button>
        <SubmitButton pendingLabel="Guardando..." disabled={pending}>
          Cambiar contrasena
        </SubmitButton>
      </div>
    </form>
  )
}

function PasswordField({
  id,
  name,
  label,
  help,
  error,
  className,
  ...inputProps
}: {
  id: string
  name: string
  label: string
  help?: string
  error?: string
  className?: string
} & Omit<React.ComponentProps<typeof Input>, "id" | "name" | "type">) {
  const errorId = `${id}-error`
  const helpId = `${id}-help`

  return (
    <div className={className ? `flex flex-col gap-1 ${className}` : "flex flex-col gap-1"}>
      <Label htmlFor={id}>
        {label}
        <span className="text-destructive"> *</span>
      </Label>
      <Input
        id={id}
        name={name}
        type="password"
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : help ? helpId : undefined}
        {...inputProps}
      />
      {help ? (
        <p id={helpId} className="text-xs text-muted-foreground">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
