"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
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
  canWrite,
}: {
  purchases: PurchaseListItemDTO[]
  canWrite: boolean
}) {
  const [txType, setTxType] = useState("")
  const [includeVoided, setIncludeVoided] = useState(false)

  const rows = useMemo(() => {
    return purchases.filter((purchase) => {
      if (!includeVoided && purchase.isVoided) return false
      if (txType && purchase.txType !== txType) return false
      return true
    })
  }, [purchases, txType, includeVoided])

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
          {purchase.vehicleDescription}
        </Link>
      ),
    },
    { key: "vendor", label: "Proveedor", render: (purchase) => purchase.vendorName },
    { key: "date", label: "Fecha", render: (purchase) => purchase.purchaseDate.slice(0, 10) },
    {
      key: "txType",
      label: "Tipo",
      render: (purchase) => <Badge variant="outline">{TX_TYPE_LABELS[purchase.txType]}</Badge>,
    },
    {
      key: "totalUsd",
      label: "Total (USD)",
      numeric: true,
      render: (purchase) => formatMoney(purchase.totalUsd),
    },
    {
      key: "status",
      label: "Estado",
      render: (purchase) =>
        purchase.isVoided ? <Badge variant="destructive">Anulada</Badge> : <Badge variant="muted">Vigente</Badge>,
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border p-3">
        <div className="flex flex-wrap items-end gap-3">
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
          <label className="flex items-center gap-1.5 pb-1.5 text-sm">
            <input
              type="checkbox"
              checked={includeVoided}
              onChange={(event) => setIncludeVoided(event.target.checked)}
              className="size-3.5 accent-primary"
            />
            Incluir anuladas
          </label>
        </div>
        {canWrite ? (
          <Button size="sm" render={<Link href="/compras/nueva" />}>
            Registrar compra
          </Button>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(purchase) => purchase.id}
        getSearchText={(purchase) => `${purchase.code} ${purchase.vehicleDescription} ${purchase.vendorName}`}
        filterPlaceholder="Buscar por código, vehículo o proveedor…"
        emptyTitle="Sin compras registradas"
        emptyDescription="Registra la primera compra para empezar a ver el costo de adquisición del lote."
        rowClassName={(purchase) => (purchase.isVoided ? "opacity-60" : undefined)}
      />

      <p className="text-right text-sm font-medium">Total vigente: {formatMoney(footTotal)}</p>
    </div>
  )
}
