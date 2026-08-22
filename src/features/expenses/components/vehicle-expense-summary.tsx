import Link from "next/link"

import { DetailSection } from "@/components/shared/detail-section"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { formatMoney } from "@/lib/money"
import { EXPENSE_CATEGORY_LABELS, expenseStatusTone } from "../enums"
import type { VehicleExpenseSummaryDTO } from "../types"

export function VehicleExpenseSummary({
  vehicleId,
  vehicleCode,
  summary,
  canWrite,
}: {
  vehicleId: string
  vehicleCode: string
  summary: VehicleExpenseSummaryDTO
  canWrite: boolean
}) {
  return (
    <DetailSection
      title="Gastos"
      description="Costo activo de gastos operativos de esta unidad, separado de compras y reparaciones."
      actions={
        canWrite ? (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/gastos/nuevo?vehicleId=${vehicleId}&returnTo=/vehiculos/${vehicleCode}`}>Registrar gasto</Link>}
          />
        ) : null
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="text-xs font-medium text-muted-foreground">Costo activo de gastos</p>
            <p className="mt-1 text-lg font-semibold">{formatMoney(summary.activeTotalUsd)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs font-medium text-muted-foreground">Gastos activos</p>
            <p className="mt-1 text-lg font-semibold">{summary.activeCount}</p>
          </div>
        </div>

        {summary.categorySummary.length > 0 ? (
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium">Resumen por categoría</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {summary.categorySummary.map((entry) => (
                <StatusBadge key={entry.category} tone="muted">
                  {entry.label}: {formatMoney(entry.activeTotalUsd)} · {entry.count}
                </StatusBadge>
              ))}
            </div>
          </div>
        ) : null}

        {summary.rows.length === 0 ? (
          <EmptyState
            title="Sin gastos registrados"
            description="Todavía no hay gastos relacionados con esta unidad."
          />
        ) : (
          <div className="rounded-lg border">
            <div className="border-b px-4 py-3">
              <p className="text-sm font-medium">Historial de gastos</p>
            </div>
            <div className="divide-y">
              {summary.rows.map((expense) => (
                <Link
                  key={expense.id}
                  href={`/gastos/${expense.code}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs">{expense.code}</p>
                    <p className="mt-1 font-medium">{EXPENSE_CATEGORY_LABELS[expense.category]}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge tone={expenseStatusTone(expense.isVoided ? "voided" : "active")}>
                        {expense.isVoided ? "Anulado" : "Vigente"}
                      </StatusBadge>
                      <span className="text-xs text-muted-foreground">{expense.expenseDate.slice(0, 10)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatMoney(expense.totalUsd)}</p>
                    <p className="text-xs text-muted-foreground">
                      {expense.isVoided ? "Fuera del costo activo" : "Detalle consultable"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </DetailSection>
  )
}
