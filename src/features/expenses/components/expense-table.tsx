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
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_OPTIONS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_OPTIONS,
  expenseStatusTone,
} from "../enums"
import type { ExpenseListItemDTO } from "../types"

export function ExpenseTable({
  expenses,
  vehicles,
  vendors,
  canWrite,
}: {
  expenses: ExpenseListItemDTO[]
  vehicles: VehicleOption[]
  vendors: CatalogOption[]
  canWrite: boolean
}) {
  const [search, setSearch] = useState("")
  const [association, setAssociation] = useState("")
  const [vehicleId, setVehicleId] = useState("")
  const [vendorId, setVendorId] = useState("")
  const [category, setCategory] = useState("")
  const [currency, setCurrency] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [includeVoided, setIncludeVoided] = useState(false)

  const hasActiveFilters = Boolean(
    search ||
      association ||
      vehicleId ||
      vendorId ||
      category ||
      currency ||
      paymentMethod ||
      dateFrom ||
      dateTo ||
      includeVoided,
  )

  const rows = useMemo(() => {
    return expenses.filter((expense) => {
      if (search) {
        const haystack = [
          expense.code,
          expense.vehicleCode ?? "General",
          expense.vehicleDescription ?? "",
          expense.vendorName ?? "Sin proveedor",
          EXPENSE_CATEGORY_LABELS[expense.category],
        ]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(search.trim().toLowerCase())) return false
      }
      if (association === "general" && !expense.isGeneral) return false
      if (association === "vehicle" && expense.isGeneral) return false
      if (vehicleId && expense.vehicleId !== vehicleId) return false
      if (vendorId && expense.vendorId !== vendorId) return false
      if (!includeVoided && expense.isVoided) return false
      if (category && expense.category !== category) return false
      if (currency && expense.currency !== currency) return false
      if (paymentMethod && expense.paymentMethod !== paymentMethod) return false
      if (dateFrom && expense.expenseDate.slice(0, 10) < dateFrom) return false
      if (dateTo && expense.expenseDate.slice(0, 10) > dateTo) return false
      return true
    })
  }, [
    expenses,
    search,
    association,
    vehicleId,
    vendorId,
    includeVoided,
    category,
    currency,
    paymentMethod,
    dateFrom,
    dateTo,
  ])

  const activeTotal = useMemo(() => {
    const activeRows = rows.filter((expense) => !expense.isVoided)
    if (activeRows.length === 0) return { amount: 0, currency: "USD" as const }
    return activeRows.map((expense) => expense.totalUsd).reduce((a, b) => addMoney(a, b))
  }, [rows])

  function resetFilters() {
    setSearch("")
    setAssociation("")
    setVehicleId("")
    setVendorId("")
    setCategory("")
    setCurrency("")
    setPaymentMethod("")
    setDateFrom("")
    setDateTo("")
    setIncludeVoided(false)
  }

  const columns: DataTableColumn<ExpenseListItemDTO>[] = [
    {
      key: "code",
      label: "Código",
      render: (expense) => (
        <Link href={`/gastos/${expense.code}`} className="font-mono text-xs hover:underline">
          {expense.code}
        </Link>
      ),
    },
    {
      key: "date",
      label: "Fecha",
      render: (expense) => expense.expenseDate.slice(0, 10),
    },
    {
      key: "category",
      label: "Categoría",
      render: (expense) => EXPENSE_CATEGORY_LABELS[expense.category],
    },
    {
      key: "vehicle",
      label: "Vehículo",
      render: (expense) =>
        expense.vehicleCode ? (
          <Link href={`/vehiculos/${expense.vehicleCode}`} className="hover:underline">
            <span className="font-medium">{expense.vehicleDescription}</span>
            <span className="mt-0.5 block font-mono text-xs text-muted-foreground">{expense.vehicleCode}</span>
          </Link>
        ) : (
          <span className="text-muted-foreground">General</span>
        ),
    },
    {
      key: "vendor",
      label: "Proveedor",
      render: (expense) => expense.vendorName ?? "Sin proveedor",
    },
    {
      key: "totalOriginal",
      label: "Total original",
      numeric: true,
      render: (expense) => formatMoney(expense.totalOriginal),
    },
    {
      key: "totalUsd",
      label: "Total (USD)",
      numeric: true,
      render: (expense) => formatMoney(expense.totalUsd),
    },
    {
      key: "pendingUsd",
      label: "Pendiente",
      numeric: true,
      render: (expense) => formatMoney(expense.pendingUsd),
    },
    {
      key: "status",
      label: "Estado",
      render: (expense) =>
        expense.isVoided ? (
          <StatusBadge tone={expenseStatusTone("voided")}>Anulado</StatusBadge>
        ) : expense.paymentStatus === "paid" ? (
          <StatusBadge tone="success">Pagado</StatusBadge>
        ) : expense.paymentStatus === "partial" ? (
          <StatusBadge tone="warning">Parcial</StatusBadge>
        ) : (
          <StatusBadge tone="muted">Sin pagar</StatusBadge>
        ),
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border p-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_repeat(8,minmax(0,1fr))]">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="expense-search">
              Buscar
            </label>
            <Input
              id="expense-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Código, vehículo o proveedor"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="expense-association">
              Tipo
            </label>
            <Select id="expense-association" value={association} onChange={(event) => setAssociation(event.target.value)}>
              <option value="">Todos</option>
              <option value="vehicle">Relacionados a vehículo</option>
              <option value="general">Generales</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="expense-vehicle">
              Vehículo
            </label>
            <Select id="expense-vehicle" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
              <option value="">Todos</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.code} · {vehicle.description}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="expense-vendor">
              Proveedor
            </label>
            <Select id="expense-vendor" value={vendorId} onChange={(event) => setVendorId(event.target.value)}>
              <option value="">Todos</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="expense-category">
              Categoría
            </label>
            <Select id="expense-category" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">Todas</option>
              {EXPENSE_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="expense-currency">
              Moneda
            </label>
            <Select id="expense-currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>
              <option value="">Todas</option>
              <option value="USD">USD</option>
              <option value="MXN">MXN</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="expense-payment">
              Pago
            </label>
            <Select id="expense-payment" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              <option value="">Todos</option>
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="expense-date-from">
              Desde
            </label>
            <Input id="expense-date-from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="expense-date-to">
              Hasta
            </label>
            <Input id="expense-date-to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
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
        getRowId={(expense) => expense.id}
        summary={
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {rows.length} de {expenses.length} {expenses.length === 1 ? "gasto visible" : "gastos visibles"}
              {hasActiveFilters ? " con los filtros actuales." : " en el registro."}
            </p>
            {canWrite ? (
              <Button size="sm" render={<Link href="/gastos/nuevo" />}>
                Registrar gasto
              </Button>
            ) : null}
          </div>
        }
        emptyTitle="Sin gastos registrados"
        emptyDescription="Registra el primer gasto operativo para empezar a seguir los egresos del lote."
        emptyAction={
          canWrite ? (
            <Button size="sm" render={<Link href="/gastos/nuevo" />}>
              Registrar gasto
            </Button>
          ) : null
        }
        filteredEmptyTitle="No hay gastos para esta búsqueda"
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
              <span className="font-medium">{formatMoney(activeTotal)}</span>
            </div>
          </div>
        }
        rowActions={(expense) => (
          <Button variant="outline" size="sm" render={<Link href={`/gastos/${expense.code}`}>Ver detalle</Link>} />
        )}
        rowClassName={(expense) => (expense.isVoided ? "opacity-60" : undefined)}
      />
    </div>
  )
}
