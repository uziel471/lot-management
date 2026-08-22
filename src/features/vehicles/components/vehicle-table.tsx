"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import type { CatalogOption } from "@/features/catalogs/types"
import { formatMoney } from "@/lib/money"
import type { VehicleListItemDTO } from "../types"

/**
 * Inventario de vehículos: filtro por estatus, marca y rango de fecha
 * de recepción, y búsqueda por código, VIN o número de inventario. El
 * filtro es del lado del cliente, en la misma línea que
 * `CatalogTable` (ver su comentario): el punto de revisión es cuando
 * el listado crezca a varios cientos de filas.
 */
export function VehicleTable({
  vehicles,
  makes,
  statuses,
  canWrite,
}: {
  vehicles: VehicleListItemDTO[]
  makes: CatalogOption[]
  statuses: CatalogOption[]
  canWrite: boolean
}) {
  const [search, setSearch] = useState("")
  const [statusId, setStatusId] = useState("")
  const [makeId, setMakeId] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const hasActiveFilters = Boolean(search || statusId || makeId || dateFrom || dateTo)

  const rows = useMemo(() => {
    return vehicles.filter((vehicle) => {
      if (search) {
        const haystack = [vehicle.code, vehicle.vin, vehicle.stockNumber, vehicle.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(search.trim().toLowerCase())) return false
      }
      if (statusId && vehicle.statusId !== statusId) return false
      if (makeId && vehicle.makeId !== makeId) return false
      if (dateFrom && vehicle.dateReceived.slice(0, 10) < dateFrom) return false
      if (dateTo && vehicle.dateReceived.slice(0, 10) > dateTo) return false
      return true
    })
  }, [vehicles, search, statusId, makeId, dateFrom, dateTo])

  const columns: DataTableColumn<VehicleListItemDTO>[] = [
    {
      key: "code",
      label: "Código",
      render: (vehicle) => (
        <Link href={`/vehiculos/${vehicle.code}`} className="font-mono text-xs hover:underline">
          {vehicle.code}
        </Link>
      ),
    },
    { key: "description", label: "Vehículo", render: (vehicle) => vehicle.description },
    {
      key: "status",
      label: "Estatus",
      render: (vehicle) => (
        <StatusBadge tone={statusTone(vehicle.statusName)}>{vehicle.statusName}</StatusBadge>
      ),
    },
    {
      key: "vin",
      label: "VIN",
      render: (vehicle) =>
        vehicle.vin ? (
          <span className="font-mono text-xs">{vehicle.vin}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "stockNumber",
      label: "Inventario",
      render: (vehicle) =>
        vehicle.stockNumber ? (
          <span className="font-mono text-xs">{vehicle.stockNumber}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "daysInInventory",
      label: "Días",
      numeric: true,
      render: (vehicle) => String(vehicle.daysInInventory),
    },
    {
      key: "askingPrice",
      label: "Precio de lista",
      numeric: true,
      render: (vehicle) =>
        vehicle.askingPrice ? (
          formatMoney(vehicle.askingPrice)
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border p-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="vehicle-search">
              Buscar
            </label>
            <Input
              id="vehicle-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Código, VIN o número de inventario"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="filter-status">
              Estatus
            </label>
            <Select id="filter-status" value={statusId} onChange={(event) => setStatusId(event.target.value)}>
              <option value="">Todos</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="filter-make">
              Marca
            </label>
            <Select id="filter-make" value={makeId} onChange={(event) => setMakeId(event.target.value)}>
              <option value="">Todas</option>
              {makes.map((make) => (
                <option key={make.id} value={make.id}>
                  {make.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="filter-from">
              Recibido desde
            </label>
            <Input id="filter-from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="filter-to">
              Recibido hasta
            </label>
            <Input id="filter-to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {rows.length} de {vehicles.length} {vehicles.length === 1 ? "vehículo" : "vehículos"}
            {hasActiveFilters ? " visibles con los filtros actuales." : " visibles en inventario."}
          </p>

          {hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Limpiar filtros
            </Button>
          ) : null}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(vehicle) => vehicle.id}
        emptyTitle="Todavía no hay vehículos"
        emptyDescription="Registra el primero para que aparezca en el inventario."
        emptyAction={
          canWrite ? (
            <Button size="sm" render={<Link href="/vehiculos/nuevo">Nuevo vehículo</Link>} />
          ) : null
        }
        filteredEmptyTitle="No hay vehículos para esta búsqueda"
        filteredEmptyDescription="Ajusta o limpia los filtros para volver al inventario completo."
        filteredEmptyAction={
          <Button variant="outline" size="sm" onClick={resetFilters}>
            Restablecer vista
          </Button>
        }
        hasActiveFilters={hasActiveFilters}
        rowActions={(vehicle) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/vehiculos/${vehicle.code}`}>Ver detalle</Link>}
            />
            {canWrite ? (
              <Button
                variant="ghost"
                size="sm"
                render={<Link href={`/vehiculos/${vehicle.code}/editar`}>Editar</Link>}
              />
            ) : null}
          </div>
        )}
      />
    </div>
  )

  function resetFilters() {
    setSearch("")
    setStatusId("")
    setMakeId("")
    setDateFrom("")
    setDateTo("")
  }
}

function statusTone(statusName: string) {
  const normalized = statusName.toLowerCase()
  if (normalized.includes("vend")) return "success" as const
  if (normalized.includes("apart") || normalized.includes("proceso")) return "warning" as const
  if (normalized.includes("anulad")) return "destructive" as const
  return "neutral" as const
}
