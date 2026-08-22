"use client"

import { useMemo, useState } from "react"

import { SearchX } from "lucide-react"

import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import {
  PageToolbar,
  PageToolbarActions,
  PageToolbarGroup,
  PageToolbarSummary,
} from "@/components/shared/page-toolbar"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import type { Role } from "@/types/role"
import type { UserDTO } from "../types"
import { UserRowActions } from "./user-row-actions"

const ROLE_BADGE_TONE: Record<Role, React.ComponentProps<typeof StatusBadge>["tone"]> = {
  admin: "neutral",
  capturista: "warning",
  lectura: "muted",
}

export function UsersManagement({
  users,
  currentUserId,
}: {
  users: UserDTO[]
  currentUserId: string
}) {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const activeAdminCount = useMemo(
    () => users.filter((user) => user.isActive && user.role === "admin").length,
    [users],
  )

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase()

    return users.filter((user) => {
      if (!showInactive && !user.isActive) return false
      if (roleFilter && user.role !== roleFilter) return false
      if (!needle) return true

      return [user.name, user.email, user.role].join(" ").toLowerCase().includes(needle)
    })
  }, [roleFilter, search, showInactive, users])

  const inactiveCount = users.filter((user) => !user.isActive).length
  const hasActiveFilters = Boolean(search || roleFilter || showInactive)

  const columns: DataTableColumn<UserDTO>[] = [
    {
      key: "name",
      label: "Persona",
      render: (user) => (
        <div className="space-y-0.5">
          <p className="font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">{formatDate(user.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "email",
      label: "Correo",
      render: (user) => <span className="text-sm text-muted-foreground">{user.email}</span>,
    },
    {
      key: "role",
      label: "Rol",
      render: (user) => <StatusBadge tone={ROLE_BADGE_TONE[user.role]}>{user.role}</StatusBadge>,
    },
    {
      key: "status",
      label: "Estado",
      render: (user) =>
        user.isActive ? (
          <StatusBadge tone="success">Activa</StatusBadge>
        ) : (
          <StatusBadge tone="muted">Inactiva</StatusBadge>
        ),
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <PageToolbar>
        <PageToolbarGroup className="grid min-w-full gap-3 lg:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))]">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="user-search">
              Buscar
            </label>
            <Input
              id="user-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre o correo"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="user-role-filter">
              Rol
            </label>
            <Select
              id="user-role-filter"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
            >
              <option value="">Todos los roles</option>
              <option value="admin">admin</option>
              <option value="capturista">capturista</option>
              <option value="lectura">lectura</option>
            </Select>
          </div>

          <div className="flex flex-col justify-end gap-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(event) => setShowInactive(event.target.checked)}
                className="size-3.5 accent-primary"
              />
              Incluir inactivas
            </label>
          </div>
        </PageToolbarGroup>

        <PageToolbarActions>
          {hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Limpiar filtros
            </Button>
          ) : null}
        </PageToolbarActions>
      </PageToolbar>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(user) => user.id}
        emptyTitle="No hay usuarios registrados"
        emptyDescription="El primer administrador se crea fuera de la interfaz. Desde aqui se administran las cuentas operativas."
        filteredEmptyTitle="No hay usuarios para esta vista"
        filteredEmptyDescription="Ajusta o limpia los filtros para volver a la administracion completa."
        filteredEmptyAction={
          <Button variant="outline" size="sm" onClick={resetFilters} data-icon="inline-start">
            <SearchX />
            Restablecer vista
          </Button>
        }
        hasActiveFilters={hasActiveFilters}
        showCount={false}
        footer={
          <PageToolbar className="border-dashed bg-muted/20">
            <PageToolbarSummary>
              {rows.length} de {users.length} {users.length === 1 ? "usuario visible" : "usuarios visibles"}
              {hasActiveFilters ? " con los filtros actuales." : " en administracion."}
            </PageToolbarSummary>
            <PageToolbarActions>
              <PageToolbarSummary>
                {activeAdminCount} {activeAdminCount === 1 ? "administrador activo" : "administradores activos"}
              </PageToolbarSummary>
              {inactiveCount > 0 ? (
                <PageToolbarSummary>
                  {inactiveCount} {inactiveCount === 1 ? "cuenta inactiva" : "cuentas inactivas"} disponible
                  {inactiveCount === 1 ? "" : "s"} para reactivacion.
                </PageToolbarSummary>
              ) : null}
            </PageToolbarActions>
          </PageToolbar>
        }
        rowClassName={(user) => (user.isActive ? undefined : "opacity-60")}
        rowActions={(user) => (
          <UserRowActions
            user={user}
            currentUserId={currentUserId}
            activeAdminCount={activeAdminCount}
          />
        )}
      />
    </div>
  )

  function resetFilters() {
    setSearch("")
    setRoleFilter("")
    setShowInactive(false)
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
