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
import { voidExpenseAction } from "../actions"
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_COMPONENTS,
  EXPENSE_EVIDENCE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  expenseStatusTone,
} from "../enums"
import type { ExpenseDetailDTO } from "../types"

export function ExpenseDetail({
  expense,
  canVoid,
}: {
  expense: ExpenseDetailDTO
  canVoid: boolean
}) {
  const router = useRouter()

  async function handleVoid(reason: string) {
    const formData = new FormData()
    formData.set("reason", reason)
    const result = await voidExpenseAction(expense.code, formData)
    if (result.ok) {
      toastManager.add({ title: "Gasto anulado", description: expense.code })
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
              <h2 className="font-mono text-sm text-muted-foreground">{expense.code}</h2>
              <StatusBadge tone={expenseStatusTone(expense.isVoided ? "voided" : "active")}>
                {expense.isVoided ? "Anulado" : "Vigente"}
              </StatusBadge>
              <StatusBadge tone="muted">{EXPENSE_CATEGORY_LABELS[expense.category]}</StatusBadge>
              {expense.isGeneral ? <StatusBadge tone="muted">General</StatusBadge> : null}
            </div>
            <p className="text-sm text-muted-foreground">
              Registro financiero inmutable de un egreso operativo, consultable con su trazabilidad completa.
            </p>
          </div>
          {canVoid && !expense.isVoided ? <VoidAction onConfirm={handleVoid} /> : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="flex flex-col gap-6">
          <DetailSection
            title="Identidad y contexto"
            description="Datos principales del gasto, la unidad cuando aplica y el proveedor relacionado."
          >
            <DetailGrid>
              <DetailItem label="Fecha del gasto" value={expense.expenseDate.slice(0, 10)} />
              <DetailItem label="Categoría" value={EXPENSE_CATEGORY_LABELS[expense.category]} />
              <DetailItem
                label="Vehículo"
                value={
                  expense.vehicleCode ? (
                    <Link href={`/vehiculos/${expense.vehicleCode}`} className="hover:underline">
                      {expense.vehicleCode} · {expense.vehicleDescription}
                    </Link>
                  ) : (
                    "Gasto general"
                  )
                }
              />
              <DetailItem label="Proveedor" value={expense.vendorName ?? "Sin proveedor"} />
              <DetailItem label="Moneda original" value={expense.currency} />
              <DetailItem label="Tipo de cambio" value={expense.exchangeRate} />
            </DetailGrid>
          </DetailSection>

          <DetailSection
            title="Desglose financiero"
            description="Importes capturados por componente en la moneda original."
          >
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <tbody>
                  {EXPENSE_COMPONENTS.map((component) => (
                    <tr key={component.key} className="border-b last:border-0">
                      <td className="px-4 py-2 text-muted-foreground">{component.label}</td>
                      <td className="px-4 py-2 text-right">{formatMoney(expense.components[component.key])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DetailSection>

          <DetailSection
            title="Totales"
            description="Los valores históricos conservan el tipo de cambio capturado al momento de guardar."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Total original" value={formatMoney(expense.totalOriginal)} />
              <Metric label="Total en USD" value={formatMoney(expense.totalUsd)} />
              <Metric label="Pagado USD" value={formatMoney(expense.paidUsd)} />
              <Metric label="Pendiente USD" value={formatMoney(expense.pendingUsd)} />
            </div>
            {expense.isVoided ? (
              <p className="text-sm text-muted-foreground">
                Este gasto conserva sus valores históricos, pero ya no contribuye a los totales activos.
              </p>
            ) : null}
          </DetailSection>

          <DetailSection
            title="Pagos relacionados"
            description="Aplicaciones activas que reducen el saldo pendiente de este gasto."
          >
            {expense.paymentSummary.activeApplications.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin pagos activos relacionados.</p>
            ) : (
              <div className="rounded-lg border">
                <div className="divide-y">
                  {expense.paymentSummary.activeApplications.map((application) => (
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
            title="Pago, referencias y evidencia"
            description="Datos para conciliación y soporte documental."
          >
            <DetailGrid>
              <DetailItem
                label="Forma de pago"
                value={expense.paymentMethod ? PAYMENT_METHOD_LABELS[expense.paymentMethod] : undefined}
              />
              <DetailItem label="Referencia" value={expense.referenceNumber} />
              <DetailItem
                label="Tipo de evidencia"
                value={expense.evidenceType ? EXPENSE_EVIDENCE_TYPE_LABELS[expense.evidenceType] : undefined}
              />
              <DetailItem label="Etiqueta de evidencia" value={expense.evidenceLabel} />
              <DetailItem
                label="Liga de evidencia"
                value={
                  expense.evidenceUrl ? (
                    <a href={expense.evidenceUrl} target="_blank" rel="noreferrer" className="hover:underline">
                      Abrir evidencia
                    </a>
                  ) : undefined
                }
              />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Notas" description="Observaciones operativas registradas junto con el gasto.">
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {expense.notes ?? "Sin notas registradas."}
            </p>
          </DetailSection>
        </div>

        <div className="flex flex-col gap-6">
          <DetailSection title="Registro" description="Trazabilidad de alta y, cuando aplica, de anulación.">
            <DetailGrid className="sm:grid-cols-1">
              <DetailItem label="Capturado por" value={expense.createdByName ?? expense.createdBy} />
              <DetailItem label="Creado el" value={expense.createdAt.slice(0, 10)} />
              <DetailItem label="Actualizado el" value={expense.updatedAt.slice(0, 10)} />
            </DetailGrid>
          </DetailSection>

          {expense.isVoided ? (
            <DetailSection
              title="Anulación"
              description="El gasto sigue disponible para consulta, pero queda fuera de los totales activos."
            >
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
                <div className="grid gap-3">
                  <p className="font-medium text-destructive">Gasto anulado</p>
                  <p className="text-muted-foreground">{expense.voidReason}</p>
                  <div className="grid gap-2 text-muted-foreground">
                    <p>Responsable: {expense.voidedByName ?? expense.voidedBy ?? "—"}</p>
                    <p>Fecha: {expense.voidedAt?.slice(0, 10) ?? "—"}</p>
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
      title="Anular este gasto"
      description="Esta operación no se puede deshacer. Registra un motivo claro para conservar la trazabilidad."
      confirmLabel="Anular"
      variant="destructive"
      body={
        <div className="grid gap-2">
          <Label htmlFor="expense-void-reason">Motivo de la anulación</Label>
          <Textarea
            id="expense-void-reason"
            name="reason"
            rows={4}
            required
            minLength={3}
            maxLength={500}
            placeholder="Explica por qué este gasto debe quedar anulado."
          />
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
