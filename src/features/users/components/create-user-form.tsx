"use client"

import { useState, useTransition } from "react"
import { createUserAction } from "../actions"
import { ROLES } from "@/types/role"
import { Button } from "@/components/ui/button"

export function CreateUserForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createUserAction({
        name: formData.get("name"),
        email: formData.get("email"),
        role: formData.get("role"),
        password: formData.get("password"),
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      const form = document.getElementById("create-user-form") as HTMLFormElement | null
      form?.reset()
    })
  }

  return (
    <form id="create-user-form" action={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-xs font-medium">
          Nombre
        </label>
        <input
          id="name"
          name="name"
          required
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-xs font-medium">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-xs font-medium">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="role" className="text-xs font-medium">
          Rol
        </label>
        <select
          id="role"
          name="role"
          defaultValue="capturista"
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Creando…" : "Crear usuario"}
      </Button>
      {error ? <p className="w-full text-sm text-destructive">{error}</p> : null}
    </form>
  )
}
