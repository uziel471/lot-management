"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { DetailGrid, DetailItem, DetailSection } from "@/components/shared/detail-section"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toastManager } from "@/components/ui/toast"
import { formatMoney } from "@/lib/money"
import { voidPaymentAction } from "../actions"
import { PAYMENT_METHOD_LABELS, PAYMENT_SOURCE_TYPE_LABELS } from "../enums"
import type { PaymentDetailDTO } from "../types"

export function PaymentDetail({
  payment,
  canVoid,
}: {
  payment: PaymentDetailDTO
  canVoid: boolean
}) {
  const router = useRouter()

  async function handleVoid(reason: string) {
    const formData = new FormData()
    formData.set("reason", reason)
    const result = await voidPaymentAction(payment.code, formData)
    if (result.ok) {
      toastManager.add({ title: "Pago anulado", description: payment.code })
      router.refresh()
    } else {
      toastManager.add({ title: "No se pudo anular", description: result.error })
    }
  }

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div className="rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-sm text-muted-foreground">{payment.code}</h2>
              {payment.isVoided ? <StatusBadge tone="destructive">Anulado</StatusBadge> : <StatusBadge tone="success">Vigente</StatusBadge>}
            </div>
            <p className="text-sm text-muted-foreground">
              Registro inmutable de pago saliente con aplicaciones y saldo histórico congelado.
            </p>
          </div>
          {canVoid && !payment.isVoided ? <VoidAction onConfirm={handleVoid} /> : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="flex flex-col gap-6">
          <DetailSection title="Identidad" description="Datos principales del pago y su contexto operativo.">
            <DetailGrid>
              <DetailItem label="Fecha" value={payment.paymentDate.slice(0, 10)} />
              <DetailItem label="Proveedor" value={payment.providerName ?? "Sin proveedor"} />
              <DetailItem label="Método" value={PAYMENT_METHOD_LABELS[payment.method]} />
              <DetailItem label="Moneda" value={payment.currency} />
              <DetailItem label="Tipo de cambio" value={payment.exchangeRate} />
              <DetailItem label="Estatus" value={payment.isVoided ? "Anulado" : "Vigente"} />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Monto" description="Importe original capturado y equivalente USD congelado.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Monto original" value={formatMoney(payment.amount)} />
              <Metric label="Equivalente USD" value={formatMoney(payment.totalUsd)} />
            </div>
          </DetailSection>

          <DetailSection title="Aplicaciones" description="Cada documento conserva su referencia y saldo capturado al momento del pago.">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Documento</th>
                    <th className="px-4 py-2 text-right">Aplicado</th>
                    <th className="px-4 py-2 text-right">USD</th>
                    <th className="px-4 py-2 text-right">Total USD</th>
                    <th className="px-4 py-2 text-right">Pendiente USD</th>
                  </tr>
                </thead>
                <tbody>
                  {payment.applications.map((application) => (
                    <tr key={`${application.sourceType}:${application.sourceId}`} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <Link href={application.sourceHref} className="hover:underline">
                          <span className="font-medium">{application.sourceCode}</span>
                        </Link>
                        <p className="text-xs text-muted-foreground">{PAYMENT_SOURCE_TYPE_LABELS[application.sourceType]}</p>
                      </td>
                      <td className="px-4 py-3 text-right">{formatMoney(application.appliedAmount)}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(application.appliedUsd)}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(application.sourceTotalUsdSnapshot)}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(application.sourcePendingUsdSnapshot)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DetailSection>

          <DetailSection title="Referencias y evidencia" description="Metadatos consultables del pago conservados aun si se anula.">
            <DetailGrid>
              <DetailItem label="Referencia" value={payment.referenceNumber ?? undefined} />
              <DetailItem label="Cuenta" value={payment.accountLabel ?? undefined} />
            </DetailGrid>
            <div className="grid gap-3">
              {payment.evidence.length > 0 ? payment.evidence.map((evidence, index) => (
                <div key={`${evidence.type}-${index}`} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{evidence.label ?? evidence.type}</p>
                  {evidence.url ? <a href={evidence.url} className="text-muted-foreground underline">{evidence.url}</a> : null}
                  {evidence.notes ? <p className="mt-1 text-muted-foreground">{evidence.notes}</p> : null}
                </div>
              )) : <p className="text-sm text-muted-foreground">Sin evidencia registrada.</p>}
            </div>
          </DetailSection>

          <DetailSection title="Notas" description="Observaciones capturadas junto con el pago.">
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{payment.notes ?? "Sin notas registradas."}</p>
          </DetailSection>
        </div>

        <div className="flex flex-col gap-6">
          <DetailSection title="Registro" description="Trazabilidad de alta y anulación.">
            <DetailGrid className="sm:grid-cols-1">
              <DetailItem label="Capturado por" value={payment.createdByName ?? payment.createdBy} />
              <DetailItem label="Creado el" value={payment.createdAt.slice(0, 10)} />
              <DetailItem label="Actualizado el" value={payment.updatedAt.slice(0, 10)} />
            </DetailGrid>
          </DetailSection>

          {payment.isVoided ? (
            <DetailSection title="Anulación" description="El pago permanece consultable pero ya no reduce saldos activos.">
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
                <p className="font-medium text-destructive">Pago anulado</p>
                <p className="mt-2 text-muted-foreground">{payment.voidReason}</p>
                <div className="mt-3 grid gap-2 text-muted-foreground">
                  <p>Responsable: {payment.voidedByName ?? payment.voidedBy ?? "—"}</p>
                  <p>Fecha: {payment.voidedAt?.slice(0, 10) ?? "—"}</p>
                </div>
              </div>
            </DetailSection>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function VoidAction({ onConfirm }: { onConfirm: (reason: string) => Promise<void> }) {
  return (
    <ConfirmDialog
      trigger={<Button variant="destructive" size="sm">Anular</Button>}
      title="Anular este pago"
      description="La anulación libera el saldo aplicado, pero conserva el registro para consulta y auditoría."
      confirmLabel="Anular"
      variant="destructive"
      body={
        <div className="grid gap-2">
          <Label htmlFor="payment-void-reason">Motivo de la anulación</Label>
          <Textarea id="payment-void-reason" name="reason" rows={4} required minLength={3} maxLength={500} />
        </div>
      }
      onConfirm={(formData) => {
        const reason = formData?.get("reason")
        return onConfirm(typeof reason === "string" ? reason : "")
      }}
    />
  )
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  )
}
