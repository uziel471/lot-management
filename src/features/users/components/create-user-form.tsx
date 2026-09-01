"use client"

import { useState, useTransition } from "react"

import { ShieldCheck, UserCog } from "lucide-react"

import { SubmitButton } from "@/components/shared/submit-button"
import { StatusBadge } from "@/components/shared/status-badge"
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
import { Select } from "@/components/ui/select"
import { toastManager } from "@/components/ui/toast"
import type { ActionResult } from "@/types/action-result"
import { ROLES, type Role } from "@/types/role"
import { createUserAction, updateUserAction } from "../actions"
import type { UserDTO } from "../types"

const ROLE_COPY: Record<Role, string> = {
  admin: "Administra usuarios, catalogos y operaciones sensibles.",
  capturista: "Registra la operacion diaria, pero no administra usuarios ni anulaciones.",
  lectura: "Solo consulta la informacion; no escribe datos.",
}

export function UserFormDialog({
  user,
  currentUserId,
  activeAdminCount,
  trigger,
}: {
  user?: UserDTO
  currentUserId?: string
  activeAdminCount?: number
  trigger: React.ReactElement
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [values, setValues] = useState({ name: user?.name ?? "", email: user?.email ?? "" })
  const [selectedRole, setSelectedRole] = useState<Role>(user?.role ?? "capturista")
  const isEdit = Boolean(user)
  const editingUser = user ?? null
  const isSelf = user?.id === currentUserId
  const isLastActiveAdmin = Boolean(user?.isActive && user.role === "admin" && activeAdminCount === 1)
  const lockAdminRole = Boolean(isEdit && isSelf && isLastActiveAdmin)

  function handleSubmit(formData: FormData) {
    setError(null)
    setFieldErrors({})

    startTransition(async () => {
      const payload = {
        name: formData.get("name"),
        email: formData.get("email"),
        role: formData.get("role"),
      }
      setValues({
        name: String(payload.name ?? ""),
        email: String(payload.email ?? ""),
      })

      const result: ActionResult<UserDTO> = isEdit
        ? await updateUserAction({ userId: editingUser!.id, ...payload })
        : await createUserAction({ ...payload, password: formData.get("password") })

      if (!result.ok) {
        setError(result.error)
        setFieldErrors(result.fieldErrors ?? {})
        return
      }

      toastManager.add({
        title: isEdit ? "Usuario actualizado" : "Usuario creado",
        description: `${result.data.name} · ${result.data.email}`,
      })
      setOpen(false)
    })
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setSelectedRole(user?.role ?? "capturista")
      setValues({ name: user?.name ?? "", email: user?.email ?? "" })
      setError(null)
      setFieldErrors({})
    }
    setOpen(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="w-[min(36rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar usuario" : "Crear usuario"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ajusta identidad y rol sin cambiar la logica de permisos ni el historial."
              : "El alta es exclusiva de administracion. El acceso se activa en cuanto se guarda."}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-4">
          {isEdit ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4" />
              <span>Estado actual:</span>
              <StatusBadge tone={editingUser?.isActive ? "success" : "muted"}>
                {editingUser?.isActive ? "Activa" : "Inactiva"}
              </StatusBadge>
              <span className="text-xs">
                {editingUser?.isActive
                  ? "La desactivacion revoca sesiones activas."
                  : "La reactivacion conserva el mismo rol."}
              </span>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="user-name"
              label="Nombre"
              required
              error={fieldErrors.name?.[0]}
              input={
                <Input
                  id="user-name"
                  name="name"
                  value={values.name}
                  onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
                  required
                  aria-invalid={Boolean(fieldErrors.name?.length)}
                />
              }
            />

            <Field
              id="user-email"
              label="Correo"
              required
              error={fieldErrors.email?.[0]}
              input={
                <Input
                  id="user-email"
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
                  required
                  aria-invalid={Boolean(fieldErrors.email?.length)}
                />
              }
            />

            {!isEdit ? (
              <Field
                id="user-password"
                label="Contrasena inicial"
                required
                help="Minimo 8 caracteres."
                error={fieldErrors.password?.[0]}
                input={
                  <Input
                    id="user-password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    aria-invalid={Boolean(fieldErrors.password?.length)}
                  />
                }
              />
            ) : null}

            <Field
              id="user-role"
              label="Rol"
              required
              help={ROLE_COPY[selectedRole]}
              error={fieldErrors.role?.[0]}
              input={
                <Select
                  id="user-role"
                  name="role"
                  value={selectedRole}
                  onChange={(event) => setSelectedRole(event.target.value as Role)}
                  aria-invalid={Boolean(fieldErrors.role?.length)}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role} disabled={lockAdminRole && role !== "admin"}>
                      {role}
                    </option>
                  ))}
                </Select>
              }
            />
          </div>

          {lockAdminRole ? (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
              Esta cuenta es el ultimo administrador activo. Su rol no puede degradarse hasta que exista
              otro administrador activo.
            </div>
          ) : null}

          {isEdit && isSelf ? (
            <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
              La contrasena propia se cambia desde <span className="font-medium">Mi cuenta</span>. El
              restablecimiento administrativo sigue siendo una accion separada.
            </div>
          ) : null}

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
            <SubmitButton
              size="sm"
              pendingLabel={isEdit ? "Guardando..." : "Creando..."}
              disabled={pending}
              data-icon="inline-start"
            >
              <UserCog />
              {isEdit ? "Guardar cambios" : "Guardar usuario"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  id,
  label,
  required,
  help,
  error,
  input,
}: {
  id: string
  label: string
  required?: boolean
  help?: string
  error?: string
  input: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {input}
      {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
