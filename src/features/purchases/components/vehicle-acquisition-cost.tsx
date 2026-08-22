import Link from "next/link"

import { DetailSection } from "@/components/shared/detail-section"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { formatMoney } from "@/lib/money"
import { COST_COMPONENTS } from "../enums"
import type { PurchaseListItemDTO, VehicleAcquisitionCostDTO } from "../types"

/**
 * Costo de adquisición acumulado de un vehículo, con su desglose y
 * sus compras. Se compone en la página del vehículo, no dentro de
 * `features/vehicles` (ver design.md de `add-purchases`, "El costo
 * acumulado se compone en la página, no en la feature").
 *
 * Nombrado siempre como costo de *adquisición*, nunca como costo
 * total: reparaciones y gastos todavía no existen.
 */
export function VehicleAcquisitionCost({
  vehicleId,
  vehicleCode,
  cost,
  purchases,
  canWrite,
}: {
  vehicleId: string
  vehicleCode: string
  cost: VehicleAcquisitionCostDTO
  purchases: PurchaseListItemDTO[]
  canWrite: boolean
}) {
  return (
    <DetailSection
      title="Costo de adquisición"
      description="Total acumulado de compras vigentes de esta unidad, sin mezclar reparaciones ni otros gastos."
      actions={
        canWrite ? (
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/compras/nueva?vehicleId=${vehicleId}&returnTo=/vehiculos/${vehicleCode}`}>Registrar compra</Link>}
        />
        ) : null
      }
    >
      <div className="grid gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium text-muted-foreground">Total vigente en USD</p>
          <p className="mt-1 text-lg font-semibold">{formatMoney(cost.total)}</p>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <p>Pagado: {formatMoney(cost.paidUsd)}</p>
            <p>Pendiente: {formatMoney(cost.pendingUsd)}</p>
          </div>
        </div>

        {cost.purchaseCount === 0 ? (
          <EmptyState
            title="Sin compras registradas"
            description="Todavía no hay compras activas para esta unidad, así que el costo de adquisición permanece en cero."
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <tbody>
                  {COST_COMPONENTS.map((component) => (
                    <tr key={component.key} className="border-b last:border-0">
                      <td className="px-4 py-2 text-muted-foreground">{component.label}</td>
                      <td className="px-4 py-2 text-right">{formatMoney(cost.components[component.key])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-lg border">
              <div className="border-b px-4 py-3">
                <p className="text-sm font-medium">Compras relacionadas</p>
              </div>
              <div className="divide-y">
                {purchases.map((purchase) => (
                  <Link
                    key={purchase.id}
                    href={`/compras/${purchase.code}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs">{purchase.code}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {purchase.isVoided ? (
                          <StatusBadge tone="destructive">Anulada</StatusBadge>
                        ) : (
                          <StatusBadge tone="success">Vigente</StatusBadge>
                        )}
                        <span className="text-xs text-muted-foreground">{purchase.purchaseDate.slice(0, 10)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatMoney(purchase.totalUsd)}</p>
                      <p className="text-xs text-muted-foreground">Pendiente: {formatMoney(purchase.pendingUsd)}</p>
                      {purchase.isVoided ? (
                        <p className="text-xs text-muted-foreground">Excluida del total vigente</p>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </DetailSection>
  )
}
