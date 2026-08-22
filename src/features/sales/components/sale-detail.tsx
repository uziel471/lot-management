"use client"

import Link from "next/link"
import { useActionState } from "react"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { DetailGrid, DetailItem, DetailSection } from "@/components/shared/detail-section"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toastManager } from "@/components/ui/toast"
import { formatMoney } from "@/lib/money"
import type { ActionResult } from "@/types/action-result"
import { voidSaleAction } from "../actions"
import type { SaleDetailDTO } from "../types"

export function SaleDetail({ sale, canVoid }: { sale: SaleDetailDTO; canVoid: boolean }) {
  const [state, formAction] = useActionState(
    async (_previousState: ActionResult<SaleDetailDTO> | null, formData: FormData) => {
      const result = await voidSaleAction(sale.code, formData)
      if (result.ok) {
        toastManager.add({ title: "Venta anulada" })
      } else {
        toastManager.add({ title: "No se pudo anular", description: result.error })
      }
      return result
    },
    null,
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{sale.buyerName}</h1>
              <span className="font-mono text-xs text-muted-foreground">{sale.code}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sale.isVoided ? <StatusBadge tone="destructive">Anulada</StatusBadge> : null}
              {!sale.isVoided ? (
                <StatusBadge tone={sale.result === "profit" ? "success" : sale.result === "loss" ? "destructive" : "muted"}>
                  {sale.result === "profit" ? "Ganancia" : sale.result === "loss" ? "Pérdida" : "Sin margen"}
                </StatusBadge>
              ) : null}
              <StatusBadge tone="neutral">{sale.snapshot.roiLabel}</StatusBadge>
            </div>
          </div>
          {canVoid && !sale.isVoided ? (
            <ConfirmDialog
              trigger={<Button variant="destructive" size="sm">Anular venta</Button>}
              title="Anular venta"
              description="La venta seguirá siendo consultable, pero dejará de contar para el resultado activo del vehículo y del módulo."
              confirmLabel="Anular"
              variant="destructive"
              onConfirm={async (formData) => {
                await formAction(formData ?? new FormData())
              }}
              body={
                <div className="grid gap-2">
                  <Label htmlFor="sale-void-reason">Motivo</Label>
                  <Textarea id="sale-void-reason" name="reason" required rows={3} />
                  {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}
                </div>
              }
            />
          ) : null}
        </div>
      </div>

      {sale.isVoided ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive">Venta anulada</p>
          <p className="text-muted-foreground">{sale.voidReason}</p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="flex flex-col gap-6">
          <DetailSection title="Identidad" description="Registro inmutable de la venta capturada.">
            <DetailGrid>
              <DetailItem label="Vehículo" value={sale.vehicleDescription} />
              <DetailItem label="Código de vehículo" value={sale.vehicleCode} mono />
              <DetailItem label="Fecha de venta" value={sale.saleDate.slice(0, 10)} />
              <DetailItem label="Precio de venta" value={formatMoney(sale.salePriceUsd)} />
              <DetailItem label="Comprador" value={sale.buyerName} />
              <DetailItem label="Teléfono" value={sale.buyerPhone} />
              <DetailItem label="Correo" value={sale.buyerEmail} />
              <DetailItem label="Términos" value={sale.terms} />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Snapshot financiero" description="Congelado al momento de registrar la venta.">
            <DetailGrid>
              <DetailItem label="Adquisición" value={formatMoney(sale.snapshot.acquisitionCostUsd)} />
              <DetailItem label="Reparaciones" value={formatMoney(sale.snapshot.repairCostUsd)} />
              <DetailItem label="Gastos del vehículo" value={formatMoney(sale.snapshot.vehicleExpenseCostUsd)} />
              <DetailItem label="Costo total" value={formatMoney(sale.snapshot.totalCostUsd)} />
              <DetailItem label="Profit" value={formatMoney(sale.snapshot.profitUsd)} />
              <DetailItem label="ROI" value={sale.snapshot.roiLabel} />
            </DetailGrid>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <Button variant="outline" size="sm" render={<Link href={`/vehiculos/${sale.vehicleCode}`}>Ver vehículo</Link>} />
              <Button variant="outline" size="sm" render={<Link href={`/compras?vehicleId=${sale.vehicleId}`}>Compras</Link>} />
              <Button variant="outline" size="sm" render={<Link href={`/reparaciones?vehicleId=${sale.vehicleId}`}>Reparaciones</Link>} />
              <Button variant="outline" size="sm" render={<Link href={`/gastos?vehicleId=${sale.vehicleId}`}>Gastos</Link>} />
            </div>
          </DetailSection>
        </div>

        <div className="flex flex-col gap-6">
          <DetailSection title="Referencia y notas" description="Contexto operativo y soporte del registro.">
            <DetailGrid>
              <DetailItem label="Referencia" value={sale.referenceNumber} />
              <DetailItem label="Creado por" value={sale.createdByName} />
              <DetailItem label="Creado" value={new Date(sale.createdAt).toLocaleString("es-MX")} />
              <DetailItem label="Actualizado" value={new Date(sale.updatedAt).toLocaleString("es-MX")} />
            </DetailGrid>
            <p className="mt-4 text-sm whitespace-pre-wrap">{sale.notes ?? "Sin notas registradas."}</p>
          </DetailSection>
        </div>
      </div>
    </div>
  )
}
