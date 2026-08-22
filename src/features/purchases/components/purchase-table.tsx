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
import { TX_TYPE_LABELS } from "../enums"
import type { PurchaseListItemDTO } from "../types"

/**
 * Listado de compras: filtro por tipo, y el total en USD del pie
 * coherente con lo que muestra la tabla (ver spec, "Exclusión de
 * anuladas"). El filtro es del lado del cliente, en la misma línea
 * que el resto de los listados de esta fase.
 */
export function PurchaseTable({
  purchases,
  vehicles,
  vendors,
  canWrite,
}: {
  purchases: PurchaseListItemDTO[]
  vehicles: VehicleOption[]
  vendors: CatalogOption[]
  canWrite: boolean
}) {
  const [search, setSearch] = useState("")
  const [vehicleId, setVehicleId] = useState("")
  const [vendorId, setVendorId] = useState("")
  const [txType, setTxType] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [includeVoided, setIncludeVoided] = useState(false)
  const hasActiveFilters = Boolean(search || vehicleId || vendorId || txType || dateFrom || dateTo || includeVoided)

  const rows = useMemo(() => {
    return purchases.filter((purchase) => {
      if (search) {
        const haystack = [purchase.code, purchase.vehicleCode, purchase.vehicleDescription, purchase.vendorName]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(search.trim().toLowerCase())) return false
      }
      if (vehicleId && purchase.vehicleId !== vehicleId) return false
      if (vendorId && purchase.vendorId !== vendorId) return false
      if (!includeVoided && purchase.isVoided) return false
      if (txType && purchase.txType !== txType) return false
      if (dateFrom && purchase.purchaseDate.slice(0, 10) < dateFrom) return false
      if (dateTo && purchase.purchaseDate.slice(0, 10) > dateTo) return false
      return true
    })
  }, [purchases, search, vehicleId, vendorId, txType, dateFrom, dateTo, includeVoided])

  const footTotal = useMemo(() => {
    const vigentes = rows.filter((purchase) => !purchase.isVoided)
    if (vigentes.length === 0) return { amount: 0, currency: "USD" as const }
    return vigentes.map((p) => p.totalUsd).reduce((a, b) => addMoney(a, b))
  }, [rows])

  const columns: DataTableColumn<PurchaseListItemDTO>[] = [
    {
      key: "code",
      label: "Código",
      render: (purchase) => (
        <Link href={`/compras/${purchase.code}`} className="font-mono text-xs hover:underline">
          {purchase.code}
        </Link>
      ),
    },
    {
      key: "vehicle",
      label: "Vehículo",
      render: (purchase) => (
        <Link href={`/vehiculos/${purchase.vehicleCode}`} className="hover:underline">
          <span className="font-medium">{purchase.vehicleDescription}</span>
          <span className="mt-0.5 block font-mono text-xs text-muted-foreground">{purchase.vehicleCode}</span>
        </Link>
      ),
    },
    { key: "vendor", label: "Proveedor", render: (purchase) => purchase.vendorName },
    { key: "date", label: "Fecha", render: (purchase) => purchase.purchaseDate.slice(0, 10) },
    {
      key: "txType",
      label: "Tipo",
      render: (purchase) => <StatusBadge tone="muted">{TX_TYPE_LABELS[purchase.txType]}</StatusBadge>,
    },
    {
      key: "totalOriginal",
      label: "Total original",
      numeric: true,
      render: (purchase) => formatMoney(purchase.totalOriginal),
    },
    {
      key: "totalUsd",
      label: "Total (USD)",
      numeric: true,
      render: (purchase) => formatMoney(purchase.totalUsd),
    },
    {
      key: "pendingUsd",
      label: "Pendiente",
      numeric: true,
      render: (purchase) => formatMoney(purchase.pendingUsd),
    },
    {
      key: "status",
      label: "Estado",
      render: (purchase) =>
        purchase.isVoided ? (
          <StatusBadge tone="destructive">Anulada</StatusBadge>
        ) : purchase.paymentStatus === "paid" ? (
          <StatusBadge tone="success">Pagada</StatusBadge>
        ) : purchase.paymentStatus === "partial" ? (
          <StatusBadge tone="warning">Parcial</StatusBadge>
        ) : (
          <StatusBadge tone="muted">Sin pagar</StatusBadge>
        ),
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border p-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(0,1fr))]">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="purchase-search">
              Buscar
            </label>
            <Input
              id="purchase-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Código, vehículo o proveedor"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="filter-vehicle">
              Vehículo
            </label>
            <Select id="filter-vehicle" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
              <option value="">Todos</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.code} · {vehicle.description}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="filter-vendor">
              Proveedor
            </label>
            <Select id="filter-vendor" value={vendorId} onChange={(event) => setVendorId(event.target.value)}>
              <option value="">Todos</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="filter-tx-type">
              Tipo
            </label>
            <Select
              id="filter-tx-type"
              value={txType}
              onChange={(event) => setTxType(event.target.value)}
              className="w-40"
            >
              <option value="">Todos</option>
              {Object.entries(TX_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="filter-from">
              Desde
            </label>
            <Input id="filter-from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="filter-to">
              Hasta
            </label>
            <Input id="filter-to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
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
        getRowId={(purchase) => purchase.id}
        summary={
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {rows.length} de {purchases.length} {purchases.length === 1 ? "compra visible" : "compras visibles"}
              {hasActiveFilters ? " con los filtros actuales." : " en el registro."}
            </p>
            {canWrite ? (
              <Button size="sm" render={<Link href="/compras/nueva" />}>
                Registrar compra
              </Button>
            ) : null}
          </div>
        }
        emptyTitle="Sin compras registradas"
        emptyDescription="Registra la primera compra para empezar a ver el costo de adquisición del lote."
        emptyAction={
          canWrite ? (
            <Button size="sm" render={<Link href="/compras/nueva" />}>
              Registrar compra
            </Button>
          ) : null
        }
        filteredEmptyTitle="No hay compras para esta búsqueda"
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
              <span className="text-muted-foreground">Total vigente del resultado actual</span>
              <span className="font-medium">{formatMoney(footTotal)}</span>
            </div>
          </div>
        }
        rowActions={(purchase) => (
          <Button variant="outline" size="sm" render={<Link href={`/compras/${purchase.code}`}>Ver detalle</Link>} />
        )}
        rowClassName={(purchase) => (purchase.isVoided ? "opacity-60" : undefined)}
      />
    </div>
  )

  function resetFilters() {
    setSearch("")
    setVehicleId("")
    setVendorId("")
    setTxType("")
    setDateFrom("")
    setDateTo("")
    setIncludeVoided(false)
  }
}
