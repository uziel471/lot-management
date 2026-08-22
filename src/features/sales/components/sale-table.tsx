"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { formatMoney } from "@/lib/money"
import { ROI_RANGE_LABELS, SALE_RESULT_LABELS } from "../enums"
import type { SaleListResponseDTO, SaleVehicleOptionDTO } from "../types"

export function SaleTable({
  response,
  vehicles,
  canWrite,
}: {
  response: SaleListResponseDTO
  vehicles: SaleVehicleOptionDTO[]
  canWrite: boolean
}) {
  const [search, setSearch] = useState("")
  const [vehicleId, setVehicleId] = useState("")
  const [result, setResult] = useState("")
  const [roiRange, setRoiRange] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [includeVoided, setIncludeVoided] = useState(false)

  const hasActiveFilters = Boolean(search || vehicleId || result || roiRange || dateFrom || dateTo || includeVoided)

  const rows = useMemo(() => {
    return response.rows.filter((sale) => {
      if (search) {
        const haystack = [
          sale.code,
          sale.vehicleCode,
          sale.vehicleDescription,
          sale.buyerName,
          sale.buyerPhone ?? "",
          sale.buyerEmail ?? "",
        ]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(search.trim().toLowerCase())) return false
      }
      if (vehicleId && sale.vehicleId !== vehicleId) return false
      if (result && sale.result !== result) return false
      if (dateFrom && sale.saleDate.slice(0, 10) < dateFrom) return false
      if (dateTo && sale.saleDate.slice(0, 10) > dateTo) return false
      if (!includeVoided && sale.isVoided) return false
      if (roiRange === "negative" && !(sale.snapshot.roi !== null && sale.snapshot.roi < 0)) return false
      if (roiRange === "zeroTo50" && !(sale.snapshot.roi !== null && sale.snapshot.roi >= 0 && sale.snapshot.roi <= 50)) return false
      if (roiRange === "over50" && !(sale.snapshot.roi !== null && sale.snapshot.roi > 50)) return false
      if (roiRange === "unavailable" && sale.snapshot.roi !== null) return false
      return true
    })
  }, [response.rows, search, vehicleId, result, roiRange, dateFrom, dateTo, includeVoided])

  const summary = useMemo(() => {
    const active = rows.filter((sale) => !sale.isVoided)
    const revenue = active.reduce((sum, sale) => sum + sale.salePriceUsd.amount, 0)
    const cost = active.reduce((sum, sale) => sum + sale.snapshot.totalCostUsd.amount, 0)
    const profit = active.reduce((sum, sale) => sum + sale.snapshot.profitUsd.amount, 0)
    return {
      revenue: { amount: revenue, currency: "USD" as const },
      cost: { amount: cost, currency: "USD" as const },
      profit: { amount: profit, currency: "USD" as const },
      roi: cost > 0 ? Math.round((profit / cost) * 10_000) / 100 : null,
    }
  }, [rows])

  const columns: DataTableColumn<(typeof rows)[number]>[] = [
    {
      key: "code",
      label: "Código",
      render: (sale) => (
        <Link href={`/ventas/${sale.code}`} className="font-mono text-xs hover:underline">
          {sale.code}
        </Link>
      ),
    },
    {
      key: "vehicle",
      label: "Vehículo",
      render: (sale) => (
        <Link href={`/vehiculos/${sale.vehicleCode}`} className="hover:underline">
          <span className="font-medium">{sale.vehicleDescription}</span>
          <span className="mt-0.5 block font-mono text-xs text-muted-foreground">{sale.vehicleCode}</span>
        </Link>
      ),
    },
    { key: "buyer", label: "Comprador", render: (sale) => sale.buyerName },
    { key: "saleDate", label: "Fecha", render: (sale) => sale.saleDate.slice(0, 10) },
    { key: "price", label: "Venta", numeric: true, render: (sale) => formatMoney(sale.salePriceUsd) },
    { key: "cost", label: "Costo", numeric: true, render: (sale) => formatMoney(sale.snapshot.totalCostUsd) },
    { key: "profit", label: "Profit", numeric: true, render: (sale) => formatMoney(sale.snapshot.profitUsd) },
    { key: "roi", label: "ROI", numeric: true, render: (sale) => sale.snapshot.roiLabel },
    {
      key: "status",
      label: "Estado",
      render: (sale) =>
        sale.isVoided ? (
          <StatusBadge tone="destructive">Anulada</StatusBadge>
        ) : sale.result === "profit" ? (
          <StatusBadge tone="success">Ganancia</StatusBadge>
        ) : sale.result === "loss" ? (
          <StatusBadge tone="destructive">Pérdida</StatusBadge>
        ) : (
          <StatusBadge tone="muted">Sin margen</StatusBadge>
        ),
    },
  ]

  function resetFilters() {
    setSearch("")
    setVehicleId("")
    setResult("")
    setRoiRange("")
    setDateFrom("")
    setDateTo("")
    setIncludeVoided(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border p-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_repeat(5,minmax(0,1fr))]">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Buscar</label>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Código, vehículo o comprador" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Vehículo</label>
            <Select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
              <option value="">Todos</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.code} · {vehicle.description}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Resultado</label>
            <Select value={result} onChange={(event) => setResult(event.target.value)}>
              <option value="">Todos</option>
              {Object.entries(SALE_RESULT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">ROI</label>
            <Select value={roiRange} onChange={(event) => setRoiRange(event.target.value)}>
              <option value="">Todos</option>
              {Object.entries(ROI_RANGE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Desde</label>
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Hasta</label>
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={includeVoided} onChange={(event) => setIncludeVoided(event.target.checked)} className="size-3.5 accent-primary" />
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
        getRowId={(sale) => sale.id}
        summary={
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {rows.length} de {response.rows.length} {response.rows.length === 1 ? "venta visible" : "ventas visibles"}
              {hasActiveFilters ? " con los filtros actuales." : " en el registro."}
            </p>
            {canWrite ? (
              <Button size="sm" render={<Link href="/ventas/nuevo" />}>
                Registrar venta
              </Button>
            ) : null}
          </div>
        }
        emptyTitle="Sin ventas registradas"
        emptyDescription="Registra la primera venta para empezar a medir profit y ROI por unidad."
        emptyAction={canWrite ? <Button size="sm" render={<Link href="/ventas/nuevo" />}>Registrar venta</Button> : null}
        filteredEmptyTitle="No hay ventas para esta búsqueda"
        filteredEmptyDescription="Ajusta o limpia los filtros para volver al registro completo."
        filteredEmptyAction={<Button variant="outline" size="sm" onClick={resetFilters}>Restablecer vista</Button>}
        hasActiveFilters={hasActiveFilters}
        footer={
          <div className="grid gap-2 rounded-lg border bg-muted/30 px-3 py-3 text-sm md:grid-cols-4">
            <SummaryLine label="Venta activa" value={formatMoney(summary.revenue)} />
            <SummaryLine label="Costo activo" value={formatMoney(summary.cost)} />
            <SummaryLine label="Profit activo" value={formatMoney(summary.profit)} />
            <SummaryLine label="ROI agregado" value={summary.roi === null ? "N/A" : `${summary.roi.toFixed(2)}%`} />
          </div>
        }
        rowActions={(sale) => (
          <Button variant="outline" size="sm" render={<Link href={`/ventas/${sale.code}`}>Ver detalle</Link>} />
        )}
        rowClassName={(sale) => (sale.isVoided ? "opacity-60" : undefined)}
      />
    </div>
  )
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
