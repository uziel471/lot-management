"use client"

import { useActionState } from "react"
import { changeOwnPasswordAction, type ChangeOwnPasswordState } from "../actions"
import { Button } from "@/components/ui/button"

const initialState: ChangeOwnPasswordState = undefined

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changeOwnPasswordAction, initialState)

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="currentPassword" className="text-sm font-medium">
          Contraseña actual
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="newPassword" className="text-sm font-medium">
          Nueva contraseña
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirmar nueva contraseña
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        />
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.success ? (
        <p className="text-sm text-emerald-600">Contraseña actualizada.</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </Button>
    </form>
  )
}
