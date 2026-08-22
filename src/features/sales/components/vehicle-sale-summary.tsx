import Link from "next/link"
import { DetailGrid, DetailItem, DetailSection } from "@/components/shared/detail-section"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { formatMoney } from "@/lib/money"
import type { VehicleSaleSummaryDTO } from "../types"

export function VehicleSaleSummary({
  summary,
  vehicleId,
  canWrite,
}: {
  summary: VehicleSaleSummaryDTO
  vehicleId: string
  canWrite: boolean
}) {
  return (
    <DetailSection
      title="Venta"
      description="Resultado financiero activo de la unidad y su historial de ventas anuladas."
    >
      {summary.activeSale ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{summary.activeSale.buyerName}</p>
                <StatusBadge tone={summary.activeSale.result === "profit" ? "success" : summary.activeSale.result === "loss" ? "destructive" : "muted"}>
                  {summary.activeSale.result === "profit" ? "Ganancia" : summary.activeSale.result === "loss" ? "Pérdida" : "Sin margen"}
                </StatusBadge>
              </div>
              <p className="font-mono text-xs text-muted-foreground">{summary.activeSale.code}</p>
            </div>
            <Button variant="outline" size="sm" render={<Link href={`/ventas/${summary.activeSale.code}`}>Ver venta</Link>} />
          </div>
          <DetailGrid>
            <DetailItem label="Precio de venta" value={formatMoney(summary.activeSale.salePriceUsd)} />
            <DetailItem label="Costo total" value={formatMoney(summary.activeSale.snapshot.totalCostUsd)} />
            <DetailItem label="Profit" value={formatMoney(summary.activeSale.snapshot.profitUsd)} />
            <DetailItem label="ROI" value={summary.activeSale.snapshot.roiLabel} />
            <DetailItem label="Fecha" value={summary.activeSale.saleDate.slice(0, 10)} />
            <DetailItem label="Comprador" value={summary.activeSale.buyerName} />
          </DetailGrid>
        </div>
      ) : summary.voidedSales.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">No hay venta activa. La unidad tiene ventas anuladas consultables.</p>
          {summary.voidedSales.map((sale) => (
            <div key={sale.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-3">
              <div>
                <p className="font-medium">{sale.buyerName}</p>
                <p className="font-mono text-xs text-muted-foreground">{sale.code}</p>
              </div>
              <Button variant="outline" size="sm" render={<Link href={`/ventas/${sale.code}`}>Ver venta anulada</Link>} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          <p>No hay venta registrada para este vehículo.</p>
          {canWrite ? (
            <Button size="sm" render={<Link href={`/ventas/nuevo?vehicleId=${vehicleId}`}>Registrar venta</Link>} />
          ) : null}
        </div>
      )}
    </DetailSection>
  )
}
