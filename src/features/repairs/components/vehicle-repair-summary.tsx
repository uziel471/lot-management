import Link from "next/link"

import { DetailSection } from "@/components/shared/detail-section"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { formatMoney } from "@/lib/money"
import { REPAIR_STATUS_LABELS, repairStatusTone } from "../enums"
import type { VehicleRepairSummaryDTO } from "../types"

export function VehicleRepairSummary({
  vehicleId,
  vehicleCode,
  summary,
  canWrite,
}: {
  vehicleId: string
  vehicleCode: string
  summary: VehicleRepairSummaryDTO
  canWrite: boolean
}) {
  return (
    <DetailSection
      title="Reparaciones"
      description="Costo activo y trazabilidad del trabajo de reacondicionamiento de esta unidad, separado del costo de adquisición."
      actions={
        canWrite ? (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/reparaciones/nueva?vehicleId=${vehicleId}&returnTo=/vehiculos/${vehicleCode}`}>Registrar reparación</Link>}
          />
        ) : null
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="text-xs font-medium text-muted-foreground">Costo activo de reparaciones</p>
            <p className="mt-1 text-lg font-semibold">{formatMoney(summary.activeTotalUsd)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs font-medium text-muted-foreground">Reparaciones activas</p>
            <p className="mt-1 text-lg font-semibold">{summary.activeCount}</p>
          </div>
        </div>

        {summary.statusSummary.length > 0 ? (
          <div className="flex flex-wrap gap-2 rounded-lg border p-4">
            {summary.statusSummary.map((entry) => (
              <StatusBadge key={entry.status} tone={repairStatusTone(entry.status)}>
                {entry.label}: {entry.count}
              </StatusBadge>
            ))}
          </div>
        ) : null}

        {summary.rows.length === 0 ? (
          <EmptyState
            title="Sin reparaciones registradas"
            description="Todavía no hay reparaciones para esta unidad."
          />
        ) : (
          <div className="rounded-lg border">
            <div className="border-b px-4 py-3">
              <p className="text-sm font-medium">Historial de reparaciones</p>
            </div>
            <div className="divide-y">
              {summary.rows.map((repair) => (
                <Link
                  key={repair.id}
                  href={`/reparaciones/${repair.code}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs">{repair.code}</p>
                    <p className="mt-1 font-medium">{REPAIR_STATUS_LABELS[repair.status]}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge tone={repairStatusTone(repair.status)}>
                        {REPAIR_STATUS_LABELS[repair.status]}
                      </StatusBadge>
                      {repair.isVoided ? <StatusBadge tone="destructive">Anulada</StatusBadge> : null}
                      <span className="text-xs text-muted-foreground">{repair.openedAt.slice(0, 10)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatMoney(repair.totalUsd)}</p>
                    <p className="text-xs text-muted-foreground">
                      {repair.isVoided ? "Fuera del costo activo" : "Detalle consultable"}
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
