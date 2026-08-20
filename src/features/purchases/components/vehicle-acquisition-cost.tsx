import Link from "next/link"

import { Badge } from "@/components/ui/badge"
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
  cost,
  purchases,
}: {
  vehicleId: string
  cost: VehicleAcquisitionCostDTO
  purchases: PurchaseListItemDTO[]
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Costo de adquisición</h2>
        <span className="text-lg font-semibold">{formatMoney(cost.total)}</span>
      </div>

      {cost.purchaseCount === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no tiene compras registradas.</p>
      ) : (
        <>
          <table className="w-full text-xs">
            <tbody>
              {COST_COMPONENTS.map((component) => (
                <tr key={component.key} className="border-b last:border-0">
                  <td className="py-1 text-muted-foreground">{component.label}</td>
                  <td className="py-1 text-right">{formatMoney(cost.components[component.key])}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-col gap-1">
            {purchases.map((purchase) => (
              <Link
                key={purchase.id}
                href={`/compras/${purchase.code}`}
                className="flex items-center justify-between rounded-md border px-2 py-1.5 text-xs hover:bg-muted/50"
              >
                <span className="flex items-center gap-1.5">
                  {purchase.code}
                  {purchase.isVoided ? (
                    <Badge variant="destructive" className="text-[10px]">
                      Anulada
                    </Badge>
                  ) : null}
                </span>
                <span>{formatMoney(purchase.totalUsd)}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      <Link
        href={`/compras/nueva?vehicleId=${vehicleId}`}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        + Registrar una compra
      </Link>
    </div>
  )
}
