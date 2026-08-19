"use client"

import { useMemo, useState, useTransition } from "react"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toastManager } from "@/components/ui/toast"
import { setCatalogEntryActiveAction } from "../actions"
import type { CatalogMeta } from "../registry"
import type { CatalogEntryDTO, CatalogOption } from "../types"
import { CatalogForm } from "./catalog-form"

/**
 * Vista de administración de un catálogo: listado con el estado
 * visible, conmutador para ver también las entradas retiradas y
 * acciones por fila.
 *
 * `canSetActive` oculta desactivar y reactivar a quien no es
 * administrador. Es solo la interfaz: quien la evada llamando la
 * acción directamente se topa con el `requireRole` de `actions.ts`,
 * que es la defensa real.
 */
export function CatalogTable({
  meta,
  entries,
  makeOptions,
  canWrite,
  canSetActive,
}: {
  meta: CatalogMeta
  entries: CatalogEntryDTO[]
  makeOptions: CatalogOption[]
  canWrite: boolean
  canSetActive: boolean
}) {
  const [showInactive, setShowInactive] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const rows = useMemo(
    () => (showInactive ? entries : entries.filter((entry) => entry.isActive)),
    [entries, showInactive],
  )

  const columns: DataTableColumn<CatalogEntryDTO>[] = meta.columns.map((column) => ({
    key: column.key,
    label: column.label,
    numeric: column.numeric,
    render: (entry) => renderCell(column.key, entry),
  }))

  function handleSetActive(entry: CatalogEntryDTO, isActive: boolean) {
    setError(null)
    startTransition(async () => {
      const result = await setCatalogEntryActiveAction(meta.key, entry.code, isActive)
      if (!result.ok) {
        setError(result.error)
        return
      }
      toastManager.add({
        title: isActive ? "Entrada reactivada" : "Entrada desactivada",
        description: `${entry.name} · ${entry.code}`,
      })
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(entry) => entry.id}
        getSearchText={(entry) =>
          [entry.code, entry.name, entry.makeName, entry.city, entry.phone, entry.description]
            .filter(Boolean)
            .join(" ")
        }
        filterPlaceholder={`Buscar en ${meta.plural.toLowerCase()}…`}
        emptyTitle={`Todavía no hay ${meta.plural.toLowerCase()}`}
        emptyDescription="Da de alta la primera entrada para que aparezca en los desplegables de captura."
        toolbar={
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(event) => setShowInactive(event.target.checked)}
                className="size-3.5 accent-primary"
              />
              Ver también las desactivadas
            </label>
            {canWrite ? (
              <CatalogForm
                meta={meta}
                makeOptions={makeOptions}
                trigger={<Button size="sm">{meta.newEntryLabel}</Button>}
              />
            ) : null}
          </div>
        }
        rowClassName={(entry) => (entry.isActive ? undefined : "opacity-60")}
        rowActions={(entry) => (
          <div className="flex items-center justify-end gap-1.5">
            {canWrite ? (
              <CatalogForm
                meta={meta}
                entry={entry}
                makeOptions={makeOptions}
                trigger={
                  <Button size="xs" variant="outline">
                    Editar
                  </Button>
                }
              />
            ) : null}
            {canSetActive ? (
              <ConfirmDialog
                trigger={
                  <Button size="xs" variant={entry.isActive ? "destructive" : "outline"}>
                    {entry.isActive ? "Desactivar" : "Reactivar"}
                  </Button>
                }
                title={
                  entry.isActive
                    ? `Desactivar «${entry.name}»`
                    : `Reactivar «${entry.name}»`
                }
                description={
                  entry.isActive
                    ? "Dejará de ofrecerse al capturar registros nuevos. Los registros que ya la usan la siguen mostrando. No se borra nada."
                    : "Volverá a ofrecerse al capturar registros nuevos."
                }
                confirmLabel={entry.isActive ? "Desactivar" : "Reactivar"}
                variant={entry.isActive ? "destructive" : "default"}
                onConfirm={() => handleSetActive(entry, !entry.isActive)}
              />
            ) : null}
          </div>
        )}
      />

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {pending ? <p className="text-xs text-muted-foreground">Aplicando cambio…</p> : null}
    </div>
  )
}

function renderCell(key: string, entry: CatalogEntryDTO): React.ReactNode {
  if (key === "status") {
    return entry.isActive ? (
      <Badge variant="secondary">Activa</Badge>
    ) : (
      <Badge variant="muted">Desactivada</Badge>
    )
  }

  const value = (entry as unknown as Record<string, unknown>)[key]
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">—</span>
  }
  if (key === "code") {
    return <span className="font-mono text-xs">{String(value)}</span>
  }
  return String(value)
}
