"use client"

import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { toastManager } from "@/components/ui/toast"
import { formatMoney } from "@/lib/money"
import { voidPurchaseAction } from "../actions"
import { COST_COMPONENTS, PAYMENT_METHOD_LABELS, SOURCE_TYPE_LABELS, TX_TYPE_LABELS } from "../enums"
import type { PurchaseDetailDTO } from "../types"

/**
 * Ficha de lectura de una compra: los ocho componentes, la conversión
 * aplicada, la compra relacionada y la acción de anular. Sin ninguna
 * acción de editar — la compra es inmutable (ver design.md).
 */
export function PurchaseDetail({
  purchase,
  canVoid,
}: {
  purchase: PurchaseDetailDTO
  canVoid: boolean
}) {
  async function handleVoid(reason: string) {
    const formData = new FormData()
    formData.set("reason", reason)
    const result = await voidPurchaseAction(purchase.code, formData)
    if (result.ok) {
      toastManager.add({ title: "Compra anulada", description: purchase.code })
    } else {
      toastManager.add({ title: "No se pudo anular", description: result.error })
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">{purchase.code}</h1>
          {purchase.isVoided ? <Badge variant="destructive">Anulada</Badge> : null}
          <Badge variant="outline">{TX_TYPE_LABELS[purchase.txType]}</Badge>
        </div>
        {canVoid && !purchase.isVoided ? (
          <VoidAction onConfirm={handleVoid} />
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 rounded-lg border p-3 text-sm">
        <Info label="Vehículo">
          <Link href={`/vehiculos/${purchase.vehicleCode}`} className="hover:underline">
            {purchase.vehicleCode} · {purchase.vehicleDescription}
          </Link>
        </Info>
        <Info label="Proveedor">{purchase.vendorName}</Info>
        <Info label="Fecha de compra">{purchase.purchaseDate.slice(0, 10)}</Info>
        <Info label="Origen">{SOURCE_TYPE_LABELS[purchase.sourceType]}</Info>
        <Info label="Forma de pago">
          {purchase.paymentMethod ? PAYMENT_METHOD_LABELS[purchase.paymentMethod] : "—"}
        </Info>
        <Info label="Referencia">{purchase.referenceNumber ?? "—"}</Info>
        <Info label="Número de lote">{purchase.lotNumber ?? "—"}</Info>
        {purchase.correctsPurchaseCode ? (
          <Info label="Corrige a">
            <Link href={`/compras/${purchase.correctsPurchaseCode}`} className="hover:underline">
              {purchase.correctsPurchaseCode}
            </Link>
          </Info>
        ) : null}
        {purchase.correctedByPurchaseCode ? (
          <Info label="Corregida por">
            <Link href={`/compras/${purchase.correctedByPurchaseCode}`} className="hover:underline">
              {purchase.correctedByPurchaseCode}
            </Link>
          </Info>
        ) : null}
      </div>

      <div className="rounded-lg border p-3">
        <h2 className="text-sm font-semibold">Componentes del costo</h2>
        <table className="mt-2 w-full text-sm">
          <tbody>
            {COST_COMPONENTS.map((component) => (
              <tr key={component.key} className="border-b last:border-0">
                <td className="py-1.5 text-muted-foreground">{component.label}</td>
                <td className="py-1.5 text-right">
                  {formatMoney(purchase.components[component.key])}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-medium">
              <td className="py-1.5">Total original</td>
              <td className="py-1.5 text-right">{formatMoney(purchase.totalOriginal)}</td>
            </tr>
            {purchase.currency !== "USD" ? (
              <tr>
                <td className="py-1.5 text-muted-foreground">
                  Equivalente en USD (tipo de cambio {purchase.exchangeRate})
                </td>
                <td className="py-1.5 text-right">{formatMoney(purchase.totalUsd)}</td>
              </tr>
            ) : null}
          </tfoot>
        </table>
      </div>

      {purchase.notes ? (
        <div className="rounded-lg border p-3 text-sm">
          <h2 className="text-sm font-semibold">Notas</h2>
          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{purchase.notes}</p>
        </div>
      ) : null}

      {purchase.isVoided ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <h2 className="text-sm font-semibold text-destructive">Anulación</h2>
          <p className="mt-1 text-muted-foreground">
            {purchase.voidedByName ?? "Alguien"} anuló esta compra
            {purchase.voidedAt ? ` el ${purchase.voidedAt.slice(0, 10)}` : ""}: “{purchase.voidReason}”.
            No cuenta en el costo de adquisición del vehículo.
          </p>
        </div>
      ) : null}
    </div>
  )
}

function VoidAction({ onConfirm }: { onConfirm: (reason: string) => Promise<void> }) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive" size="sm">
          Anular
        </Button>
      }
      title="Anular esta compra"
      description="Esta operación no se puede deshacer. Anota el motivo."
      confirmLabel="Anular"
      variant="destructive"
      onConfirm={() => {
        const reason = window.prompt("Motivo de la anulación") ?? ""
        return onConfirm(reason)
      }}
    />
  )
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  )
}
