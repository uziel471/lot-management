"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { DetailGrid, DetailItem, DetailSection } from "@/components/shared/detail-section"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { toastManager } from "@/components/ui/toast"
import { formatMoney } from "@/lib/money"
import {
  cancelRepairAction,
  changeRepairStatusAction,
  completeRepairAction,
  voidRepairAction,
} from "../actions"
import {
  REPAIR_ACTIVE_STATUS_VALUES,
  REPAIR_CATEGORY_LABELS,
  REPAIR_COST_COMPONENTS,
  REPAIR_STATUS_LABELS,
  repairStatusTone,
} from "../enums"
import type { RepairDetailDTO } from "../types"

export function RepairDetail({
  repair,
  canWrite,
  canVoid,
}: {
  repair: RepairDetailDTO
  canWrite: boolean
  canVoid: boolean
}) {
  const router = useRouter()
  const isTerminal = ["completed", "cancelled", "voided"].includes(repair.status)

  async function handleStatusChange(formData?: FormData) {
    const result = await changeRepairStatusAction(repair.code, formData ?? new FormData())
    if (result.ok) {
      toastManager.add({ title: "Estatus actualizado", description: repair.code })
      router.refresh()
    } else {
      toastManager.add({ title: "No se pudo actualizar", description: result.error })
    }
  }

  async function handleComplete(formData?: FormData) {
    const result = await completeRepairAction(repair.code, formData ?? new FormData())
    if (result.ok) {
      toastManager.add({ title: "Reparación completada", description: repair.code })
      router.refresh()
    } else {
      toastManager.add({ title: "No se pudo completar", description: result.error })
    }
  }

  async function handleCancel(formData?: FormData) {
    const result = await cancelRepairAction(repair.code, formData ?? new FormData())
    if (result.ok) {
      toastManager.add({ title: "Reparación cancelada", description: repair.code })
      router.refresh()
    } else {
      toastManager.add({ title: "No se pudo cancelar", description: result.error })
    }
  }

  async function handleVoid(formData?: FormData) {
    const result = await voidRepairAction(repair.code, formData ?? new FormData())
    if (result.ok) {
      toastManager.add({ title: "Reparación anulada", description: repair.code })
      router.refresh()
    } else {
      toastManager.add({ title: "No se pudo anular", description: result.error })
    }
  }

  const availableStatuses = REPAIR_ACTIVE_STATUS_VALUES.filter((status) => status !== repair.status)

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div className="rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-sm text-muted-foreground">{repair.code}</h2>
              <StatusBadge tone={repairStatusTone(repair.status)}>{REPAIR_STATUS_LABELS[repair.status]}</StatusBadge>
              <StatusBadge tone="muted">{REPAIR_CATEGORY_LABELS[repair.category]}</StatusBadge>
              {repair.isVoided ? <StatusBadge tone="destructive">Anulada</StatusBadge> : null}
              {repair.isInternal ? <StatusBadge tone="muted">Interna</StatusBadge> : null}
            </div>
            <p className="text-sm text-muted-foreground">
              Registro financiero y operativo consultable, con historial de estatus y costos congelados.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canWrite && !repair.isVoided && !isTerminal && availableStatuses.length > 0 ? (
              <ConfirmDialog
                trigger={<Button variant="outline" size="sm">Cambiar estatus</Button>}
                title="Cambiar estatus"
                description="Registra el nuevo estatus operativo y, si aplica, una nota breve."
                confirmLabel="Actualizar"
                body={
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="repair-next-status">Nuevo estatus</Label>
                      <Select id="repair-next-status" name="nextStatus" defaultValue={availableStatuses[0]} required>
                        {availableStatuses.map((status) => (
                          <option key={status} value={status}>
                            {REPAIR_STATUS_LABELS[status]}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="repair-status-note">Nota</Label>
                      <Textarea id="repair-status-note" name="note" rows={3} />
                    </div>
                  </div>
                }
                onConfirm={handleStatusChange}
              />
            ) : null}

            {canWrite && !repair.isVoided && !isTerminal ? (
              <>
                <ConfirmDialog
                  trigger={<Button variant="outline" size="sm">Completar</Button>}
                  title="Completar reparación"
                  description="Registra la fecha de conclusión y una nota final opcional."
                  confirmLabel="Completar"
                  body={
                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="repair-completed-at">Fecha de conclusión</Label>
                        <Input id="repair-completed-at" name="completedAt" type="date" required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="repair-complete-note">Nota final</Label>
                        <Textarea id="repair-complete-note" name="note" rows={3} />
                      </div>
                    </div>
                  }
                  onConfirm={handleComplete}
                />

                <ConfirmDialog
                  trigger={<Button variant="outline" size="sm">Cancelar</Button>}
                  title="Cancelar reparación"
                  description="La reparación seguirá consultable, pero dejará de contar como trabajo activo."
                  confirmLabel="Cancelar reparación"
                  body={
                    <div className="grid gap-2">
                      <Label htmlFor="repair-cancel-reason">Motivo</Label>
                      <Textarea id="repair-cancel-reason" name="reason" rows={4} required minLength={3} maxLength={500} />
                    </div>
                  }
                  onConfirm={handleCancel}
                />
              </>
            ) : null}

            {canVoid && !repair.isVoided ? (
              <ConfirmDialog
                trigger={<Button variant="destructive" size="sm">Anular</Button>}
                title="Anular reparación"
                description="La reparación seguirá visible para consulta, pero quedará fuera de los totales activos."
                confirmLabel="Anular"
                variant="destructive"
                body={
                  <div className="grid gap-2">
                    <Label htmlFor="repair-void-reason">Motivo de la anulación</Label>
                    <Textarea id="repair-void-reason" name="reason" rows={4} required minLength={3} maxLength={500} />
                  </div>
                }
                onConfirm={handleVoid}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="flex flex-col gap-6">
          <DetailSection title="Identidad y contexto" description="Unidad, proveedor, categoría y fechas del trabajo.">
            <DetailGrid>
              <DetailItem
                label="Vehículo"
                value={
                  <Link href={`/vehiculos/${repair.vehicleCode}`} className="hover:underline">
                    {repair.vehicleCode} · {repair.vehicleDescription}
                  </Link>
                }
              />
              <DetailItem label="Proveedor" value={repair.vendorName ?? "Interna / sin proveedor"} />
              <DetailItem label="Categoría" value={REPAIR_CATEGORY_LABELS[repair.category]} />
              <DetailItem label="Estatus" value={REPAIR_STATUS_LABELS[repair.status]} />
              <DetailItem label="Apertura" value={repair.openedAt.slice(0, 10)} />
              <DetailItem label="Conclusión" value={repair.completedAt?.slice(0, 10)} />
              <DetailItem label="Moneda original" value={repair.currency} />
              <DetailItem label="Tipo de cambio" value={repair.exchangeRate} />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Desglose financiero" description="Importes capturados por componente en la moneda original.">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <tbody>
                  {REPAIR_COST_COMPONENTS.map((component) => (
                    <tr key={component.key} className="border-b last:border-0">
                      <td className="px-4 py-2 text-muted-foreground">{component.label}</td>
                      <td className="px-4 py-2 text-right">{formatMoney(repair.components[component.key])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DetailSection>

          <DetailSection title="Totales" description="Los totales en USD conservan el tipo de cambio capturado al momento de guardar.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Total original" value={formatMoney(repair.totalOriginal)} />
              <Metric label="Total en USD" value={formatMoney(repair.totalUsd)} />
            </div>
            {repair.isVoided ? (
              <p className="text-sm text-muted-foreground">
                Esta reparación conserva sus valores históricos, pero ya no contribuye a los totales activos.
              </p>
            ) : null}
          </DetailSection>

          <DetailSection title="Trabajo y referencias" description="Descripción capturada y referencias operativas.">
            <div className="grid gap-4">
              <p className="whitespace-pre-wrap text-sm">{repair.description}</p>
              <DetailGrid>
                <DetailItem label="Referencia" value={repair.referenceNumber} />
                <DetailItem label="Orden de trabajo" value={repair.workOrderNumber} />
              </DetailGrid>
            </div>
          </DetailSection>

          <DetailSection title="Notas" description="Observaciones visibles para el equipo.">
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {repair.notes ?? "Sin notas registradas."}
            </p>
          </DetailSection>

          <DetailSection title="Historial de estatus" description="Cada cambio queda registrado con responsable, fecha y nota.">
            <div className="rounded-lg border">
              <div className="divide-y">
                {repair.statusHistory.map((entry) => (
                  <div key={`${entry.changedAt}-${entry.nextStatus}`} className="grid gap-2 px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      {entry.previousStatusLabel ? (
                        <>
                          <StatusBadge tone={repairStatusTone(entry.previousStatus!)}>{entry.previousStatusLabel}</StatusBadge>
                          <span className="text-muted-foreground">→</span>
                        </>
                      ) : null}
                      <StatusBadge tone={repairStatusTone(entry.nextStatus)}>{entry.nextStatusLabel}</StatusBadge>
                    </div>
                    <p className="text-muted-foreground">
                      {entry.changedAt.slice(0, 10)} · {entry.changedByName ?? entry.changedBy}
                    </p>
                    {entry.note ? <p>{entry.note}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          </DetailSection>
        </div>

        <div className="flex flex-col gap-6">
          <DetailSection title="Registro" description="Autoría y trazabilidad del alta.">
            <DetailGrid className="sm:grid-cols-1">
              <DetailItem label="Capturada por" value={repair.createdByName ?? repair.createdBy} />
              <DetailItem label="Creada el" value={repair.createdAt.slice(0, 10)} />
              <DetailItem label="Actualizada el" value={repair.updatedAt.slice(0, 10)} />
            </DetailGrid>
          </DetailSection>

          {repair.completedAt ? (
            <DetailSection title="Conclusión" description="Metadatos finales de la reparación completada.">
              <DetailGrid className="sm:grid-cols-1">
                <DetailItem label="Fecha de conclusión" value={repair.completedAt.slice(0, 10)} />
                <DetailItem label="Responsable" value={repair.completedByName ?? repair.completedBy} />
                <DetailItem label="Nota final" value={repair.completionNote} />
              </DetailGrid>
            </DetailSection>
          ) : null}

          {repair.cancelledAt ? (
            <DetailSection title="Cancelación" description="La reparación permanece consultable como trabajo cancelado.">
              <div className="rounded-lg border p-4 text-sm">
                <p className="font-medium">{repair.cancellationReason}</p>
                <p className="mt-2 text-muted-foreground">
                  {repair.cancelledAt.slice(0, 10)} · {repair.cancelledByName ?? repair.cancelledBy ?? "—"}
                </p>
              </div>
            </DetailSection>
          ) : null}

          {repair.isVoided ? (
            <DetailSection title="Anulación" description="La reparación ya no cuenta en los totales activos del vehículo.">
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
                <p className="font-medium text-destructive">{repair.voidReason}</p>
                <p className="mt-2 text-muted-foreground">
                  {repair.voidedAt?.slice(0, 10)} · {repair.voidedByName ?? repair.voidedBy ?? "—"}
                </p>
              </div>
            </DetailSection>
          ) : null}
        </div>
      </div>
    </div>
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
