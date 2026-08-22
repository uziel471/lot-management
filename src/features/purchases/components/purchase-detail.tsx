"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { DetailGrid, DetailItem, DetailSection } from "@/components/shared/detail-section"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  const router = useRouter()

  async function handleVoid(reason: string) {
    const formData = new FormData()
    formData.set("reason", reason)
    const result = await voidPurchaseAction(purchase.code, formData)
    if (result.ok) {
      toastManager.add({ title: "Compra anulada", description: purchase.code })
      router.refresh()
    } else {
      toastManager.add({ title: "No se pudo anular", description: result.error })
    }
  }

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div className="rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-sm text-muted-foreground">{purchase.code}</h2>
              {purchase.isVoided ? (
                <StatusBadge tone="destructive">Anulada</StatusBadge>
              ) : (
                <StatusBadge tone="success">Vigente</StatusBadge>
              )}
              <StatusBadge tone="muted">{TX_TYPE_LABELS[purchase.txType]}</StatusBadge>
            </div>
            <p className="text-sm text-muted-foreground">
              Registro inmutable de la compra y su impacto en el costo de adquisición.
            </p>
          </div>
          {canVoid && !purchase.isVoided ? <VoidAction onConfirm={handleVoid} /> : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="flex flex-col gap-6">
          <DetailSection
            title="Identidad y contexto"
            description="Datos principales de la compra, la unidad y el proveedor."
          >
            <DetailGrid>
              <DetailItem
                label="Vehículo"
                value={
                  <Link href={`/vehiculos/${purchase.vehicleCode}`} className="hover:underline">
                    {purchase.vehicleCode} · {purchase.vehicleDescription}
                  </Link>
                }
              />
              <DetailItem label="Proveedor" value={purchase.vendorName} />
              <DetailItem label="Fecha de compra" value={purchase.purchaseDate.slice(0, 10)} />
              <DetailItem label="Origen" value={SOURCE_TYPE_LABELS[purchase.sourceType]} />
              <DetailItem label="Moneda original" value={purchase.currency} />
              <DetailItem label="Tipo de cambio" value={purchase.exchangeRate} />
            </DetailGrid>
          </DetailSection>

          <DetailSection
            title="Componentes financieros"
            description="Valores originales capturados por componente, sin edición posterior."
          >
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <tbody>
                  {COST_COMPONENTS.map((component) => (
                    <tr key={component.key} className="border-b last:border-0">
                      <td className="px-4 py-2 text-muted-foreground">{component.label}</td>
                      <td className="px-4 py-2 text-right">{formatMoney(purchase.components[component.key])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DetailSection>

          <DetailSection
            title="Totales y conversion"
            description="Los valores se conservan tal como fueron registrados y las anulaciones no alteran el historial."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Total original" value={formatMoney(purchase.totalOriginal)} />
              <Metric label="Total en USD" value={formatMoney(purchase.totalUsd)} />
              <Metric label="Pagado USD" value={formatMoney(purchase.paidUsd)} />
              <Metric label="Pendiente USD" value={formatMoney(purchase.pendingUsd)} />
            </div>
            {purchase.isVoided ? (
              <p className="text-sm text-muted-foreground">
                Esta compra permanece consultable, pero ya no contribuye al costo de adquisición del vehículo.
              </p>
            ) : null}
          </DetailSection>

          <DetailSection
            title="Pagos relacionados"
            description="Aplicaciones activas que reducen el saldo pendiente de esta compra."
          >
            {purchase.paymentSummary.activeApplications.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin pagos activos relacionados.</p>
            ) : (
              <div className="rounded-lg border">
                <div className="divide-y">
                  {purchase.paymentSummary.activeApplications.map((application) => (
                    <Link
                      key={`${application.paymentCode}-${application.sourceId}`}
                      href={application.paymentHref}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/40"
                    >
                      <div>
                        <p className="font-mono text-xs">{application.paymentCode}</p>
                        <p className="text-muted-foreground">{application.paymentDate.slice(0, 10)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatMoney(application.appliedUsd)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </DetailSection>

          <DetailSection
            title="Referencias y relaciones"
            description="Soporte documental y vínculos de corrección."
          >
            <DetailGrid>
              <DetailItem
                label="Forma de pago"
                value={purchase.paymentMethod ? PAYMENT_METHOD_LABELS[purchase.paymentMethod] : undefined}
              />
              <DetailItem label="Referencia" value={purchase.referenceNumber ?? undefined} />
              <DetailItem label="Número de lote" value={purchase.lotNumber ?? undefined} />
              <DetailItem
                label="Corrige a"
                value={
                  purchase.correctsPurchaseCode ? (
                    <Link href={`/compras/${purchase.correctsPurchaseCode}`} className="hover:underline">
                      {purchase.correctsPurchaseCode}
                    </Link>
                  ) : undefined
                }
              />
              <DetailItem
                label="Corregida por"
                value={
                  purchase.correctedByPurchaseCode ? (
                    <Link href={`/compras/${purchase.correctedByPurchaseCode}`} className="hover:underline">
                      {purchase.correctedByPurchaseCode}
                    </Link>
                  ) : undefined
                }
              />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Notas" description="Observaciones registradas junto con la compra.">
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {purchase.notes ?? "Sin notas registradas."}
            </p>
          </DetailSection>
        </div>

        <div className="flex flex-col gap-6">
          <DetailSection
            title="Registro"
            description="Trazabilidad de alta y, cuando aplica, de anulación."
          >
            <DetailGrid className="sm:grid-cols-1">
              <DetailItem label="Capturada por" value={purchase.createdByName ?? purchase.createdBy} />
              <DetailItem label="Creada el" value={purchase.createdAt.slice(0, 10)} />
              <DetailItem label="Actualizada el" value={purchase.updatedAt.slice(0, 10)} />
            </DetailGrid>
          </DetailSection>

          {purchase.isVoided ? (
            <DetailSection
              title="Anulación"
              description="La compra sigue disponible para consulta, pero ya no cuenta en el costo de adquisición."
            >
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
                <div className="grid gap-3">
                  <p className="font-medium text-destructive">Compra anulada</p>
                  <p className="text-muted-foreground">{purchase.voidReason}</p>
                  <div className="grid gap-2 text-muted-foreground">
                    <p>Responsable: {purchase.voidedByName ?? purchase.voidedBy ?? "—"}</p>
                    <p>Fecha: {purchase.voidedAt?.slice(0, 10) ?? "—"}</p>
                  </div>
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
      trigger={
        <Button variant="destructive" size="sm">
          Anular
        </Button>
      }
      title="Anular esta compra"
      description="Esta operación no se puede deshacer. Registra un motivo claro para conservar la trazabilidad."
      confirmLabel="Anular"
      variant="destructive"
      body={
        <div className="grid gap-2">
          <Label htmlFor="void-reason">Motivo de la anulación</Label>
          <Textarea
            id="void-reason"
            name="reason"
            rows={4}
            required
            minLength={3}
            maxLength={500}
            placeholder="Explica por qué esta compra debe quedar anulada."
          />
          <p className="text-xs text-muted-foreground">
            La compra seguirá visible para consulta, pero dejará de contar en el costo de adquisición.
          </p>
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
