"use client"

import { useMemo, useState, useTransition } from "react"

import { PencilLine, RotateCcw, SearchX, ShieldAlert } from "lucide-react"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
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
  const [search, setSearch] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const [makeFilter, setMakeFilter] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase()

    return entries.filter((entry) => {
      if (!showInactive && !entry.isActive) return false
      if (meta.key === "models" && makeFilter && entry.makeId !== makeFilter) return false
      if (!needle) return true

      const haystack = [
        entry.code,
        entry.name,
        entry.makeName,
        entry.city,
        entry.phone,
        entry.email,
        entry.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return haystack.includes(needle)
    })
  }, [entries, makeFilter, meta.key, search, showInactive])
  const inactiveCount = entries.filter((entry) => !entry.isActive).length
  const hasActiveFilters = Boolean(search || showInactive || makeFilter)

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
      <PageToolbar>
        <PageToolbarGroup className="grid min-w-full gap-3 md:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))]">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor={`catalog-search-${meta.key}`}>
              Buscar
            </label>
            <Input
              id={`catalog-search-${meta.key}`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={meta.searchPlaceholder}
            />
          </div>

          {meta.key === "models" ? (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="catalog-make-filter">
                Marca
              </label>
              <Select
                id="catalog-make-filter"
                value={makeFilter}
                onChange={(event) => setMakeFilter(event.target.value)}
              >
                <option value="">Todas las marcas activas</option>
                {makeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div className="hidden md:block" />
          )}

          <div className="flex flex-col gap-1 justify-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(event) => setShowInactive(event.target.checked)}
                className="size-3.5 accent-primary"
              />
              Incluir inactivas
            </label>
            {meta.key === "models" && makeOptions.length === 0 ? (
              <p className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                <ShieldAlert className="size-3.5" />
                Sin marcas activas para nuevos modelos.
              </p>
            ) : null}
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
        getRowId={(entry) => entry.id}
        emptyTitle={`Todavía no hay ${meta.plural.toLowerCase()}`}
        emptyDescription={meta.emptyDescription}
        filteredEmptyTitle="No hay resultados para esta vista"
        filteredEmptyDescription={meta.filteredEmptyDescription}
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
              {rows.length} de {entries.length}{" "}
              {entries.length === 1 ? meta.singular.toLowerCase() : meta.plural.toLowerCase()}
              {hasActiveFilters ? " visibles con los filtros actuales." : " visibles en administración."}
            </PageToolbarSummary>
            <PageToolbarActions>
              {inactiveCount > 0 ? (
                <PageToolbarSummary>
                  {inactiveCount} {inactiveCount === 1 ? "inactiva" : "inactivas"} disponible
                  {inactiveCount === 1 ? "" : "s"} para reactivación.
                </PageToolbarSummary>
              ) : null}
            </PageToolbarActions>
          </PageToolbar>
        }
        rowClassName={(entry) => (entry.isActive ? undefined : "opacity-60")}
        rowActions={(entry) => (
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
            {canWrite ? (
              <CatalogForm
                meta={meta}
                entry={entry}
                makeOptions={makeOptions}
                trigger={
                  <Button size="xs" variant="outline" data-icon="inline-start">
                    <PencilLine />
                    Editar
                  </Button>
                }
              />
            ) : null}
            {canSetActive ? (
              <ConfirmDialog
                trigger={
                  <Button
                    size="xs"
                    variant={entry.isActive ? "destructive" : "outline"}
                    data-icon="inline-start"
                  >
                    <RotateCcw />
                    {entry.isActive ? "Desactivar" : "Reactivar"}
                  </Button>
                }
                title={
                  entry.isActive
                    ? `Desactivar ${entry.name}`
                    : `Reactivar ${entry.name}`
                }
                description={
                  entry.isActive
                    ? "Dejará de ofrecerse en capturas nuevas, pero seguirá visible en los registros históricos. No se borra nada."
                    : "Volverá a ofrecerse en capturas nuevas y quedará disponible en administración activa."
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
      {pending ? <p className="text-xs text-muted-foreground">Aplicando cambio...</p> : null}
    </div>
  )

  function resetFilters() {
    setSearch("")
    setShowInactive(false)
    setMakeFilter("")
  }
}

function renderCell(key: string, entry: CatalogEntryDTO): React.ReactNode {
  if (key === "status") {
    return entry.isActive ? (
      <StatusBadge tone="success">Activa</StatusBadge>
    ) : (
      <StatusBadge tone="muted">Inactiva</StatusBadge>
    )
  }

  if (key === "contact") {
    if (!entry.phone && !entry.email) {
      return <span className="text-muted-foreground">Sin contacto</span>
    }

    return (
      <div className="space-y-0.5">
        {entry.phone ? <p>{entry.phone}</p> : null}
        {entry.email ? <p className="text-xs text-muted-foreground">{entry.email}</p> : null}
      </div>
    )
  }

  const value = (entry as unknown as Record<string, unknown>)[key]
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">—</span>
  }
  if (key === "code") {
    return <span className="font-mono text-xs">{String(value)}</span>
  }
  if (key === "sortOrder") {
    return <span className="tabular-nums">{String(value)}</span>
  }
  if (key === "description") {
    return <span className="text-sm text-muted-foreground">{String(value)}</span>
  }
  return String(value)
}
