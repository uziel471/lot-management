"use client"

import { useMemo, useState } from "react"

import { EmptyState } from "@/components/shared/empty-state"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type DataTableColumn<T> = {
  key: string
  label: string
  numeric?: boolean
  render?: (row: T) => React.ReactNode
}

/**
 * Tabla de administración con columnas declarativas y filtro de texto
 * en el cliente.
 *
 * El filtro es del lado del cliente a propósito: los catálogos de
 * esta fase caben de sobra en una consulta (44 modelos es el mayor).
 * El punto de revisión —paginación y búsqueda en el servidor— es
 * cuando un listado pase de unos cientos de filas.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  getSearchText,
  searchValue,
  onSearchValueChange,
  searchLabel = "Buscar",
  filterPlaceholder = "Buscar…",
  searchInputClassName,
  emptyTitle = "Sin resultados",
  emptyDescription,
  emptyAction,
  filteredEmptyTitle = "Ningún resultado para ese filtro",
  filteredEmptyDescription,
  filteredEmptyAction,
  hasActiveFilters = false,
  toolbar,
  summary,
  footer,
  rowActions,
  rowClassName,
  actionsLabel = "Acciones",
  showCount = true,
  countLabel,
  tableClassName,
  tableWrapperClassName,
}: {
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowId: (row: T) => string
  getSearchText?: (row: T) => string
  searchValue?: string
  onSearchValueChange?: (value: string) => void
  searchLabel?: string
  filterPlaceholder?: string
  searchInputClassName?: string
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: React.ReactNode
  filteredEmptyTitle?: string
  filteredEmptyDescription?: string
  filteredEmptyAction?: React.ReactNode
  hasActiveFilters?: boolean
  toolbar?: React.ReactNode
  summary?: React.ReactNode
  footer?: React.ReactNode
  rowActions?: (row: T) => React.ReactNode
  rowClassName?: (row: T) => string | undefined
  actionsLabel?: string
  showCount?: boolean
  countLabel?: (visibleRows: number, totalRows: number) => React.ReactNode
  tableClassName?: string
  tableWrapperClassName?: string
}) {
  const [internalFilter, setInternalFilter] = useState("")
  const filter = searchValue ?? internalFilter

  const visibleRows = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    if (!needle || !getSearchText) return rows
    return rows.filter((row) => getSearchText(row).toLowerCase().includes(needle))
  }, [filter, rows, getSearchText])
  const isFiltered = hasActiveFilters || Boolean(filter.trim())

  function handleFilterChange(value: string) {
    if (onSearchValueChange) {
      onSearchValueChange(value)
      return
    }

    setInternalFilter(value)
  }

  return (
    <div className="flex flex-col gap-3">
      {getSearchText || toolbar ? (
        <div className="flex flex-wrap items-end justify-between gap-2">
          {getSearchText ? (
            <div className="flex min-w-52 flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="data-table-search">
                {searchLabel}
              </label>
              <Input
                id="data-table-search"
                value={filter}
                onChange={(event) => handleFilterChange(event.target.value)}
                placeholder={filterPlaceholder}
                aria-label={filterPlaceholder}
                className={cn("max-w-64", searchInputClassName)}
              />
            </div>
          ) : null}
          {toolbar}
        </div>
      ) : null}

      {summary ? <div>{summary}</div> : null}

      {visibleRows.length === 0 ? (
        <EmptyState
          title={isFiltered ? filteredEmptyTitle : emptyTitle}
          description={isFiltered ? filteredEmptyDescription : emptyDescription}
        >
          {isFiltered ? filteredEmptyAction : emptyAction}
        </EmptyState>
      ) : (
        <div className={cn("overflow-x-auto rounded-lg border", tableWrapperClassName)}>
          <Table className={tableClassName}>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key} className={cn(column.numeric && "text-right")}>
                    {column.label}
                  </TableHead>
                ))}
                {rowActions ? <TableHead className="w-px text-right">{actionsLabel}</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row) => (
                <TableRow key={getRowId(row)} className={rowClassName?.(row)}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={cn(column.numeric && "text-right")}>
                      {column.render ? column.render(row) : null}
                    </TableCell>
                  ))}
                  {rowActions ? (
                    <TableCell className="text-right">{rowActions(row)}</TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {footer ? <div>{footer}</div> : null}

      {showCount ? (
        <p className="text-xs text-muted-foreground">
          {countLabel
            ? countLabel(visibleRows.length, rows.length)
            : `${visibleRows.length} de ${rows.length} ${rows.length === 1 ? "registro" : "registros"}`}
        </p>
      ) : null}
    </div>
  )
}
