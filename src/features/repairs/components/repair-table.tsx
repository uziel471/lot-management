"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import type { CatalogOption } from "@/features/catalogs/types"
import type { VehicleOption } from "@/features/vehicles/types"
import { addMoney, formatMoney } from "@/lib/money"
import { isActiveRepairStatus } from "../domain"
import {
  REPAIR_CATEGORY_LABELS,
  REPAIR_CATEGORY_OPTIONS,
  REPAIR_STATUS_LABELS,
  REPAIR_STATUS_OPTIONS,
  repairStatusTone,
} from "../enums"
import type { RepairListItemDTO } from "../types"

export function RepairTable({
  repairs,
  vehicles,
  vendors,
  canWrite,
}: {
  repairs: RepairListItemDTO[]
  vehicles: VehicleOption[]
  vendors: CatalogOption[]
  canWrite: boolean
}) {
  const [search, setSearch] = useState("")
  const [vehicleId, setVehicleId] = useState("")
  const [vendorId, setVendorId] = useState("")
  const [status, setStatus] = useState("")
  const [category, setCategory] = useState("")
  const [currency, setCurrency] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [includeVoided, setIncludeVoided] = useState(false)
  const hasActiveFilters = Boolean(
    search || vehicleId || vendorId || status || category || currency || dateFrom || dateTo || includeVoided,
  )

  const rows = useMemo(() => {
    return repairs.filter((repair) => {
      if (search) {
        const haystack = [
          repair.code,
          repair.vehicleCode,
          repair.vehicleDescription,
          repair.vendorName ?? "Interna",
          REPAIR_CATEGORY_LABELS[repair.category],
          REPAIR_STATUS_LABELS[repair.status],
        ]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(search.trim().toLowerCase())) return false
      }
      if (vehicleId && repair.vehicleId !== vehicleId) return false
      if (vendorId && repair.vendorId !== vendorId) return false
      if (!includeVoided && repair.isVoided) return false
      if (status && repair.status !== status) return false
      if (category && repair.category !== category) return false
      if (currency && repair.currency !== currency) return false
      if (dateFrom && repair.openedAt.slice(0, 10) < dateFrom) return false
      if (dateTo && repair.openedAt.slice(0, 10) > dateTo) return false
      return true
    })
  }, [repairs, search, vehicleId, vendorId, includeVoided, status, category, currency, dateFrom, dateTo])

  const activeTotal = useMemo(() => {
    const activeRows = rows.filter(
      (repair) => !repair.isVoided && isActiveRepairStatus(repair.status),
    )
    if (activeRows.length === 0) return { amount: 0, currency: "USD" as const }
    return activeRows.map((repair) => repair.totalUsd).reduce((a, b) => addMoney(a, b))
  }, [rows])

  function resetFilters() {
    setSearch("")
    setVehicleId("")
    setVendorId("")
    setStatus("")
    setCategory("")
    setCurrency("")
    setDateFrom("")
    setDateTo("")
    setIncludeVoided(false)
  }

  const columns: DataTableColumn<RepairListItemDTO>[] = [
    {
      key: "code",
      label: "Código",
      render: (repair) => (
        <Link href={`/reparaciones/${repair.code}`} className="font-mono text-xs hover:underline">
          {repair.code}
        </Link>
      ),
    },
    {
      key: "vehicle",
      label: "Vehículo",
      render: (repair) => (
        <Link href={`/vehiculos/${repair.vehicleCode}`} className="hover:underline">
          <span className="font-medium">{repair.vehicleDescription}</span>
          <span className="mt-0.5 block font-mono text-xs text-muted-foreground">{repair.vehicleCode}</span>
        </Link>
      ),
    },
    {
      key: "vendor",
      label: "Proveedor",
      render: (repair) => repair.vendorName ?? "Interna",
    },
    {
      key: "category",
      label: "Categoría",
      render: (repair) => REPAIR_CATEGORY_LABELS[repair.category],
    },
    {
      key: "status",
      label: "Estado",
      render: (repair) => <StatusBadge tone={repairStatusTone(repair.status)}>{REPAIR_STATUS_LABELS[repair.status]}</StatusBadge>,
    },
    { key: "openedAt", label: "Apertura", render: (repair) => repair.openedAt.slice(0, 10) },
    {
      key: "completedAt",
      label: "Conclusión",
      render: (repair) => repair.completedAt?.slice(0, 10) ?? "—",
    },
    {
      key: "totalUsd",
      label: "Total (USD)",
      numeric: true,
      render: (repair) => formatMoney(repair.totalUsd),
    },
    {
      key: "pendingUsd",
      label: "Pendiente",
      numeric: true,
      render: (repair) => formatMoney(repair.pendingUsd),
    },
    {
      key: "payment",
      label: "Pago",
      render: (repair) =>
        repair.paymentStatus === "paid" ? (
          <StatusBadge tone="success">Pagada</StatusBadge>
        ) : repair.paymentStatus === "partial" ? (
          <StatusBadge tone="warning">Parcial</StatusBadge>
        ) : (
          <StatusBadge tone="muted">Sin pagar</StatusBadge>
        ),
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border p-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_repeat(7,minmax(0,1fr))]">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="repair-search">
              Buscar
            </label>
            <Input
              id="repair-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Código, vehículo o proveedor"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="repair-vehicle">
              Vehículo
            </label>
            <Select id="repair-vehicle" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
              <option value="">Todos</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.code} · {vehicle.description}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="repair-vendor">
              Proveedor
            </label>
            <Select id="repair-vendor" value={vendorId} onChange={(event) => setVendorId(event.target.value)}>
              <option value="">Todos</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="repair-status">
              Estado
            </label>
            <Select id="repair-status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Todos</option>
              {REPAIR_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="repair-category">
              Categoría
            </label>
            <Select id="repair-category" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">Todas</option>
              {REPAIR_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="repair-date-from">
              Desde
            </label>
            <Input id="repair-date-from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="repair-date-to">
              Hasta
            </label>
            <Input id="repair-date-to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="repair-currency">
              Moneda
            </label>
            <Select id="repair-currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>
              <option value="">Todas</option>
              <option value="USD">USD</option>
              <option value="MXN">MXN</option>
            </Select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={includeVoided}
              onChange={(event) => setIncludeVoided(event.target.checked)}
              className="size-3.5 accent-primary"
            />
            Incluir anuladas
          </label>

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
        getRowId={(repair) => repair.id}
        summary={
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {rows.length} de {repairs.length} {repairs.length === 1 ? "reparación visible" : "reparaciones visibles"}
              {hasActiveFilters ? " con los filtros actuales." : " en el registro."}
            </p>
            {canWrite ? (
              <Button size="sm" render={<Link href="/reparaciones/nueva" />}>
                Registrar reparación
              </Button>
            ) : null}
          </div>
        }
        emptyTitle="Sin reparaciones registradas"
        emptyDescription="Registra la primera reparación para empezar a seguir el trabajo operativo de las unidades."
        emptyAction={
          canWrite ? (
            <Button size="sm" render={<Link href="/reparaciones/nueva" />}>
              Registrar reparación
            </Button>
          ) : null
        }
        filteredEmptyTitle="No hay reparaciones para esta búsqueda"
        filteredEmptyDescription="Ajusta o limpia los filtros para volver al registro completo."
        filteredEmptyAction={
          <Button variant="outline" size="sm" onClick={resetFilters}>
            Restablecer vista
          </Button>
        }
        hasActiveFilters={hasActiveFilters}
        footer={
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Total activo vigente del resultado actual</span>
              <span className="font-medium">{formatMoney(activeTotal)}</span>
            </div>
          </div>
        }
        rowActions={(repair) => (
          <Button variant="outline" size="sm" render={<Link href={`/reparaciones/${repair.code}`}>Ver detalle</Link>} />
        )}
        rowClassName={(repair) => (repair.isVoided ? "opacity-60" : undefined)}
      />
    </div>
  )
}
