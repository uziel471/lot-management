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
  filterPlaceholder = "Buscar…",
  emptyTitle = "Sin resultados",
  emptyDescription,
  toolbar,
  rowActions,
  rowClassName,
}: {
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowId: (row: T) => string
  getSearchText?: (row: T) => string
  filterPlaceholder?: string
  emptyTitle?: string
  emptyDescription?: string
  toolbar?: React.ReactNode
  rowActions?: (row: T) => React.ReactNode
  rowClassName?: (row: T) => string | undefined
}) {
  const [filter, setFilter] = useState("")

  const visibleRows = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    if (!needle || !getSearchText) return rows
    return rows.filter((row) => getSearchText(row).toLowerCase().includes(needle))
  }, [filter, rows, getSearchText])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {getSearchText ? (
          <Input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={filterPlaceholder}
            aria-label={filterPlaceholder}
            className="max-w-64"
          />
        ) : (
          <span />
        )}
        {toolbar}
      </div>

      {visibleRows.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? emptyTitle : "Ningún resultado para ese filtro"}
          description={rows.length === 0 ? emptyDescription : undefined}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={cn(column.numeric && "text-right")}>
                  {column.label}
                </TableHead>
              ))}
              {rowActions ? <TableHead className="text-right">Acciones</TableHead> : null}
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
      )}

      <p className="text-xs text-muted-foreground">
        {visibleRows.length} de {rows.length} {rows.length === 1 ? "registro" : "registros"}
      </p>
    </div>
  )
}
