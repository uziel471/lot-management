"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import type { CatalogOption } from "@/features/catalogs/types"
import { addMoney, formatMoney } from "@/lib/money"
import { PAYMENT_METHOD_LABELS, PAYMENT_SOURCE_TYPE_LABELS } from "../enums"
import type { PaymentListItemDTO } from "../types"

export function PaymentTable({
  payments,
  vendors,
  canWrite,
}: {
  payments: PaymentListItemDTO[]
  vendors: CatalogOption[]
  canWrite: boolean
}) {
  const [search, setSearch] = useState("")
  const [providerId, setProviderId] = useState("")
  const [sourceType, setSourceType] = useState("")
  const [method, setMethod] = useState("")
  const [currency, setCurrency] = useState("")
  const [status, setStatus] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [includeVoided, setIncludeVoided] = useState(false)

  const hasActiveFilters = Boolean(
    search || providerId || sourceType || method || currency || status || dateFrom || dateTo || includeVoided,
  )

  const rows = useMemo(() => {
    return payments.filter((payment) => {
      if (search) {
        const haystack = [
          payment.code,
          payment.providerName ?? "Sin proveedor",
          PAYMENT_METHOD_LABELS[payment.method],
          ...payment.sourceTypes.map((type) => PAYMENT_SOURCE_TYPE_LABELS[type]),
        ]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(search.trim().toLowerCase())) return false
      }
      if (providerId && payment.providerId !== providerId) return false
      if (!includeVoided && payment.isVoided) return false
      if (sourceType && !payment.sourceTypes.includes(sourceType as PaymentListItemDTO["sourceTypes"][number])) return false
      if (method && payment.method !== method) return false
      if (currency && payment.currency !== currency) return false
      if (status && payment.status !== status) return false
      if (dateFrom && payment.paymentDate.slice(0, 10) < dateFrom) return false
      if (dateTo && payment.paymentDate.slice(0, 10) > dateTo) return false
      return true
    })
  }, [payments, search, providerId, includeVoided, sourceType, method, currency, status, dateFrom, dateTo])

  const activeTotal = useMemo(() => {
    const activeRows = rows.filter((payment) => !payment.isVoided)
    if (activeRows.length === 0) return { amount: 0, currency: "USD" as const }
    return activeRows.map((payment) => payment.totalUsd).reduce((a, b) => addMoney(a, b))
  }, [rows])

  function resetFilters() {
    setSearch("")
    setProviderId("")
    setSourceType("")
    setMethod("")
    setCurrency("")
    setStatus("")
    setDateFrom("")
    setDateTo("")
    setIncludeVoided(false)
  }

  const columns: DataTableColumn<PaymentListItemDTO>[] = [
    {
      key: "code",
      label: "Código",
      render: (payment) => (
        <Link href={`/pagos/${payment.code}`} className="font-mono text-xs hover:underline">
          {payment.code}
        </Link>
      ),
    },
    { key: "date", label: "Fecha", render: (payment) => payment.paymentDate.slice(0, 10) },
    { key: "provider", label: "Proveedor", render: (payment) => payment.providerName ?? "Sin proveedor" },
    { key: "method", label: "Método", render: (payment) => PAYMENT_METHOD_LABELS[payment.method] },
    {
      key: "amount",
      label: "Monto",
      numeric: true,
      render: (payment) => formatMoney(payment.amount),
    },
    {
      key: "totalUsd",
      label: "USD",
      numeric: true,
      render: (payment) => formatMoney(payment.totalUsd),
    },
    {
      key: "applications",
      label: "Aplicaciones",
      numeric: true,
      render: (payment) => String(payment.applicationCount),
    },
    {
      key: "status",
      label: "Estado",
      render: (payment) =>
        payment.isVoided ? (
          <StatusBadge tone="destructive">Anulado</StatusBadge>
        ) : (
          <StatusBadge tone="success">Vigente</StatusBadge>
        ),
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border p-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_repeat(7,minmax(0,1fr))]">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="payment-search">
              Buscar
            </label>
            <Input
              id="payment-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Código, proveedor o método"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="payment-provider">
              Proveedor
            </label>
            <Select id="payment-provider" value={providerId} onChange={(event) => setProviderId(event.target.value)}>
              <option value="">Todos</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="payment-source-type">
              Documento
            </label>
            <Select id="payment-source-type" value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
              <option value="">Todos</option>
              {Object.entries(PAYMENT_SOURCE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="payment-method">
              Método
            </label>
            <Select id="payment-method" value={method} onChange={(event) => setMethod(event.target.value)}>
              <option value="">Todos</option>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="payment-currency">
              Moneda
            </label>
            <Select id="payment-currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>
              <option value="">Todas</option>
              <option value="USD">USD</option>
              <option value="MXN">MXN</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="payment-status">
              Estado
            </label>
            <Select id="payment-status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Todos</option>
              <option value="active">Vigente</option>
              <option value="voided">Anulado</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="payment-from">
              Desde
            </label>
            <Input id="payment-from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="payment-to">
              Hasta
            </label>
            <Input id="payment-to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
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
            Incluir anulados
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
        getRowId={(payment) => payment.id}
        summary={
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {rows.length} de {payments.length} {payments.length === 1 ? "pago visible" : "pagos visibles"}
              {hasActiveFilters ? " con los filtros actuales." : " en el registro."}
            </p>
            <p className="text-sm font-medium">Total activo: {formatMoney(activeTotal)}</p>
          </div>
        }
        emptyTitle="Sin pagos registrados"
        emptyDescription="Registra el primer pago para empezar a seguir saldos pendientes y pagos parciales."
      />
    </div>
  )
}
