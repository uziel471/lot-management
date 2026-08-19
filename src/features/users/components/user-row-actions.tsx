"use client"

import { useState, useTransition } from "react"
import {
  changeRoleAction,
  deactivateUserAction,
  reactivateUserAction,
  resetPasswordAction,
} from "../actions"
import { ROLES, type Role } from "@/types/role"
import type { UserDTO } from "../types"
import { Button } from "@/components/ui/button"

export function UserRowActions({ user }: { user: UserDTO }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [resetOpen, setResetOpen] = useState(false)

  function handleRoleChange(role: Role) {
    setError(null)
    startTransition(async () => {
      const result = await changeRoleAction({ userId: user.id, role })
      if (!result.ok) setError(result.error)
    })
  }

  function handleToggleActive() {
    setError(null)
    startTransition(async () => {
      const action = user.isActive ? deactivateUserAction : reactivateUserAction
      const result = await action({ userId: user.id })
      if (!result.ok) setError(result.error)
    })
  }

  function handleResetPassword(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await resetPasswordAction({
        userId: user.id,
        newPassword: formData.get("newPassword"),
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setResetOpen(false)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <select
          value={user.role}
          disabled={pending}
          onChange={(e) => handleRoleChange(e.target.value as Role)}
          className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs"
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <Button size="xs" variant="outline" disabled={pending} onClick={handleToggleActive}>
          {user.isActive ? "Desactivar" : "Reactivar"}
        </Button>
        <Button size="xs" variant="ghost" disabled={pending} onClick={() => setResetOpen((v) => !v)}>
          Restablecer contraseña
        </Button>
      </div>

      {resetOpen ? (
        <form action={handleResetPassword} className="flex items-center gap-2">
          <input
            type="password"
            name="newPassword"
            placeholder="Nueva contraseña"
            required
            minLength={8}
            className="h-7 rounded-md border border-input bg-transparent px-2 text-xs"
          />
          <Button type="submit" size="xs" disabled={pending}>
            Guardar
          </Button>
        </form>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
